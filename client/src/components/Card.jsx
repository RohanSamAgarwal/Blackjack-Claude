import { SUIT_GLYPH, SUIT_COLOR, isFace, hiLoTag } from '../cards.js';

// A playing card. Pass { hidden:true } (or a {hidden:true} card) for the back.
// `scale` shrinks the whole card for crowded seats. `showTag` overlays the
// Hi-Lo value when the host enabled per-card counters.
export default function Card({ card, scale = 1, animate = false, delay = 0, showTag = false }) {
  const w = Math.round(78 * scale);
  const h = Math.round(110 * scale);
  const anim = animate ? { animation: `cardIn .45s cubic-bezier(.34,1.56,.64,1) ${delay}s both` } : {};
  const hidden = !card || card.hidden;

  if (hidden) {
    return (
      <div className="pc" style={{ width: w, height: h, ...anim, border: `${Math.max(2, 2.5 * scale)}px solid #5a5a4a`,
        background: 'linear-gradient(135deg,#8b1414,#a51a1a,#7d1010)' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg,transparent,transparent 5px,rgba(255,255,255,.05) 5px,rgba(255,255,255,.05) 6px)' }} />
        <div style={{ position: 'absolute', inset: Math.round(5 * scale), border: '1.5px solid rgba(240,210,120,.35)', borderRadius: 5 }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: Math.round(26 * scale), color: '#f0d279', opacity: 0.85 }}>R</div>
      </div>
    );
  }

  const color = SUIT_COLOR[card.suit];
  const glyph = SUIT_GLYPH[card.suit];
  const rf = Math.round(18 * scale);
  const sf = Math.round(15 * scale);
  const tag = showTag ? hiLoTag(card.rank) : null;

  return (
    <div className="pc" style={{ width: w, height: h, ...anim, border: `${Math.max(2, 2.5 * scale)}px solid #b0b0a0`,
      background: 'linear-gradient(155deg,#fff,#f8f7f0 40%,#edebd8)' }}>
      <div style={{ position: 'absolute', top: Math.round(5 * scale), left: Math.round(6 * scale), display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
        <span style={{ fontSize: rf, fontWeight: 'bold', fontFamily: "'Georgia',serif", color }}>{card.rank}</span>
        <span style={{ fontSize: sf, color }}>{glyph}</span>
      </div>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: Math.round(50 * scale), color, opacity: 0.12 }}>{glyph}</div>
      {isFace(card.rank) && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: Math.round(34 * scale), fontWeight: 900, fontFamily: "'Playfair Display','Georgia',serif", color, opacity: 0.7 }}>{card.rank}</div>
      )}
      <div style={{ position: 'absolute', bottom: Math.round(5 * scale), right: Math.round(6 * scale), display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1, transform: 'rotate(180deg)' }}>
        <span style={{ fontSize: rf, fontWeight: 'bold', fontFamily: "'Georgia',serif", color }}>{card.rank}</span>
        <span style={{ fontSize: sf, color }}>{glyph}</span>
      </div>
      {tag != null && (
        <div style={{ position: 'absolute', top: 2, right: 2, fontSize: Math.round(11 * scale), fontWeight: 700,
          padding: '0 4px', borderRadius: 4, background: tag > 0 ? 'rgba(39,174,96,.9)' : tag < 0 ? 'rgba(192,57,43,.9)' : 'rgba(120,120,120,.85)', color: '#fff' }}>
          {tag > 0 ? `+${tag}` : tag}
        </div>
      )}
    </div>
  );
}
