import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addNames,
  csvResults,
  landingRotation,
  normalizeName,
  parseCsv,
  randomIndex,
} from "./raffle.ts";

test("CSV accepts BOM, semicolons, known headers and a name column beyond the first", () => {
  assert.deepEqual(
    parseCsv("\uFEFFemail;Nome\r\na@b.com;Ana Souza\r\nc@d.com;João Pedro"),
    ["Ana Souza", "João Pedro"],
  );
  assert.deepEqual(
    parseCsv('nome,email\n"Silva, Ana",a@b.com\n"João ""JP""",c@d.com'),
    ["Silva, Ana", 'João "JP"'],
  );
  assert.deepEqual(parseCsv("Ana\nBruno\nCamila"), ["Ana", "Bruno", "Camila"]);
  assert.deepEqual(parseCsv('Nome\n"Ana\nMaria"'), ["Ana\nMaria"]);
  assert.throws(() => parseCsv('nome\n"Ana'), /aspas/);
  assert.deepEqual(parseCsv('"Ana; Maria",ana@example.com\nBruno,bruno@example.com'), ['Ana; Maria', 'Bruno']);
});

test("Names are normalized and deduplicated without silently allowing empty entries", () => {
  assert.equal(normalizeName("  JOÃO   Pedro "), "joao pedro");
  const result = addNames(
    [],
    ["João Pedro", "JOAO PEDRO", "", "   ", "Ana", "x".repeat(81)],
  );
  assert.equal(result.added, 2);
  assert.equal(result.duplicates, 1);
  assert.equal(result.invalid, 1);
  assert.deepEqual(
    result.participants.map((person) => person.name),
    ["João Pedro", "Ana"],
  );
});

test("Rejection sampling rejects the biased tail and produces only valid indices", () => {
  let call = 0;
  const index = randomIndex(3, (array) => {
    array[0] = call++ === 0 ? 0xffffffff : 5;
    return array;
  });
  assert.equal(index, 2);
  assert.equal(call, 2);
  assert.equal(randomIndex(1), 0);
  assert.throws(() => randomIndex(0));
  for (let length = 1; length <= 300; length++) {
    const index = randomIndex(length);
    assert.ok(index >= 0 && index < length);
  }
});

test("Every wheel segment lands with its center precisely under the top pointer", () => {
  for (const count of [1, 2, 3, 16, 48, 300]) {
    for (let index = 0; index < count; index++) {
      const current = 2587.7;
      const rotation = landingRotation(current, index, count);
      const center = (index + 0.5) * (360 / count);
      const distance = Math.abs((rotation + center) % 360);
      assert.ok(distance < 0.00001 || Math.abs(distance - 360) < 0.00001);
      assert.ok(rotation - current >= 2160);
    }
  }
});

test("Results export escapes quotes and protects names interpreted as spreadsheet formulas", () => {
  const csv = csvResults([
    {
      id: "1",
      name: '=SUM(1,2) "Ana"',
      participantId: "a",
      date: "2026-10-20T10:00:00.000Z",
      round: 1,
      poolSize: 16,
    },
  ]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'=SUM(1,2) ""Ana"""'));
});
