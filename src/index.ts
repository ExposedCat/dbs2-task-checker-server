import { Elysia, t } from 'elysia';
import { jwt as jwtPlugin } from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';

import { getUser, loginUser } from './services/user.js';
import { execute } from './services/execute/index.js';
import { getDatasets } from './services/datasets.js';
import { createDbConnection } from './services/database.js';

// FIXME: Move to env
const _database = await createDbConnection('mongodb://127.0.0.1:27017');

const app = new Elysia()
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
  .on('error', ({ error }) => console.error(error))
  .derive(async () => ({
    database: _database,
  }))
  .post(
    '/login',
    async ({ jwt, body, database, error }) => {
      const userId = await loginUser({ database, ...body });
      if (!userId) {
        return error(401, 'Unauthorized');
      }
      return {
        token: await jwt.sign({ userId }),
      };
    },
    {
      body: t.Object({
        login: t.String(),
        password: t.String(),
      }),
    },
  )
  .derive(async ({ database, jwt, headers, error }) => {
    const token = headers['authorization'];
    const data = await jwt.verify(token);
    if (!data) {
      return error(401, 'Unauthorized');
    }
    const user = await getUser({ database, userId: data.userId });
    if (!user) {
      return error(401, 'Unauthorized');
    }
    return { user };
  })
  .get('/session', ({ user }) => user)
  .get('/datasets', ({ database }) => getDatasets({ database }))
  .post(
    '/query',
    ({ user, body }) =>
      execute({
        ...(body as any), // TODO:
        user,
      }),
    {
      body: t.Object({
        dataset: t.String(),
        query: t.String(),
        port: t.Optional(t.Number()),
      }),
    },
  )
  .all('*', async ({ error }) => error(404, { message: 'Not Found' }))
  .listen(8080);

console.log(`🦊 DBS Portal API is running at http://${app.server?.hostname}:${app.server?.port}`);
