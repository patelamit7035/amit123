-- =============================================================================
-- End-to-end tests for the FunnelOS affiliate schema: the new-user trigger,
-- every RLS policy, and every RPC - run against a real Postgres.
-- =============================================================================

\set ON_ERROR_STOP on
\set ADMIN   '''11111111-1111-4111-8111-111111111111'''
\set RAHUL   '''22222222-2222-4222-8222-222222222222'''
\set PRIYA   '''33333333-3333-4333-8333-333333333333'''

\echo '== 1. new-user trigger: profiles, roles and bank details =='

insert into auth.users (id, email, raw_user_meta_data) values
  (:ADMIN::uuid, 'admin@funnelos.app', '{"full_name":"Amit Patel","phone":"+91 90000 00000","account_holder_name":"Amit Patel","bank_name":"HDFC Bank","account_number":"50100234567890","ifsc_code":"hdfc0001234","upi_id":"amit@okhdfcbank"}'::jsonb);
insert into auth.users (id, email, raw_user_meta_data) values
  (:RAHUL::uuid, 'rahul@example.com', '{"full_name":"Rahul Sharma","phone":"+91 98765 43210","account_holder_name":"Rahul Sharma","bank_name":"ICICI Bank","account_number":"002401512345","ifsc_code":"icic0000024","upi_id":"rahul@okicici"}'::jsonb);
insert into auth.users (id, email, raw_user_meta_data) values
  (:PRIYA::uuid, 'priya@example.com', '{"full_name":"Priya Nair","phone":"+91 91234 56780"}'::jsonb);

select test.assert_eq((select role from public.profiles where id = :ADMIN::uuid), 'admin', 'first sign-up becomes the admin');
select test.assert_eq((select role from public.profiles where id = :RAHUL::uuid), 'affiliate', 'second sign-up is an affiliate');
select test.assert_eq((select role from public.profiles where id = :PRIYA::uuid), 'affiliate', 'third sign-up is an affiliate');
select test.assert_eq((select full_name from public.profiles where id = :RAHUL::uuid), 'Rahul Sharma', 'name carried from sign-up metadata');
select test.assert((select referral_code from public.profiles where id = :RAHUL::uuid) ~ '^RAHULS-[A-Z2-9]{4}$', 'referral code generated from the name');
select test.assert_eq((select count(distinct referral_code)::int from public.profiles), 3, 'referral codes are unique');
select test.assert_eq((select ifsc_code from public.bank_details where user_id = :RAHUL::uuid), 'ICIC0000024', 'bank details stored and IFSC upper-cased');
select test.assert_eq((select count(*)::int from public.bank_details), 3, 'every user gets a bank details row');

\echo '== 2. products: only an admin can write them =='

set role authenticated;
select test.login(:ADMIN::uuid);
select test.assert(public.is_admin(), 'is_admin() is true for the admin');

insert into public.products (id, name, description, price, currency, commission_percent)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'FunnelOS Pro (Annual)', 'The complete funnel OS', 24999, 'INR', 20);
insert into public.products (id, name, description, price, currency, commission_percent, active)
values ('aaaaaaaa-0000-4000-8000-000000000002', 'Retired Offer', 'No longer sold', 999, 'INR', 10, false);

reset role;
set role authenticated;
select test.login(:RAHUL::uuid);
select test.assert(not public.is_admin(), 'is_admin() is false for an affiliate');
select test.assert_eq((select count(*)::int from public.products), 1, 'an affiliate sees only active products');
select test.expect_error(
  $$insert into public.products (name, price, commission_percent) values ('Sneaky', 1, 99)$$,
  'row-level security',
  'an affiliate cannot create products');
select test.expect_no_rows(
  $$update public.products set commission_percent = 90 where name = 'FunnelOS Pro (Annual)'$$,
  'an affiliate cannot raise their own commission rate');

reset role;
select test.assert_eq((select commission_percent from public.products where name = 'FunnelOS Pro (Annual)'), 20::numeric,
                      'the commission rate is untouched after the blocked update');
set role authenticated;
select test.login(:RAHUL::uuid);

\echo '== 3. profiles and bank details are private to their owner =='

select test.assert_eq((select count(*)::int from public.profiles), 1, 'an affiliate sees only their own profile');
select test.assert_eq((select count(*)::int from public.bank_details), 1, 'an affiliate sees only their own bank details');
select test.assert_eq((select count(*)::int from public.bank_details where user_id = :PRIYA::uuid), 0,
                      'an affiliate cannot read another affiliate''s bank details');

update public.profiles set full_name = 'Rahul S.', role = 'admin', status = 'active' where id = :RAHUL::uuid;
select test.assert_eq((select full_name from public.profiles where id = :RAHUL::uuid), 'Rahul S.', 'an affiliate can edit their own name');

reset role;
select test.assert_eq((select role from public.profiles where id = :RAHUL::uuid), 'affiliate',
                      'an affiliate cannot promote themselves to admin');

\echo '== 4. affiliate links =='

set role authenticated;
select test.login(:RAHUL::uuid);
select test.assert(
  (select code from public.ensure_affiliate_link('aaaaaaaa-0000-4000-8000-000000000001')) ~ '^[A-Z2-9]{8}$',
  'ensure_affiliate_link issues a readable code');
select test.assert_eq(
  (select id from public.ensure_affiliate_link('aaaaaaaa-0000-4000-8000-000000000001')),
  (select id from public.affiliate_links where affiliate_id = :RAHUL::uuid),
  'calling it again returns the same link');
select test.assert_eq((select count(*)::int from public.affiliate_links), 1, 'exactly one link exists');
select test.expect_error(
  $$select public.ensure_affiliate_link('aaaaaaaa-0000-4000-8000-000000000002')$$,
  'not available',
  'no link can be created for an inactive product');

reset role;
set role authenticated;
select test.login(:PRIYA::uuid);
select test.assert(public.ensure_affiliate_link('aaaaaaaa-0000-4000-8000-000000000001') is not null,
                   'the second affiliate gets their own link');
select test.assert_eq((select count(*)::int from public.affiliate_links), 1, 'each affiliate sees only their own link');

reset role;
select test.assert_eq((select count(distinct code)::int from public.affiliate_links), 2, 'two affiliates get two distinct codes');

\echo '== 5. the public (anonymous) surface =='

-- An anonymous visitor only ever knows the code from the URL they clicked, so
-- the codes are read here as the admin and passed in as literals below.
reset role;
select code as rahul_code from public.affiliate_links where affiliate_id = :RAHUL::uuid \gset

set role anon;
select test.logout();

select test.assert(public.resolve_link(:'rahul_code') is not null, 'anon can resolve a live referral link');
select test.assert_eq(public.resolve_link(:'rahul_code') -> 'product' ->> 'name', 'FunnelOS Pro (Annual)',
                      'the resolved link carries the product');
select test.assert_eq((public.resolve_link(:'rahul_code') -> 'product' ->> 'commissionPercent')::numeric, 0::numeric,
                      'the public payload never leaks the commission rate');
select test.assert_eq(public.resolve_link(:'rahul_code') -> 'affiliate' ->> 'fullName', 'Rahul S.',
                      'the resolved link names the affiliate');
select test.assert(public.resolve_link(:'rahul_code') -> 'affiliate' ->> 'id' is not null, 'the affiliate id is present');
select test.assert(public.resolve_link('NOSUCH12') is null, 'an unknown code resolves to nothing');
select test.assert_eq((select count(*)::int from public.affiliate_links), 0, 'anon cannot list affiliate links');

select public.register_click(:'rahul_code');
select public.register_click(lower(:'rahul_code'));

select public.submit_lead(:'rahul_code', '  Arjun Mehta ', ' Arjun@Example.com ', ' +91 99880 11223 ',
                          'https://mypage.example.com/offer');

select test.expect_error(
  $$select public.submit_lead('NOSUCH12', 'A', 'a@example.com', '99999')$$,
  'no longer active', 'a dead link is rejected');
select test.expect_error(
  format($$select public.submit_lead(%L, 'A', 'not-an-email', '99999')$$, :'rahul_code'),
  'valid email', 'a malformed email is rejected');
select test.expect_error(
  format($$select public.submit_lead(%L, '', 'a@example.com', '99999')$$, :'rahul_code'),
  'required', 'an empty name is rejected');
select test.expect_error(
  format($$select public.submit_lead(%L, 'A', 'a@example.com', '   ')$$, :'rahul_code'),
  'required', 'an empty phone number is rejected');

-- Re-submitting the same form updates the row instead of inflating the count.
select public.submit_lead(:'rahul_code', 'Arjun Mehta', 'ARJUN@example.com', '+91 99880 19999');

select test.assert_eq((select count(*)::int from public.leads), 0, 'anon cannot read leads back out');
select test.expect_error(
  $$insert into public.leads (affiliate_id, product_id, name, email, phone)
    values ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-0000-4000-8000-000000000001', 'X', 'x@e.com', '1')$$,
  'row-level security', 'anon cannot insert leads directly');
select test.expect_error(
  $$select public.convert_lead('00000000-0000-4000-8000-000000000000', 24999)$$,
  'permission denied', 'anon cannot record a sale');
select test.expect_error(
  $$select public.pay_conversions('22222222-2222-4222-8222-222222222222', array[gen_random_uuid()], 'ref')$$,
  'permission denied', 'anon cannot record a payout');
select test.expect_error(
  $$select public.ensure_affiliate_link('aaaaaaaa-0000-4000-8000-000000000001')$$,
  'permission denied', 'anon cannot mint an affiliate link');
select test.expect_error(
  $$select public.is_admin()$$,
  'permission denied', 'anon cannot call is_admin()');

reset role;
select test.assert_eq((select count(*)::int from public.leads), 1, 'the duplicate submission did not create a second lead');
select test.assert_eq((select phone from public.leads), '+91 99880 19999', 'the duplicate submission refreshed the phone number');
select test.assert_eq((select name from public.leads), 'Arjun Mehta', 'the lead name was trimmed');
select test.assert_eq((select email from public.leads), 'arjun@example.com', 'the lead email was lower-cased');
select test.assert_eq((select source from public.leads), 'https://mypage.example.com/offer', 'the landing page is recorded as the source');
select test.assert_eq((select affiliate_id from public.leads), :RAHUL::uuid, 'the lead is attributed to the link owner');
select test.assert_eq((select clicks from public.affiliate_links where affiliate_id = :RAHUL::uuid), 2, 'clicks are counted, case-insensitively');

\echo '== 6. leads are visible to their own affiliate and the admin only =='

set role authenticated;
select test.login(:PRIYA::uuid);
select test.assert_eq((select count(*)::int from public.leads), 0, 'another affiliate sees none of these leads');
select test.expect_no_rows(
  $$update public.leads set status = 'contacted'$$,
  'an affiliate cannot edit leads');

reset role;
set role authenticated;
select test.login(:RAHUL::uuid);
select test.assert_eq((select count(*)::int from public.leads), 1, 'the owning affiliate sees their lead');
select test.expect_error(
  $$select public.convert_lead((select id from public.leads limit 1), 24999)$$,
  'only an admin', 'an affiliate cannot mark their own lead as a purchase');

\echo '== 7. recording a sale computes the commission and the credit date =='

reset role;
set role authenticated;
select test.login(:ADMIN::uuid);

select public.convert_lead((select id from public.leads limit 1), 24999, null, 'Paid by UPI');

select test.assert_eq((select commission_percent from public.conversions), 20::numeric,
                      'the product rate is snapshotted onto the sale');
select test.assert_eq((select commission_amount from public.conversions), 4999.80::numeric,
                      'commission = 20% of 24999');
select test.assert_eq((select round(extract(epoch from (payout_due_at - converted_at)) / 86400)::int from public.conversions), 7,
                      'the commission is credited 7 days after the sale');
select test.assert_eq((select status from public.leads), 'converted', 'the lead is flipped to converted');
select test.assert((select converted_at from public.leads) is not null, 'the lead records when it converted');

select test.expect_error(
  $$select public.convert_lead((select id from public.leads limit 1), 5000)$$,
  'already marked', 'the same lead cannot be converted twice');
select test.expect_error(
  $$select public.convert_lead((select id from public.leads limit 1), 0)$$,
  'greater than 0', 'a zero-value sale is rejected');

-- A client-supplied commission_amount must never be trusted.
insert into public.leads (id, affiliate_id, product_id, link_id, name, email, phone)
values ('bbbbbbbb-0000-4000-8000-000000000001', :RAHUL::uuid, 'aaaaaaaa-0000-4000-8000-000000000001',
        (select id from public.affiliate_links where affiliate_id = :RAHUL::uuid), 'Sneha', 'sneha@example.com', '99880');
insert into public.conversions (lead_id, affiliate_id, product_id, sale_amount, commission_percent, commission_amount)
values ('bbbbbbbb-0000-4000-8000-000000000001', :RAHUL::uuid, 'aaaaaaaa-0000-4000-8000-000000000001', 1000, 10, 999999);
select test.assert_eq((select commission_amount from public.conversions where lead_id = 'bbbbbbbb-0000-4000-8000-000000000001'),
                      100.00::numeric, 'the trigger recomputes the commission and ignores what the client sent');
select public.delete_conversion((select id from public.conversions where lead_id = 'bbbbbbbb-0000-4000-8000-000000000001'));
delete from public.leads where id = 'bbbbbbbb-0000-4000-8000-000000000001';

\echo '== 8. the payout hold, and paying out =='

select test.expect_error(
  format($$select public.pay_conversions(%L, array[%L]::uuid[], 'UPI/1')$$,
         :RAHUL::uuid, (select id from public.conversions)),
  'hold period', 'a commission inside the hold window cannot be paid');
select test.expect_error(
  format($$select public.pay_conversions(%L, array[%L]::uuid[], '  ')$$,
         :RAHUL::uuid, (select id from public.conversions)),
  'reference', 'a payout needs a transfer reference');

-- Fast-forward past the hold window.
update public.conversions set payout_due_at = now() - interval '1 hour';

select test.expect_error(
  format($$select public.pay_conversions(%L, array[%L]::uuid[], 'UPI/1')$$,
         :PRIYA::uuid, (select id from public.conversions)),
  'another affiliate', 'a commission cannot be paid out to the wrong affiliate');

select public.pay_conversions(:RAHUL::uuid, array[(select id from public.conversions)], 'UPI/4471829301', 'Weekly payout');

select test.assert_eq((select amount from public.payouts), 4999.80::numeric, 'the payout totals the selected commissions');
select test.assert((select paid_at from public.conversions) is not null, 'the commission is marked paid');
select test.assert_eq((select payout_id from public.conversions), (select id from public.payouts), 'the commission links to its payout');

select test.expect_error(
  format($$select public.pay_conversions(%L, array[%L]::uuid[], 'UPI/2')$$,
         :RAHUL::uuid, (select id from public.conversions)),
  'already paid', 'the same commission cannot be paid twice');
select test.expect_error(
  format($$select public.delete_conversion(%L)$$, (select id from public.conversions)),
  'already been paid', 'a paid commission cannot be deleted');

\echo '== 9. an affiliate sees their own money, and nobody else''s =='

reset role;
set role authenticated;
select test.login(:RAHUL::uuid);
select test.assert_eq((select count(*)::int from public.conversions), 1, 'the affiliate sees their commission');
select test.assert_eq((select count(*)::int from public.payouts), 1, 'the affiliate sees their payout');
select test.expect_no_rows(
  $$update public.conversions set commission_amount = 99999$$,
  'an affiliate cannot edit their commission');
select test.expect_error(
  $$insert into public.payouts (affiliate_id, amount, reference) values ('22222222-2222-4222-8222-222222222222', 100000, 'self')$$,
  'row-level security', 'an affiliate cannot invent a payout');

reset role;
set role authenticated;
select test.login(:PRIYA::uuid);
select test.assert_eq((select count(*)::int from public.conversions), 0, 'another affiliate sees no commissions');
select test.assert_eq((select count(*)::int from public.payouts), 0, 'another affiliate sees no payouts');

\echo '== 10. settings and the email log =='

select test.assert_eq((select payout_hold_days from public.app_settings), 7, 'an affiliate can read the program settings');
select test.expect_no_rows(
  $$update public.app_settings set payout_hold_days = 0$$,
  'an affiliate cannot change the hold period');
select test.assert_eq((select count(*)::int from public.email_log), 0, 'an affiliate cannot read the email log');

reset role;
set role authenticated;
select test.login(:ADMIN::uuid);
update public.app_settings set payout_hold_days = 14 where id = 1;
select test.assert_eq((select payout_hold_days from public.app_settings), 14, 'the admin can change the hold period');

-- The new hold period applies to the next sale.
insert into public.leads (id, affiliate_id, product_id, link_id, name, email, phone)
values ('cccccccc-0000-4000-8000-000000000001', :RAHUL::uuid, 'aaaaaaaa-0000-4000-8000-000000000001',
        (select id from public.affiliate_links where affiliate_id = :RAHUL::uuid), 'Vikram', 'vikram@example.com', '99881');
select public.convert_lead('cccccccc-0000-4000-8000-000000000001', 4999, 30);
select test.assert_eq(
  (select round(extract(epoch from (payout_due_at - converted_at)) / 86400)::int
     from public.conversions where lead_id = 'cccccccc-0000-4000-8000-000000000001'),
  14, 'a 14-day hold is applied to the new sale');
select test.assert_eq(
  (select commission_amount from public.conversions where lead_id = 'cccccccc-0000-4000-8000-000000000001'),
  1499.70::numeric, 'an overridden rate of 30% is applied');

select test.assert_eq((select count(*)::int from public.profiles), 3, 'the admin sees every affiliate');
select test.assert_eq((select count(*)::int from public.bank_details), 3, 'the admin sees every bank account to transfer to');
select test.assert_eq((select count(*)::int from public.leads), 2, 'the admin sees every lead');

reset role;
\echo ''
\echo 'ALL SQL TESTS PASSED'
