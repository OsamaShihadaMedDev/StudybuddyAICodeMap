-- Add premium hook counter (lifetime, never resets — prevents sign-in abuse)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS premium_used integer NOT NULL DEFAULT 0;

-- Add Pro user model preference (flash = Gemini 2.5 Flash, gpt-oss = GPT-OSS 20B)
-- Defaults to 'flash' — Pro users always get Gemini Flash unless they switch
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_model text NOT NULL DEFAULT 'flash'
    CHECK (preferred_model IN ('flash', 'gpt-oss'));
