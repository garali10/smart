import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        exportType: "named",
        ref: true,
        svgo: false,
        titleProp: true,
      },
      include: '**/*.svg', // petite correction ici aussi : "**" pour tous les sous-dossiers
    })
  ],
  server: {
    port: 3001, // or any available port for frontend
    proxy: {
      '/api': {
        target: 'http://localhost:5001', // your backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env': {}
  },
  optimizeDeps: {
    include: ['react-router-dom']
  }
});