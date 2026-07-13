-- Curriculum spine: curated, read-only topic tree that seeds the Sheet Generator.
-- v1 ships Cardiovascular only. Additive per project schema rules.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.curriculum_topics (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id         uuid REFERENCES public.curriculum_topics(id) ON DELETE CASCADE,
  system            text NOT NULL,
  title             text NOT NULL,
  level             int  NOT NULL DEFAULT 1,
  yield_tier        text NOT NULL DEFAULT 'high',
  sort_order        int  NOT NULL DEFAULT 0,
  generator_prompt  text,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX curriculum_topics_system_sort_idx
  ON public.curriculum_topics (system, sort_order)
  WHERE is_active;

CREATE INDEX curriculum_topics_parent_idx
  ON public.curriculum_topics (parent_id);

-- Coverage tracking lands in v2; the column is nullable and not stamped in v1.
-- SET NULL so archiving a topic never destroys a user's study history row.
ALTER TABLE public.study_history
  ADD COLUMN IF NOT EXISTS curriculum_topic_id uuid
    REFERENCES public.curriculum_topics(id) ON DELETE SET NULL;

ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;

-- Curated content: readable by everyone (anon + authenticated).
-- No client write path; seeding happens via migration only.
CREATE POLICY "curriculum_topics_public_read"
  ON public.curriculum_topics
  FOR SELECT
  TO anon, authenticated
  USING (is_active);

-- Seed: Cardiovascular system + its 18 level-1 topics.
-- Order is study order (foundation -> risk -> ischemic -> HF -> valvular ->
-- arrhythmia -> emergency), not alphabetical.
WITH sys AS (
  INSERT INTO public.curriculum_topics (system, title, level, yield_tier, sort_order, is_active)
  VALUES ('Cardiovascular', 'Cardiovascular', 0, 'high', 0, true)
  RETURNING id
)
INSERT INTO public.curriculum_topics (parent_id, system, title, level, yield_tier, sort_order, is_active)
SELECT sys.id, 'Cardiovascular', t.title, 1, 'high', t.sort_order, true
FROM sys, (VALUES
  ('Congenital Heart Disease (Cyanotic & Acyanotic)',         10),
  ('Cardiac Physiology & Hemodynamics',                       20),
  ('Essential Hypertension & Antihypertensives',              30),
  ('Hyperlipidemia & Statin Therapy',                         40),
  ('Stable Ischemic Heart Disease',                           50),
  ('Acute Coronary Syndrome (STEMI/NSTEMI/UA)',               60),
  ('MI Complications & Post-MI Care',                         70),
  ('Heart Failure — HFrEF (GDMT)',                            80),
  ('Heart Failure — HFpEF & Acute Decompensation',            90),
  ('Cardiomyopathies (Dilated, Hypertrophic, Restrictive)',  100),
  ('Aortic Valve Disease (AS & AR)',                         110),
  ('Mitral Valve Disease (MS, MR, MVP)',                     120),
  ('Infective Endocarditis',                                 130),
  ('Pericardial Disease (Pericarditis & Tamponade)',         140),
  ('Atrial Fibrillation & Flutter',                          150),
  ('Bradyarrhythmias, Heart Block & Ventricular Arrhythmias', 160),
  ('Shock Syndromes',                                        170),
  ('Aortic Aneurysm & Dissection',                           180)
) AS t(title, sort_order);
