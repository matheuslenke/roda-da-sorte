import { useEffect, useRef, useState } from "react";
import type { WheelEntry } from "./wheel-model";
import { ArrowCounterClockwise, Play, SpinnerGap } from "@phosphor-icons/react";
import type { WheelScene, WheelView } from "./wheel-scene";
import { Wheel as FlatWheel } from "./wheel";

type Props = {
  people: WheelEntry[];
  rotation: number;
  spinning: boolean;
  duration: number;
  reducedMotion: boolean;
  onPlay: () => void;
  onDragPlay: (direction: 1 | -1) => void;
  interactionMode: "orbit" | "spin";
  disabled: boolean;
  busy: boolean;
};

/** Loads WebGL only for the game. The SVG stays available while loading or if the GPU is unavailable. */
export function ThreeWheel(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<WheelScene | null>(null);
  const cameraView = useRef<WheelView | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const [state, setState] = useState<"loading" | "ready" | "fallback">(
    "loading",
  );
  const peopleKey = props.people
    .map((person) => `${person.id}:${person.name}:${person.weight ?? 1}`)
    .join("|");

  useEffect(() => {
    let cancelled = false;
    const container = host.current;
    if (!container) return;
    setState("loading");
    async function load() {
      try {
        const { createWheelScene } = await import("./wheel-scene");
        await document.fonts.load('900 48px "Barlow Condensed"');
        await document.fonts.load('400 48px "Archivo Black"');
        await document.fonts.load('700 40px "Outfit"');
        await document.fonts.load('600 25px "Outfit"');
        if (cancelled) return;
        const stage = createWheelScene(
          container!,
          latest.current.people,
          latest.current.spinning ? 0 : latest.current.rotation,
          (available) => {
            if (!cancelled) setState(available ? "ready" : "fallback");
          },
          cameraView.current,
          (direction) => latest.current.onDragPlay(direction),
        );
        scene.current = stage;
        stage.setInteraction(
          latest.current.interactionMode,
          latest.current.disabled,
        );
        stage.move(
          latest.current.rotation,
          latest.current.spinning ? latest.current.duration : 0,
          latest.current.reducedMotion,
        );
        setState("ready");
      } catch {
        if (!cancelled) setState("fallback");
      }
    }
    void load();
    return () => {
      cancelled = true;
      cameraView.current = scene.current?.readView() ?? cameraView.current;
      scene.current?.dispose();
      scene.current = null;
    };
    // A stable identity prevents rebuilding the GPU scene on unrelated form updates.
  }, [peopleKey]);

  useEffect(() => {
    scene.current?.move(
      props.rotation,
      props.spinning ? props.duration : 0,
      props.reducedMotion,
    );
  }, [props.rotation, props.spinning, props.duration, props.reducedMotion]);

  useEffect(() => {
    scene.current?.setInteraction(props.interactionMode, props.disabled);
  }, [props.interactionMode, props.disabled]);

  return (
    <div
      className={`three-wheel-shell renderer-${state} interaction-${props.interactionMode}`}
    >
      <div
        className="three-wheel-canvas"
        ref={host}
        role="img"
        tabIndex={state === "ready" ? 0 : -1}
        aria-label={`Roleta ${state === "ready" ? "3D" : ""} com ${props.people.length} ${props.people.some((person) => person.weight) ? "grupos proporcionais" : "participantes com chances iguais"}. ${props.interactionMode === "spin" ? "Arraste uma borda e solte para sortear. Ou use o botão Girar." : "Arraste para mudar o ângulo ou use as setas do teclado."}`}
      />
      {state !== "ready" && (
        <div className="wheel-fallback">
          <FlatWheel
            people={props.people}
            rotation={props.rotation}
            spinning={props.spinning}
            duration={props.duration}
          />
        </div>
      )}
      <button
        className="wheel-play-button"
        disabled={props.disabled}
        onClick={props.onPlay}
        aria-label={
          props.busy
            ? "Sorteio em andamento"
            : "Girar a roleta pelo botão central"
        }
      >
        {props.busy ? (
          <SpinnerGap size={38} className="spinner" />
        ) : (
          <Play size={38} weight="fill" />
        )}
        <span>{props.busy ? "GIRANDO" : "GIRAR"}</span>
      </button>
      <span className="renderer-label">
        {state === "ready"
          ? props.interactionMode === "spin"
            ? "ARRASTE UMA BORDA E SOLTE PARA GIRAR"
            : "ARRASTE PARA EXPLORAR EM 3D"
          : state === "loading"
            ? "PREPARANDO O PALCO"
            : "MODO COMPATÍVEL"}
      </span>
      {state === "ready" && (
        <button
          className="reset-view-button"
          aria-label="Restaurar ângulo da roleta"
          title="Restaurar ângulo da roleta"
          onClick={() => scene.current?.resetView()}
        >
          <ArrowCounterClockwise size={17} />
        </button>
      )}
    </div>
  );
}
