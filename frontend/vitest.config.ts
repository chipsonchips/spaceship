import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        include: ['**/__tests__/**/*.spec.tsx', '**/__tests__/**/*.spec.ts'],
        exclude: ['node_modules', 'dist', '.next'],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
});
