import Elysia, { t } from 'elysia';
import { RequireAuth } from '../middlewares/auth';
import type { ServiceResponse } from '../services/response';
import { executeQuestion } from '../services/user';

export const QueryRoute = new Elysia({ name: 'Route.Query' })
  .use(RequireAuth)
  .post(
    '/query',
    ({ user, body, database }): Promise<ServiceResponse<{ result: number | null }>> =>
      executeQuestion({ ...body, database, user }),
    {
      body: t.Object({ query: t.String() }),
    },
  );
