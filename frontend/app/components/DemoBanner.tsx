"use client";

import { IS_DEMO, PORTFOLIO_URL } from "../utils/demo";

const STORAGE_PREFIX = "medicograph";

/** Shown only in the static demo build: explains where the data lives and offers a reset. */
export default function DemoBanner() {
  if (!IS_DEMO) return null;

  const resetDemo = () => {
    if (!window.confirm("Reset the demo? This signs you out and clears accounts and audit entries stored in this browser.")) return;
    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(STORAGE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    } catch {
      // storage unavailable: nothing to clear
    }
    window.location.href = "/signin";
  };

  return (
    <div className="flex-shrink-0 bg-slate-900 text-white text-[11px] leading-snug">
      <div className="px-4 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span>
          Static demo: the pipeline runs in your browser with sample data. Uploaded files never leave your device.
        </span>
        <span className="flex items-center gap-4">
          <button type="button" onClick={resetDemo} className="underline underline-offset-2 hover:text-primary-fixed-dim cursor-pointer">
            Reset demo
          </button>
          <a href={PORTFOLIO_URL} className="underline underline-offset-2 hover:text-primary-fixed-dim">
            Back to portfolio
          </a>
        </span>
      </div>
    </div>
  );
}
