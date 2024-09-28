import type { Database } from './database.js';

export type Dataset = {
  id: string;
  name: string;
  bank: {
    Question: string;
    Solution: string;
    Test: string;
    Output: string[];
  }[];
};

export type GetDatasetsArgs = {
  database: Database;
};

export function getDatasets(args: GetDatasetsArgs) {
  const { database } = args;

  return database.datasets
    .find(
      {},
      {
        projection: {
          '_id': 0,
          'id': 1,
          'name': 1,
          'bank.Question': 1,
        },
      },
    )
    .toArray();
}
