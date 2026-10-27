/**
 * Static demo switch. When NEXT_PUBLIC_STATIC_DEMO is "true" the API client in ../api.ts talks to the
 * in-browser engine instead of the FastAPI backend.
 */
export const IS_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

export const PORTFOLIO_URL = "https://my-portfolio-khalif-amin.vercel.app/projects";

export * as demoAuth from "./authStore";
export * as demoEngine from "./engine";
