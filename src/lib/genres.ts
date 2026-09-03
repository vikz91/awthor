function addGenre(genres: string[], seen: Set<string>, value: string) {
  const genre = value.trim();
  const key = genre.toLocaleLowerCase();

  if (!genre || seen.has(key)) {
    return;
  }

  seen.add(key);
  genres.push(genre);
}

/** Parses the persisted CSV genre field, including quoted commas and escaped quotes. */
export function parseGenreCsv(value: string): string[] {
  const genres: string[] = [];
  const seen = new Set<string>();
  let field = "";
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (character === '"') {
      if (quoted && value[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (!quoted && (character === "," || character === "\n" || character === "\r")) {
      addGenre(genres, seen, field);
      field = "";
      if (character === "\r" && value[index + 1] === "\n") {
        index += 1;
      }
      continue;
    }

    field += character;
  }

  addGenre(genres, seen, field);
  return genres;
}

function serializeGenre(genre: string): string {
  return /[",\r\n]/.test(genre) ? `"${genre.replaceAll('"', '""')}"` : genre;
}

/** Serializes genres as one canonical, portable CSV line. */
export function serializeGenreCsv(genres: readonly string[]): string {
  const normalized = parseGenreCsv(genres.map(serializeGenre).join(","));
  return normalized.map(serializeGenre).join(", ");
}

export function normalizeGenreCsv(value: string): string {
  return serializeGenreCsv(parseGenreCsv(value));
}

export function mergeGenres(...groups: readonly (readonly string[])[]): string[] {
  return parseGenreCsv(groups.flat().map(serializeGenre).join(","));
}

export function hasOpenGenreCsvQuote(value: string): boolean {
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== '"') {
      continue;
    }
    if (quoted && value[index + 1] === '"') {
      index += 1;
      continue;
    }
    quoted = !quoted;
  }

  return quoted;
}
