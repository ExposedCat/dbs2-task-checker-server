import Elysia, { t } from 'elysia';
import { getDataset } from '../services/datasets';

export const DatasetRoute = new Elysia({ name: 'Route.Dataset' }) //
  .get('/dataset', ({ query }) => getDataset({ ...query }), {
    query: t.Object({
      datasetId: t.String(),
      format: t.Union([t.Literal('txt'), t.Literal('json')]),
    }),
  });
