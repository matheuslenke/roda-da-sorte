import { useEffect, useRef, useState } from "react";
import { MusicNotes, SpeakerHigh, WarningCircle } from "@phosphor-icons/react";

export type Track = "background" | "spin" | "result";
export const TRACKS = {
  background: { path: "/audio/intro.mp3", title: "Intro do programa" },
  spin: { path: "/audio/roleta.mp3", title: "Roleta rodando" },
  result: { path: "/audio/resultado.mp3", title: "Resultado do sorteio" },
};

/** Native audio only: no remote player, iframe, tracking request or network dependency after assets load. */
export function LocalSoundtrack({
  track,
  onEnded,
}: {
  track: Track;
  onEnded: () => void;
}) {
  const element = useRef<HTMLAudioElement>(null);
  const generation = useRef(0);
  const [status, setStatus] = useState<
    "loading" | "playing" | "blocked" | "error"
  >("loading");

  async function resume() {
    const audio = element.current;
    if (!audio) return;
    const request = generation.current;
    try {
      audio.volume = 0.32;
      await audio.play();
      if (generation.current === request) setStatus("playing");
    } catch (cause) {
      if (generation.current !== request) return;
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setStatus(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "blocked"
          : "error",
      );
    }
  }

  useEffect(() => {
    const audio = element.current;
    if (!audio) return;
    generation.current++;
    setStatus("loading");
    audio.load();
    void resume();
    const unlock = () => void resume();
    document.addEventListener("pointerdown", unlock, {
      once: true,
      capture: true,
    });
    document.addEventListener("keydown", unlock, { once: true, capture: true });
    return () => {
      generation.current++;
      audio.pause();
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };
  }, [track]);

  return (
    <div className={`local-soundtrack music-${status}`}>
      <audio
        ref={element}
        src={TRACKS[track].path}
        loop={track !== "result"}
        onEnded={onEnded}
        preload="auto"
        data-track={track}
        onPlaying={() => setStatus("playing")}
        onError={() => setStatus("error")}
      />
      {status === "blocked" ? (
        <button className="audio-unlock" onClick={() => void resume()}>
          <SpeakerHigh size={16} /> Liberar áudio
        </button>
      ) : status === "error" ? (
        <span role="status">
          <WarningCircle size={14} /> Não foi possível carregar a trilha.
        </span>
      ) : (
        <span className="now-playing" role="status">
          <MusicNotes size={13} />{" "}
          {status === "loading" ? "Carregando trilha…" : TRACKS[track].title}
        </span>
      )}
    </div>
  );
}
