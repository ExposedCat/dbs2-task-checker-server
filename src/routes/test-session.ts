import Elysia, { t } from 'elysia';
import { RequireAuth } from '../middlewares/auth';
import type { DatasetName } from '../services/execute';
import { startTestSession } from '../services/user';

export const TestSessionRoute = new Elysia({ name: 'Route.TestSession' }) //
  .use(RequireAuth)
  .post(
    '/test-session',
    ({ database, user, body }) =>
      startTestSession({
        datasetId: body.datasetId as DatasetName,
        database,
        user,
        cathegories: {
          // TODO:
          select: 6,
          insert: 3,
          update: 3,
          // aggregate: 0,
        },
        minPoints: 10,
      }),
    { body: t.Object({ datasetId: t.String() }) },
  );
