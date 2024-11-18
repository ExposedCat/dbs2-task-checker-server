import { readDataset } from '../dataset.js';
import type { ServiceResponse } from '../response';
import type { User } from '../user';
import { type ExecuteRedisArgs, executeRedis } from './redis';

export type BaseExecuteArgs = {
  queries: string[];
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
const { ok, data: redisDataset } = await readDataset({
  datasetId: 'redis',
  format: 'json',
});

export function execute({ datasetId, ...args }: ExecuteArgs): Promise<ExecuteResult> {
  if (!ok) {
    throw redisDataset;
  }

  switch (datasetId) {
    case 'redis':
      return executeRedis({ ...args, dataset: redisDataset });

    default:
      throw new Error(`Unsupported dataset '${datasetId}'`);
  }
}
