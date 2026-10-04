// Non-reactive dictionary lookup, for code that already knows its language (content/status.ts,
// server load functions, OG/meta generation). Components should use `t()` instead.
import en from './en';
import fr from './fr';
import type { Dict, Lang } from './types';

export const DICTS: Readonly<Record<Lang, Dict>> = { en, fr };
