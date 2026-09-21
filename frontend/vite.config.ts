import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

const certificateDirectory = path.resolve("certs");

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true
      }
    },
    https: {
      key: fs.readFileSync(path.join(certificateDirectory, "localhost-key.pem")),
      cert: fs.readFileSync(path.join(certificateDirectory, "localhost.pem"))
    }
  }
});
