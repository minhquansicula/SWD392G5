import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['tests/ui/**/*.test.tsx'],
    setupFiles: ['tests/ui/setup.ts'],
    env: { DEBUG_PRINT_LIMIT: '1200' },
    maxWorkers: 2,
    testTimeout: 10000,
    clearMocks: true,
    restoreMocks: true,
  },
});
