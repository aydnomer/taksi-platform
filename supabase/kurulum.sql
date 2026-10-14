-- Taksicim: canlı müsaitlik ve sayılar için Supabase kurulumu.
-- Supabase panelinde SQL Editor'e yapıştırıp bir kere çalıştır (tekrar çalıştırmak zararsızdır).
-- Sonra data/site.json içinde ayarlar.supabaseUrl ve ayarlar.supabaseAnonKey'i doldur.
--
-- Güvenlik özeti:
--  * Yolcu sadece durumları okur ve "şu butona basıldı" sayacı ekler. Başka hiçbir şeyi okuyamaz, değiştiremez.
--  * PIN'ler şifreli (bcrypt) saklanır. 5 yanlış denemede o kod 15 dakika kilitlenir, tekrarında süre katlanır.
--  * Sayılar sadece PIN'le okunur: şoför kendininkini, durak başkanı durağınınkini, yönetici hepsini.

create extension if not exists pgcrypto with schema extensions;

-- ---------- TABLOLAR ----------

-- Herkesin okuyabildiği durum tablosu (yolcu sayfası buradan okur)
create table if not exists public.durumlar (
  kod         text primary key,
  durum       text not null default 'musait' check (durum in ('musait','yolcuda','kapali')),
  donus_dk    int check (donus_dk between 1 and 240),
  yedekler    text[],
  durak       text,
  guncelleme  timestamptz not null default now()
);

-- Şoför PIN'leri: sadece veritabanının içinden okunur, dışarıya kapalı
create table if not exists public.pinler (
  kod       text primary key references public.durumlar(kod) on delete cascade,
  pin_hash  text not null
);

-- Durak başkanının PIN'i: durağın bütün şoförlerinin durumunu değiştirebilir, durağın sayılarını görür
create table if not exists public.durak_pinler (
  durak     text primary key,
  pin_hash  text not null
);

-- Yönetici PIN'i: bütün müşterilerin sayılarını görür (/rapor/). Tek satır.
create table if not exists public.yonetici_pin (
  id        int primary key default 1 check (id = 1),
  pin_hash  text not null
);

-- Yanlış PIN sayacı (deneme-yanılmayı durdurur)
create table if not exists public.pin_deneme (
  anahtar  text primary key,
  hata     int not null default 0,
  kilit    timestamptz
);

-- Sayaç: hangi sayfada hangi butona basıldı (isim, numara, konum yok)
create table if not exists public.olaylar (
  id      bigint generated always as identity primary key,
  kod     text not null,
  tur     text not null,
  hedef   text,
  zaman   timestamptz not null default now()
);
-- Nereden geldi (nfc, qr, uygulama, durak, link) ve telefona özel rastgele sayı (kişi bilgisi değil)
alter table public.olaylar add column if not exists kaynak text;
alter table public.olaylar add column if not exists cihaz  text;
alter table public.olaylar drop constraint if exists olaylar_tur_check;
alter table public.olaylar add constraint olaylar_tur_check
  check (tur in ('ziyaret','arama','konum','yonlendirme','rehber','google','kurulum','paylas','esya'));
alter table public.olaylar drop constraint if exists olaylar_kaynak_check;
alter table public.olaylar add constraint olaylar_kaynak_check
  check (kaynak is null or kaynak in ('nfc','qr','uygulama','durak','link'));
alter table public.olaylar drop constraint if exists olaylar_cihaz_check;
alter table public.olaylar add constraint olaylar_cihaz_check
  check (cihaz is null or cihaz ~ '^[a-z0-9]{6,24}$');
create index if not exists olaylar_kod_zaman on public.olaylar (kod, zaman);
create index if not exists olaylar_hedef_zaman on public.olaylar (hedef, zaman);
create index if not exists olaylar_cihaz_zaman on public.olaylar (cihaz, zaman);

-- ---------- ERİŞİM KURALLARI ----------

alter table public.durumlar     enable row level security;
alter table public.pinler       enable row level security;
alter table public.durak_pinler enable row level security;
alter table public.yonetici_pin enable row level security;
alter table public.pin_deneme   enable row level security;
alter table public.olaylar      enable row level security;
-- pinler, durak_pinler, yonetici_pin, pin_deneme: hiçbir politika yok, dışarıdan okunamaz, yazılamaz.

drop policy if exists "durum herkes okur" on public.durumlar;
create policy "durum herkes okur" on public.durumlar for select using (true);

-- Sayaç: herkes ekler ama sadece var olan bir sayfaya, zamanı sunucu yazar, aynı telefondan saatte en fazla 60 kayıt
create or replace function public._olay_uygun(p_kod text, p_cihaz text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (exists (select 1 from public.durumlar d where d.kod = p_kod)
          or exists (select 1 from public.durumlar d where 'd:' || d.durak = p_kod))
     and (p_cihaz is null or (select count(*) from public.olaylar o where o.cihaz = p_cihaz and o.zaman > now() - interval '1 hour') < 60);
$$;
drop policy if exists "olay herkes ekler" on public.olaylar;
create policy "olay herkes ekler" on public.olaylar for insert with check (
  public._olay_uygun(kod, cihaz)
  and coalesce(length(hedef), 0) < 40
  and zaman > now() - interval '1 minute' and zaman < now() + interval '1 minute'
);
drop policy if exists "olay herkes okur" on public.olaylar;
-- Supabase "authenticated" rolüne de varsayılan yetki verir; site giriş kullanmıyor, onu da kapatıyoruz
revoke all on public.olaylar, public.durumlar, public.pinler, public.durak_pinler, public.yonetici_pin, public.pin_deneme from anon, authenticated;
grant insert (kod, tur, hedef, kaynak, cihaz) on public.olaylar to anon;
grant select on public.durumlar to anon;

-- ---------- PIN KONTROLÜ (kilitli) ----------

-- Doğruysa sayacı sıfırlar; yanlışsa sayar, 5. yanlışta kilitler (15 dk, sonra 30, 60 … en çok 1 gün)
create or replace function public._pin_sonuc(p_anahtar text, p_dogru boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare d public.pin_deneme;
begin
  -- Sayaç, deneyen adrese göre tutulur: biri yanlış PIN deneyerek gerçek şoförü kilitleyemez
  p_anahtar := p_anahtar || '@' || coalesce(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), '');
  select * into d from public.pin_deneme where anahtar = p_anahtar for update;
  if d.kilit is not null and d.kilit > now() then return false; end if;
  if p_dogru then delete from public.pin_deneme where anahtar = p_anahtar; return true; end if;
  insert into public.pin_deneme (anahtar, hata) values (p_anahtar, 1)
    on conflict (anahtar) do update set
      hata = public.pin_deneme.hata + 1,
      kilit = case when public.pin_deneme.hata + 1 >= 5
                   then now() + make_interval(mins => least(15 * power(2, public.pin_deneme.hata - 4), 1440)::int) end;
  return false;
end $$;

create or replace function public.pin_kontrol(p_kod text, p_pin text)
returns boolean language sql security definer set search_path = '' as $$
  select public._pin_sonuc('sofor:' || p_kod,
    exists (select 1 from public.pinler where kod = p_kod and pin_hash = extensions.crypt(p_pin, pin_hash)));
$$;

create or replace function public.durak_pin_kontrol(p_durak text, p_pin text)
returns boolean language sql security definer set search_path = '' as $$
  select public._pin_sonuc('durak:' || p_durak,
    exists (select 1 from public.durak_pinler where durak = p_durak and pin_hash = extensions.crypt(p_pin, pin_hash)));
$$;

create or replace function public.yonetici_pin_kontrol(p_pin text)
returns boolean language sql security definer set search_path = '' as $$
  select public._pin_sonuc('yonetici',
    exists (select 1 from public.yonetici_pin where pin_hash = extensions.crypt(p_pin, pin_hash)));
$$;

-- ---------- DURUM GÜNCELLEME ----------

-- Şoför panelinden durum güncelleme (PIN doğruysa)
create or replace function public.durum_guncelle(p_kod text, p_pin text, p_durum text, p_donus_dk int default null, p_yedekler text[] default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.pin_kontrol(p_kod, p_pin) then return false; end if;
  update public.durumlar
     set durum = p_durum,
         donus_dk = case when p_durum = 'yolcuda' then p_donus_dk else null end,
         yedekler = coalesce(p_yedekler[1:5], yedekler),
         guncelleme = now()
   where kod = p_kod;
  return true;
end $$;

-- Durak başkanı, durağındaki bir şoförün durumunu değiştirir
create or replace function public.durak_durum_guncelle(p_durak text, p_pin text, p_kod text, p_durum text, p_donus_dk int default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not public.durak_pin_kontrol(p_durak, p_pin) then return false; end if;
  update public.durumlar
     set durum = p_durum,
         donus_dk = case when p_durum = 'yolcuda' then p_donus_dk else null end,
         guncelleme = now()
   where kod = p_kod and durak = p_durak;
  return found;
end $$;

-- ---------- SAYILAR ----------

-- tip: 'sofor' (kendi sayıları, şoför PIN'i), 'durak' (durağın bütün araçları, durak PIN'i), 'hepsi' (yönetici PIN'i)
-- PIN yanlışsa null döner.
create or replace function public.olay_listesi(p_tip text, p_kod text, p_pin text, p_baslangic timestamptz default null)
returns json language plpgsql security definer set search_path = '' as $$
declare kodlar text[];
begin
  if p_tip = 'sofor' then
    if not public.pin_kontrol(p_kod, p_pin) then return null; end if;
    kodlar := array[p_kod];
  elsif p_tip = 'durak' then
    if not public.durak_pin_kontrol(p_kod, p_pin) then return null; end if;
    kodlar := array(select kod from public.durumlar where durak = p_kod) || ('d:' || p_kod);
  elsif p_tip = 'hepsi' then
    if not public.yonetici_pin_kontrol(p_pin) then return null; end if;
  else
    return null;
  end if;
  return coalesce((
    select json_agg(json_build_object('kod', o.kod, 'tur', o.tur, 'hedef', o.hedef, 'kaynak', o.kaynak, 'cihaz', o.cihaz, 'zaman', o.zaman) order by o.zaman)
      from public.olaylar o
     where (p_baslangic is null or o.zaman >= p_baslangic)
       and (kodlar is null or o.kod = any(kodlar) or o.hedef = any(kodlar))
  ), '[]'::json);
end $$;

-- Fonksiyonlar varsayılan olarak herkese açıktır; sadece gerekenleri yolcu/şoför tarafına açıyoruz
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.pin_kontrol(text, text) to anon;
grant execute on function public.durak_pin_kontrol(text, text) to anon;
grant execute on function public.durum_guncelle(text, text, text, int, text[]) to anon;
grant execute on function public.durak_durum_guncelle(text, text, text, text, int) to anon;
grant execute on function public.olay_listesi(text, text, text, timestamptz) to anon;
grant execute on function public._olay_uygun(text, text) to anon; -- sayaç kuralı bunu çağırır

-- ---------- KAYIT ÖRNEKLERİ ----------
-- PIN'ler en az 6 rakam olsun. Yönetici PIN'i uzun ve harfli olsun.
--
-- Yönetici:
-- insert into yonetici_pin (pin_hash) values (extensions.crypt('BURAYA-UZUN-PIN', extensions.gen_salt('bf')))
--   on conflict (id) do update set pin_hash = excluded.pin_hash;
--
-- Durak:
-- insert into durak_pinler (durak, pin_hash) values ('ornek-durak', extensions.crypt('482193', extensions.gen_salt('bf')))
--   on conflict (durak) do update set pin_hash = excluded.pin_hash;
--
-- Şoför (kodu, durağı ve PIN'i değiştir):
-- insert into durumlar (kod, durak) values ('ahmet', 'ornek-durak') on conflict (kod) do update set durak = excluded.durak;
-- insert into pinler (kod, pin_hash) values ('ahmet', extensions.crypt('582014', extensions.gen_salt('bf')))
--   on conflict (kod) do update set pin_hash = excluded.pin_hash;
--
-- Kilitlenen bir PIN'i hemen açmak için:
-- delete from pin_deneme where anahtar like 'sofor:ahmet@%';
