import { useEffect, useState } from "react";
import { audio } from "../game/audio";

export function MuteButton() {
  const [muted, setMuted] = useState(audio.isMuted);

  useEffect(() => audio.subscribe(() => setMuted(audio.isMuted)), []);

  return (
    <button
      type="button"
      className={`mute ${muted ? "is-off" : ""}`}
      aria-pressed={muted}
      onClick={() => audio.toggleMute()}
    >
      {muted ? "Silencio" : "Sonido"}
    </button>
  );
}
