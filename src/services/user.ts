import { ObjectId } from 'mongodb';

import type { Database } from './database.js';

export type User = {
  login: string;
  password: string;
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

  // TODO: encode passwords
  // const passwordCorrect = await Bun.password.verify(password, user.password);
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
    return await database.users.findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          _id: 0,
          user: 1,
        },
      },
    );
  } catch {
    return null;
  }
}
