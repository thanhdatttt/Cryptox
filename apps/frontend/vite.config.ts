import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const authProxyTarget = env.VITE_AUTH_PROXY_TARGET || env.VITE_BACKEND_URL || "http://localhost:3000";

  return {
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
