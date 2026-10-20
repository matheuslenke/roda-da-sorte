type SoundLevels = { music: number; effects: number };
const SOUND_LEVELS_KEY = "roda-da-comunidade:volumes:v1";
const DEFAULT_LEVELS: SoundLevels = { music: 32, effects: 100 };

export function readSoundLevels(): SoundLevels {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(SOUND_LEVELS_KEY) ?? "null",
    );
    if (typeof value !== "object" || value === null) return DEFAULT_LEVELS;
    const percentage = (level: unknown, fallback: number) =>
      typeof level === "number" && Number.isFinite(level)
        ? Math.max(0, Math.min(100, level))
        : fallback;
    return {
      music: percentage(
        "music" in value ? value.music : undefined,
        DEFAULT_LEVELS.music,
      ),
      effects: percentage(
        "effects" in value ? value.effects : undefined,
        DEFAULT_LEVELS.effects,
      ),
    };
  } catch {
    return DEFAULT_LEVELS;
  }
}

export function saveSoundLevels(levels: SoundLevels) {
  try {
    localStorage.setItem(SOUND_LEVELS_KEY, JSON.stringify(levels));
  } catch {
    /* Volume controls remain available when storage is blocked. */
  }
}
