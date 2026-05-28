import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: '0.0.0.0',
        port: Number(process.env.VITE_PORT ?? 5173),
        hmr: {
            host: 'localhost',
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // React e ReactDOM em chunk próprio — carregados uma vez, cacheados longo prazo
                    if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
                        return 'vendor-react';
                    }
                    // Inertia + Ziggy em chunk próprio
                    if (id.includes('node_modules/@inertiajs/') || id.includes('node_modules/ziggy')) {
                        return 'vendor-inertia';
                    }
                    // astronomy-engine é pesado (~200KB) e só é usado na Home
                    if (id.includes('node_modules/astronomy-engine')) {
                        return 'vendor-astronomy';
                    }
                    // recharts e seus internals em chunk lazy próprio
                    if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-vendor')) {
                        return 'vendor-charts';
                    }
                },
            },
        },
    },
});
