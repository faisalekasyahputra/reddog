import type { NextConfig } from "next";

// ponytail: serve every image as the original file, no WebP/AVIF re-encode
const nextConfig: NextConfig = { images: { unoptimized: true } };

export default nextConfig;
