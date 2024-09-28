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
  datasetId: D;
} & DatasetArgsMap[D];

export type ExecuteResult = {
  ok: boolean;
  message: string;
};

export async function execute<D extends DatasetName>({ datasetId, ...args }: ExecuteArgs<D>) {
  switch (datasetId) {
    case 'redis':
      return executeRedis(args);

    default:
      throw new Error(`Unsupported dataset "${datasetId}"`);
  }
}
