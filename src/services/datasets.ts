import fsp from 'fs/promises';

export type Dataset = {
  id: string;
  name: string;
  bank: {
    kind: string;
    question: string;
    solution: string;
    test: string;
  }[];
};

export type GetDatasetArgs<F extends 'txt' | 'json'> = {
  datasetId: string;
  format: F;
};

export type GetDatasetResponse<F extends 'txt' | 'json'> = F extends 'txt'
  ? string
  : { ok: true; response: string[][] } | { ok: false; response: string };

export async function getDataset<F extends 'txt' | 'json'>(args: GetDatasetArgs<F>): Promise<GetDatasetResponse<F>> {
  const { datasetId, format } = args;

  const trimmed = datasetId.split('/')[0];

  try {
    const raw = await fsp.readFile(`${import.meta.dir}/../../datasets/${trimmed}/dataset.txt`, 'utf8');

    if (format === 'txt') {
      return raw as GetDatasetResponse<F>;
    }

    return {
      ok: true,
      response: raw
        .split('\n')
        .filter(Boolean)
        .map(line => line.split(' ')),
    } as GetDatasetResponse<F>;
  } catch (error) {
    console.error(error);
    return { ok: false, response: 'Dataset not found' } as GetDatasetResponse<F>;
  }
}
