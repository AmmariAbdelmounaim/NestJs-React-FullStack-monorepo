import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      // Swagger JSON endpoint from your NestJS API
      target: 'http://localhost:3000/api/docs/json',
    },
    output: {
      // Where to generate the API client code
      target: './src/api/generated',
      // Generate React Query hooks
      mode: 'tags-split',
      // File naming pattern
      schemas: './src/api/generated/model',
      client: 'react-query',
      // Override the default axios instance if needed
      override: {
        mutator: {
          path: './src/api/axios-instance.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useInfinite: false,
          useInfiniteQueryParam: 'page',
        },
      },
      // Generate TypeScript types
      prettier: true,
    },
  },
});
