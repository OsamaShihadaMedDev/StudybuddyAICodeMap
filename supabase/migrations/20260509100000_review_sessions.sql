-- One row per card review event, for computing streak, retention, and activity
CREATE TABLE public.review_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  rating text NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')),
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast per-user time-range queries
CREATE INDEX idx_review_sessions_user_date
  ON public.review_sessions(user_id, reviewed_at DESC);

ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own review sessions"
  ON public.review_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own review sessions"
  ON public.review_sessions FOR SELECT
  USING (auth.uid() = user_id);
