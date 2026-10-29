import { describe, expect, it, vi } from 'vitest';
import { createSpringDataSource, normalizeSpringPage } from '../src/spring.js';
describe('Spring Data adapter', () => {
 it('normalizes pages', () => expect(normalizeSpringPage({content:[{id:1}],totalElements:9,totalPages:3})).toEqual({rows:[{id:1}],rowCount:9,pageCount:3}));
 it('maps pagination, sorting and filters', async () => {
  const fetcher=vi.fn(async()=>({ok:true,json:async()=>({content:[],totalElements:0})}));
  await createSpringDataSource({url:'/api/customers',fetcher})({pagination:{pageIndex:2,pageSize:10},sorting:[{id:'name',desc:true}],globalFilter:'abc',columnFilters:[{id:'status',value:'active'}]});
  const url=fetcher.mock.calls[0][0];
  expect(url).toContain('page=2'); expect(url).toContain('sort=name%2Cdesc'); expect(url).toContain('filter.status=active');
 });
});

describe('Spring request edge cases', () => {
 it('preserves query parameters and replaces pagination and sort values', async () => {
  const fetcher=vi.fn(async()=>({ok:true,json:async()=>({content:[],totalElements:0})}));
  const signal=new AbortController().signal;
  await createSpringDataSource({url:'/api/customers?tenant=demo&page=8&sort=old,asc',fetcher})(
   {pagination:{pageIndex:0,pageSize:20},sorting:[{id:'name',desc:false},{id:'id',desc:true}],signal}
  );
  const query=new URL(fetcher.mock.calls[0][0],'https://example.test').searchParams;
  expect(query.get('tenant')).toBe('demo');
  expect(query.getAll('page')).toEqual(['0']);
  expect(query.getAll('sort')).toEqual(['name,asc','id,desc']);
  expect(fetcher.mock.calls[0][1].signal).toBe(signal);
 });
 it('supports custom backend sort mappings and reports HTTP errors', async () => {
  const fetcher=vi.fn(async()=>({ok:false,status:500}));
  await expect(createSpringDataSource({url:'/api',fetcher,mapSort:()=>['customer.name,asc']})(
   {pagination:{pageIndex:0,pageSize:20}}
  )).rejects.toThrow('Table request failed (500)');
  expect(fetcher.mock.calls[0][0]).toContain('sort=customer.name%2Casc');
 });
});
