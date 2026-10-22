import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { createApp, openApiDocument } from './bootstrap';

/** Writes the OpenAPI document to a file (default: openapi.json) without starting the server. */
async function main() {
  const { app } = await createApp({ logger: false });
  const out = process.argv[2] ?? 'openapi.json';
  writeFileSync(out, JSON.stringify(openApiDocument(app), null, 2));
  await app.close();
  console.log(`OpenAPI written to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
