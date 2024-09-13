import fsp from 'fs/promises';

export async function readDatasets() {
  const datasets = await fsp.readdir('./datasets');
  return Promise.all(datasets.map(async dataset => ({ name: dataset })));
}
