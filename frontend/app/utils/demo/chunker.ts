/**
 * Text chunking for the static demo.
 * Mirrors LangChain's RecursiveCharacterTextSplitter (chunk_size=1000, chunk_overlap=200,
 * keep_separator=True) used by backend/app/Services/embedding_service.py.
 */

export const CHUNK_SIZE = 1000;
export const CHUNK_OVERLAP = 200;
const SEPARATORS = ["\n\n", "\n", " ", ""];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Split on a separator, keeping the separator at the start of the following piece. */
function splitKeepingSeparator(text: string, separator: string): string[] {
  if (separator === "") return text.split("");
  const pieces = text.split(new RegExp(`(${escapeRegExp(separator)})`));
  const splits: string[] = [pieces[0]];
  for (let i = 1; i < pieces.length; i += 2) {
    splits.push(pieces[i] + (pieces[i + 1] ?? ""));
  }
  return splits.filter((s) => s !== "");
}

function mergeSplits(splits: string[], chunkSize: number, chunkOverlap: number): string[] {
  const docs: string[] = [];
  let current: string[] = [];
  let total = 0;

  const emit = () => {
    const doc = current.join("").trim();
    if (doc) docs.push(doc);
  };

  for (const piece of splits) {
    const length = piece.length;
    if (total + length > chunkSize && current.length > 0) {
      emit();
      while (total > chunkOverlap || (total + length > chunkSize && total > 0)) {
        total -= current[0].length;
        current = current.slice(1);
      }
    }
    current.push(piece);
    total += length;
  }
  emit();
  return docs;
}

function splitRecursively(text: string, separators: string[], chunkSize: number, chunkOverlap: number): string[] {
  let separator = separators[separators.length - 1];
  let rest: string[] = [];
  for (let i = 0; i < separators.length; i++) {
    const candidate = separators[i];
    if (candidate === "") {
      separator = candidate;
      break;
    }
    if (text.includes(candidate)) {
      separator = candidate;
      rest = separators.slice(i + 1);
      break;
    }
  }

  const final: string[] = [];
  let good: string[] = [];
  for (const piece of splitKeepingSeparator(text, separator)) {
    if (piece.length < chunkSize) {
      good.push(piece);
      continue;
    }
    if (good.length) {
      final.push(...mergeSplits(good, chunkSize, chunkOverlap));
      good = [];
    }
    if (rest.length === 0) final.push(piece);
    else final.push(...splitRecursively(piece, rest, chunkSize, chunkOverlap));
  }
  if (good.length) final.push(...mergeSplits(good, chunkSize, chunkOverlap));
  return final;
}

export interface TextChunk {
  content: string;
  metadata: { page: number; chunk: number };
}

/**
 * Chunk the whole document, then work out which page each chunk starts on
 * so answers can cite a page.
 */
export function createTextChunks(pages: string[], chunkSize = CHUNK_SIZE, chunkOverlap = CHUNK_OVERLAP): TextChunk[] {
  const text = pages.join("\n");
  if (!text.trim()) throw new Error("Cannot chunk empty text");

  const pageStarts: number[] = [];
  let offset = 0;
  for (const page of pages) {
    pageStarts.push(offset);
    offset += page.length + 1;
  }
  const pageAt = (position: number) => {
    let page = 1;
    pageStarts.forEach((start, i) => {
      if (position >= start) page = i + 1;
    });
    return page;
  };

  let cursor = 0;
  return splitRecursively(text, SEPARATORS, chunkSize, chunkOverlap).map((content, index) => {
    const found = text.indexOf(content, Math.max(0, cursor - chunkOverlap - 1));
    const start = found === -1 ? cursor : found;
    cursor = start + 1;
    return { content, metadata: { page: pageAt(start), chunk: index + 1 } };
  });
}
