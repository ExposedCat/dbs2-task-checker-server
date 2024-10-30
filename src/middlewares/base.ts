import '@elysiajs/cors';
import { Elysia, t } from 'elysia';
import { jwt as jwtPlugin } from '@elysiajs/jwt';

import { createDbConnection } from '../services/database.js';

export const RequireBase = new Elysia({ name: 'Middleware.Base' })
  .use(
    jwtPlugin({
      name: 'jwt',
      // FIXME: Move to env
      secret: 'Shirbity Shnorble',
      schema: t.Object({
        userId: t.String(),
      }),
    }),
  )
  .on('error', ({ error }) => console.error(error))
  .decorate(
    'database', //
    await createDbConnection(process.env.DB_CONNECTION_URL ?? 'mongodb://127.0.0.1:27017'),
  )
  .as('plugin');
