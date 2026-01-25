import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/services/**/*.ts', 'src/routes/**/*.ts'],
      thresholds: {
        'src/services/**/*.ts': { statements: 80, lines: 80 },
        'src/routes/**/*.ts': { statements: 70, lines: 70 },
      },
    },
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
