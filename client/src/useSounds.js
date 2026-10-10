import { useEffect, useRef } from 'react';
import { sfx } from './sound.js';

// Watches server state and plays table sounds on the transitions that matter:
// cards appearing, a shuffle, and this viewer's round result.
export function useSounds(state) {
  const prev = useRef({ cards: 0, phase: null, shuffled: false });

  useEffect(() => {
    if (!state) return;
    const countCards = () => {
      let n = state.dealer?.cards?.length || 0;
      for (const s of state.seats || []) if (s.occupied) for (const h of s.hands || []) n += h.cards.length;
      return n;
    };
    const cards = countCards();
    if (cards > prev.current.cards) sfx.card();
    if (state.justShuffled && !prev.current.shuffled) sfx.shuffle();

    if (state.phase === 'roundEnd' && prev.current.phase !== 'roundEnd') {
      const mySeat = state.you?.seatIndex;
      const mine = (state.lastRound?.results || []).find((r) => r.seatIndex === mySeat);
      if (mine) {
        if (mine.net > 0) sfx.win();
        else if (mine.net < 0) sfx.lose();
        else sfx.push();
      }
    }
    prev.current = { cards, phase: state.phase, shuffled: state.justShuffled };
  }, [state]);
}
