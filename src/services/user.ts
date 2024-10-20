import { ObjectId } from 'mongodb';
import type { WithId } from 'mongodb';

import type { ServiceResponse } from './response.js';
import { execute } from './execute/index.js';
import type { BaseExecuteArgs, DatasetName } from './execute/index.js';
import type { Dataset } from './datasets.js';
import type { Database } from './database.js';

export type Submission = {
  datasetId: DatasetName;
  session: TestSession;
};

export type User = {
  user: string;
  password: string;
  testSession: TestSession | null;
  submissions: Submission[];
};

export type TestSession = {
  datasetId: DatasetName;
  tasks: {
    kind: string;
    question: string;
    solution: string;
    userSolution: string | null;
    correct: boolean;
    test: string | null;
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

export type StartTestSessionResponse =
  | {
      ok: true;
      data: {
        firstQuestion: string;
        response: string;
      };
      error: null;
    }
  | {
      ok: false;
      data: null;
      error: string;
    };

export async function startTestSession({
  database,
  user,
  datasetId,
  cathegories,
}: StartTestSessionArgs): Promise<StartTestSessionResponse> {
  if (user.testSession) {
    return { ok: false, error: 'Test session is already started', data: null };
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
    return { ok: false, error: 'No questions were found by criteria', data: null };
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

  return {
    ok: true,
    data: {
      firstQuestion: tasks[0].question,
      response: `"${datasetId}" test session started`,
    },
    error: null,
  };
}

export type ExecuteQuestionArgs = BaseExecuteArgs & {
  database: Database;
};

export type ExecuteQuestionResult = ServiceResponse<{
  result: number | null;
  wrong: string[];
}>;

export async function executeQuestion({ database, user, query }: ExecuteQuestionArgs): Promise<ExecuteQuestionResult> {
  if (!user.testSession) {
    return { ok: false, error: 'Test session is not started', data: null };
  }

  const { datasetId, tasks } = user.testSession;
  const currentTaskIndex = tasks.findIndex(task => !task.userSolution);
  if (currentTaskIndex === -1) {
    return { ok: false, error: 'All questions have already been answered', data: null };
  }
  const currentTask = tasks[currentTaskIndex];

  const error500: ExecuteQuestionResult = {
    ok: false,
    error: 'Failed to test task. Please report to your teacher',
    data: null,
  };

  const getFinalResponse = async (response: string): Promise<ServiceResponse<{ response: string }>> => {
    if (!currentTask.test) {
      return { ok: true, data: { response }, error: null };
    }

    const result = await execute({
      datasetId,
      query: currentTask.test,
      user,
      noReset: true,
    });

    if (!result.ok) {
      console.error(`Failed to get final response`, result.error);
      return error500;
    }

    return result;
  };

  const userResult = await execute({ datasetId, query, user });
  if (!userResult.ok) return userResult;
  const userTest = await getFinalResponse(userResult.data.response);
  if (!userTest.ok) {
    return error500;
  }

  const correctResult = await execute({ datasetId, query: currentTask.solution, user });
  if (!correctResult.ok) {
    console.error(`Failed to execute test query`, correctResult.error);
    return error500;
  }
  const correctTest = await getFinalResponse(correctResult.data.response);
  if (!correctTest.ok) {
    console.error(`Failed to execute test`, correctTest.error);
    return error500;
  }

  const isCorrect = userTest.data.response.trim() === correctTest.data.response.trim();
  // console.log(`=====`, isCorrect);
  // console.log(`User Solution "${query.trim()}"`);
  // console.log(`User Result "${userResult.data.response.trim()}"`);
  // console.log(`User Test "${userTest.data.response.trim()}"`);
  // console.log(`Correct Solution "${currentTask.solution.trim()}"`);
  // console.log(`Correct Result "${correctResult.data.response.trim()}"`);
  // console.log(`Correct Test "${correctTest.data.response.trim()}"`);
  // console.log(`Test query = "${currentTask.test ?? '<None>'}"`);

  const newUser = await database.users.findOneAndUpdate(
    { user: user.user },
    {
      $set: {
        [`testSession.tasks.${currentTaskIndex}.userSolution`]: query,
        [`testSession.tasks.${currentTaskIndex}.correct`]: isCorrect,
      },
    },
    {
      returnDocument: 'after',
    },
  );

  if (!newUser) return error500;

  const result =
    newUser.testSession!.tasks.at(-1)?.userSolution !== null
      ? newUser.testSession!.tasks.reduce((score, task) => score + Number(task.correct), 0)
      : null;

  if (result !== null) {
    await database.users.updateOne(
      { user: user.user },
      {
        $push: {
          submissions: {
            datasetId,
            session: newUser!.testSession!,
          },
        },
        $set: {
          testSession: null,
        },
      },
    );
  }

  const wrong = newUser.testSession?.tasks.filter(task => !task.correct).map(task => task.question) ?? [];

  return { ok: true, data: { result, wrong }, error: null };
}
