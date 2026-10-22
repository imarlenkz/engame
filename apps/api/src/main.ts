import 'reflect-metadata';
import { SwaggerModule } from '@nestjs/swagger';
import { createApp, openApiDocument, API_PREFIX } from './bootstrap';

async function main() {
  const { app, env } = await createApp();
  if (env.NODE_ENV !== 'production' || env.SWAGGER_PUBLIC) {
    SwaggerModule.setup(`${API_PREFIX}/docs`, app, openApiDocument(app), {
      jsonDocumentUrl: `${API_PREFIX}/openapi.json`,
    });
  }
  await app.listen(env.PORT, '0.0.0.0');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
