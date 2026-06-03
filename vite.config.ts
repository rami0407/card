import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Trigger build after switching Pages source to GitHub Actions
export default defineConfig({
  plugins: [react()],
  base: '/card/',
})
