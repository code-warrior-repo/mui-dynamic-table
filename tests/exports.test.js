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

import { getExportData, rowsToTxt, rowsToJson, createXlsxBlob, createPdfBlob } from '../src/exports.js';
import { Buffer } from 'node:buffer';

function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

const context = {
  title: 'Customers',
  rows: [{ name: 'Ada', age: 37, active: true, secret: 'private', profile: { city: 'London' } }],
  columns: [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'age', header: 'Age' },
    { accessorKey: 'active', header: 'Active' },
    { accessorKey: 'profile.city', header: 'City' },
    { accessorKey: 'secret', enableExport: false }
  ]
};

describe('built-in export formats', () => {
  it('projects consistent nested/computed values and honors exportValue', () => {
    expect(getExportData({ rows:context.rows, columns:[
      { accessorKey:'name', exportHeader:'Customer', exportValue:row=>row.name.toUpperCase() }
    ] })).toEqual({headers:['Customer'],keys:['name'],values:[['ADA']]});
  });
  it('serializes typed JSON without exporting excluded fields', () => {
    expect(JSON.parse(rowsToJson(context))).toEqual([
      {name:'Ada',age:37,active:true,'profile.city':'London'}
    ]);
    expect(rowsToJson({...context,rows:[]})).toBe('[]');
  });
  it('keeps duplicate JSON keys from overwriting values', () => {
    expect(JSON.parse(rowsToJson({rows:[{name:'Ada'}],columns:[
      {accessorKey:'name'}, {accessorKey:'name',exportValue:()=> 'Grace'}
    ]}))).toEqual([{name:'Ada',name_2:'Grace'}]);
  });
  it('creates readable tab-separated text with escaped embedded tabs and line breaks', () => {
    expect(rowsToTxt(context)).toBe('Name\tAge\tActive\tCity\r\nAda\t37\ttrue\tLondon');
    expect(rowsToTxt({rows:[{value:'a\tb\nc'}],columns:[{accessorKey:'value',header:'Value'}]}))
      .toBe('Value\r\na\\tb\\nc');
  });
  it('creates a real XLSX workbook with typed cells and excluded columns omitted', async () => {
    const module = await import('exceljs');
    const ExcelJS = module.default ?? module;
    const blob = await createXlsxBlob(context);
    expect(blob.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await readBlob(blob)));
    const sheet = workbook.getWorksheet('Results');
    expect(sheet.getRow(1).values.slice(1)).toEqual(['Name','Age','Active','City']);
    expect(sheet.getRow(2).values.slice(1)).toEqual(['Ada',37,true,'London']);
  });
  it('creates a PDF document containing the table title and cell values', async () => {
    const blob = await createPdfBlob(context);
    expect(blob.type).toBe('application/pdf');
    const text = Buffer.from(await readBlob(blob)).toString('latin1');
    expect(text).toMatch(/^%PDF-/);
    expect(text).toContain('Customers');
    expect(text).toContain('Ada');
    expect(text).not.toContain('private');
  });
});
