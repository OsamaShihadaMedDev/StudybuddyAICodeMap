---
name: AI output format
description: No markdown symbols, plain uppercase section titles, flashcard Q/A format
type: feature
---
Output sections in order: SUMMARY, CLINICAL APPROACH, KEY POINTS, VISUAL EXPLANATIONS (conditional), FLASHCARDS, REFERENCE NOTE.
- SUMMARY: 120-160 words, **bold** key terms allowed
- CLINICAL APPROACH: 4-6 actionable bullets (diagnostic approach, next step, first-line tx)
- KEY POINTS: 6-8 max, no repetition from summary
- FLASHCARDS: 4-5 only, must include next-best-step + mechanism + diagnosis Qs
- REFERENCE NOTE: 1-2 lines, adapts to exam mode
- Mode header displayed at top of output showing examMode | difficulty | focus | length
