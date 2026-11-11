-- EvidenceMint Team NAS Round 3 workspace.
-- Run once in Supabase SQL Editor. Invite codes are checked by /api/cloud, not stored here.
create extension if not exists pgcrypto;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.workspaces (id, name)
values ('b8d6d70c-ff7d-41c1-bb59-4e0b30be8f41', 'Team NAS - EvidenceMint Demo')
on conflict (id) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id),
  role text not null default 'creator' check (role in ('admin','creator','reviewer')),
  display_name text not null default '',
  created_at timestamptz not null default now()
);
alter table public.profiles alter column workspace_id drop not null;

create table if not exists public.reviews (
  id text not null,
  workspace_id uuid not null references public.workspaces(id),
  creator_id uuid not null references auth.users(id),
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table if not exists public.approved_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  record_key text not null,
  record_type text not null check (record_type in ('fact','guideline')),
  version integer not null check (version > 0),
  title text not null,
  content text not null,
  source_url text,
  valid_until date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  active boolean not null default true,
  unique (workspace_id, record_key, version)
);

create or replace function public.evidencemint_new_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, display_name)
  values (new.id, 'creator', coalesce(new.raw_user_meta_data->>'name',''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.evidencemint_my_workspace()
returns uuid language sql stable security definer set search_path = '' as $$
  select p.workspace_id from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.evidencemint_my_role()
returns text language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid()
$$;

drop trigger if exists evidencemint_profile_after_signup on auth.users;
create trigger evidencemint_profile_after_signup after insert on auth.users
for each row execute procedure public.evidencemint_new_profile();

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
alter table public.approved_records enable row level security;

drop policy if exists "Members read own workspace" on public.workspaces;
create policy "Members read own workspace" on public.workspaces for select to authenticated
using (id = public.evidencemint_my_workspace());

drop policy if exists "Members read workspace profiles" on public.profiles;
create policy "Members read workspace profiles" on public.profiles for select to authenticated
using (workspace_id = public.evidencemint_my_workspace());

drop policy if exists "Members read reviews" on public.reviews;
create policy "Members read reviews" on public.reviews for select to authenticated
using (workspace_id = public.evidencemint_my_workspace());
drop policy if exists "Members create reviews" on public.reviews;
create policy "Members create reviews" on public.reviews for insert to authenticated
with check (workspace_id = public.evidencemint_my_workspace() and creator_id = auth.uid() and payload->>'status' <> 'approved');
drop policy if exists "Members update reviews" on public.reviews;
create policy "Members update reviews" on public.reviews for update to authenticated
using (workspace_id = public.evidencemint_my_workspace() and (creator_id = auth.uid() or public.evidencemint_my_role() in ('admin','reviewer')))
with check (workspace_id = public.evidencemint_my_workspace() and (creator_id = auth.uid() or public.evidencemint_my_role() in ('admin','reviewer')) and (public.evidencemint_my_role() in ('admin','reviewer') or payload->>'status' <> 'approved'));

create or replace function public.evidencemint_guard_review_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  if old.creator_id <> auth.uid() and public.evidencemint_my_role() not in ('admin','reviewer') then
    raise exception 'Only the creator or an authorised reviewer can update this review';
  end if;
  if public.evidencemint_my_role() = 'creator' and new.payload->>'status' = 'approved' then
    raise exception 'Only an authorised reviewer can approve a review';
  end if;
  return new;
end;
$$;
drop trigger if exists evidencemint_review_permission_guard on public.reviews;
create trigger evidencemint_review_permission_guard before update on public.reviews
for each row execute procedure public.evidencemint_guard_review_update();

drop policy if exists "Members read approved records" on public.approved_records;
create policy "Members read approved records" on public.approved_records for select to authenticated
using (workspace_id = public.evidencemint_my_workspace());
drop policy if exists "Admins add approved record versions" on public.approved_records;
create policy "Admins add approved record versions" on public.approved_records for insert to authenticated
with check (
  workspace_id = public.evidencemint_my_workspace()
  and created_by = auth.uid()
  and public.evidencemint_my_role() in ('admin','reviewer')
);

grant usage on schema public to authenticated;
grant select on public.workspaces, public.profiles, public.reviews, public.approved_records to authenticated;
grant insert, update on public.reviews to authenticated;
grant insert on public.approved_records to authenticated;
