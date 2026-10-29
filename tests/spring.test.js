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
