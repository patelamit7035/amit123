-- =============================================================================
-- FunnelOS affiliate system - complete schema, security and server-side logic.
--
-- Apply with:  supabase db push      (CLI)
--         or:  paste into Supabase Studio → SQL Editor → Run
--
-- Everything the public (anonymous) internet is allowed to do goes through a
-- SECURITY DEFINER function with its own validation. No table is writable by
-- anonymous visitors.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  full_name     text not null default '',
  phone         text not null default '',
  role          text not null default 'affiliate' check (role in ('admin', 'affiliate')),
  status        text not null default 'active'    check (status in ('pending', 'active', 'suspended')),
  referral_code text not null unique,
  created_at    timestamptz not null default now()
);

create table if not exists public.bank_details (
  user_id             uuid primary key references public.profiles (id) on delete cascade,
  account_holder_name text not null default '',
  bank_name           text not null default '',
  account_number      text not null default '',
  ifsc_code           text not null default '',
  upi_id              text not null default '',
  updated_at          timestamptz not null default now()
);

create table if not exists public.products (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  description        text not null default '',
  price              numeric(12, 2) not null check (price > 0),
  currency           text not null default 'INR',
  commission_percent numeric(5, 2) not null check (commission_percent >= 0 and commission_percent <= 100),
  landing_url        text not null default '',
  active             boolean not null default true,
  created_at         timestamptz not null default now()
);

create table if not exists public.affiliate_links (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  affiliate_id uuid not null references public.profiles (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete cascade,
  clicks       integer not null default 0,
  created_at   timestamptz not null default now(),
  unique (affiliate_id, product_id)
);

create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.profiles (id) on delete cascade,
  product_id   uuid not null references public.products (id) on delete cascade,
  link_id      uuid references public.affiliate_links (id) on delete set null,
  name         text not null,
  email        text not null,
  phone        text not null,
  status       text not null default 'new' check (status in ('new', 'contacted', 'converted', 'rejected')),
  source       text not null default 'referral-page',
  note         text not null default '',
  created_at   timestamptz not null default now(),
  converted_at timestamptz
);

-- One person, one lead per affiliate link: a re-submitted form updates the row
-- instead of inflating the affiliate's lead count.
create unique index if not exists leads_link_email_key on public.leads (link_id, lower(email));
create index if not exists leads_affiliate_idx on public.leads (affiliate_id, created_at desc);

create table if not exists public.payouts (
  id           uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.profiles (id) on delete cascade,
  amount       numeric(12, 2) not null default 0,
  reference    text not null default '',
  note         text not null default '',
  paid_at      timestamptz not null default now()
);

create table if not exists public.conversions (
  id                 uuid primary key default gen_random_uuid(),
  lead_id            uuid not null unique references public.leads (id) on delete cascade,
  affiliate_id       uuid not null references public.profiles (id) on delete cascade,
  product_id         uuid not null references public.products (id) on delete cascade,
  sale_amount        numeric(12, 2) not null check (sale_amount > 0),
  commission_percent numeric(5, 2) not null check (commission_percent >= 0 and commission_percent <= 100),
  commission_amount  numeric(12, 2) not null default 0,
  converted_at       timestamptz not null default now(),
  payout_due_at      timestamptz not null default now(),
  paid_at            timestamptz,
  payout_id          uuid references public.payouts (id) on delete set null,
  note               text not null default ''
);

create index if not exists conversions_affiliate_idx on public.conversions (affiliate_id, converted_at desc);

create table if not exists public.app_settings (
  id                   integer primary key default 1 check (id = 1),
  brand_name           text not null default 'FunnelOS',
  currency             text not null default 'INR',
  payout_hold_days     integer not null default 7 check (payout_hold_days >= 0 and payout_hold_days <= 90),
  public_base_url      text not null default '',
  funnelos_webhook_url text not null default '',
  whatsapp_number      text not null default '',
  notify_from_email    text not null default '',
  notify_admin_email   text not null default ''
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.email_log (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid references public.leads (id) on delete set null,
  to_email   text not null,
  template   text not null,
  status     text not null default 'sent' check (status in ('sent', 'failed', 'queued')),
  error      text not null default '',
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- SECURITY DEFINER so the policies on `profiles` can ask "is this an admin?"
-- without recursing back into those same policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.generate_referral_code(p_name text)
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  prefix   text;
  suffix   text;
  candidate text;
begin
  prefix := left(regexp_replace(upper(coalesce(p_name, '')), '[^A-Z]', '', 'g'), 6);
  if length(prefix) < 3 then prefix := 'FOS'; end if;

  for _attempt in 1..50 loop
    suffix := '';
    for _i in 1..4 loop
      suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    candidate := prefix || '-' || suffix;
    if not exists (select 1 from public.profiles where referral_code = candidate) then
      return candidate;
    end if;
  end loop;

  return prefix || '-' || replace(gen_random_uuid()::text, '-', '');
end;
$$;

create or replace function public.generate_link_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
begin
  for _attempt in 1..50 loop
    candidate := '';
    for _i in 1..8 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    if not exists (select 1 from public.affiliate_links where code = candidate) then
      return candidate;
    end if;
  end loop;
  return upper(replace(gen_random_uuid()::text, '-', ''));
end;
$$;

-- Mirrors calcCommission() in src/lib/affiliate/commission.ts.
create or replace function public.calc_commission(p_sale numeric, p_percent numeric)
returns numeric
language sql
immutable
as $$
  select case
    when p_sale is null or p_percent is null or p_sale <= 0 or p_percent <= 0 then 0::numeric
    else round(p_sale * p_percent / 100.0, 2)
  end;
$$;

-- -----------------------------------------------------------------------------
-- New-user bootstrap: a profile (and bank details) for every auth user.
-- The very first account to sign up becomes the admin.
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := coalesce(nullif(meta ->> 'full_name', ''), split_part(new.email, '@', 1));
  v_role text;
begin
  select case when count(*) = 0 then 'admin' else 'affiliate' end into v_role from public.profiles;

  insert into public.profiles (id, email, full_name, phone, role, status, referral_code)
  values (
    new.id,
    lower(new.email),
    v_name,
    coalesce(meta ->> 'phone', ''),
    v_role,
    'active',
    public.generate_referral_code(v_name)
  )
  on conflict (id) do nothing;

  insert into public.bank_details (user_id, account_holder_name, bank_name, account_number, ifsc_code, upi_id)
  values (
    new.id,
    coalesce(meta ->> 'account_holder_name', ''),
    coalesce(meta ->> 'bank_name', ''),
    coalesce(meta ->> 'account_number', ''),
    upper(coalesce(meta ->> 'ifsc_code', '')),
    coalesce(meta ->> 'upi_id', '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- An affiliate may edit their own name and phone, never their role or status.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.status := old.status;
    new.referral_code := old.referral_code;
    new.email := old.email;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- Commission and credit date are computed server-side, never trusted from the
-- client, and mirror the same rules the UI applies.
create or replace function public.fill_conversion()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_hold integer;
begin
  select payout_hold_days into v_hold from public.app_settings where id = 1;
  new.commission_amount := public.calc_commission(new.sale_amount, new.commission_percent);
  if new.converted_at is null then new.converted_at := now(); end if;
  new.payout_due_at := new.converted_at + make_interval(days => coalesce(v_hold, 7));
  return new;
end;
$$;

drop trigger if exists conversions_fill on public.conversions;
create trigger conversions_fill
  before insert on public.conversions
  for each row execute function public.fill_conversion();

-- -----------------------------------------------------------------------------
-- Row level security
-- -----------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.bank_details    enable row level security;
alter table public.products        enable row level security;
alter table public.affiliate_links enable row level security;
alter table public.leads           enable row level security;
alter table public.conversions     enable row level security;
alter table public.payouts         enable row level security;
alter table public.app_settings    enable row level security;
alter table public.email_log       enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists bank_select on public.bank_details;
create policy bank_select on public.bank_details
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists bank_insert on public.bank_details;
create policy bank_insert on public.bank_details
  for insert to authenticated with check (user_id = auth.uid() or public.is_admin());

drop policy if exists bank_update on public.bank_details;
create policy bank_update on public.bank_details
  for update to authenticated using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to authenticated using (active or public.is_admin());

drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists links_select on public.affiliate_links;
create policy links_select on public.affiliate_links
  for select to authenticated using (affiliate_id = auth.uid() or public.is_admin());

drop policy if exists links_insert on public.affiliate_links;
create policy links_insert on public.affiliate_links
  for insert to authenticated with check (affiliate_id = auth.uid() or public.is_admin());

drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads
  for select to authenticated using (affiliate_id = auth.uid() or public.is_admin());

-- Leads normally arrive through submit_lead(); the admin can also add one by
-- hand (a lead that came in by phone) or delete spam.
drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads
  for insert to authenticated with check (public.is_admin());

drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads
  for delete to authenticated using (public.is_admin());

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists conversions_select on public.conversions;
create policy conversions_select on public.conversions
  for select to authenticated using (affiliate_id = auth.uid() or public.is_admin());

drop policy if exists conversions_write on public.conversions;
create policy conversions_write on public.conversions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists payouts_select on public.payouts;
create policy payouts_select on public.payouts
  for select to authenticated using (affiliate_id = auth.uid() or public.is_admin());

drop policy if exists payouts_write on public.payouts;
create policy payouts_write on public.payouts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_select on public.app_settings;
create policy settings_select on public.app_settings
  for select to authenticated using (true);

drop policy if exists settings_update on public.app_settings;
create policy settings_update on public.app_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists email_log_select on public.email_log;
create policy email_log_select on public.email_log
  for select to authenticated using (public.is_admin());
