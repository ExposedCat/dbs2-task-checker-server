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

  const user = await database.user.findOne({ login });
  if (!user) {
    return null;
  }

  const passwordCorrect = Bun.password.verify(password, user.password);
  if (!passwordCorrect) {
    return null;
  }

  return user._id.toString();
}
