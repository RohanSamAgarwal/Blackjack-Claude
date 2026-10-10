// Client-side display helpers for cards (server sends suit letters S/H/D/C).
export const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_COLOR = { S: '#1a1a2e', C: '#1a1a2e', H: '#c0392b', D: '#c0392b' };

export const isFace = (rank) => rank === 'A' || rank === 'J' || rank === 'Q' || rank === 'K';

// Hi-Lo tag for the optional per-card counter display.
export function hiLoTag(rank) {
  if (rank === 'A' || rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return -1;
  const n = Number(rank);
  if (n >= 2 && n <= 6) return 1;
  return 0;
}
