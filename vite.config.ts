import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        tailwindcss(),
        react(),
        dts({ include: ['src'], rollupTypes: true }),
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'SchemaFormsRenderer',
            formats: ['es', 'cjs'],
            fileName: (format) => format === 'es' ? 'index.js' : 'index.cjs',
        },
        rollupOptions: {
            external: [
                'react',
                'react-dom',
                'react/jsx-runtime',
                'react-hook-form',
                'lucide-react',
                '@schema-forms-data/core',
                '@schema-forms-data/templates',
                '@schema-forms-data/ui',
            ],
        },
        sourcemap: true,
        minify: false,
    },
});
