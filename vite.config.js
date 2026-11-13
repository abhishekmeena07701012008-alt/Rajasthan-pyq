import { defineConfig } from "vite";

export default defineConfig({

    // Project root directory
    root: ".",

    // Development server settings
    server: {
        host: "0.0.0.0",
        port: 5173,
        strictPort: true,
        open: true
    },

    // Preview server settings
    preview: {
        host: "0.0.0.0",
        port: 4173
    },

    // Production build settings
    build: {
        outDir: "dist",
        assetsDir: "assets",
        sourcemap: true,
        minify: "esbuild",
        emptyOutDir: true
    },

    // Public assets directory
    publicDir: "public",

    // CSS settings
    css: {
        devSourcemap: true
    },

    // Dependency optimization
    optimizeDeps: {
        include: [
            "firebase/app",
            "firebase/auth",
            "firebase/firestore",
            "firebase/storage"
        ]
    }

});
