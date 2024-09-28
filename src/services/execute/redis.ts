import { createClient } from 'redis';

import type { BaseExecuteArgs } from './index.js';

export type ExecuteRedisArgs = BaseExecuteArgs & {
  port: number;
};

export async function executeRedis({ port, user, query }: ExecuteRedisArgs) {
  if (!port) {
    return { ok: false, message: 'Unauthorized' };
  }

  const client = createClient({
    url: `redis://default:${user.password}@127.0.0.1:${port}`,
  });

  await client.connect();

  try {
    const response = await client.sendCommand(query.split(' '));
    const textResponse = response ? response.toString().trim() : '';
    return { ok: true, response: textResponse };
  } catch (error) {
    const textError = error instanceof Error ? error.message : 'Unkown error';
    return { ok: false, response: textError };
  }
}
