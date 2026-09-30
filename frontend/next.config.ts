import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  sassOptions: {
    silenceDeprecations: ["color-functions", "global-builtin", "import"],
  },
  images: { unoptimized: true },
  output: "export",
};

export default nextConfig;
