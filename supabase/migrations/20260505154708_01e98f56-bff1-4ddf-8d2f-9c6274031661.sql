
-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_pro boolean NOT NULL DEFAULT false,
  pro_expires_at timestamptz,
  pro_source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- decks
CREATE TABLE public.decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  topic_emoji text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic)
);

-- cards
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  tag text,
  topic text NOT NULL,
  topic_emoji text,
  interval_days integer NOT NULL DEFAULT 0,
  due_at timestamptz NOT NULL DEFAULT now(),
  last_reviewed_at timestamptz,
  review_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

-- usage_records
CREATE TABLE public.usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('sheet','cards')),
  usage_date date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, kind, usage_date)
);

-- pro_codes
CREATE TABLE public.pro_codes (
  code text PRIMARY KEY,
  duration_days integer NOT NULL DEFAULT 30,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed 40 pro codes
INSERT INTO public.pro_codes (code) VALUES
('X7A9K2QZ'),('M4P8L1DX'),('Q9Z2W6TR'),('B7N3X8FV'),('K2R5T9LP'),
('Z8X4M1QA'),('J3L9V7KC'),('T6P2W8RY'),('H9D4X2MN'),('R5Q8Z3LB'),
('V2K7T1XF'),('N8M4P9ZA'),('C3X7L2QR'),('P9T5B1KM'),('D4W8Z6NX'),
('Y7R3M2QP'),('L2X9V5ZT'),('F8Q1K4RB'),('A6T3N9XM'),('U5Z8P2LC'),
('X1M7K9RD'),('Q4L2Z8VT'),('B9P5X3KF'),('R2T8M6ZA'),('J7W4N1QP'),
('H3Z9L5XM'),('T1K8Q2VR'),('D7M4P9XB'),('V8R2L1ZT'),('N5X9K3QA'),
('C6T2M8RP'),('P1Z7X4KL'),('Y9Q5R2MN'),('F3K8T1ZX'),('A7M4L9QP'),
('U2X6R8ZT'),('X9P1K3MF'),('Q7Z4L2RN'),('B5T8M1XA'),('R3K9P6QZ');

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pro_codes ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- decks policies
CREATE POLICY "Users can view own decks" ON public.decks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own decks" ON public.decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own decks" ON public.decks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own decks" ON public.decks
  FOR DELETE USING (auth.uid() = user_id);

-- cards policies
CREATE POLICY "Users can view own cards" ON public.cards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cards" ON public.cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cards" ON public.cards
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cards" ON public.cards
  FOR DELETE USING (auth.uid() = user_id);

-- usage_records policies
CREATE POLICY "Users can view own usage" ON public.usage_records
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON public.usage_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own usage" ON public.usage_records
  FOR UPDATE USING (auth.uid() = user_id);

-- pro_codes policies
CREATE POLICY "Authenticated users can read codes" ON public.pro_codes
  FOR SELECT TO authenticated USING (true);

-- redeem_pro_code function
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
