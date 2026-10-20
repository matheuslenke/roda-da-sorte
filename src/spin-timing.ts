import { randomIndex } from "./raffle.ts";

const MINIMUM_SECONDS = 16;
const MAXIMUM_SECONDS = 22;

/** Independent of the winner draw. Sample once per animation, never during rendering. */
export function randomSpinSeconds(sample = randomIndex): number {
  return (
    MINIMUM_SECONDS + sample((MAXIMUM_SECONDS - MINIMUM_SECONDS) * 4 + 1) / 4
  );
}
