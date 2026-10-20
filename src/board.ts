/** Keep the complete name visible, including long unbroken names, in four TV-style rows. */
export function boardLayout(text: string) {
  for (let columns = 14; columns <= 24; columns++) {
    const lines: string[] = [];
    let line = "";
    for (const word of text.trim().split(/\s+/)) {
      for (let offset = 0; offset < word.length; offset += columns) {
        const piece = word.slice(offset, offset + columns);
        if (line && line.length + piece.length + 1 > columns) {
          lines.push(line);
          line = "";
        }
        line = line ? `${line} ${piece}` : piece;
        if (offset + columns < word.length) {
          lines.push(line);
          line = "";
        }
      }
    }
    if (line) lines.push(line);
    if (lines.length > 4) continue;
    const rows = Array<string>(4).fill("");
    const start = Math.floor((4 - lines.length) / 2);
    lines.forEach((value, index) => {
      rows[start + index] = value;
    });
    return { rows, columns };
  }
  return {
    rows: [
      text.slice(0, 24),
      text.slice(24, 48),
      text.slice(48, 72),
      text.slice(72, 96),
    ],
    columns: 24,
  };
}
