import { test } from "node:test";
import assert from "node:assert/strict";
import {
  entryLanding,
  groupForPerson,
  visualGroups,
  wheelSectors,
} from "./wheel-model.ts";
import { addNames, randomIndex } from "./raffle.ts";

test("500 names are accepted and presented as 20 groups of 25 without duplicates or omissions", () => {
  const names = Array.from(
    { length: 500 },
    (_, index) => `Pessoa ${index + 1}`,
  );
  const pool = addNames([], names).participants;
  assert.equal(pool.length, 500);
  const groups = visualGroups(pool);
  assert.equal(groups.length, 20);
  assert.ok(groups.every((group) => group.members.length === 25));
  assert.equal(
    new Set(groups.flatMap((group) => group.members.map((person) => person.id)))
      .size,
    500,
  );
  pool.forEach((person, index) => {
    const selected = randomIndex(500, (array) => {
      array[0] = index;
      return array;
    });
    assert.equal(pool[selected].id, person.id);
    const match = groupForPerson(groups, pool[selected].id);
    assert.equal(match.group.members[match.memberIndex].id, person.id);
  });
});

test("Incomplete groups keep person-level probabilities and proportional wheel slices", () => {
  for (const length of [49, 51, 499, 501, 999, 1000]) {
    const pool = Array.from({ length }, (_, index) => ({
      id: String(index),
      name: `Pessoa ${index + 1}`,
    }));
    const groups = visualGroups(pool);
    const entries = groups.map((group) => group.entry);
    const sectors = wheelSectors(entries);
    assert.equal(
      groups.reduce((sum, group) => sum + group.members.length, 0),
      length,
    );
    assert.ok(groups.every((group) => group.members.length <= 25));
    entries.forEach((entry, index) => {
      assert.ok(
        Math.abs(
          (sectors[index].end - sectors[index].start) / 360 -
            entry.weight! / length,
        ) < 1e-10,
      );
      const angle =
        (entryLanding(781.3, index, entries) + sectors[index].center) % 360;
      assert.ok(angle < 1e-8 || 360 - angle < 1e-8);
    });
  }
});

test("Either gesture direction lands on the same selected participant across positive and negative rotations", () => {
  const entries = Array.from({ length: 25 }, (_, index) => ({
    id: String(index),
    name: `Pessoa ${index}`,
  }));
  const sectors = wheelSectors(entries);
  for (const current of [-7943.2, -10, 0, 781.3, 9876]) {
    entries.forEach((_, index) => {
      for (const direction of [1, -1] as const) {
        const landing = entryLanding(current, index, entries, direction);
        assert.ok((landing - current) * direction >= 2160 - 1e-8);
        const aligned = (((landing + sectors[index].center) % 360) + 360) % 360;
        assert.ok(Math.min(aligned, 360 - aligned) < 1e-8);
      }
    });
  }
});
