-- Atomically claim the next invoice number for a user.
-- Increments next_invoice_number in a single UPDATE...RETURNING statement,
-- which serializes concurrent requests on the row lock and eliminates the
-- read-then-update race condition in the application layer.
create or replace function public.claim_invoice_number(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  update public.profiles
  set next_invoice_number = next_invoice_number + 1
  where id = p_user_id
  returning next_invoice_number - 1 into v_number;

  if not found then
    raise exception 'Profile not found for user %', p_user_id;
  end if;

  return v_number;
end;
$$;
