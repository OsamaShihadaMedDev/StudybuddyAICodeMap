-- Add Stripe columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS billing_interval text CHECK (billing_interval IN ('month', 'year'));

-- Block anonymous users from redeeming pro codes
CREATE OR REPLACE FUNCTION public.redeem_pro_code(code_input text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_row pro_codes%ROWTYPE;
  expires_at timestamptz;
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF (auth.jwt() ->> 'is_anonymous')::boolean IS TRUE THEN
    RETURN json_build_object('success', false, 'error', 'account_required');
  END IF;

  SELECT * INTO code_row FROM pro_codes
    WHERE code = upper(trim(code_input))
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF code_row.redeemed_by IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'already_redeemed');
  END IF;

  expires_at := now() + (code_row.duration_days || ' days')::interval;

  UPDATE pro_codes
    SET redeemed_by = current_user_id, redeemed_at = now()
    WHERE code = code_row.code;

  UPDATE profiles
    SET is_pro = true, pro_expires_at = expires_at, pro_source = 'code'
    WHERE id = current_user_id;

  RETURN json_build_object('success', true, 'expires_at', expires_at);
END;
$$;