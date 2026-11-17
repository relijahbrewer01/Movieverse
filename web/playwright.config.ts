import { defineConfig, devices } from '@playwright/test';

const port = 48173;

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:' + port, contextOptions: { reducedMotion: 'reduce' } },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'touch', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ' + port + ' --strictPort',
    url: 'http://127.0.0.1:' + port,
  },
});
