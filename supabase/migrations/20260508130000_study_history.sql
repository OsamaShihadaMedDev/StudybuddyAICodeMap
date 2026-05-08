-- Study history table: one row per saved study sheet generation
CREATE TABLE public.study_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic text NOT NULL,
  input text NOT NULL,
  output text NOT NULL,
  exam_mode text,
  difficulty text,
  focus text,
  length text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_study_history_user_created
  ON public.study_history(user_id, created_at DESC);

-- RLS: users can only access their own history
ALTER TABLE public.study_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own study history"
  ON public.study_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own study history"
  ON public.study_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own study history"
  ON public.study_history FOR DELETE
  USING (auth.uid() = user_id);
