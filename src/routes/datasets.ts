import Elysia from 'elysia';
import { RequireBase } from '../middlewares/base';
import { getDatasets } from '../services/datasets';

export const DatasetsRoute = new Elysia({ name: 'Route.Datasets' })
  .use(RequireBase)
  .get('/datasets', ({ database }) => getDatasets({ database }));
