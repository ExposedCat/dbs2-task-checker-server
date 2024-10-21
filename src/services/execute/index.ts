import { executeRedis, type ExecuteRedisArgs } from './redis.js';
import type { User } from '../user.js';
import type { ServiceResponse } from '../response.js';
import { getDataset } from '../datasets.js';

export type BaseExecuteArgs = {
  query: string;
  user: User;
  noReset?: boolean;
};

export type DatasetName = 'redis';

export type DatasetArgsMap = {
  redis: ExecuteRedisArgs;
};

export type ExecuteArgs = {
  datasetId: DatasetName;
} & BaseExecuteArgs;

export type ExecuteResult = ServiceResponse<{ response: string }>;

// FIXME: Move to service
const { ok, data: redisDataset } = await getDataset({ datasetId: 'redis', format: 'json' });

export async function execute({ datasetId, ...args }: ExecuteArgs): Promise<ExecuteResult> {
  if (!ok) {
    throw redisDataset;
  }

  switch (datasetId) {
    case 'redis':
      return executeRedis({ ...args, dataset: redisDataset });

    default:
      throw new Error(`Unsupported dataset "${datasetId}"`);
  }
}
