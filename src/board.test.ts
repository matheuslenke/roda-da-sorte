import { test } from "node:test";
import assert from "node:assert/strict";
import { boardLayout } from "./board.ts";

test("The TV board centers short names and preserves all letters of 80-character names", () => {
  for (const text of [
    "ANA SOUZA",
    "A".repeat(80),
    "ALEXANDRE MARIA DE ALBUQUERQUE E SILVA",
    Array(40).fill("A").join(" "),
  ]) {
    const { rows, columns } = boardLayout(text);
    assert.equal(rows.length, 4);
    assert.ok(rows.every((row) => row.length <= columns));
    assert.equal(rows.join("").replace(/\s/g, ""), text.replace(/\s/g, ""));
  }
  assert.deepEqual(boardLayout("ANA").rows, ["", "ANA", "", ""]);
});
