# MUI DynamicTable

Reusable JavaScript/JSX table library for Next.js client components, powered by Material UI 9 and TanStack Table 9.

## Install and build

Use Node.js **22.22.2+ within v22**, **24.15.0+ within v24**, or **26+** for the current development tools. `.nvmrc` and GitHub Actions use Node 22.23.4.

Current stable dependencies: Material UI **9.5.0**, TanStack Table **9.3.1**, React **19.3.1**, Next.js **16.4.3** (example), Vitest **5.0.5**, ESLint **10.13.0**, and tsup **9.0.0**. Both package lockfiles pin the installed versions.

```sh
npm install
npm run check
```

## Next.js demo

```sh
cd examples/nextjs-demo
npm install
npm run dev
```

The demo is local-file linked to the package. Build the library first. Visit `/` for client mode. `app/spring/page.jsx` is available at `/spring` when a Spring API is available. The demo includes a light/dark theme toggle.

## API

`<DynamicTable columns={columns} data={rows} />` for client mode.

`<DynamicTable columns={columns} dataSource={fetchPage} />` for server mode, where `fetchPage({pagination,sorting,columnFilters,globalFilter,signal})` returns `{rows,rowCount}`. Keep `dataSource` referentially stable with `useMemo`/`useCallback` to avoid repeat requests.

Optional props: `title`, `getRowId`, `enableSorting`, `enableFiltering`, `enablePagination`, `enableRowSelection`, `enableGlobalSearch`, `enableColumnFilters`, `pageSize`, `pageSizeOptions`, `rowActions`, `toolbarActions`, `exportHandlers`, `enableExport`, `exportFormats`, `exportFilename`, `exportButtonDisplay`, `exportLabel`, `onRowSelectionChange`, `onStateChange`, `loading`, `error`, `emptyMessage`, `initialSorting`, `sx`.

Columns use TanStack Table v9 definitions (`accessorKey`, `header`, `cell`, `enableSorting`, `enableColumnFilter`). Shift-click sorts by multiple columns. Supply `getRowId` for durable selection across server pages.

## Export dropdown

Exports are enabled by default. One **Export** button opens a menu containing **PDF, TXT, JSON, XLSX, CSV**. Client mode exports all filtered/sorted rows before pagination; server mode exports only the loaded page unless you override a handler to fetch the complete dataset.

```jsx
<DynamicTable
  columns={columns}
  data={rows}
  exportFilename="customers"
  exportButtonDisplay="both" // "icon", "text", or "both"
  exportFormats={['pdf', 'txt', 'json', 'xlsx', 'csv']}
/>
```

`exportFilename` is the base filename without an extension (default `table`). `exportLabel` changes the button text/accessibility label (default `Export`). Set `enableExport={false}` to hide exports, or choose formats with `exportFormats`.

CSV and TXT contain column headers; TXT uses tabs between values and escapes embedded tabs/newlines. JSON contains an array of records keyed by column ID or accessor key, preserving number/boolean values. XLSX creates a real workbook with typed cells. PDF creates a landscape table with repeated headers and page breaks. ExcelJS and jsPDF/AutoTable load on demand for XLSX/PDF. For non-Latin PDF fonts or custom layouts, supply a custom PDF handler.

All formats honor nested `accessorKey` paths, `accessorFn`, grouped columns, `exportHeader`, `exportValue(row, index)`, and `enableExport: false`. Rendered JSX is not exported. Formula-like CSV values are prefixed with an apostrophe; XLSX text values remain string cells.

Override individual defaults with `exportHandlers={{ pdf: customPdf, xlsx: customXlsx }}`. Handlers receive `{rows, columns, state, filename, title}` and may return a promise. The older `excel` handler name aliases `xlsx`. Async exports disable the menu button until complete and display failures in an alert.

Standalone helpers are exported: `exportRowsAsPdf`, `exportRowsAsTxt`, `exportRowsAsJson`, `exportRowsAsXlsx`, and `exportRowsAsCsv`. `rowsToCsv`, `rowsToTxt`, and `rowsToJson` serialize without downloading; `createPdfBlob` and `createXlsxBlob` return generated file blobs.

## Spring Boot API contract

`GET /api/customers?page=0&size=20&sort=name,asc&search=abc&filter.status=Active`

Spring should return `Page<Customer>` JSON with `content`, `totalElements`, and `totalPages`. The backend must implement `search` and `filter.*` parameters, validate sort/filter column names, authorize data access, and cap page size. Spring's built-in pageable resolver handles `page`, `size`, `sort`, but **does not automatically implement search/filter**.

Use `createSpringDataSource({url:'/api/customers'})`. Configure Next.js rewrite/proxy or a same-origin API route to forward requests to Spring Boot. For secure full exports, implement `POST /api/customers/export/xlsx` and `/pdf` with filtering/sorting criteria in request JSON; use `exportWithEndpoint` for download. CSRF/auth and content-disposition requirements depend on your deployment.

## Publishing

1. Replace `@company` with your real npm scope in `package.json` and demo files. The publishing workflow reads the scope from the package name.
2. Configure GitHub Actions variable `ARTIFACTORY_NPM_URL`, e.g. `https://example.jfrog.io/artifactory/api/npm/npm-local/`.
3. Configure secret `ARTIFACTORY_NPM_TOKEN` with a token scoped to publishing to that repository.
4. Protect the `release` environment and require approval. Prefer short-lived JFrog OIDC tokens when configured.
5. Commit lockfile updates after dependency changes. Workflows use `npm ci` for reproducible builds. Merge through CI, bump `package.json` version, and push a matching tag (e.g. `v0.1.0`).
6. Consumers configure their scope registry and authenticate via approved CI secret management.

The package uses React/MUI/TanStack as peer dependencies, so consuming apps provide compatible versions. PDF/XLSX engines are regular dependencies loaded dynamically when those formats are selected.

## Notes

The default table performs client filtering and pagination for `data`; server mode delegates all filtering/sorting/pagination to the API. With a stable `getRowId`, selected IDs persist across server pages; the header checkbox selects the current page. Without `getRowId`, TanStack uses row indexes, which are unsuitable for server selection. This is a starter library; add accessibility, cross-browser, and large-dataset performance tests before enterprise rollout.

## Example usage

```jsx
'use client';
import { DynamicTable } from '@company/mui-dynamic-table';

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'Email' }
];
const rows = [{ id: 1, name: 'Ada', email: 'ada@example.com' }];

export default function Customers() {
  return <DynamicTable
    columns={columns}
    data={rows}
    getRowId={row => String(row.id)}
    enableRowSelection
    enableColumnFilters
    exportFilename="customers"
  />;
}
```

`enablePagination={false}` renders all client rows. In server mode the data source still controls how many rows are returned. `pageSize` and `initialSorting` initialize table state on mount. Column filters use text matching by default; supply a column `filterFn` for custom behavior. Sorting and filtering reset to page zero. In-flight requests are aborted when criteria change or the component unmounts, and late responses are ignored.

The built ESM entry includes the Next.js client directive, keeps React/MUI/TanStack external, and emits source maps. The table uses the surrounding MUI theme, compact spacing on small screens, and horizontal scrolling for wide tables. CSV values are escaped and formula-like cells are prefixed with an apostrophe.

## Validation

`npm run check` runs JSX-aware ESLint with hook checks, Vitest/Testing Library tests, and the package build. Tests cover custom cells/actions, client pagination, sorting, global/column filtering, stable selection, loading/error/empty states, export handlers and CSV encoding, request cancellation, server pagination, and Spring query mapping. CI also builds the Next.js example and checks package contents. Publishing requires configured Artifactory credentials and a matching release tag; no registry credentials are stored in source.

## Dependency migration notes

This release requires Material UI 9 and TanStack Table 9 in consuming applications. Older MUI 5–7 and TanStack 8 peer ranges have been removed. React 18.2 and 19 remain accepted peers; validation uses React 19.3.1.

The implementation uses the native TanStack v9 `useTable` API with explicit features and row processors. Client exports use `getPrePaginatedRowModel()`. For custom column sorting, v9 uses `sortFn`; replace older `sortingFn` options. Cell renderers can use `cell: ({ cell }) => cell.getValue()`. Call row, column, and cell instance methods on their original objects. Existing component props and export handler contracts are preserved.

Material UI checkboxes use `slotProps.input`, and spacing/alignment styles use `sx` in place of removed system props. The Next.js example uses version 16. ESLint 10 handles JSX references natively, so the older `eslint-plugin-react` dependency is no longer needed.

Migration references: [Material UI v9](https://mui.com/material-ui/migration/upgrade-to-v9/) and [TanStack Table v9](https://tanstack.com/table/latest/docs/framework/react/guide/migrating).
