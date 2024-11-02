import type { Database } from './database.js';
import { parseCommand } from './escape.js';
import type { ServiceResponse } from './response.js';

export type Dataset = {
  id: string;
  name: string;
  bank: {
    kind: string;
    question: string;
    solution: string;
    test: string | null;
  }[];
};

export type GetDatasetArgs<F extends 'txt' | 'json'> = {
  datasetId: string;
  format: F;
};

export type GetDatasetResponse<F extends 'txt' | 'json'> = F extends 'txt'
  ? string
  :
      | { ok: true; data: string[][]; error: null }
      | {
          ok: false;
          data: null;
          error: string;
        };

export async function readDataset<F extends 'txt' | 'json'>(args: GetDatasetArgs<F>): Promise<GetDatasetResponse<F>> {
  const { datasetId, format } = args;

  const trimmed = datasetId.split('/')[0];

  try {
    const raw = await Bun.file(`${process.cwd()}/datasets/${trimmed}/dataset.txt`).text();

    if (format === 'txt') {
      return raw as GetDatasetResponse<F>;
    }

    return {
      ok: true,
      data: raw
        .split('\n')
        .filter(Boolean)
        .map(command => parseCommand(command)),
      error: null,
    } as GetDatasetResponse<F>;
  } catch (error) {
    console.error(error);
    return {
      ok: false,
      data: null,
      error: 'Dataset not found',
    } as GetDatasetResponse<F>;
  }
}

export type GetDatasetsArgs = {
  database: Database;
};

export async function getDatasets({ database }: GetDatasetsArgs) {
  return {
    ok: true,
    error: null,
    data: await database.datasets
      .find<Pick<Dataset, 'id' | 'name'>>(
        {},
        {
          projection: {
            _id: false,
            id: true,
            name: true,
          },
        },
      )
      .toArray(),
  };
}

export type RawDatasetEntry = {
  Question: string;
  Solution: string;
  Test: string;
};

export type CreateOrUpdateDatasetArgs = {
  id: string;
  name: string;
  kind: string;
  database: Database;
  data: RawDatasetEntry[];
};

export async function createOrUpdateDataset({
  id,
  name,
  kind,
  data,
  database,
}: CreateOrUpdateDatasetArgs): Promise<ServiceResponse<null>> {
  const bank: Dataset['bank'] = data.map(item => ({
    kind,
    question: item.Question,
    solution: item.Solution,
    test: item.Test || null,
  }));

  await database.datasets.findOneAndUpdate(
    { id },
    {
      $addToSet: {
        bank: { $each: bank },
      },
      $setOnInsert: {
        id,
        name,
      },
    },
    { upsert: true },
  );

  return { ok: true, data: null, error: null };
}
