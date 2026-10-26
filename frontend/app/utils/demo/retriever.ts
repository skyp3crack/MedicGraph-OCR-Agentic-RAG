/**
 * Retrieval + answer composition for the static demo.
 *
 * The live system embeds chunks into ChromaDB and asks Gemini to answer from the top-k context.
 * Here the same shape is reproduced in the browser: BM25 ranking over the de-identified chunks,
 * then an extractive answer built only from the retrieved text. Nothing outside the report is used,
 * and the assistant declines when the report does not contain the answer.
 */
import type { TextChunk } from "./chunker";

const STOPWORDS = new Set(
  (
    "a an the and or of to in on at for with without by from is are was were be been being do does did " +
    "what which who whom whose when where why how this that these those it its as into about any all " +
    "can could should would may might will shall has have had having me my i you your we our they their " +
    "tell show give please explain describe list there patient report document up prescribed given performed taken received done noted found"
  ).split(" "),
);

const stem = (t: string) => (t.length > 4 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t);

export const tokenize = (text: string): string[] =>
  (text.toLowerCase().match(/[a-z0-9][a-z0-9.\-/]*/g) ?? [])
    .map((t) => t.replace(/[.\-/]+$/g, ""))
    .flatMap((t) => (t.includes("-") && !/^\d/.test(t) ? [t, ...t.split("-")] : [t]))
    .map(stem)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));

export interface RetrievalIndex {
  chunks: TextChunk[];
  tokens: string[][];
  avgLength: number;
  docFreq: Map<string, number>;
}

export function buildIndex(chunks: TextChunk[]): RetrievalIndex {
  const tokens = chunks.map((c) => tokenize(c.content));
  const docFreq = new Map<string, number>();
  tokens.forEach((list) => new Set(list).forEach((t) => docFreq.set(t, (docFreq.get(t) ?? 0) + 1)));
  const avgLength = tokens.reduce((sum, list) => sum + list.length, 0) / Math.max(1, tokens.length);
  return { chunks, tokens, avgLength, docFreq };
}

const idf = (index: RetrievalIndex, term: string) => {
  const n = index.chunks.length;
  const df = index.docFreq.get(term) ?? 0;
  return Math.log(1 + (n - df + 0.5) / (df + 0.5));
};

export function search(index: RetrievalIndex, query: string, k = 5) {
  const terms = [...new Set(tokenize(query))];
  const k1 = 1.5;
  const b = 0.75;

  return index.chunks
    .map((chunk, i) => {
      const list = index.tokens[i];
      let score = 0;
      for (const term of terms) {
        const tf = list.filter((t) => t === term).length;
        if (!tf) continue;
        score += idf(index, term) * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * list.length) / index.avgLength)));
      }
      return { chunk, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, k);
}

const IDENTITY_QUESTION =
  /\b(name|ic\b|nric|identity card|mykad|phone|telephone|contact number|email|address|mrn|registration (?:no|number)|passport)\b/i;

const NO_ANSWER = "I don't have enough information in the provided report to answer that question.";

/** Sentences of a chunk, with a short trailing "Label:" glued to the sentence it introduces. */
const splitSentences = (text: string): string[] => {
  const parts = text
    .split(/\n\s*[•●▪]\s*|\n\s*o\s+(?=[A-Z])|(?<=[.!?])\s+(?=[A-Z0-9])|\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const sentences: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    let sentence = parts[i];
    while (/:\.?$/.test(sentence) && sentence.length < 60 && i + 1 < parts.length) {
      sentence = `${sentence.replace(/\.$/, "")} ${parts[++i]}`;
    }
    if (sentence.length > 28 && !/\bSULIT\b|No\. Ruj\./.test(sentence)) sentences.push(sentence);
  }
  return sentences;
};

const clip = (sentence: string, max = 240) => (sentence.length > max ? `${sentence.slice(0, max).trimEnd()}...` : sentence);

export interface DemoAnswer {
  answer: string;
  source_chunks: { content: string; metadata: Record<string, unknown> }[];
}

export function answerQuestion(index: RetrievalIndex, question: string): DemoAnswer {
  const hits = search(index, question, 5);
  const terms = [...new Set(tokenize(question))];

  if (IDENTITY_QUESTION.test(question) && !/\b(hospital|doctor|dr\b|ward|department)\b/i.test(question)) {
    return {
      answer:
        "That detail is a personal identifier. It was removed by the PHI de-identification step before the report was indexed, so the assistant cannot see it. Use the patient fields in the validation workbench instead.",
      source_chunks: [],
    };
  }

  if (!hits.length || terms.length === 0) return { answer: NO_ANSWER, source_chunks: [] };

  // If most of what was asked never appears in the report, decline rather than guess.
  const unseen = terms.filter((t) => !index.docFreq.has(t));
  if (unseen.length / terms.length >= 0.5) return { answer: NO_ANSWER, source_chunks: [] };

  // Rank the sentences of the retrieved chunks (BM25 at sentence level), de-duplicating the chunk overlap.
  const seen = new Set<string>();
  const sentences = hits.flatMap(({ chunk }) =>
    splitSentences(chunk.content)
      .filter((sentence) => {
        const key = sentence.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((sentence, position) => ({ sentence, order: chunk.metadata.chunk * 1000 + position })),
  );
  const avgLength = sentences.reduce((sum, { sentence }) => sum + tokenize(sentence).length, 0) / Math.max(1, sentences.length);
  const k1 = 1.4;
  const b = 0.25;

  const best = sentences
    .map((entry) => {
      const words = tokenize(entry.sentence);
      let weight = 0;
      for (const term of terms) {
        const tf = words.filter((w) => w === term).length;
        if (tf) weight += idf(index, term) * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * words.length) / avgLength)));
      }
      return { ...entry, weight };
    })
    .filter((entry) => entry.weight > 0)
    .sort((x, y) => Math.round(y.weight * 4) - Math.round(x.weight * 4) || y.sentence.length - x.sentence.length)
    .filter((entry, _i, ranked) => entry.weight >= 0.55 * ranked[0].weight)
    .slice(0, 3)
    .sort((x, y) => x.order - y.order);

  if (!best.length) return { answer: NO_ANSWER, source_chunks: [] };

  const answer = `Based on the report: ${best.map((s) => clip(s.sentence).replace(/[.\s]+$/, "")).join(". ")}.`;
  return {
    answer,
    source_chunks: hits.slice(0, 3).map(({ chunk }) => ({ content: chunk.content, metadata: { ...chunk.metadata } })),
  };
}
