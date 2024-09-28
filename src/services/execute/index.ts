import { executeRedis, type ExecuteRedisArgs } from './redis.js';
import type { User } from '../user.js';

export type BaseExecuteArgs = {
  query: string;
  user: User;
};

export type DatasetName = 'redis';

export type DatasetArgsMap = {
  redis: ExecuteRedisArgs;
};

export type ExecuteArgs<D extends DatasetName> = {
  dataset: D;
} & DatasetArgsMap[D];

export type ExecuteResult = {
  ok: boolean;
  message: string;
};

export async function execute<D extends DatasetName>({ dataset, ...args }: ExecuteArgs<D>) {
  switch (dataset) {
    case 'redis':
      return executeRedis(args);

    default:
      throw new Error(`Unsupported dataset: ${dataset}`);
  }
}
