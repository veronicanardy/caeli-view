import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/js/**/*.test.ts'],
        environment: 'node',
        globals: false,
        reporters: 'default',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
        },
    },
});
