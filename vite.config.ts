import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    react({
      jsxImportSource: '@emotion/react',
      // @ts-expect-error – babel option is supported at runtime but missing from these type defs
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
  ],
  optimizeDeps: {
    include: ['@elastic/eui', '@elastic/eui-theme-borealis', '@emotion/react', '@emotion/css'],
  },
})
