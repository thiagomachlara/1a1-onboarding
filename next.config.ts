import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Manter console.log em produção para debug
  compiler: {
    removeConsole: false,
  },
};

export default nextConfig;

