'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, TablePagination, Toolbar, Typography, TextField, Checkbox,
  Button, CircularProgress, Alert, Stack, useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  flexRender, useTable, tableFeatures, columnFilteringFeature, globalFilteringFeature,
  rowSortingFeature, rowPaginationFeature, rowSelectionFeature, columnVisibilityFeature,
  createFilteredRowModel, createSortedRowModel, createPaginatedRowModel,
  filterFns, sortFns
} from '@tanstack/react-table';

// Register the table features and row processors once for all instances.
const features = tableFeatures({
  columnVisibilityFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowSortingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  filterFns,
  sortFns
});

/**
 * dataSource(args) => Promise<{rows,rowCount,pageCount?}> for server mode.
 * exportHandlers: {csv?, excel?, pdf?}; handlers receive {rows, columns, state}.
 * Server handlers should export the complete filtered dataset, not just current rows.
 */
export default function DynamicTable({
  columns = [], data = [], dataSource, getRowId, title = 'Results',
  enableSorting = true, enableFiltering = true, enablePagination = true,
  enableRowSelection = false, enableGlobalSearch = true,
  enableColumnFilters = false, pageSize = 20, pageSizeOptions = [10, 20, 50, 100],
  rowActions, toolbarActions, exportHandlers = {}, onRowSelectionChange,
  onStateChange, loading: externalLoading = false, error: externalError,
  emptyMessage = 'No records found', initialSorting = [],
  sx, ...paperProps
}) {
  const server = typeof dataSource === 'function';
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize });
  const [sorting, setSorting] = useState(initialSorting);
  const [columnFilters, setColumnFilters] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState({});
  const [remote, setRemote] = useState({ rows: [], rowCount: 0 });
  const [busy, setBusy] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [exportingFormat, setExportingFormat] = useState(null);
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));

  const resetPage = setter => updater => {
    setter(updater);
    setPagination(p => p.pageIndex === 0 ? p : { ...p, pageIndex: 0 });
  };
  useEffect(() => {
    if (!server) {
      setBusy(false);
      setRequestError(null);
      return;
    }
    const controller = new AbortController();
    setBusy(true);
    setRequestError(null);
    Promise.resolve().then(() => controller.signal.aborted ? null : dataSource({ pagination, sorting, columnFilters, globalFilter, signal: controller.signal }))
      .then(result => { if (!controller.signal.aborted) setRemote({ rows: result.rows ?? [], rowCount: result.rowCount ?? 0, pageCount: result.pageCount }); })
      .catch(err => { if (!controller.signal.aborted) setRequestError(err?.message || 'Unable to load data'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [server, dataSource, pagination, sorting, columnFilters, globalFilter]);

  const effectiveColumns = useMemo(() => [
    ...(enableRowSelection ? [{ id: '_select', header: ({ table }) => <Checkbox size="small" slotProps={{ input: { 'aria-label': 'Select all rows' } }} checked={table.getIsAllPageRowsSelected()} indeterminate={table.getIsSomePageRowsSelected()} disabled={table.getRowModel().rows.length === 0} onChange={table.getToggleAllPageRowsSelectedHandler()} />, cell: ({ row }) => <Checkbox size="small" slotProps={{ input: { 'aria-label': 'Select row' } }} checked={row.getIsSelected()} disabled={!row.getCanSelect()} onChange={row.getToggleSelectedHandler()} />, enableSorting: false, enableColumnFilter: false }] : []),
    ...columns,
    ...(rowActions ? [{ id: '_actions', header: 'Actions', cell: ({ row }) => rowActions(row.original), enableSorting: false, enableColumnFilter: false }] : [])
  ], [columns, enableRowSelection, rowActions]);

  const table = useTable({
    features,
    data: server ? remote.rows : data,
    columns: effectiveColumns,
    defaultColumn: { filterFn: 'includesString' },
    getRowId,
    state: { pagination, sorting, columnFilters, globalFilter, rowSelection },
    onPaginationChange: setPagination,
    onSortingChange: resetPage(setSorting),
    onColumnFiltersChange: resetPage(setColumnFilters),
    onGlobalFilterChange: resetPage(setGlobalFilter),
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    enableSorting,
    enableFilters: enableFiltering,
    enableGlobalFilter: enableGlobalSearch,
    manualPagination: server || !enablePagination,
    manualSorting: server,
    manualFiltering: server,
    rowCount: server ? remote.rowCount : undefined
  });
  const state = useMemo(() => ({ pagination, sorting, columnFilters, globalFilter, rowSelection }),
    [pagination, sorting, columnFilters, globalFilter, rowSelection]);
  useEffect(() => { onRowSelectionChange?.(rowSelection); }, [rowSelection, onRowSelectionChange]);
  useEffect(() => { onStateChange?.(state); }, [state, onStateChange]);
  const rows = table.getRowModel().rows;
  const exporting = Object.entries(exportHandlers).filter(([, handler]) => typeof handler === 'function');
  const exportContext = () => ({
    rows: (server ? rows : table.getPrePaginatedRowModel().rows).map(r => r.original),
    columns, state
  });
  const runExport = async (format, handler) => {
    setExportError(null);
    setExportingFormat(format);
    try { await handler(exportContext()); }
    catch (err) { setExportError(err?.message || 'Unable to export data'); }
    finally { setExportingFormat(null); }
  };
  const visibleColumns = table.getVisibleLeafColumns();

  return <Paper variant="outlined" sx={[{ width: '100%', overflow: 'hidden' }, ...(Array.isArray(sx) ? sx : sx ? [sx] : [])]} {...paperProps}>
    <Toolbar sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, py: 1 }}>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>{title}</Typography>
      {enableGlobalSearch && <TextField size="small" label="Search" value={globalFilter ?? ''} onChange={e => table.setGlobalFilter(e.target.value)} />}
      {toolbarActions?.({ table, state })}
      {exporting.map(([format, handler]) => <Button key={format} size="small" variant="outlined" disabled={Boolean(exportingFormat) || busy || externalLoading} onClick={() => runExport(format, handler)}>Export {format.toUpperCase()}</Button>)}
    </Toolbar>
    {(externalError || requestError || exportError) && <Alert severity="error">{String(externalError?.message || externalError || requestError || exportError)}</Alert>}
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size={compact ? 'small' : 'medium'} aria-label={title}>
        <TableHead>
          {table.getHeaderGroups().map(group => <React.Fragment key={group.id}>
            <TableRow>
              {group.headers.map(header => <TableCell key={header.id} colSpan={header.colSpan} sortDirection={header.column.getIsSorted() || false}>
                {header.isPlaceholder ? null : (enableSorting && header.column.getCanSort() ?
                  <TableSortLabel active={header.column.getIsSorted() !== false} direction={header.column.getIsSorted() || 'asc'} onClick={header.column.getToggleSortingHandler()} title="Shift-click for multi-column sorting">{flexRender(header.column.columnDef.header, header.getContext())}</TableSortLabel> : flexRender(header.column.columnDef.header, header.getContext()))}
              </TableCell>)}
            </TableRow>
            {enableFiltering && enableColumnFilters && <TableRow>{group.headers.map(header => <TableCell key={header.id} colSpan={header.colSpan}>
              {!header.isPlaceholder && header.column.getCanFilter() && <TextField size="small" fullWidth label={`Filter ${header.column.id}`} value={header.column.getFilterValue() ?? ''} onChange={e => header.column.setFilterValue(e.target.value)} />}
            </TableCell>)}</TableRow>}
          </React.Fragment>)}
        </TableHead>
        <TableBody>
          {(busy || externalLoading) ? <TableRow><TableCell align="center" colSpan={Math.max(1, visibleColumns.length)}><Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'center', gap: 1, py: 3 }}><CircularProgress size={22} />Loading…</Stack></TableCell></TableRow> :
            rows.length === 0 ? <TableRow><TableCell align="center" colSpan={Math.max(1, visibleColumns.length)}><Box sx={{ py: 3 }}>{emptyMessage}</Box></TableCell></TableRow> :
            rows.map(row => <TableRow key={row.id} hover selected={row.getIsSelected()}>{row.getVisibleCells().map(cell => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>)}
        </TableBody>
      </Table>
    </TableContainer>
    {enablePagination && <TablePagination component="div" count={server ? remote.rowCount : table.getFilteredRowModel().rows.length} page={pagination.pageIndex} rowsPerPage={pagination.pageSize} rowsPerPageOptions={pageSizeOptions} onPageChange={(_, page) => table.setPageIndex(page)} onRowsPerPageChange={e => table.setPageSize(Number(e.target.value))} />}
  </Paper>;
}
