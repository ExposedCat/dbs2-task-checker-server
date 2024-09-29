import { createClient } from 'redis';

import type { BaseExecuteArgs, ExecuteResult } from './index.js';

export type LoadRedisArgs = Omit<ExecuteRedisArgs, 'query'>;

export type LoadRedisResponse = {
  response: string;
} & (
  | {
      ok: true;
      client: ReturnType<typeof createClient>;
    }
  | { ok: false; client: null }
);

export async function loadRedis({ port, user, dataset }: LoadRedisArgs): Promise<LoadRedisResponse> {
  if (!port) {
    return { ok: false, response: 'Unauthorized', client: null };
  }

  const client = createClient({
    url: `redis://default:${user.password}@127.0.0.1:${port}`,
  });

  await client.connect();
  await client.flushDb();

  try {
    for (const command of dataset) {
      await client.sendCommand(command);
    }
    return { ok: true, response: 'Dataset loaded', client };
  } catch (error) {
    const textError = error instanceof Error ? error.message : 'Unkown error';
    await client.quit();
    return { ok: false, response: textError, client: null };
  }
}

export type ExecuteRedisArgs = BaseExecuteArgs & {
  port: number;
  dataset: string[][];
};

export async function executeRedis({ port, user, query, dataset }: ExecuteRedisArgs): Promise<ExecuteResult> {
  if (!port) {
    return { ok: false, response: 'Unauthorized' };
  }

  const { ok, client, response: loadingResponse } = await loadRedis({ port, user, dataset });

  if (!ok) {
    return { ok, response: loadingResponse };
  }

  try {
    const response = await client.sendCommand(query.split(' '));
    const textResponse = response ? response.toString().trim() : '';
    return { ok: true, response: textResponse };
  } catch (error) {
    const textError = error instanceof Error ? error.message : 'Unkown error';
    return { ok: false, response: textError };
  } finally {
    await client.quit();
  }
}
