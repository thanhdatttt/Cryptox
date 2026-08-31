import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const repositoryRoot = resolve(__dirname, "../..");
  const env = loadEnv(mode, repositoryRoot, "VITE_");
  const authProxyTarget = env.VITE_AUTH_PROXY_TARGET || env.VITE_BACKEND_URL || "http://localhost:3000";

  return {
    envDir: repositoryRoot,
    envPrefix: "VITE_",
    plugins: [react() as any],
    server: {
      proxy: {
        "/api": {
          target: authProxyTarget,
          changeOrigin: false,
          xfwd: true,
          rewrite: (path: string) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
