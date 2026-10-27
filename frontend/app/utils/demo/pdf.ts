/**
 * Browser-side PDF text extraction for the static demo (stand-in for pypdf / Docling).
 * pdf.js is copied into /public/pdfjs by scripts/build-demo.mjs and loaded on demand,
 * so it stays out of the app bundle.
 */

export interface PdfTextItem {
  str: string;
  hasEOL?: boolean;
  width?: number;
  height?: number;
  transform?: number[];
}

interface PdfJsModule {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: Uint8Array }) => {
    promise: Promise<{
      numPages: number;
      getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: PdfTextItem[] }> }>;
    }>;
  };
}

// A runtime import keeps bundlers from trying to resolve the file at build time.
const runtimeImport = new Function("url", "return import(url)") as (url: string) => Promise<PdfJsModule>;

let loader: Promise<PdfJsModule> | null = null;

function loadPdfJs(): Promise<PdfJsModule> {
  loader ??= runtimeImport("/pdfjs/pdf.min.mjs").then((mod) => {
    mod.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
    return mod;
  });
  return loader;
}

/**
 * Rebuilds readable text from pdf.js text items. pdf.js hands back many small fragments (a hyphen can be
 * its own item), so a space is only inserted where the fragments are visibly apart or on a new line.
 */
export function itemsToText(items: PdfTextItem[]): string {
  let out = "";
  let lastEnd = 0;
  let lastY: number | null = null;

  for (const item of items) {
    // Empty items are end-of-line markers; their coordinates already belong to the next line.
    if (item.str === "") {
      if (item.hasEOL && out && !out.endsWith("\n")) out += "\n";
      continue;
    }

    const x = item.transform?.[4] ?? 0;
    const y = item.transform?.[5] ?? 0;
    const size = item.height || Math.abs(item.transform?.[3] ?? 10) || 10;

    if (lastY !== null && Math.abs(y - lastY) > size * 0.5 && !out.endsWith("\n")) {
      out += "\n";
    } else if (out && !out.endsWith("\n") && !out.endsWith(" ") && !item.str.startsWith(" ") && x - lastEnd > size * 0.18) {
      out += " ";
    }

    out += item.str;
    if (item.hasEOL) out += "\n";
    lastEnd = x + (item.width ?? 0);
    lastY = y;
  }

  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Returns one string per page. Pages without a text layer (scans) come back empty. */
export async function extractPdfPages(file: File): Promise<string[]> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    pages.push(itemsToText(content.items));
  }
  return pages;
}
