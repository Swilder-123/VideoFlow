import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests', testMatch: 'installed.acceptance.js', workers: 1,
  timeout: 180_000, reporter: 'list', outputDir: 'test-results/installed',
})
