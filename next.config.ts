import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // 显式锁定项目根，避免 Next 向上追溯到 C:\Users\jayv0
  // （会造成 "package-lock.json outside the current Git repository" 警告，
  //   并让 Turbopack 的模块解析范围失控）
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;