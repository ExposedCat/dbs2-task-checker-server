import { createClient } from 'redis';

import { parseCommand } from '../escape.js';
import type { BaseExecuteArgs, ExecuteResult } from './index.js';

export type LoadRedisArgs = Omit<ExecuteRedisArgs, 'queries'>;

export type LoadRedisResponse = {
  response: string;
} & (
  | {
      ok: true;
      client: ReturnType<typeof createClient>;
    }
  | { ok: false; client: null }
);

async function loadRedis({ user, dataset, noReset }: LoadRedisArgs): Promise<LoadRedisResponse> {
  const client = createClient({
    url: `redis://default:${user.password}@127.0.0.1:${user.port}`,
  });

  await client.connect();

  if (!noReset) {
    try {
      const indexes = await client.ft._list();
      for (const index of indexes) {
        await client.ft.dropIndex(index);
      }
      await client.flushDb();
    } catch (error) {
      return {
        ok: false,
        response: error instanceof Error ? String(error) : 'Unkown error (while flushing db)',
        client: null,
      };
    }

    try {
      for (const command of dataset) {
        if (command.length === 0) {
          continue;
        }
        await client.sendCommand(command);
      }
      return { ok: true, response: 'Dataset loaded', client };
    } catch (error) {
      const textError =
        error instanceof Error
          ? `Unexpected Error (while loading dataset): ${error}`
          : 'Unkown error (while loading dataset)';
      await client.quit();
      return { ok: false, response: textError, client: null };
    }
  }

  return { ok: true, response: 'Dataset not loaded (noReset = true)', client };
}

export type ExecuteRedisArgs = BaseExecuteArgs & {
  dataset: string[][];
};

export async function executeRedis({
  user,
  queries,
  dataset,
  noReset = false,
}: ExecuteRedisArgs): Promise<ExecuteResult> {
  const {
    ok,
    client,
    response: loadingResponse,
  } = await loadRedis({
    user,
    dataset,
    noReset,
  });

  if (!ok) {
    return { ok, error: loadingResponse, data: null };
  }

  let batchResponse = '';
  for (const singleQuery of queries) {
    try {
      console.log('Executing:', parseCommand(singleQuery));
      const response = await client.sendCommand(parseCommand(singleQuery));
      // console.log('Response:', response);
      const textResponse = response !== undefined ? JSON.stringify(response, null, 1) : '<empty>';
      batchResponse += `${textResponse}\n`;
    } catch (error) {
      await client.quit();
      const textError =
        error instanceof Error
          ? `Unexpected Error (while executing command): ${error}`
          : 'Unkown error (while executing command)';
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
