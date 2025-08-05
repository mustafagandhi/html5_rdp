import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          vendor: ['webrtc-adapter', 'simple-peer', 'socket.io-client'],
          utils: ['uuid', 'qrcode', 'js-cookie', 'dayjs', 'lodash-es'],
        },
      },
    },
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
  },
  server: {
    port: 3000,
    host: true,
    https: false, // Enable for production
  },
  preview: {
    port: 3000,
    host: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
      '@components': resolve(__dirname, 'components'),
      '@utils': resolve(__dirname, 'utils'),
      '@services': resolve(__dirname, 'services'),
      '@pages': resolve(__dirname, 'pages'),
    },
  },
  define: {
    __VERSION__: JSON.stringify(process.env.npm_package_version),
  },
}); 