-- Taksicim: canlı müsaitlik durumu için Supabase kurulumu.
-- Supabase panelinde SQL Editor'e yapıştırıp bir kere çalıştır.
-- Sonra data/site.json içinde ayarlar.supabaseUrl ve ayarlar.supabaseAnonKey'i doldur.

create extension if not exists pgcrypto;

-- Herkesin okuyabildiği durum tablosu (yolcu sayfası buradan okur)
create table if not exists public.durumlar (
  kod         text primary key,
  durum       text not null default 'musait' check (durum in ('musait','yolcuda','kapali')),
  donus_dk    int,
  yedekler    text[],
  durak       text,
  guncelleme  timestamptz not null default now()
);

-- Şoför PIN'leri: sadece veritabanının içinden okunur, dışarıya kapalı
create table if not exists public.pinler (
  kod       text primary key references public.durumlar(kod) on delete cascade,
  pin_hash  text not null
);

-- Sayaç: hangi sayfada hangi butona basıldı (isim, numara, konum yok)
create table if not exists public.olaylar (
  id     bigint generated always as identity primary key,
  kod    text not null,
  tur    text not null,
  hedef  text,
  zaman  timestamptz not null default now()
);
-- Nereden geldi (nfc, qr, uygulama, durak, link) ve telefona özel rastgele sayı (kişi bilgisi değil)
alter table public.olaylar add column if not exists kaynak text;
alter table public.olaylar add column if not exists cihaz  text;
alter table public.olaylar drop constraint if exists olaylar_tur_check;
alter table public.olaylar add constraint olaylar_tur_check
  check (tur in ('ziyaret','arama','konum','yonlendirme','rehber','google','kurulum','paylas','esya'));
create index if not exists olaylar_kod_zaman on public.olaylar (kod, zaman);
create index if not exists olaylar_hedef_zaman on public.olaylar (hedef, zaman);

alter table public.durumlar enable row level security;
alter table public.pinler   enable row level security;
alter table public.olaylar  enable row level security;

drop policy if exists "durum herkes okur" on public.durumlar;
create policy "durum herkes okur" on public.durumlar for select using (true);
drop policy if exists "olay herkes ekler" on public.olaylar;
create policy "olay herkes ekler" on public.olaylar for insert
  with check (length(kod) < 40 and coalesce(length(hedef),0) < 40 and coalesce(length(kaynak),0) < 12 and coalesce(length(cihaz),0) < 24);
-- Sayılar dışarıya kapalı: sadece aşağıdaki olay_listesi ile, PIN'le okunur.
drop policy if exists "olay herkes okur" on public.olaylar;
-- pinler tablosuna hiçbir politika yok: dışarıdan okunamaz, yazılamaz.

-- PIN doğru mu?
create or replace function public.pin_kontrol(p_kod text, p_pin text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select exists (select 1 from pinler where kod = p_kod and pin_hash = crypt(p_pin, pin_hash));
$$;

-- Şoför panelinden durum güncelleme (PIN doğruysa)
create or replace function public.durum_guncelle(p_kod text, p_pin text, p_durum text, p_donus_dk int default null, p_yedekler text[] default null)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  if not pin_kontrol(p_kod, p_pin) then return false; end if;
  update durumlar
     set durum = p_durum,
         donus_dk = case when p_durum = 'yolcuda' then p_donus_dk else null end,
         yedekler = coalesce(p_yedekler, yedekler),
         guncelleme = now()
   where kod = p_kod;
  return true;
end $$;

grant execute on function public.pin_kontrol(text, text) to anon;
grant execute on function public.durum_guncelle(text, text, text, int, text[]) to anon;

-- Durak başkanının PIN'i: durağın bütün şoförlerinin durumunu değiştirebilir
create table if not exists public.durak_pinler (
  durak     text primary key,
  pin_hash  text not null
);
alter table public.durak_pinler enable row level security;

create or replace function public.durak_pin_kontrol(p_durak text, p_pin text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select exists (select 1 from durak_pinler where durak = p_durak and pin_hash = crypt(p_pin, pin_hash));
$$;

create or replace function public.durak_durum_guncelle(p_durak text, p_pin text, p_kod text, p_durum text, p_donus_dk int default null)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  if not durak_pin_kontrol(p_durak, p_pin) then return false; end if;
  update durumlar
     set durum = p_durum,
         donus_dk = case when p_durum = 'yolcuda' then p_donus_dk else null end,
         guncelleme = now()
   where kod = p_kod and durak = p_durak;
  return found;
end $$;

grant execute on function public.durak_pin_kontrol(text, text) to anon;
grant execute on function public.durak_durum_guncelle(text, text, text, text, int) to anon;

-- Yeni durak ekleme örneği:
-- insert into durak_pinler (durak, pin_hash) values ('ornek-durak', crypt('482193', gen_salt('bf')))
--   on conflict (durak) do update set pin_hash = excluded.pin_hash;

-- Yeni şoför ekleme örneği (kodu ve PIN'i değiştir):
-- insert into durumlar (kod, durak) values ('ahmet', 'ornek-durak') on conflict do nothing;
-- insert into pinler (kod, pin_hash) values ('ahmet', crypt('4821', gen_salt('bf')))
--   on conflict (kod) do update set pin_hash = excluded.pin_hash;

-- ---------- SAYILAR (rapor) ----------
-- Yönetici PIN'i: bütün müşterilerin sayılarını görür (/rapor/). Tek satır.
create table if not exists public.yonetici_pin (
  id        int primary key default 1 check (id = 1),
  pin_hash  text not null
);
alter table public.yonetici_pin enable row level security;
-- insert into yonetici_pin (pin_hash) values (crypt('BURAYA-UZUN-PIN', gen_salt('bf')))
--   on conflict (id) do update set pin_hash = excluded.pin_hash;

-- tip: 'sofor' (kendi sayıları, şoför PIN'i), 'durak' (durağın bütün araçları, durak PIN'i), 'hepsi' (yönetici PIN'i)
-- PIN yanlışsa null döner.
create or replace function public.olay_listesi(p_tip text, p_kod text, p_pin text, p_baslangic timestamptz default null)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare kodlar text[];
begin
  if p_tip = 'sofor' then
    if not pin_kontrol(p_kod, p_pin) then return null; end if;
    kodlar := array[p_kod];
  elsif p_tip = 'durak' then
    if not durak_pin_kontrol(p_kod, p_pin) then return null; end if;
    kodlar := array(select kod from durumlar where durak = p_kod) || ('d:' || p_kod);
  elsif p_tip = 'hepsi' then
    if not exists (select 1 from yonetici_pin where pin_hash = crypt(p_pin, pin_hash)) then return null; end if;
  else
    return null;
  end if;
  return coalesce((
    select json_agg(json_build_object('kod', o.kod, 'tur', o.tur, 'hedef', o.hedef, 'kaynak', o.kaynak, 'cihaz', o.cihaz, 'zaman', o.zaman) order by o.zaman)
      from olaylar o
     where (p_baslangic is null or o.zaman >= p_baslangic)
       and (kodlar is null or o.kod = any(kodlar) or o.hedef = any(kodlar))
  ), '[]'::json);
end $$;
grant execute on function public.olay_listesi(text, text, text, timestamptz) to anon;
