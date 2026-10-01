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
        },
      },
    ],
  },
});
