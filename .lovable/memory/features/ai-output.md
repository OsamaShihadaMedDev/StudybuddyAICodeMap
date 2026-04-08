---
name: AI output format
description: No markdown symbols, plain uppercase section titles, flashcard Q/A format, exam traps section
type: feature
---
Output sections in order: SUMMARY, CLINICAL APPROACH, KEY POINTS, EXAM TRAPS, VISUAL AIDS (conditional), FLASHCARDS, REFERENCE NOTE.
- SUMMARY: 120-160 words, micro-structured (Definition/Mechanism/Key Associations), **bold** key terms
- CLINICAL APPROACH: 4-6 steps grouped by Diagnosis/Workup/Management/Complications, uses arrows (→)
- KEY POINTS: 6-8 max, exam trigger format ("If X → think Y"), no repetition
- EXAM TRAPS: 3-6 bullets, common confusions/pitfalls/diagnostic traps
- VISUAL AIDS: 1-3 items only when topic benefits from visuals (radiology, histology, ECG, anatomy). Each has title, why-it-matters, search phrase. Wikimedia fetched in UI.
- FLASHCARDS: 4-5 only, tagged [Diagnosis]/[Mechanism]/[Next Step]/[Complication]/[Association]
- REFERENCE NOTE: 1-2 lines, adapts to exam mode, mentions visual references if visual aids present
- Mode header displayed at top of output showing examMode | difficulty | focus | length
