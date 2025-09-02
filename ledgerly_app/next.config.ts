import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  allowedDevOrigins: ["http://192.168.1.50:3000"],
  /* config options here */
};

export default nextConfig;
