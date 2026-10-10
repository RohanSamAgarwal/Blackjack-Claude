import { useState } from 'react';
import { sfx } from '../sound.js';

export default function SoundToggle() {
  const [on, setOn] = useState(sfx.on);
  return (
    <button
      className="icon-btn"
      aria-label={on ? 'Mute sound' : 'Unmute sound'}
      onClick={() => { sfx.init(); const v = !on; sfx.setOn(v); setOn(v); if (v) sfx.btn(); }}
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}
