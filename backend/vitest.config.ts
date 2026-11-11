import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.spec.ts'],
          exclude: ['src/**/*.integration.spec.ts'],
          setupFiles: ['src/test/unit-rate-limit-setup.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['src/**/*.integration.spec.ts'],
          globalSetup: ['src/test/integration-global-setup.ts'],
          setupFiles: ['src/test/integration-env.ts'],
          fileParallelism: false,
          testTimeout: 15_000,
        },
      },
    ],
  },
});
