import { executeRedis, type ExecuteRedisArgs } from './redis.js';
import type { User } from '../user.js';
import { getDataset } from '../datasets.js';

export type BaseExecuteArgs = {
  query: string;
  user: User;
};

export type DatasetName = 'redis';

export type DatasetArgsMap = {
  redis: ExecuteRedisArgs;
};

export type ExecuteArgs = {
  datasetId: DatasetName;
} & BaseExecuteArgs;

export type ExecuteResult = {
  ok: boolean;
  response: string;
};

// FIXME: Move to service
const { ok, response: redisDataset } = await getDataset({ datasetId: 'redis', format: 'json' });

export async function execute({ datasetId, ...args }: ExecuteArgs): Promise<ExecuteResult> {
  if (!ok) {
    throw redisDataset;
  }

  switch (datasetId) {
    case 'redis':
      // TODO: Move port to db
      return executeRedis({ ...args, dataset: redisDataset, port: 6379 });

    default:
      throw new Error(`Unsupported dataset "${datasetId}"`);
  }
}
