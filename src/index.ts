import { Elysia, t } from 'elysia';
import { jwt as jwtPlugin } from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';

import { executeQuestion, getUser, loginUser, startTestSession } from './services/user.js';
import type { DatasetName, ExecuteResult } from './services/execute/index.js';
import { getDataset, getDatasets } from './services/datasets.js';
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
  // .post(
  //   '/dataset',
  //   ({ database, body }) => {
  //     const bank = body.bank.map(item => ({
  //       kind: body.kind,
  //       question: item.Question,
  //       solution: item.Solution,
  //       test: item.Test,
  //     }));
  //     return database.datasets.updateOne(
  //       { id: body.id },
  //       {
  //         $push: { bank: { $each: bank } },
  //         $setOnInsert: {
  //           id: body.id,
  //           name: body.name,
  //         },
  //       },
  //       { upsert: true },
  //     );
  //   },
  //   {
  //     body: t.Object({
  //       id: t.String(),
  //       kind: t.String(),
  //       name: t.String(),
  //       bank: t.Array(
  //         t.Object({
  //           Question: t.String(),
  //           Solution: t.String(),
  //           Test: t.String(),
  //         }),
  //       ),
  //     }),
  //   },
  // )
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
  .get('/dataset', ({ query }) => getDataset({ ...query }), {
    query: t.Object({
      datasetId: t.String(),
      format: t.Union([t.Literal('txt'), t.Literal('json')]),
    }),
  })
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
  .get('/session', ({ user }) => {
    const nextTaskIndex = user.testSession?.tasks.findIndex(task => !task.userSolution);
    const nextTask =
      nextTaskIndex === undefined || nextTaskIndex === -1 ? null : user.testSession!.tasks[nextTaskIndex];
    return {
      date: Date.now(),
      login: user.user,
      testSession: nextTask && {
        kind: nextTask.kind,
        datasetId: user.testSession!.datasetId,
        question: nextTask.question,
        questionNumber: nextTaskIndex! + 1,
        questionTotal: user.testSession!.tasks.length,
      },
    };
  })
  .post(
    '/test-session',
    ({ database, user, body }) =>
      startTestSession({
        datasetId: body.datasetId as DatasetName,
        database,
        user,
        cathegories: {
          select: 5,
          insert: 5,
          update: 5,
          aggregate: 5,
        },
      }),
    { body: t.Object({ datasetId: t.String() }) },
  )
  .get('/datasets', ({ database }) => getDatasets({ database }))
  .post(
    '/query',
    async ({ user, body, database }): Promise<ExecuteResult> => executeQuestion({ ...body, database, user }),
    {
      body: t.Object({ query: t.String() }),
    },
  )
  .all('*', async ({ error }) => error(404, { message: 'Not Found' }))
  .listen(8080);

console.log(`🦊 DBS Portal API is running at http://${app.server?.hostname}:${app.server?.port}`);
