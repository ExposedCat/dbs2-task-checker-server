import { Elysia } from 'elysia';

import { RequireBase } from './middlewares/base.js';
import { RequireErrorFallback } from './middlewares/fallback.js';
import { DatasetRoute } from './routes/dataset.js';
import { DatasetsRoute } from './routes/datasets.js';
import { LoginRoute } from './routes/login.js';
import { QueryRoute } from './routes/query.js';
import { SessionRoute } from './routes/session.js';
import { TestSessionRoute } from './routes/test-session.js';

const app = new Elysia()
  .use(RequireBase)
  .use(LoginRoute)
  .use(DatasetRoute)
  .use(SessionRoute)
  .use(DatasetsRoute)
  .use(TestSessionRoute)
  .use(QueryRoute)
  .use(RequireErrorFallback)
  .listen(8080);

console.log(`🦊 DBS Portal API is running at http://${app.server?.hostname}:${app.server?.port}`);
