---
name: AI output format
description: No markdown symbols, plain uppercase section titles, flashcard Q/A format, exam traps section, memory hooks section, quiz mode
type: feature
---
Output sections in order: SUMMARY, MEMORY HOOKS, CLINICAL APPROACH, KEY POINTS, EXAM TRAPS, FLASHCARDS, REFERENCE NOTE.
- SUMMARY: Adaptive length, micro-structured (Definition/Mechanism/Key Associations), **bold** key terms
- MEMORY HOOKS: 2-4 ultra-concise First Aid-style one-liner associations, arrow format
- CLINICAL APPROACH: 4-6 steps grouped by Diagnosis/Workup/Management/Complications, uses arrows (→)
- KEY POINTS: 6-8 max, exam trigger format ("If X → think Y"), no repetition
- EXAM TRAPS: 3-6 bullets, common confusions/pitfalls/diagnostic traps
- FLASHCARDS: 4-5 only, tagged [Diagnosis]/[Mechanism]/[Next Step]/[Complication]/[Association]
- REFERENCE NOTE: 1-2 lines, adapts to exam mode
- Mode header displayed at top of output showing examMode | difficulty | focus | length
- Quiz Mode: generates only FLASHCARDS section with 5-7 USMLE-style questions
- Save + Study History: localStorage-based, save/reload past outputs
