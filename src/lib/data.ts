import hardwareData from '../../data/hardware.json';
import softwareData from '../../data/software.json';
import unlocksData from '../../data/unlocks.json';
import kumiawaseRaw from '../../data/kumiawase.csv?raw';

export const hardware = hardwareData;
export const software = softwareData;

export interface Compatibility {
  genres: string[];
  contents: string[];
  matrix: Map<string, Map<string, string>>;
}

// kumiawase.csv は引用符なしの単純CSVなので分割で十分（先頭のBOMを除去）
export function parseCompatibility(raw: string): Compatibility {
  const text = raw.replace(/^\uFEFF/, '').trim();
  const lines = text.split(/\r?\n/);
  const genres = lines[0].split(',').slice(1);
  const matrix = new Map<string, Map<string, string>>();

  for (const line of lines.slice(1)) {
    if (!line) continue;
    const cells = line.split(',');
    const row = new Map<string, string>();
    genres.forEach((g, i) => row.set(g, cells[i + 1]));
    matrix.set(cells[0], row);
  }

  return { genres, contents: [...matrix.keys()], matrix };
}

export const kumiawase = parseCompatibility(kumiawaseRaw);

// ジャンル・内容の解放年（defaultYear 未満のものはその年から解放）
const unlocks = unlocksData as {
  defaultYear: number;
  genres: Record<string, number>;
  contents: Record<string, number>;
};

export function genreUnlockYear(genre: string): number {
  return unlocks.genres[genre] ?? unlocks.defaultYear;
}

export function contentUnlockYear(content: string): number {
  return unlocks.contents[content] ?? unlocks.defaultYear;
}

export function availableGenres(year: number): string[] {
  return kumiawase.genres.filter((g) => genreUnlockYear(g) <= year);
}

export function availableContents(year: number): string[] {
  return kumiawase.contents.filter((c) => contentUnlockYear(c) <= year);
}
