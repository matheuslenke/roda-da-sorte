import { randomIndex } from "./raffle.ts";

export const SPIN_RANGES = [
  { minimum: 12, maximum: 16 },
  { minimum: 16, maximum: 22 },
  { minimum: 22, maximum: 30 },
];

/** Independent of the winner draw. Sample once per animation, never during rendering. */
export function randomSpinSeconds(
  minimum: number,
  sample = randomIndex,
): number {
  const range =
    SPIN_RANGES.find((range) => range.minimum === minimum) ?? SPIN_RANGES[1];
  return (
    range.minimum + sample((range.maximum - range.minimum) * 4 + 1) / 4
  );
}
