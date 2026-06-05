ALTER TABLE public.flagged_questions
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.qbank_sessions(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS flagged_questions_user_question_key;
ALTER TABLE public.flagged_questions
  DROP CONSTRAINT IF EXISTS flagged_questions_user_id_question_id_key;

ALTER TABLE public.flagged_questions
  ADD CONSTRAINT flagged_questions_user_session_question_key
  UNIQUE (user_id, session_id, question_id);

CREATE INDEX IF NOT EXISTS idx_flagged_questions_session
  ON public.flagged_questions(session_id);
