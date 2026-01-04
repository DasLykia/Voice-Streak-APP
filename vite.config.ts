import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // ADD THIS LINE:
  base: './', 
  server: {
    port: 5173,
    strictPort: true
  }
});