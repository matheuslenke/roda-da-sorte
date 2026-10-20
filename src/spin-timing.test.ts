import { test } from "node:test";
import assert from "node:assert/strict";
import { randomSpinSeconds } from "./spin-timing.ts";

test("Spin timing samples once within the chosen longer range, including both endpoints", () => {
  const range = { minimum: 16, maximum: 22 };
  let calls = 0;
  assert.equal(
    randomSpinSeconds((size) => {
      calls++;
      assert.equal(size, (range.maximum - range.minimum) * 4 + 1);
      return 0;
    }),
    range.minimum,
  );
  assert.equal(calls, 1);
  assert.equal(
    randomSpinSeconds((size) => size - 1),
    range.maximum,
  );
  const mid = randomSpinSeconds((size) => Math.floor(size / 2));
  assert.ok(mid > range.minimum && mid < range.maximum);
  const actual = randomSpinSeconds();
  assert.ok(actual >= range.minimum && actual <= range.maximum);
});
