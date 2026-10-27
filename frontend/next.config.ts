import type { NextConfig } from "next";

// The static demo (see scripts/build-demo.mjs) is exported as plain files and runs without the FastAPI backend.
const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

const nextConfig: NextConfig = {
  ...(isStaticDemo && {
    output: "export",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
