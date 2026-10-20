export type Participant = { id: string; name: string };
export type Draw = {
  id: string;
  name: string;
  participantId: string;
  date: string;
  round: number;
  poolSize: number;
};
export const MAX_PARTICIPANTS = 300;
export const INITIAL_NAMES = [
  "Ana Souza",
  "Bruno Lima",
  "Camila Rocha",
  "Diego Santos",
  "Elisa Martins",
  "Felipe Costa",
  "Gabriela Alves",
  "Henrique Melo",
  "Isabela Dias",
  "João Pedro",
  "Karina Oliveira",
  "Lucas Ribeiro",
  "Mariana Silva",
  "Nicolas Ferreira",
  "Paula Mendes",
  "Rafael Gomes",
];

export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function addNames(existing: Participant[], names: string[]) {
  const seen = new Set(existing.map((person) => normalizeName(person.name)));
  const added: Participant[] = [];
  let duplicates = 0;
  let invalid = 0;
  for (const rawName of names) {
    const name = rawName.trim().replace(/\s+/g, " ");
    if (!name) continue;
    if (
      name.length > 80 ||
      existing.length + added.length >= MAX_PARTICIPANTS
    ) {
      invalid++;
      continue;
    }
    const key = normalizeName(name);
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    added.push({ id: crypto.randomUUID(), name });
  }
  return {
    participants: [...existing, ...added],
    added: added.length,
    duplicates,
    invalid,
  };
}

/** Reads the name column, including quoted delimiters, CRLF and multiline fields. */
export function parseCsv(source: string): string[] {
  const text = source.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  let inQuotes = false;
  let commas = 0;
  let semicolons = 0;
  for (const character of firstLine) {
    if (character === '"') inQuotes = !inQuotes;
    if (!inQuotes && character === ',') commas++;
    if (!inQuotes && character === ';') semicolons++;
  }
  const delimiter = semicolons > commas ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index++;
      } else quoted = !quoted;
    } else if (!quoted && character === delimiter) {
      row.push(field);
      field = "";
    } else if (!quoted && (character === "\n" || character === "\r")) {
      if (character === "\r" && text[index + 1] === "\n") index++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (quoted)
    throw new Error(
      "O CSV tem aspas sem fechamento. Confira o arquivo e tente novamente.",
    );
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows[0]?.map(normalizeName) ?? [];
  const nameColumn = headers.findIndex((header) =>
    ["nome", "name", "nomes", "participante", "participantes"].includes(header),
  );
  return (nameColumn >= 0 ? rows.slice(1) : rows)
    .map((columns) => columns[Math.max(0, nameColumn)] ?? "")
    .filter((name) => name.trim());
}

/** Rejection sampling avoids modulo bias for pools that don't divide 2^32. */
export function randomIndex(
  length: number,
  fill: (array: Uint32Array) => Uint32Array = (array) =>
    crypto.getRandomValues(array),
): number {
  if (!Number.isSafeInteger(length) || length < 1 || length > MAX_PARTICIPANTS)
    throw new Error("Quantidade de participantes inválida.");
  const limit = Math.floor(2 ** 32 / length) * length;
  const value = new Uint32Array(1);
  do {
    fill(value);
  } while (value[0] >= limit);
  return value[0] % length;
}

export function landingRotation(
  current: number,
  index: number,
  count: number,
): number {
  const target = (360 - (index + 0.5) * (360 / count)) % 360;
  return current + 360 * 6 + ((target - (current % 360) + 360) % 360);
}

export function csvResults(draws: Draw[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  return (
    "\uFEFF" +
    [
      "Rodada;Nome;Data;Participantes",
      ...draws.map((draw) =>
        [
          draw.round,
          escape(/^[=+@\-\t\r]/.test(draw.name) ? `'${draw.name}` : draw.name),
          escape(draw.date),
          draw.poolSize,
        ].join(";"),
      ),
    ].join("\r\n")
  );
}
