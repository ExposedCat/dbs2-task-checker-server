import { createClient } from 'redis';

import { parseCommand } from '../escape.js';
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

export async function loadRedis({ port, user, dataset, noReset }: LoadRedisArgs): Promise<LoadRedisResponse> {
  if (!port) {
    return { ok: false, response: 'Unauthorized', client: null };
  }

  const client = createClient({
    url: `redis://default:${user.password}@127.0.0.1:${port}`,
  });

  await client.connect();

  if (!noReset) {
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

  return { ok: true, response: 'Dataset not loaded (noReset = true)', client };
}

export type ExecuteRedisArgs = BaseExecuteArgs & {
  port: number;
  dataset: string[][];
};

export async function executeRedis({
  port,
  user,
  query,
  dataset,
  noReset = false,
}: ExecuteRedisArgs): Promise<ExecuteResult> {
  if (!port) {
    return { ok: false, error: 'Unauthorized', data: null };
  }

  const { ok, client, response: loadingResponse } = await loadRedis({ port, user, dataset, noReset });

  if (!ok) {
    return { ok, error: loadingResponse, data: null };
  }

  const queries = query.split('\n');
  let batchResponse = '';
  for (const singleQuery of queries) {
    try {
      const response = await client.sendCommand(parseCommand(singleQuery));
      const textResponse = response !== undefined && response !== null ? response.toString().trim() : '';
      batchResponse += `${textResponse}\n`;
    } catch (error) {
      await client.quit();
      const textError = error instanceof Error ? error.message : 'Unkown error';
      return { ok: false, error: textError, data: null };
    }
  }

  await client.quit();
  return {
    ok: true,
    data: { response: batchResponse },
    error: null,
  };
}
