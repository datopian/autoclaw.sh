import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const schema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  draft: z.boolean().optional(),
});

const playbooks = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../playbooks' }),
  schema,
});

const examples = defineCollection({
  loader: glob({ pattern: '*/README.md', base: '../examples' }),
  schema,
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: '../blog' }),
  schema: schema.extend({
    date: z.coerce.date(),
  }),
});

export const collections = { playbooks, examples, blog };
