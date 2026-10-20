import type { Draw, Participant } from "./raffle";
import { INITIAL_NAMES, MAX_PARTICIPANTS, normalizeName } from "./raffle";

const STORAGE_KEY = "roda-da-comunidade:v1";
export type SavedState = {
  participants: Participant[];
  draws: Draw[];
  excludeWinners: boolean;
  duration: number;
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function initialState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const value: unknown = JSON.parse(raw);
      if (
        isRecord(value) &&
        Array.isArray(value.participants) &&
        Array.isArray(value.draws)
      ) {
        const participants: Participant[] = [];
        const keys = new Set<string>();
        for (const person of value.participants) {
          if (
            !isRecord(person) ||
            typeof person.id !== "string" ||
            typeof person.name !== "string" ||
            !person.name.trim() ||
            person.name.length > 80
          )
            continue;
          const key = normalizeName(person.name);
          if (!keys.has(key) && participants.length < MAX_PARTICIPANTS) {
            participants.push({ id: person.id, name: person.name });
            keys.add(key);
          }
        }
        const draws: Draw[] = [];
        for (const draw of value.draws) {
          if (
            isRecord(draw) &&
            typeof draw.id === "string" &&
            typeof draw.name === "string" &&
            typeof draw.participantId === "string" &&
            typeof draw.date === "string" &&
            Number.isFinite(Date.parse(draw.date)) &&
            typeof draw.round === "number" &&
            typeof draw.poolSize === "number"
          ) {
            draws.push({
              id: draw.id,
              name: draw.name,
              participantId: draw.participantId,
              date: draw.date,
              round: draw.round,
              poolSize: draw.poolSize,
            });
          }
        }
        return {
          participants,
          draws,
          excludeWinners: value.excludeWinners !== false,
          duration: [5, 8, 12].includes(Number(value.duration))
            ? Number(value.duration)
            : 8,
        };
      }
    }
  } catch {
    /* A blocked or malformed storage still permits a fresh local session. */
  }
  return {
    participants: INITIAL_NAMES.map((name) => ({
      id: crypto.randomUUID(),
      name,
    })),
    draws: [],
    excludeWinners: true,
    duration: 8,
  };
}

export function saveState(state: SavedState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
