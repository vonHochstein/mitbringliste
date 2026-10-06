-- Run only in the dedicated mitbringliste project in organization Testprojekte.
begin;
create table public.mitbringsel (
  id uuid primary key default gen_random_uuid(),
  nutzer text not null check (char_length(nutzer) between 1 and 80 and nutzer ~ '[^[:space:]]'),
  mitbringsel text not null check (char_length(mitbringsel) between 1 and 160 and mitbringsel ~ '[^[:space:]]'),
  anzahl text not null check (char_length(anzahl) between 1 and 80 and anzahl ~ '[^[:space:]]')
);
alter table public.mitbringsel enable row level security;
grant usage on schema public to anon;
revoke all on public.mitbringsel from public, anon, authenticated;
grant select, insert, delete on public.mitbringsel to anon;
grant update (nutzer, mitbringsel, anzahl) on public.mitbringsel to anon;
create policy "Shared list read" on public.mitbringsel for select to anon using (true);
create policy "Shared list add" on public.mitbringsel for insert to anon with check (true);
create policy "Shared list edit" on public.mitbringsel for update to anon using (true) with check (true);
create policy "Shared list remove" on public.mitbringsel for delete to anon using (true);
commit;
