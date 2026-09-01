import { chunkPatches, validateAndMapCsvImport } from './csv-import.util';
import type { ContentEntry } from '../models/asset-content.models';

const entry: ContentEntry = {
  id: 1,
  ayah_id: 100,
  sura: 2,
  aya: 255,
  surah_name: 'البقرة',
  uthmani: 'x',
  text: 'old',
  footnotes: '',
  order: 1,
};

describe('validateAndMapCsvImport', () => {
  it('rejects header mismatch', () => {
    const result = validateAndMapCsvImport('wrong,headers\n1,1', 'ayah', [entry]);
    expect(result.headerMismatch).toBeTrue();
    expect(result.valid).toBeFalse();
  });

  it('maps valid ayah rows to patches', () => {
    const csv = 'sura,aya,surah_name,uthmani,text,footnotes\n2,255,البقرة,x,new text,fn';
    const result = validateAndMapCsvImport(csv, 'ayah', [entry]);
    expect(result.valid).toBeTrue();
    expect(result.patches).toEqual([{ ayah_id: 100, text: 'new text', footnotes: 'fn' }]);
  });

  it('reports unknown rows', () => {
    const csv = 'sura,aya,surah_name,uthmani,text,footnotes\n99,1,x,x,t,';
    const result = validateAndMapCsvImport(csv, 'ayah', [entry]);
    expect(result.rowErrors).toEqual([{ rowNumber: 2, message: 'UNKNOWN_ROW' }]);
  });
});

describe('chunkPatches', () => {
  it('splits arrays', () => {
    expect(chunkPatches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
