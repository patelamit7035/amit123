-- Assertion helpers for the SQL test-suite (test-only, never applied to prod).

create schema if not exists test;

create or replace function test.assert(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'ASSERTION FAILED: %', p_message;
  end if;
end;
$$;

create or replace function test.assert_eq(p_actual anyelement, p_expected anyelement, p_message text)
returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', p_message, p_expected, p_actual;
  end if;
end;
$$;

/** Runs SQL that is expected to fail, and checks the message. */
create or replace function test.expect_error(p_sql text, p_needle text, p_message text)
returns void
language plpgsql
as $$
declare
  v_failed boolean := false;
  v_error  text := '';
begin
  begin
    execute p_sql;
  exception when others then
    v_failed := true;
    v_error := sqlerrm;
  end;

  if not v_failed then
    raise exception 'ASSERTION FAILED: % - the statement succeeded but should have been rejected', p_message;
  end if;
  if position(lower(p_needle) in lower(v_error)) = 0 then
    raise exception 'ASSERTION FAILED: % - expected an error containing "%", got "%"', p_message, p_needle, v_error;
  end if;
end;
$$;

/**
 * Runs a write that RLS is expected to block. A blocked UPDATE/DELETE is not an
 * error in Postgres - the rows are simply invisible, so nothing changes.
 */
create or replace function test.expect_no_rows(p_sql text, p_message text)
returns void
language plpgsql
as $$
declare
  v_count integer;
begin
  execute p_sql;
  get diagnostics v_count = row_count;
  if v_count <> 0 then
    raise exception 'ASSERTION FAILED: % - % row(s) were changed but none should have been', p_message, v_count;
  end if;
end;
$$;

/** Signs the session in as a given user, the way a Supabase JWT would. */
create or replace function test.login(p_user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, false);
end;
$$;

create or replace function test.logout()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', false);
end;
$$;

grant usage on schema test to anon, authenticated, service_role;
grant execute on all functions in schema test to anon, authenticated, service_role;
