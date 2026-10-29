import { describe, expect, it, vi } from 'vitest';
import { rowsToCsv, exportWithEndpoint } from '../src/exports.js';

describe('CSV exports', () => {
  it('escapes commas, quotes, newlines and spreadsheet formulas', () => {
    expect(rowsToCsv({ columns: [{accessorKey:'value', header:'Value'}], rows: [
      {value:'a,"b"\nc'}, {value:'=SUM(A1)'}, {value:'  +cmd'}, {value:null}
    ] })).toBe('Value\r\n"a,""b""\nc"\r\n\'=SUM(A1)\r\n\'  +cmd\r\n');
  });
  it('exports nested and computed columns while excluding opted-out fields', () => {
    expect(rowsToCsv({ rows:[{person:{name:'Ada'}, secret:'hidden'}], columns:[
      {header:'Group', columns:[{accessorKey:'person.name', header:'Name'},
        {id:'upper', accessorFn:row=>row.person.name.toUpperCase(), exportHeader:'Upper'},
        {accessorKey:'secret', enableExport:false}]}
    ] })).toBe('Name,Upper\r\nAda,ADA');
  });
  it('propagates endpoint errors', async () => {
    await expect(exportWithEndpoint({url:'/export', fetcher:vi.fn(async()=>({ok:false,status:403}))})).rejects.toThrow('Export failed (403)');
  });
});
