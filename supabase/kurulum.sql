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
  tur    text not null check (tur in ('arama','konum','yonlendirme','rehber','google','kurulum','paylas')),
  hedef  text,
  zaman  timestamptz not null default now()
);
create index if not exists olaylar_kod_zaman on public.olaylar (kod, zaman);
create index if not exists olaylar_hedef_zaman on public.olaylar (hedef, zaman);

alter table public.durumlar enable row level security;
alter table public.pinler   enable row level security;
alter table public.olaylar  enable row level security;

drop policy if exists "durum herkes okur" on public.durumlar;
create policy "durum herkes okur" on public.durumlar for select using (true);
drop policy if exists "olay herkes ekler" on public.olaylar;
create policy "olay herkes ekler" on public.olaylar for insert with check (length(kod) < 40 and coalesce(length(hedef),0) < 40);
drop policy if exists "olay herkes okur" on public.olaylar;
create policy "olay herkes okur" on public.olaylar for select using (true);
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
