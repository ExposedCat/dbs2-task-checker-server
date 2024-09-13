import { MongoClient } from 'mongodb';
import type { Collection } from 'mongodb';

import type { User } from './user.js';

export type Database = {
  user: Collection<User>;
};

export async function createDbConnection(connectionString: string) {
  const client = new MongoClient(connectionString);
  await client.connect();
  const mongoDb = client.db('dbs2-portal');
  const user = mongoDb.collection<User>('user');
  const database: Database = { user };
  return database;
}
