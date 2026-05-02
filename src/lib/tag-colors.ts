export const TAG_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Diagnosis':    { bg: 'bg-amber-500/10',    text: 'text-amber-500',    border: 'border-amber-500/30' },
  'Mechanism':    { bg: 'bg-purple-500/10',   text: 'text-purple-400',   border: 'border-purple-500/30' },
  'Next Step':    { bg: 'bg-teal-500/10',     text: 'text-teal-400',     border: 'border-teal-500/30' },
  'Complication': { bg: 'bg-rose-500/10',     text: 'text-rose-400',     border: 'border-rose-500/30' },
  'Association':  { bg: 'bg-sky-500/10',      text: 'text-sky-400',      border: 'border-sky-500/30' },
};

export const getTagColors = (tag: string) =>
  TAG_COLORS[tag] || { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' };