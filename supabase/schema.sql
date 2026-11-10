-- Keel database schema for Supabase.
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run: every statement is idempotent.
--
-- Privacy model
--   * Each person's journal, habits, savings and plans live in user_state and
--     are readable only by that person.
--   * Nothing is shared automatically. An entry is shared only when its owner
--     sends it, and only to a linked partner. The recipient receives a copy.
--   * Partners are linked by invitation and both people must agree.

create extension if not exists pgcrypto;

-- ── Profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Personal data (one JSON document per person) ────────────────────────────
create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- ── Partner links ───────────────────────────────────────────────────────────
create table if not exists public.partnerships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint no_self_partner check (requester <> addressee),
  constraint unique_pair unique (requester, addressee)
);

create or replace function public.is_partner(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.partnerships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;

create or replace function public.is_linked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.partnerships
    where (requester = a and addressee = b) or (requester = b and addressee = a)
  );
$$;

-- ── Shared entries (a copy of a journal entry sent to a partner) ────────────
create table if not exists public.shared_entries (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references public.profiles (id) on delete cascade,
  recipient uuid not null references public.profiles (id) on delete cascade,
  entry jsonb not null,
  note text not null default '' check (char_length(note) <= 2000),
  reply text,
  replied_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shared_entries_recipient_idx on public.shared_entries (recipient, created_at desc);
create index if not exists shared_entries_sender_idx on public.shared_entries (sender, created_at desc);

-- ── Row-level security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.user_state enable row level security;
alter table public.partnerships enable row level security;
alter table public.shared_entries enable row level security;

drop policy if exists "read own or linked profile" on public.profiles;
create policy "read own or linked profile" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_linked(auth.uid(), id));

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own state" on public.user_state;
create policy "own state" on public.user_state
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "see own partnerships" on public.partnerships;
create policy "see own partnerships" on public.partnerships
  for select to authenticated
  using (requester = auth.uid() or addressee = auth.uid());

drop policy if exists "see sent or received" on public.shared_entries;
create policy "see sent or received" on public.shared_entries
  for select to authenticated
  using (sender = auth.uid() or recipient = auth.uid());

drop policy if exists "send to partner" on public.shared_entries;
create policy "send to partner" on public.shared_entries
  for insert to authenticated
  with check (
    sender = auth.uid()
    and public.is_partner(auth.uid(), recipient)
    and reply is null and read_at is null and replied_at is null
  );

drop policy if exists "unsend own" on public.shared_entries;
create policy "unsend own" on public.shared_entries
  for delete to authenticated
  using (sender = auth.uid());

-- Only display_name is editable on profiles; email and id are not.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;

-- ── Actions (run as functions so each rule is enforced in one place) ────────

-- Invite by email. If they already invited you, this accepts their invite.
create or replace function public.invite_partner(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  them uuid;
  existing public.partnerships;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select id into them from public.profiles where email = lower(trim(p_email));
  if them is null then return 'not_found'; end if;
  if them = me then return 'self'; end if;

  select * into existing from public.partnerships
  where (requester = me and addressee = them) or (requester = them and addressee = me);

  if found then
    if existing.status = 'accepted' then return 'already_partners'; end if;
    if existing.addressee = me then
      update public.partnerships set status = 'accepted' where id = existing.id;
      return 'accepted';
    end if;
    return 'already_invited';
  end if;

  insert into public.partnerships (requester, addressee) values (me, them);
  return 'invited';
end;
$$;

create or replace function public.respond_partner(p_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_accept then
    update public.partnerships set status = 'accepted'
    where id = p_id and addressee = auth.uid() and status = 'pending';
  else
    delete from public.partnerships
    where id = p_id and addressee = auth.uid() and status = 'pending';
  end if;
end;
$$;

-- Either person can unlink (or cancel an invite). Shared copies stay with each person.
create or replace function public.remove_partner(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.partnerships
  where id = p_id and (requester = auth.uid() or addressee = auth.uid());
$$;

create or replace function public.mark_shared_read(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.shared_entries set read_at = coalesce(read_at, now())
  where id = p_id and recipient = auth.uid();
$$;

create or replace function public.reply_shared(p_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if char_length(p_reply) > 2000 then raise exception 'reply_too_long'; end if;
  update public.shared_entries
  set reply = nullif(trim(p_reply), ''), replied_at = now(), read_at = coalesce(read_at, now())
  where id = p_id and recipient = auth.uid();
end;
$$;

-- Recipients can remove an entry from their own inbox.
create or replace function public.dismiss_shared(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.shared_entries where id = p_id and recipient = auth.uid();
$$;

revoke execute on function public.invite_partner(text) from public, anon;
revoke execute on function public.respond_partner(uuid, boolean) from public, anon;
revoke execute on function public.remove_partner(uuid) from public, anon;
revoke execute on function public.mark_shared_read(uuid) from public, anon;
revoke execute on function public.reply_shared(uuid, text) from public, anon;
revoke execute on function public.dismiss_shared(uuid) from public, anon;
grant execute on function public.invite_partner(text) to authenticated;
grant execute on function public.respond_partner(uuid, boolean) to authenticated;
grant execute on function public.remove_partner(uuid) to authenticated;
grant execute on function public.mark_shared_read(uuid) to authenticated;
grant execute on function public.reply_shared(uuid, text) to authenticated;
grant execute on function public.dismiss_shared(uuid) to authenticated;

-- ── Live updates for the shared inbox ───────────────────────────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shared_entries'
     ) then
    alter publication supabase_realtime add table public.shared_entries;
  end if;
end;
$$;
