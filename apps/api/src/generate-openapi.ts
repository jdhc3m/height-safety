import 'reflect-metadata';

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { configureApiApp } from './api-bootstrap';
import { AppModule } from './app.module';

function sortForStableJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForStableJson);
  }

  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortForStableJson(child)]),
    );
  }

  return value;
}

async function generate(): Promise<void> {
  const outputArgument = process.argv[2];
  if (!outputArgument) {
    throw new Error('Usage: generate-openapi <output-file>');
  }

  const outputPath = resolve(outputArgument);
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApiApp(app);

  try {
    await app.init();
    const config = new DocumentBuilder()
      .setTitle('Height Safety API')
      .setDescription(
        'Prototype API contract; not a compliance or certification service.',
      )
      .setVersion('1.0.0')
      .addServer('/api/v1', 'Version 1 API')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'opaque' },
        'access-token',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    document.info.license = { name: 'Proprietary prototype' };
    document.security = [];
    const stableDocument = sortForStableJson(document);

    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      `${JSON.stringify(stableDocument, null, 2)}\n`,
      'utf8',
    );
  } finally {
    await app.close();
  }
}

void generate();
