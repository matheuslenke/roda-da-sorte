import type { Participant } from "./raffle";

export type WheelEntry = Participant & { weight?: number };
export type VisualGroup = { entry: WheelEntry; members: Participant[] };
export const GROUP_THRESHOLD = 48;
export const GROUP_SIZE = 25;

/** These groups present an already uniform person-level draw; they never choose the winner. */
export function visualGroups(people: Participant[]): VisualGroup[] {
  if (people.length <= GROUP_THRESHOLD) return [];
  const count = Math.ceil(people.length / GROUP_SIZE);
  const size = Math.floor(people.length / count);
  const extra = people.length % count;
  let offset = 0;
  return Array.from({ length: count }, (_, index) => {
    const members = people.slice(
      offset,
      offset + size + (index < extra ? 1 : 0),
    );
    offset += members.length;
    return {
      entry: {
        id: `visual-group-${index + 1}`,
        name: `GRUPO ${String(index + 1).padStart(2, "0")}`,
        weight: members.length,
      },
      members,
    };
  });
}

export function wheelSectors(entries: WheelEntry[]) {
  const total = entries.reduce((sum, entry) => sum + (entry.weight ?? 1), 0);
  let position = 0;
  return entries.map((entry) => {
    const start = (position / total) * 360;
    position += entry.weight ?? 1;
    const end = (position / total) * 360;
    return { start, end, center: (start + end) / 2 };
  });
}

export function entryLanding(
  current: number,
  index: number,
  entries: WheelEntry[],
  direction: 1 | -1 = 1,
) {
  const sector = wheelSectors(entries)[index];
  if (!sector) throw new Error("Fatia inválida.");
  const target = (360 - sector.center) % 360;
  const modulo = (angle: number) => ((angle % 360) + 360) % 360;
  return direction === 1
    ? current + 360 * 6 + modulo(target - current)
    : current - 360 * 6 - modulo(current - target);
}

export function groupForPerson(groups: VisualGroup[], participantId: string) {
  const index = groups.findIndex((group) =>
    group.members.some((person) => person.id === participantId),
  );
  if (index < 0) throw new Error("Participante fora dos grupos.");
  const group = groups[index];
  return {
    group,
    index,
    memberIndex: group.members.findIndex(
      (person) => person.id === participantId,
    ),
  };
}
