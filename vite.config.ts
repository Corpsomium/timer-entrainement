import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { execSync } from 'node:child_process'

function resolveBuildHash(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return `local-${Date.now().toString(36)}`
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/timer-entrainement/',
  define: {
    __APP_BUILD__: JSON.stringify(resolveBuildHash()),
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
