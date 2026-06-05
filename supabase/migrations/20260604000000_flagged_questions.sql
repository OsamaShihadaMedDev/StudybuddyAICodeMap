CREATE TABLE public.flagged_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  flagged_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);

ALTER TABLE public.flagged_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own flags"
  ON public.flagged_questions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own flags"
  ON public.flagged_questions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own flags"
  ON public.flagged_questions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_flagged_questions_user
  ON public.flagged_questions(user_id);
