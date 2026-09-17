-- =============================================================================
-- FunnelOS affiliate system - server-side operations.
--
-- The public internet only ever touches this file's anon-callable functions:
-- resolve_link, register_click and submit_lead. Everything money-related is
-- admin-gated inside the function body, so a stolen anon key cannot record a
-- sale or a payout.
-- =============================================================================

-- Returns the caller's link for a product, creating it on first use.
create or replace function public.ensure_affiliate_link(p_product_id uuid)
returns public.affiliate_links
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link public.affiliate_links;
begin
  if auth.uid() is null then
    raise exception 'Sign in to get your affiliate link' using errcode = '42501';
  end if;

  select * into v_link
  from public.affiliate_links
  where affiliate_id = auth.uid() and product_id = p_product_id;

  if found then
    return v_link;
  end if;

  if not exists (select 1 from public.products where id = p_product_id and active) then
    raise exception 'This product is not available' using errcode = 'P0002';
  end if;

  insert into public.affiliate_links (code, affiliate_id, product_id)
  values (public.generate_link_code(), auth.uid(), p_product_id)
  on conflict (affiliate_id, product_id) do update set product_id = excluded.product_id
  returning * into v_link;

  return v_link;
end;
$$;

-- What the public referral page needs, and nothing more: no emails, no
-- commission rates, no other affiliate's data.
create or replace function public.resolve_link(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
           'link', jsonb_build_object('id', l.id, 'code', l.code, 'affiliateId', l.affiliate_id,
                                      'productId', l.product_id, 'clicks', l.clicks, 'createdAt', l.created_at),
           'product', jsonb_build_object('id', p.id, 'name', p.name, 'description', p.description,
                                         'price', p.price, 'currency', p.currency, 'landingUrl', p.landing_url,
                                         'active', p.active, 'commissionPercent', 0, 'createdAt', p.created_at),
           'affiliate', jsonb_build_object('id', pr.id, 'fullName', pr.full_name, 'referralCode', pr.referral_code),
           'settings', jsonb_build_object('brandName', s.brand_name, 'currency', s.currency,
                                          'whatsappNumber', s.whatsapp_number, 'payoutHoldDays', s.payout_hold_days,
                                          'publicBaseUrl', s.public_base_url, 'funnelosWebhookUrl', '',
                                          'notifyFromEmail', '', 'notifyAdminEmail', '')
         )
    into v_result
  from public.affiliate_links l
  join public.products p on p.id = l.product_id
  join public.profiles pr on pr.id = l.affiliate_id
  cross join public.app_settings s
  where l.code = upper(trim(p_code))
    and p.active
    and pr.status <> 'suspended'
    and s.id = 1;

  return v_result;
end;
$$;

create or replace function public.register_click(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.affiliate_links set clicks = clicks + 1 where code = upper(trim(p_code));
$$;

-- The public lead form. Validates, de-duplicates and attributes the lead to the
-- affiliate who owns the link.
create or replace function public.submit_lead(
  p_code   text,
  p_name   text,
  p_email  text,
  p_phone  text,
  p_source text default 'referral-page'
)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_link    public.affiliate_links;
  v_lead    public.leads;
  v_name    text := left(btrim(coalesce(p_name, '')), 80);
  v_email   text := left(lower(btrim(coalesce(p_email, ''))), 120);
  v_phone   text := left(btrim(coalesce(p_phone, '')), 20);
begin
  if v_name = '' or v_email = '' or v_phone = '' then
    raise exception 'Name, email and phone are all required' using errcode = '22023';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[A-Za-z]{2,}$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;

  select l.* into v_link
  from public.affiliate_links l
  join public.products p on p.id = l.product_id
  join public.profiles pr on pr.id = l.affiliate_id
  where l.code = upper(trim(p_code)) and p.active and pr.status <> 'suspended';

  if not found then
    raise exception 'This affiliate link is no longer active' using errcode = 'P0002';
  end if;

  insert into public.leads (affiliate_id, product_id, link_id, name, email, phone, source)
  values (v_link.affiliate_id, v_link.product_id, v_link.id, v_name, v_email, v_phone,
          left(coalesce(nullif(btrim(p_source), ''), 'referral-page'), 200))
  on conflict (link_id, lower(email))
    do update set name = excluded.name, phone = excluded.phone
  returning * into v_lead;

  return v_lead;
end;
$$;

-- Admin marks a lead as a purchase. Commission and credit date are filled in by
-- the conversions trigger, so the client cannot dictate what it gets paid.
create or replace function public.convert_lead(
  p_lead_id    uuid,
  p_sale_amount numeric,
  p_commission_percent numeric default null,
  p_note       text default ''
)
returns public.conversions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead       public.leads;
  v_product    public.products;
  v_conversion public.conversions;
  v_percent    numeric;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can record a purchase' using errcode = '42501';
  end if;
  if coalesce(p_sale_amount, 0) <= 0 then
    raise exception 'Sale amount must be greater than 0' using errcode = '22023';
  end if;

  select * into v_lead from public.leads where id = p_lead_id;
  if not found then
    raise exception 'Lead not found' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.conversions where lead_id = p_lead_id) then
    raise exception 'This lead is already marked as a purchase' using errcode = '23505';
  end if;

  select * into v_product from public.products where id = v_lead.product_id;
  v_percent := coalesce(p_commission_percent, v_product.commission_percent);

  insert into public.conversions (lead_id, affiliate_id, product_id, sale_amount, commission_percent, note)
  values (p_lead_id, v_lead.affiliate_id, v_lead.product_id, round(p_sale_amount, 2), v_percent,
          left(coalesce(p_note, ''), 300))
  returning * into v_conversion;

  update public.leads
     set status = 'converted', converted_at = v_conversion.converted_at
   where id = p_lead_id;

  return v_conversion;
end;
$$;

create or replace function public.delete_conversion(p_conversion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conversion public.conversions;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can remove a purchase' using errcode = '42501';
  end if;

  select * into v_conversion from public.conversions where id = p_conversion_id;
  if not found then
    raise exception 'Sale not found' using errcode = 'P0002';
  end if;
  if v_conversion.paid_at is not null then
    raise exception 'This commission has already been paid and cannot be removed' using errcode = '42501';
  end if;

  delete from public.conversions where id = p_conversion_id;
  update public.leads set status = 'contacted', converted_at = null where id = v_conversion.lead_id;
end;
$$;

-- Marks matured commissions as transferred, in one transaction, and records the
-- bank/UPI reference of the real transfer the admin just made.
create or replace function public.pay_conversions(
  p_affiliate_id   uuid,
  p_conversion_ids uuid[],
  p_reference      text,
  p_note           text default ''
)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payout public.payouts;
  v_total  numeric;
  v_count  integer;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can record a payout' using errcode = '42501';
  end if;
  if p_conversion_ids is null or array_length(p_conversion_ids, 1) is null then
    raise exception 'Select at least one commission to pay' using errcode = '22023';
  end if;
  if btrim(coalesce(p_reference, '')) = '' then
    raise exception 'Add the bank/UPI reference for this transfer' using errcode = '22023';
  end if;

  select count(*), coalesce(sum(commission_amount), 0)
    into v_count, v_total
  from public.conversions
  where id = any (p_conversion_ids)
    and affiliate_id = p_affiliate_id
    and paid_at is null
    and payout_due_at <= now();

  if v_count <> array_length(p_conversion_ids, 1) then
    raise exception 'Some commissions are already paid, still inside the hold period, or belong to another affiliate'
      using errcode = '22023';
  end if;

  insert into public.payouts (affiliate_id, amount, reference, note)
  values (p_affiliate_id, v_total, left(btrim(p_reference), 120), left(coalesce(p_note, ''), 300))
  returning * into v_payout;

  update public.conversions
     set paid_at = v_payout.paid_at, payout_id = v_payout.id
   where id = any (p_conversion_ids) and affiliate_id = p_affiliate_id and paid_at is null;

  return v_payout;
end;
$$;

-- -----------------------------------------------------------------------------
-- Execution grants. Only the three public functions are reachable anonymously.
-- -----------------------------------------------------------------------------

-- Supabase's default privileges hand EXECUTE on new functions to anon and
-- authenticated, so the admin-only routines are revoked from anon explicitly
-- (the checks inside each function body are the real gate; this is the belt).
revoke all on function public.ensure_affiliate_link(uuid)                from public, anon;
revoke all on function public.resolve_link(text)                         from public;
revoke all on function public.register_click(text)                       from public;
revoke all on function public.submit_lead(text, text, text, text, text)  from public;
revoke all on function public.convert_lead(uuid, numeric, numeric, text) from public, anon;
revoke all on function public.delete_conversion(uuid)                    from public, anon;
revoke all on function public.pay_conversions(uuid, uuid[], text, text)  from public, anon;
revoke all on function public.is_admin()                                 from public, anon;
revoke all on function public.generate_referral_code(text)               from public, anon, authenticated;
revoke all on function public.generate_link_code()                       from public, anon, authenticated;
revoke all on function public.handle_new_user()                          from public, anon, authenticated;
revoke all on function public.guard_profile_update()                     from public, anon, authenticated;
grant execute on function public.is_admin() to authenticated;

grant execute on function public.resolve_link(text)                        to anon, authenticated;
grant execute on function public.register_click(text)                      to anon, authenticated;
grant execute on function public.submit_lead(text, text, text, text, text) to anon, authenticated;
grant execute on function public.ensure_affiliate_link(uuid)               to authenticated;
grant execute on function public.convert_lead(uuid, numeric, numeric, text) to authenticated;
grant execute on function public.delete_conversion(uuid)                   to authenticated;
grant execute on function public.pay_conversions(uuid, uuid[], text, text) to authenticated;
