import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ChangeEvent } from "react";
import {
  ArrowRight,
  ArrowsIn,
  ArrowsOut,
  CaretDown,
  Check,
  CheckCircle,
  DownloadSimple,
  FileCsv,
  GearSix,
  Info,
  ListBullets,
  MusicNotes,
  Play,
  Plus,
  SpeakerHigh,
  SpeakerSlash,
  Sparkle,
  Ticket,
  Trash,
  Trophy,
  UsersThree,
  SpinnerBall,
  X,
} from "@phosphor-icons/react";
import confetti from "canvas-confetti";
import {
  addNames,
  csvResults,
  INITIAL_NAMES,
  MAX_PARTICIPANTS,
  normalizeName,
  parseCsv,
  randomIndex,
} from "./raffle";
import type { Draw } from "./raffle";
import { initialState, saveState } from "./storage";
import type { SavedState } from "./storage";
import { ShowAudio } from "./audio";
import { WHEEL_COLORS } from "./wheel";
import { ThreeWheel } from "./three-wheel";
import { boardLayout } from "./board";
import { LocalSoundtrack } from "./local-soundtrack";
import type { Track } from "./local-soundtrack";
import { entryLanding, groupForPerson, visualGroups } from "./wheel-model";
import type { WheelEntry } from "./wheel-model";
import { randomSpinSeconds } from "./spin-timing";
import { readSoundLevels, saveSoundLevels } from "./sound-settings";

type Phase =
  | "idle"
  | "group-spinning"
  | "group-revealing"
  | "spinning"
  | "revealing"
  | "winner";
type Panel = "how" | "music" | null;
const dateFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function downloadFile(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function LetterBoard({
  phase,
  winner,
  group,
}: {
  phase: Phase;
  winner: Draw | null;
  group: string | null;
}) {
  const reveal = (phase === "revealing" || phase === "winner") && winner;
  const words = reveal
    ? winner.name.toLocaleUpperCase("pt-BR")
    : phase === "group-revealing"
      ? (group ?? "GRUPO DA SORTE")
      : phase === "group-spinning"
        ? "QUAL É O GRUPO DA SORTE?"
        : phase === "spinning"
          ? "QUEM SERÁ O SORTUDO?"
          : "A SORTE ESTÁ NO AR";
  const { rows, columns } = boardLayout(words);
  return (
    <div
      className={`letter-board ${phase === "revealing" ? "revealing" : ""} ${columns > 14 ? "long-name" : ""}`}
      style={{ "--columns": columns } as CSSProperties}
      aria-hidden="true"
    >
      {rows.map((row, rowIndex) => {
        const text = row;
        const padding = Math.floor((columns - text.length) / 2);
        return (
          <div className="letter-row" key={rowIndex}>
            {Array.from({ length: columns }, (_, index) => {
              const letter = text[index - padding];
              return (
                <span
                  key={`${phase}-${index}`}
                  className={`letter ${letter && letter !== " " ? "filled" : ""}`}
                  style={
                    {
                      "--delay": `${(rowIndex * columns + index) * (1200 / (columns * 4))}ms`,
                    } as CSSProperties
                  }
                >
                  {letter && letter !== " " ? letter : ""}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function App() {
  const demo =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("demo") === "500";
  const [saved] = useState<SavedState>(() =>
    demo
      ? {
          participants: Array.from({ length: 500 }, (_, index) => ({
            id: `demo-${index + 1}`,
            name: `Pessoa ${String(index + 1).padStart(3, "0")}`,
          })),
          draws: [],
          excludeWinners: true,
        }
      : initialState(),
  );
  const [participants, setParticipants] = useState(saved.participants);
  const [draws, setDraws] = useState(saved.draws);
  const [excludeWinners, setExcludeWinners] = useState(saved.excludeWinners);
  const [activeSpinSeconds, setActiveSpinSeconds] = useState(16);
  const [levels, setLevels] = useState(readSoundLevels);
  const [nameInput, setNameInput] = useState("");
  const [entryMode, setEntryMode] = useState<"single" | "list">("single");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"draw" | "results">("draw");
  const [phase, setPhase] = useState<Phase>("idle");
  const [winner, setWinner] = useState<Draw | null>(null);
  const [rotation, setRotation] = useState(0);
  const [wheelSnapshot, setWheelSnapshot] = useState<WheelEntry[] | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [effects, setEffects] = useState(true);
  const [muted, setMuted] = useState(false);
  const [interactionMode, setInteractionMode] = useState<"orbit" | "spin">(
    "orbit",
  );
  const [soundtrack, setSoundtrack] = useState<Track | null>("background");
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState("");
  const [presentation, setPresentation] = useState(false);
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [clearTarget, setClearTarget] = useState<
    "participants" | "results" | null
  >(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const audio = useRef(new ShowAudio());
  const busy = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const settingsPopover = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const running = phase !== "idle" && phase !== "winner";
  const spinning = phase === "spinning" || phase === "group-spinning";
  const revealedDraws = running
    ? draws.filter((draw) => draw.id !== winner?.id)
    : draws;
  const winners = new Set(
    revealedDraws.map((draw) => normalizeName(draw.name)),
  );
  const eligible = participants.filter(
    (person) => !excludeWinners || !winners.has(normalizeName(person.name)),
  );
  const groups = visualGroups(eligible);
  const wheelPeople =
    wheelSnapshot ??
    (groups.length ? groups.map((group) => group.entry) : eligible);
  const filteredPeople = participants.filter((person) =>
    normalizeName(person.name).includes(normalizeName(query)),
  );
  const round = Math.max(0, ...draws.map((draw) => draw.round)) + 1;
  const stageLabel =
    phase === "group-spinning"
      ? "ETAPA 1 DE 2 · QUAL É O GRUPO DA SORTE?"
      : phase === "group-revealing"
        ? `${selectedGroup} · A SORTE CONTINUA`
        : phase === "spinning" && selectedGroup
          ? `ETAPA 2 DE 2 · ${selectedGroup}`
          : phase === "spinning"
            ? "SEGURA ESSA EMOÇÃO"
            : phase === "revealing" || phase === "winner"
              ? "TEMOS UM NOME DE SORTE"
              : groups.length
                ? `${eligible.length} NOMES · ${groups.length} GRUPOS VISUAIS`
                : "QUEM SERÁ QUE VEM AÍ?";
  useEffect(() => {
    const showAudio = audio.current;
    return () => showAudio.dispose();
  }, []);

  useEffect(() => {
    if (demo) return;
    if (!saveState({ participants, draws, excludeWinners }))
      setNotice(
        "O navegador bloqueou o salvamento. Exporte os resultados antes de sair.",
      );
  }, [participants, draws, excludeWinners]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (settingsPopover.current?.matches(":popover-open")) return;
        setPanel(null);
        setClearTarget(null);
        setPresentation(false);
      }
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      timers.current.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(""), 6500);
    return () => clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    audio.current.enabled = effects && !muted;
    const prepare = () => {
      if (effects && !muted) void audio.current.prepare().catch(() => {});
    };
    document.addEventListener("pointerdown", prepare, {
      once: true,
      capture: true,
    });
    document.addEventListener("keydown", prepare, {
      once: true,
      capture: true,
    });
    return () => {
      document.removeEventListener("pointerdown", prepare, true);
      document.removeEventListener("keydown", prepare, true);
    };
  }, [effects, muted]);

  useEffect(() => {
    audio.current.volume = levels.effects / 100;
    saveSoundLevels(levels);
  }, [levels]);

  useEffect(() => {
    if (!spinning) return;
    const start = performance.now();
    const total = activeSpinSeconds * 1000;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      audio.current.cue("tick");
      const progress = (performance.now() - start) / total;
      if (progress < 0.98)
        timeout = setTimeout(tick, 55 + Math.pow(progress, 3) * 440);
    };
    tick();
    return () => clearTimeout(timeout);
  }, [phase, activeSpinSeconds]);

  function addParticipants(names: string[]) {
    const result = addNames(participants, names);
    setParticipants(result.participants);
    setNameInput("");
    setWheelSnapshot(null);
    setRotation(0);
    const messages = [
      `${result.added} ${result.added === 1 ? "participante adicionado" : "participantes adicionados"}.`,
    ];
    if (result.duplicates)
      messages.push(
        `${result.duplicates} ${result.duplicates === 1 ? "duplicado ignorado" : "duplicados ignorados"}.`,
      );
    if (result.invalid)
      messages.push(
        `Limite de ${MAX_PARTICIPANTS} pessoas e 80 caracteres por nome.`,
      );
    setNotice(messages.join(" "));
  }

  async function importCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1_000_000) {
      setNotice("Escolha um CSV de até 1 MB.");
      return;
    }
    try {
      const names = parseCsv(await file.text());
      if (!names.length) {
        setNotice(
          "Nenhum nome encontrado. Use uma coluna chamada Nome ou a primeira coluna.",
        );
        return;
      }
      addParticipants(names);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Não foi possível ler o CSV.",
      );
    }
  }

  async function toggleEffects() {
    const next = !effects;
    setEffects(next);
    audio.current.enabled = next && !muted;
    if (!next || muted) return;
    try {
      await audio.current.prepare();
      audio.current.cue("reveal");
    } catch {
      setNotice("Não foi possível ativar os efeitos neste navegador.");
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    audio.current.enabled = effects && !next;
    if (!next && effects) void audio.current.prepare().catch(() => {});
  }

  function chooseSoundtrack(track: Track) {
    setSoundtrack(track);
    setPanel(null);
  }
  function stopMusic() {
    setSoundtrack(null);
  }
  function toggleMusic() {
    setSoundtrack((current) =>
      current
        ? null
        : phase === "winner"
          ? "result"
          : running
            ? "spin"
            : "background",
    );
  }

  function celebrate() {
    audio.current.cue("win");
    if (reducedMotion) return;
    void confetti({
      particleCount: 110,
      spread: 85,
      origin: { x: 0.67, y: 0.57 },
      colors: WHEEL_COLORS,
      disableForReducedMotion: true,
      zIndex: 100,
    });
    timers.current.push(
      setTimeout(() => {
        void confetti({
          particleCount: 70,
          angle: 125,
          spread: 70,
          origin: { x: 0.9, y: 0.55 },
          colors: WHEEL_COLORS,
          disableForReducedMotion: true,
        });
      }, 300),
    );
  }

  function spin(direction: 1 | -1 = 1) {
    if (busy.current || !eligible.length || phase === "winner") return;
    busy.current = true;
    if (effects && !muted) void audio.current.prepare().catch(() => {});
    const pool = [...eligible];
    const index = randomIndex(pool.length);
    const person = pool[index];
    const draw: Draw = {
      id: crypto.randomUUID(),
      name: person.name,
      participantId: person.id,
      date: new Date().toISOString(),
      round,
      poolSize: pool.length,
    };
    const nextDraws = [...draws, draw];
    // Commit the draw before the visual sequence: reloads cannot silently reroll it.
    if (!demo && !saveState({ participants, draws: nextDraws, excludeWinners }))
      setNotice(
        "Resultado nesta sessão. Exporte o histórico: o salvamento local foi bloqueado.",
      );
    setWinner(draw);
    setDraws(nextDraws);
    setSelectedGroup(null);
    if (soundtrack) setSoundtrack("spin");
    const prepareSpin = (
      from: number,
      index: number,
      entries: WheelEntry[],
    ) => {
      const seconds = reducedMotion ? 0.5 : randomSpinSeconds();
      setActiveSpinSeconds(seconds);
      setRotation(
        entryLanding(
          from,
          index,
          entries,
          direction,
          Math.max(6, Math.ceil(seconds * 0.8)),
        ),
      );
      return seconds * 1000;
    };
    const revealWinner = () => {
      setPhase("revealing");
      audio.current.cue("reveal");
      timers.current.push(
        setTimeout(
          () => {
            setPhase("winner");
            busy.current = false;
            celebrate();
            setSoundtrack((current) => (current ? "result" : null));
          },
          reducedMotion ? 100 : 1500,
        ),
      );
    };
    const drawGroups = visualGroups(pool);
    if (!drawGroups.length) {
      setWheelSnapshot(pool);
      const spinDuration = prepareSpin(rotation, index, pool);
      setPhase("spinning");
      timers.current.push(setTimeout(revealWinner, spinDuration));
      return;
    }
    const selection = groupForPerson(drawGroups, person.id);
    const entries = drawGroups.map((group) => group.entry);
    setWheelSnapshot(entries);
    const spinDuration = prepareSpin(rotation, selection.index, entries);
    setPhase("group-spinning");
    timers.current.push(
      setTimeout(() => {
        setSelectedGroup(selection.group.entry.name);
        setPhase("group-revealing");
        audio.current.cue("reveal");
        timers.current.push(
          setTimeout(
            () => {
              setWheelSnapshot(selection.group.members);
              const finalDuration = prepareSpin(
                0,
                selection.memberIndex,
                selection.group.members,
              );
              setPhase("spinning");
              timers.current.push(setTimeout(revealWinner, finalDuration));
            },
            reducedMotion ? 150 : 1200,
          ),
        );
      }, spinDuration),
    );
  }

  function nextRound() {
    setSoundtrack((current) => (current ? "background" : null));
    setPhase("idle");
    setWinner(null);
    setWheelSnapshot(null);
    setRotation(0);
    setSelectedGroup(null);
  }

  async function togglePresentation() {
    if (presentation) {
      setPresentation(false);
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => {});
      return;
    }
    setPresentation(true);
    if (document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen().catch(() => {});
  }

  useEffect(() => {
    const syncFullscreen = () => {
      if (!document.fullscreenElement) setPresentation(false);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () =>
      document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  function exportResults() {
    downloadFile(
      csvResults(draws),
      "resultados-roda-da-comunidade.csv",
      "text/csv;charset=utf-8;",
    );
    setNotice("Resultados exportados. A festa fica registrada!");
  }

  function clearConfirmed() {
    if (clearTarget === "participants") {
      setParticipants([]);
      setWheelSnapshot(null);
      setRotation(0);
      setQuery("");
    }
    if (clearTarget === "results") {
      setDraws([]);
      nextRound();
    }
    setClearTarget(null);
  }

  return (
    <div
      className={`app game-view-${view} ${presentation ? "presentation" : ""} ${participantsOpen ? "participants-open" : ""}`}
    >
      <div className="studio-background" aria-hidden="true">
        <img src="/images/studio-roda-v2.webp" alt="" fetchPriority="high" />
      </div>
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            if (!running) setView("draw");
          }}
          aria-label="Roda da Comunidade, início"
        >
          <span className="brand-symbol">
            <SpinnerBall size={29} weight="bold" />
          </span>
          <span className="brand-wordmark">
            <strong>
              RODA <small>A</small> RODA
            </strong>
            <span className="brand-small">DA COMUNIDADE</span>
          </span>
        </a>
        <nav aria-label="Navegação principal">
          <button
            className={view === "draw" ? "active" : ""}
            onClick={() => setView("draw")}
          >
            <SpinnerBall size={18} /> Jogar
          </button>
          <button
            className={view === "results" ? "active" : ""}
            disabled={running}
            onClick={() => setView("results")}
          >
            <Trophy size={18} /> Resultados{" "}
            {draws.length > 0 && (
              <span className="nav-count">{draws.length}</span>
            )}
          </button>
        </nav>
        <button className="how-button" onClick={() => setPanel("how")}>
          <Info size={18} /> Como jogar
        </button>
      </header>
      {demo && (
        <div className="demo-badge">
          DEMONSTRAÇÃO · 500 NOMES · DADOS TEMPORÁRIOS
        </div>
      )}

      <main>
        {view === "draw" && (
          <button
            className="participants-toggle"
            aria-expanded={participantsOpen}
            aria-controls="participants-panel"
            onClick={() => setParticipantsOpen(!participantsOpen)}
          >
            <UsersThree size={20} /> Participantes{" "}
            <span>{participants.length}</span>
            <CaretDown size={16} />
          </button>
        )}
        <section className="page-heading">
          <div>
            <div className="eyebrow">
              <span /> A SORTE ESTÁ NO AR
            </div>
            <h1>
              {view === "draw" ? (
                <>
                  Sua comunidade.
                  <br className="mobile-break" /> Um grande <span>show.</span>
                  <Sparkle className="heading-spark" weight="fill" />
                </>
              ) : (
                <>
                  Quem já teve a sua <span>vez.</span>
                  <Sparkle className="heading-spark" weight="fill" />
                </>
              )}
            </h1>
            <p>
              {view === "draw"
                ? "Dê uma volta na nostalgia. O próximo nome pode ser o seu."
                : "Cada rodada, uma história. Todos os vencedores ficam por aqui."}
            </p>
          </div>
          <div className="heading-note">
            <span className="little-spark">✳</span>
            <span>
              Um toque de nostalgia.
              <br />
              <strong>Uma rodada de emoção.</strong>
            </span>
          </div>
        </section>

        {view === "draw" ? (
          <div className="draw-layout">
            <aside className="participants-panel" id="participants-panel">
              <div className="panel-title">
                <div>
                  <UsersThree size={23} weight="duotone" />
                  <h2>Participantes</h2>
                </div>
                <span className="count-badge">{participants.length}</span>
              </div>
              <p className="panel-description">
                O show começa com a sua galera.
              </p>
              <div
                className="input-tabs"
                role="group"
                aria-label="Forma de adicionar nomes"
              >
                <button
                  className={entryMode === "single" ? "selected" : ""}
                  disabled={running || phase === "winner"}
                  onClick={() => setEntryMode("single")}
                >
                  <Plus size={16} /> Nome a nome
                </button>
                <button
                  className={entryMode === "list" ? "selected" : ""}
                  disabled={running || phase === "winner"}
                  onClick={() => setEntryMode("list")}
                >
                  <ListBullets size={16} /> Colar lista
                </button>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  addParticipants(
                    entryMode === "single"
                      ? [nameInput]
                      : nameInput.split(/\r?\n/),
                  );
                }}
              >
                <label className="sr-only" htmlFor="participant-names">
                  {entryMode === "single"
                    ? "Nome do participante"
                    : "Lista de nomes, um por linha"}
                </label>
                {entryMode === "single" ? (
                  <div className="name-field">
                    <input
                      id="participant-names"
                      placeholder="Digite um nome…"
                      maxLength={80}
                      value={nameInput}
                      disabled={running || phase === "winner"}
                      onChange={(event) => setNameInput(event.target.value)}
                    />
                    <button
                      aria-label="Adicionar participante"
                      disabled={
                        !nameInput.trim() || running || phase === "winner"
                      }
                    >
                      <Plus size={21} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <>
                    <textarea
                      id="participant-names"
                      rows={4}
                      placeholder={"Ana Souza\nBruno Lima\nCamila Rocha"}
                      value={nameInput}
                      disabled={running || phase === "winner"}
                      onChange={(event) => setNameInput(event.target.value)}
                    />
                    <button
                      className="add-list"
                      disabled={
                        !nameInput.trim() || running || phase === "winner"
                      }
                    >
                      <Plus size={16} /> Adicionar nomes
                    </button>
                  </>
                )}
              </form>
              <button
                className="csv-button"
                disabled={running || phase === "winner"}
                onClick={() => fileInput.current?.click()}
              >
                <FileCsv size={20} weight="duotone" /> Importar arquivo CSV{" "}
                <ArrowRight size={16} />
              </button>
              <input
                ref={fileInput}
                className="sr-only"
                type="file"
                accept=".csv,text/csv"
                onChange={importCsv}
                tabIndex={-1}
                aria-label="Importar participantes de um CSV"
              />
              <div className="participants-divider" />
              <div className="list-header">
                <span>
                  NA RODA <span>({participants.length})</span>
                </span>
                <button
                  title="Limpar participantes"
                  aria-label="Limpar todos os participantes"
                  disabled={
                    !participants.length || running || phase === "winner"
                  }
                  onClick={() => setClearTarget("participants")}
                >
                  <Trash size={16} />
                </button>
              </div>
              {participants.length > 20 && (
                <input
                  className="search-input"
                  aria-label="Buscar participante"
                  placeholder="Buscar participante…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              )}
              <div className="participant-list">
                {filteredPeople.map((person, index) => {
                  const excluded =
                    excludeWinners && winners.has(normalizeName(person.name));
                  return (
                    <div
                      className={`participant ${excluded ? "excluded" : ""}`}
                      key={person.id}
                    >
                      <span
                        className="avatar"
                        style={
                          {
                            "--avatar-color":
                              WHEEL_COLORS[index % WHEEL_COLORS.length],
                          } as CSSProperties
                        }
                      >
                        {person.name
                          .split(" ")
                          .map((word) => word[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span className="participant-name">
                        {person.name}
                        {excluded && (
                          <small>
                            Já levou a sorte <Trophy size={10} weight="fill" />
                          </small>
                        )}
                      </span>
                      <button
                        aria-label={`Remover ${person.name}`}
                        disabled={running || phase === "winner"}
                        onClick={() => {
                          setParticipants(
                            participants.filter(
                              (item) => item.id !== person.id,
                            ),
                          );
                          setWheelSnapshot(null);
                          setRotation(0);
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
                {!filteredPeople.length && (
                  <div className="empty-participants">
                    <Ticket size={30} />
                    <p>
                      {query
                        ? "Nenhum nome encontrado."
                        : "O palco está pronto. Só falta a galera!"}
                    </p>
                    {!query && (
                      <button onClick={() => addParticipants(INITIAL_NAMES)}>
                        Usar lista de exemplo
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="participants-bottom">
                <CheckCircle size={15} weight="fill" />
                <span>
                  {eligible.length}{" "}
                  {eligible.length === 1 ? "pessoa pronta" : "pessoas prontas"}{" "}
                  para a próxima rodada
                </span>
              </div>
            </aside>

            <section className="show-area" aria-label="Palco do sorteio">
              <div ref={stageRef} className={`stage phase-${phase}`}>
                <div className="stage-stars" aria-hidden="true">
                  <span>✦</span>
                  <span>✧</span>
                  <span>✦</span>
                  <span>✧</span>
                  <span>✧</span>
                </div>
                <div className="spotlight spotlight-left" />
                <div className="spotlight spotlight-right" />
                <div className="stage-topline">
                  <span className="on-air">
                    <i /> NO AR <span>•</span> RODADA{" "}
                    {String(winner?.round ?? round).padStart(2, "0")}
                  </span>
                  <div className="stage-tools">
                    <button
                      title={
                        muted
                          ? "Reativar todos os sons"
                          : "Silenciar todos os sons"
                      }
                      aria-label={
                        muted
                          ? "Reativar todos os sons"
                          : "Silenciar todos os sons"
                      }
                      aria-pressed={muted}
                      onClick={toggleMute}
                    >
                      <span
                        className={`icon-swap ${!muted ? "is-active" : ""}`}
                        aria-hidden="true"
                      >
                        <span className="active-icon">
                          <SpeakerHigh size={19} />
                        </span>
                        <span className="inactive-icon">
                          <SpeakerSlash size={19} />
                        </span>
                      </span>
                    </button>
                    <button
                      title={
                        presentation
                          ? "Sair do modo apresentação"
                          : "Modo apresentação"
                      }
                      aria-label={
                        presentation
                          ? "Sair do modo apresentação"
                          : "Modo apresentação"
                      }
                      onClick={() => void togglePresentation()}
                    >
                      {presentation ? (
                        <ArrowsIn size={19} />
                      ) : (
                        <ArrowsOut size={19} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="board-label">
                  <span /> {stageLabel} <span />
                </div>
                <LetterBoard
                  phase={phase}
                  winner={winner}
                  group={selectedGroup}
                />
                <ThreeWheel
                  people={wheelPeople}
                  rotation={rotation}
                  spinning={spinning}
                  duration={activeSpinSeconds}
                  reducedMotion={reducedMotion}
                  onPlay={() => spin()}
                  onDragPlay={spin}
                  interactionMode={interactionMode}
                  busy={running}
                  disabled={running || phase === "winner" || !eligible.length}
                />
                <div className="game-scoreboard">
                  <span className="scoreboard-icon">
                    <UsersThree size={21} weight="duotone" />
                  </span>
                  <strong>{eligible.length}</strong>
                  <span>NA DISPUTA</span>
                  <div />
                  <span className="scoreboard-chance">CHANCE INDIVIDUAL</span>
                  <b>
                    {eligible.length ? `1 em ${eligible.length}` : "Boa sorte!"}
                  </b>
                </div>
                <div className="stage-floor" />
                <div className="stage-caption">
                  <Sparkle size={13} weight="fill" />
                  <span>
                    {phase === "spinning"
                      ? "A PRÓXIMA VOLTA PODE SER SUA"
                      : phase === "revealing"
                        ? "E O NOME DE SORTE É…"
                        : "O PALCO É NOSSO. A SORTE É SUA."}
                  </span>
                  <Sparkle size={13} weight="fill" />
                </div>
                {phase === "winner" && winner && (
                  <div className="winner-backdrop">
                    <div className="winner-card" role="status">
                      <div className="winner-medal">
                        <Trophy size={31} weight="fill" />
                      </div>
                      <span className="eyebrow">É SEU NOME NO PAINEL!</span>
                      <h2>{winner.name}</h2>
                      <p>Essa rodada é sua. Pode comemorar!</p>
                      <button autoFocus onClick={nextRound}>
                        Bora para a próxima <ArrowRight size={18} />
                      </button>
                      <button className="celebrate-again" onClick={celebrate}>
                        <Sparkle size={16} /> Mais confete, por favor
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="show-bottom">
                <span>
                  <CheckCircle size={15} /> Mesma chance para cada pessoa.
                </span>
              </div>

              {draws.length > 0 && phase !== "winner" && (
                <div className="last-result">
                  <span className="small-trophy">
                    <Trophy size={18} weight="duotone" />
                  </span>
                  <div>
                    <span>ÚLTIMO NOME DE SORTE</span>
                    <strong>
                      {running
                        ? (draws[draws.length - 2]?.name ??
                          "Aguardando a revelação…")
                        : draws[draws.length - 1].name}
                    </strong>
                  </div>
                  <button disabled={running} onClick={() => setView("results")}>
                    Ver resultados <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </section>
          </div>
        ) : (
          <section className="results-panel">
            <div className="results-header">
              <div>
                <span className="eyebrow">O HALL DA SORTE</span>
                <h2>
                  {draws.length} {draws.length === 1 ? "motivo" : "motivos"}{" "}
                  para comemorar.
                </h2>
              </div>
              <button
                className="secondary-button"
                onClick={exportResults}
                disabled={!draws.length}
              >
                <DownloadSimple size={18} /> Exportar CSV
              </button>
            </div>
            {!draws.length ? (
              <div className="results-empty">
                <Trophy size={58} weight="duotone" />
                <h3>A primeira volta ainda vem aí.</h3>
                <p>
                  Os nomes sorteados aparecerão aqui, salvos neste navegador.
                </p>
                <button
                  className="secondary-button"
                  onClick={() => setView("draw")}
                >
                  Ir para o sorteio <ArrowRight size={18} />
                </button>
              </div>
            ) : (
              <>
                <div className="results-grid">
                  {[...draws].reverse().map((draw) => (
                    <article className="result-card" key={draw.id}>
                      <span className="result-round">
                        RODADA {String(draw.round).padStart(2, "0")}
                      </span>
                      <Trophy
                        className="result-trophy"
                        size={27}
                        weight="duotone"
                      />
                      <h3>{draw.name}</h3>
                      <p>
                        {dateFormat.format(new Date(draw.date))} <span>•</span>{" "}
                        {draw.poolSize} participantes
                      </p>
                      <span className="result-saved">
                        <Check size={13} /> Resultado salvo
                      </span>
                    </article>
                  ))}
                </div>
                <button
                  className="clear-results"
                  onClick={() => setClearTarget("results")}
                >
                  <Trash size={15} /> Limpar histórico
                </button>
              </>
            )}
          </section>
        )}

        <footer>
          <span>
            Feito para juntar a galera<span className="footer-star">✳</span> e
            deixar a sorte fazer o resto.
          </span>
          <span>
            <span className="local-dot" />{" "}
            {draws.length
              ? "Resultados salvos neste navegador"
              : "Sem cadastro. É só chegar e girar."}
          </span>
        </footer>
      </main>

      {presentation && (
        <button
          className="exit-presentation"
          onClick={() => void togglePresentation()}
        >
          <ArrowsIn size={17} /> Sair da apresentação <kbd>esc</kbd>
        </button>
      )}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {phase === "group-spinning"
          ? "Sorteio em andamento. Apresentando o grupo do vencedor."
          : phase === "group-revealing"
            ? `${selectedGroup}. Preparando a revelação do nome.`
            : phase === "spinning"
              ? "Sorteio em andamento."
              : phase === "revealing" && winner
                ? `O vencedor é ${winner.name}. Resultado salvo.`
                : ""}
      </div>
      {notice && (
        <div className="toast" role="status">
          <Info size={19} />
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      )}

      <button
        className="floating-settings-button"
        popoverTarget="game-settings"
        aria-label="Abrir configurações"
        title="Configurações"
      >
        <GearSix size={25} />
        <span>Configurações</span>
      </button>
      <div
        ref={settingsPopover}
        id="game-settings"
        popover="auto"
        className="floating-settings"
        role="dialog"
        aria-labelledby="game-settings-title"
      >
        <div className="floating-settings-heading">
          <h2 id="game-settings-title">Do seu jeito</h2>
          <button
            popoverTarget="game-settings"
            popoverTargetAction="hide"
            aria-label="Fechar configurações"
          >
            <X size={21} />
          </button>
        </div>
        <p className="floating-settings-intro">
          Ajuste os controles e volte ao show.
        </p>
        {muted && (
          <div className="global-mute-note" role="status">
            <SpeakerSlash size={16} />
            <span>Todo o áudio está silenciado.</span>
            <button onClick={toggleMute}>Reativar</button>
          </div>
        )}
        <h3>Como mover a roleta</h3>
        <div
          className="wheel-input-modes"
          role="group"
          aria-label="Modo de interação da roleta"
        >
          <button
            aria-pressed={interactionMode === "orbit"}
            disabled={running}
            onClick={() => setInteractionMode("orbit")}
          >
            Explorar 3D
          </button>
          <button
            aria-pressed={interactionMode === "spin"}
            disabled={running}
            onClick={() => setInteractionMode("spin")}
          >
            Girar arrastando
          </button>
        </div>

        <h3>Som do palco</h3>
        <div className="audio-toggles">
          <div className="audio-channel">
            <button
              className="audio-toggle"
              aria-pressed={effects}
              onClick={() => void toggleEffects()}
            >
              {effects ? <SpeakerHigh size={18} /> : <SpeakerSlash size={18} />}{" "}
              {effects ? "Efeitos ligados" : "Efeitos desligados"}
            </button>
            <label className="volume-control" htmlFor="effects-volume">
              <span>
                Efeitos <output>{levels.effects}%</output>
              </span>
              <input
                id="effects-volume"
                type="range"
                min="0"
                max="100"
                step="1"
                value={levels.effects}
                aria-label="Volume dos efeitos sonoros"
                aria-valuetext={`${levels.effects}%`}
                onChange={(event) =>
                  setLevels((current) => ({
                    ...current,
                    effects: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
          <div className="audio-channel">
            <button
              className="audio-toggle"
              aria-pressed={!!soundtrack}
              onClick={toggleMusic}
            >
              <MusicNotes size={18} />{" "}
              {soundtrack ? "Música ligada" : "Música desligada"}
            </button>
            <label className="volume-control" htmlFor="music-volume">
              <span>
                Música <output>{levels.music}%</output>
              </span>
              <input
                id="music-volume"
                type="range"
                min="0"
                max="100"
                step="1"
                value={levels.music}
                aria-label="Volume da música"
                aria-valuetext={`${levels.music}%`}
                onChange={(event) =>
                  setLevels((current) => ({
                    ...current,
                    music: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
        </div>
        <label className="toggle-row">
          <span>
            <strong>Uma chance para cada pessoa</strong>
            <small>Retirar vencedores das próximas rodadas.</small>
          </span>
          <input
            type="checkbox"
            checked={excludeWinners}
            disabled={running || phase === "winner"}
            onChange={(event) => {
              setExcludeWinners(event.target.checked);
              setWheelSnapshot(null);
              setRotation(0);
            }}
          />
          <span className="toggle-track" />
        </label>

        <button
          className="secondary-button full"
          onClick={() => {
            settingsPopover.current?.hidePopover();
            setPanel("music");
          }}
        >
          <MusicNotes size={18} /> Ouvir as trilhas
        </button>
        <button
          className="secondary-button full"
          disabled={!draws.length}
          onClick={exportResults}
        >
          <DownloadSimple size={18} /> Exportar resultados
        </button>
      </div>

      {panel && (
        <Dialog
          title={
            panel === "how"
              ? "Todo grande show tem suas regras."
              : "O som da nostalgia"
          }
          close={() => setPanel(null)}
        >
          {panel === "how" && (
            <>
              <p className="dialog-intro">
                O clima é de TV. A estrela é a sua comunidade.
              </p>
              <ol className="how-steps">
                <li>
                  <span>01</span>
                  <div>
                    <strong>Chame a galera</strong>
                    <p>
                      Adicione nomes, cole uma lista ou importe um CSV. Nomes
                      repetidos são ignorados.
                    </p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Deixe a sorte girar</strong>
                    <p>
                      Cada pessoa ativa tem a mesma chance. O sorteio usa a
                      aleatoriedade criptográfica do navegador, e a roleta
                      acompanha o resultado.
                    </p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Comemore sem moderação</strong>
                    <p>
                      O vencedor aparece no painel e fica salvo antes da
                      animação. Recarregar a página não refaz o sorteio.
                    </p>
                  </div>
                </li>
              </ol>
              <div className="settings-note">
                <UsersThree size={20} />
                <p>
                  Acima de 48 nomes, a apresentação tem duas etapas: grupo e
                  pessoa, com até 25 nomes por grupo. O vencedor é sorteado uma
                  única vez entre todos. As fatias dos grupos são proporcionais
                  ao tamanho de cada grupo.
                </p>
              </div>
              <p className="audit-note">
                O sorteio é local. A aleatoriedade criptográfica evita
                previsibilidade, mas não constitui uma auditoria externa contra
                alterações feitas pelo organizador no próprio navegador.
              </p>
              <div className="settings-note">
                <Info size={20} />
                <p>
                  Uma homenagem independente aos programas de auditório
                  brasileiros, sem vínculo com o SBT ou a Jequiti.
                </p>
              </div>
            </>
          )}
          {panel === "music" && (
            <>
              <p className="dialog-intro">
                As trilhas que você escolheu, incluídas no próprio site. A
                música da roleta entra automaticamente durante o giro.
              </p>
              <div className="music-options">
                <button
                  className={soundtrack === "background" ? "selected" : ""}
                  onClick={() => void chooseSoundtrack("background")}
                >
                  <MusicNotes size={22} />
                  <span>
                    <strong>Intro do programa</strong>
                    <small>Trilha de fundo · arquivo local</small>
                  </span>
                  <Play size={18} weight="fill" />
                </button>
                <button
                  className={soundtrack === "spin" ? "selected" : ""}
                  onClick={() => void chooseSoundtrack("spin")}
                >
                  <SpinnerBall size={22} />
                  <span>
                    <strong>Segura a emoção</strong>
                    <small>Roleta rodando</small>
                  </span>
                  <Play size={18} weight="fill" />
                </button>
                <button
                  className={soundtrack === "result" ? "selected" : ""}
                  onClick={() => chooseSoundtrack("result")}
                >
                  <Trophy size={22} />
                  <span>
                    <strong>É hora de comemorar</strong>
                    <small>Resultado do sorteio · MP3 local</small>
                  </span>
                  <Play size={18} weight="fill" />
                </button>
              </div>
              <p className="music-tip">
                Durante o sorteio, a trilha muda para a roleta. Na primeira
                interação, o navegador libera o áudio automaticamente.
              </p>
              {soundtrack && (
                <button className="secondary-button full" onClick={stopMusic}>
                  <SpeakerSlash size={17} /> Parar trilha
                </button>
              )}
              <a
                className="reference-link"
                href="https://www.youtube.com/watch?v=ZLvw15d1TT8"
                target="_blank"
                rel="noreferrer"
              >
                Revisitar o programa que inspirou o palco{" "}
                <ArrowRight size={15} />
              </a>
            </>
          )}
        </Dialog>
      )}

      {soundtrack && (
        <LocalSoundtrack
          track={soundtrack}
          volume={levels.music / 100}
          muted={muted}
          onEnded={() =>
            setSoundtrack((current) =>
              current === "result" ? "background" : current,
            )
          }
        />
      )}

      {clearTarget && (
        <Dialog
          title={
            clearTarget === "participants"
              ? "Esvaziar a roda?"
              : "Limpar os resultados?"
          }
          close={() => setClearTarget(null)}
        >
          <p className="dialog-intro">
            {clearTarget === "participants"
              ? "Todos os participantes serão removidos. Os resultados anteriores continuam no histórico."
              : "O histórico salvo será apagado e todos poderão participar novamente. Exporte o CSV antes, se quiser guardar."}
          </p>
          <div className="confirm-actions">
            <button
              className="secondary-button"
              onClick={() => setClearTarget(null)}
            >
              Voltar
            </button>
            <button className="danger-button" onClick={clearConfirmed}>
              <Trash size={17} />{" "}
              {clearTarget === "participants"
                ? "Remover participantes"
                : "Limpar histórico"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function Dialog({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="dialog-content">
        <div className="dialog-title">
          <h2>{title}</h2>
          <button onClick={close} aria-label="Fechar janela">
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
