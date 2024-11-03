import { jwt as jwtPlugin } from '@elysiajs/jwt';
import { Elysia, t } from 'elysia';

import cors from '@elysiajs/cors';
import { createDbConnection } from '../services/database';

export const RequireBase = new Elysia({ name: 'Middleware.Base' })
  .use(cors())
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
  .on('error', ({ error }) => {
    console.error(error);
    return { ok: false, data: null, error: error.message ?? 'Unknown error' };
  })
  .decorate(
    'database', //
    await createDbConnection(process.env.DB_CONNECTION_URL ?? 'mongodb://127.0.0.1:27017'),
  )
  .as('plugin');
