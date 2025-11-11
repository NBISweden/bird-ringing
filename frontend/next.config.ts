import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	sassOptions: {
		silenceDeprecations: ["color-functions", "global-builtin", "import"],
	},
	output: "export"
};

export default nextConfig;
