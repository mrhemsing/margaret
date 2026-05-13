import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const createConfig = (phase: string): NextConfig => ({
  outputFileTracingRoot: process.cwd(),
  allowedDevOrigins: ["soma3.b-average.com"],
  // Keep `next dev` and `next build` from writing to the same directory.
  // Running a production build while the dev server is active can corrupt
  // the dev server's chunk manifest and cause missing-module white screens.
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
});

export default createConfig;
