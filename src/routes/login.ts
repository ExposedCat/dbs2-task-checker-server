import { Elysia, t } from 'elysia';

import { RequireBase } from '../middlewares/base.js';
import { loginUser } from '../services/user.js';

export const LoginRoute = new Elysia({ name: 'Route.Login' }) //
  .use(RequireBase)
  .post(
    '/login',
    async ({ jwt, body, database }) => {
      const userId = await loginUser({ database, ...body });
      if (!userId) {
        return {
          ok: false,
          data: null,
          error: 'Login failed',
        };
      }
      return {
        ok: true,
        data: await jwt.sign({ userId }),
        error: null,
      };
    },
    {
      body: t.Object({
        login: t.String(),
        password: t.String(),
      }),
    },
  );
