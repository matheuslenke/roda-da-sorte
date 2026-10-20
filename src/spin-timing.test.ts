import { test } from "node:test";
import assert from "node:assert/strict";
import { randomSpinSeconds, SPIN_RANGES } from "./spin-timing.ts";

test("Spin timing samples once within the chosen longer range, including both endpoints", () => {
  for (const range of SPIN_RANGES) {
    let calls = 0;
    assert.equal(
      randomSpinSeconds(range.minimum, (size) => {
        calls++;
        assert.equal(size, (range.maximum - range.minimum) * 4 + 1);
        return 0;
      }),
      range.minimum,
    );
    assert.equal(calls, 1);
    assert.equal(
      randomSpinSeconds(range.minimum, (size) => size - 1),
      range.maximum,
    );
    const mid = randomSpinSeconds(range.minimum, (size) =>
      Math.floor(size / 2),
    );
    assert.ok(mid > range.minimum && mid < range.maximum);
    const actual = randomSpinSeconds(range.minimum);
    assert.ok(actual >= range.minimum && actual <= range.maximum);
  }
  assert.equal(
    randomSpinSeconds(5, () => 0),
    16,
  );
});
