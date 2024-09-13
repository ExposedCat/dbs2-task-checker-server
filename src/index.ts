import { Elysia, t } from 'elysia';
import { jwt as jwtPlugin } from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';

import { loginUser } from './services/user.js';
import { readDatasets } from './services/datasets.js';
import { createDbConnection } from './services/database.js';

const _database = await createDbConnection('mongodb://127.0.0.1:27017');
const _datasets = await readDatasets();

const app = new Elysia()
  .use(cors())
  .use(
    jwtPlugin({
      name: 'jwt',
      // FIXME: Move to env
      secret: 'Shirbity Shnorble',
    }),
  )
  .on('error', console.error)
  .derive(async () => ({
    database: _database,
    datasets: _datasets,
  }))
  .post(
    '/login',
    async ({ jwt, body, database, error }) => {
      const token = await loginUser({ database, ...body });
      if (!token) {
        return error(401, 'Unauthorized');
      }
      return jwt.sign({ token });
    },
    {
      body: t.Object({
        login: t.String(),
        password: t.String(),
      }),
    },
  )
  .get('/datasets', ({ datasets }) => datasets)
  .all('*', async ({ error }) => error(404, { message: 'Not Found' }))
  .listen(8080);

console.log(`🦊 DBS Portal API is running at http://${app.server?.hostname}:${app.server?.port}`);
