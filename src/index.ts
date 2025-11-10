import { z } from 'zod';

// Example usage of zod
const exampleSchema = z.object({
  name: z.string(),
  age: z.number().positive(),
});

type Example = z.infer<typeof exampleSchema>;

console.log('Web Agent Protocol - TypeScript/ESM project initialized!');

export { exampleSchema };
export type { Example };

