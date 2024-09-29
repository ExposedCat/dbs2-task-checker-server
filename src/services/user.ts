import { ObjectId } from 'mongodb';
import type { WithId } from 'mongodb';

import { execute } from './execute/index.js';
import type { BaseExecuteArgs, DatasetName } from './execute/index.js';
import type { Dataset } from './datasets.js';
import type { Database } from './database.js';

export type User = {
  user: string;
  password: string;
  testSession: TestSession | null;
};

export type TestSession = {
  datasetId: DatasetName;
  tasks: {
    kind: string;
    question: string;
    solution: string;
    userSolution: string | null;
    correct: boolean;
    test: string;
  }[];
};

export type LoginUserArgs = {
  database: Database;
  login: string;
  password: string;
};

export async function loginUser(args: LoginUserArgs) {
  const { database, login, password } = args;

  const user = await database.users.findOne({ user: login });
  if (!user) {
    return null;
  }

  const passwordCorrect = password === user.password;
  if (!passwordCorrect) {
    return null;
  }

  return user._id.toString();
}

export type GetUserArgs = {
  database: Database;
  userId: string;
};

export async function getUser(args: GetUserArgs) {
  const { database, userId } = args;

  try {
    return await database.users.findOne({ _id: new ObjectId(userId) });
  } catch {
    return null;
  }
}

export type StartTestSessionArgs = {
  database: Database;
  user: WithId<User>;
  datasetId: DatasetName;
  cathegories: Record<string, number>;
};

export type StartTestSessionResponse = { response: string } & (
  | {
      ok: true;
      firstQuestion: string;
    }
  | {
      ok: false;
      firstQuestion: null;
    }
);

export async function startTestSession({
  database,
  user,
  datasetId,
  cathegories,
}: StartTestSessionArgs): Promise<StartTestSessionResponse> {
  if (user.testSession) {
    return { ok: false, response: 'Test session is already started', firstQuestion: null };
  }

  const maxLimit = Math.max(...Object.values(cathegories));

  const groups = await database.datasets
    .aggregate<{
      kind: string;
      bank: Dataset['bank'];
    }>([
      { '$match': { 'id': datasetId } },
      { '$unwind': { 'path': '$bank' } },
      { '$addFields': { 'random': { '$rand': {} } } },
      { '$sort': { 'random': 1 } },
      {
        '$group': {
          '_id': '$bank.kind',
          'bank': { '$push': '$bank' },
        },
      },
      {
        '$project': {
          '_id': 0,
          'kind': '$_id',
          'bank': { '$slice': ['$bank', maxLimit] },
        },
      },
    ])
    .toArray();

  const sessionBank: Dataset['bank'] = [];
  for (const { kind, bank } of groups) {
    const limit = cathegories[kind];
    if (limit) {
      sessionBank.push(...bank.slice(0, limit));
    }
  }

  if (sessionBank.length === 0) {
    return { ok: false, response: 'No questions were found by criteria', firstQuestion: null };
  }

  const tasks = sessionBank.map(item => ({ ...item, correct: false, userSolution: null }));
  await database.users.updateOne(
    { _id: user._id },
    {
      $set: {
        testSession: {
          datasetId,
          tasks,
        },
      },
    },
  );

  return { ok: true, response: `"${datasetId}" test session started`, firstQuestion: tasks[0].question };
}

export type ExecuteQuestionArgs = BaseExecuteArgs & {
  database: Database;
};

export async function executeQuestion({ database, user, query }: ExecuteQuestionArgs) {
  if (!user.testSession) {
    return { ok: false, response: 'Test session is not started' };
  }

  const { datasetId, tasks } = user.testSession;
  const currentTaskIndex = tasks.findIndex(task => !task.userSolution);
  if (currentTaskIndex === -1) {
    return { ok: false, response: 'All questions have been answered' };
  }
  const currentTask = tasks[currentTaskIndex];

  const error500 = { ok: false, response: 'Failed to test task. Please report to your teacher' };

  const getFinalResponse = async (commandResponse: string) => {
    if (!currentTask.test) {
      return { ok: true, response: commandResponse };
    }

    const result = await execute({
      datasetId,
      query: currentTask.test,
      user,
      noReset: true,
    });

    if (!result.ok) {
      return error500;
    }
    return result;
  };

  const { ok: solutionOk, response: solutionResponse } = await execute({ datasetId, query, user });
  if (!solutionOk) {
    return { ok: false, response: solutionResponse };
  }
  const solutionTest = await getFinalResponse(solutionResponse);
  if (!solutionTest.ok) return error500;

  const { ok: correctOk, response: correctResponse } = await execute({ datasetId, query: currentTask.solution, user });
  if (!correctOk) return error500;
  const correctTest = await getFinalResponse(correctResponse);
  if (!correctTest.ok) return error500;

  const isCorrect = solutionTest.response === correctTest.response;

  await database.users.updateOne(
    { user: user.user },
    {
      $set: {
        [`testSession.tasks.${currentTaskIndex}.userSolution`]: query,
        [`testSession.tasks.${currentTaskIndex}.correct`]: isCorrect,
      },
    },
  );

  return { ok: true, response: 'Solution submitted' };
}
