/** Map a Spring Data Page response to the shape expected by DynamicTable. */
export function normalizeSpringPage(page) {
  return { rows: page.content ?? [], rowCount: page.totalElements ?? 0, pageCount: page.totalPages ?? 0 };
}
/**
 * Adapt Spring Data pageable API. Keep the caller responsible for authorization and request headers.
 * @param {{url:string, fetcher?:typeof fetch, params?:object, mapSort?:(sort:Array)=>string[]}} options
 */
export function createSpringDataSource({ url, fetcher = fetch, params = {}, mapSort }) {
  return async ({ pagination, sorting = [], globalFilter = '', columnFilters = [], signal }) => {
    const [baseUrl, hash] = url.split('#', 2);
    const [pathname, search = ''] = baseUrl.split('?', 2);
    const query = new URLSearchParams(search);
    Object.entries(params).forEach(([key, value]) => { if (value != null) query.set(key, String(value)); });
    query.set('page', String(pagination.pageIndex));
    query.set('size', String(pagination.pageSize));
    const sort = mapSort ? mapSort(sorting) : sorting.map(({ id, desc }) => `${id},${desc ? 'desc' : 'asc'}`);
    query.delete('sort');
    query.delete('search');
    columnFilters.forEach(({ id }) => query.delete(`filter.${id}`));
    sort.forEach(value => query.append('sort', value));
    if (globalFilter) query.set('search', globalFilter);
    columnFilters.forEach(({ id, value }) => { if (value !== '' && value != null) query.set(`filter.${id}`, String(value)); });
    const response = await fetcher(`${pathname}?${query}${hash ? `#${hash}` : ''}`, { signal });
    if (!response.ok) throw new Error(`Table request failed (${response.status})`);
    return normalizeSpringPage(await response.json());
  };
}
