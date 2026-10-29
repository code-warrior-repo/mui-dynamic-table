import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DynamicTable from '../src/DynamicTable.jsx';

const columns = [{accessorKey:'name',header:'Name'}, {accessorKey:'email',header:'Email'}];
const data = [{id:1,name:'Ada',email:'ada@example.com'}, {id:2,name:'Grace',email:'grace@example.com'}];

describe('DynamicTable', () => {
  it('renders custom cells and row actions', () => {
    const action = vi.fn();
    render(<DynamicTable columns={[{accessorKey:'name',header:'Name',cell:({cell})=><b>{cell.getValue().toUpperCase()}</b>}]} data={data} rowActions={row=><button onClick={()=>action(row)}>View {row.name}</button>}/>);
    expect(screen.getByText('ADA')).toBeInTheDocument();
    fireEvent.click(screen.getByText('View Ada'));
    expect(action).toHaveBeenCalledWith(data[0]);
  });
  it('filters globally and by column, including numeric values', () => {
    render(<DynamicTable columns={[...columns,{accessorKey:'id',header:'ID'}]} data={data} enableColumnFilters/>);
    fireEvent.change(screen.getByLabelText('Search'), {target:{value:'Grace'}});
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search'), {target:{value:''}});
    fireEvent.change(screen.getByLabelText('Filter id'), {target:{value:'1'}});
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.queryByText('Grace')).not.toBeInTheDocument();
  });
  it('paginates and resets to the first page when searching', () => {
    render(<DynamicTable columns={columns} data={data} pageSize={1} pageSizeOptions={[1,2]}/>);
    expect(screen.queryByText('Grace')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Go to next page'}));
    expect(screen.getByText('Grace')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search'),{target:{value:'Ada'}});
    expect(screen.getByText('Ada')).toBeInTheDocument();
  });
  it('renders all rows when pagination is disabled', () => {
    render(<DynamicTable columns={columns} data={data} pageSize={1} enablePagination={false}/>);
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Grace')).toBeInTheDocument();
  });
  it('sorts by multiple columns with shift-click', async () => {
    const onStateChange=vi.fn();
    render(<DynamicTable columns={columns} data={data} onStateChange={onStateChange}/>);
    fireEvent.click(screen.getByText('Name'));
    fireEvent.click(screen.getByText('Email'),{shiftKey:true});
    await waitFor(()=>expect(onStateChange.mock.lastCall[0].sorting).toEqual([{id:'name',desc:false},{id:'email',desc:false}]));
  });
  it('selects rows by stable IDs', async () => {
    const selection=vi.fn();
    render(<DynamicTable columns={columns} data={data} getRowId={row=>String(row.id)} enableRowSelection onRowSelectionChange={selection}/>);
    fireEvent.click(screen.getAllByRole('checkbox',{name:'Select row'})[0]);
    await waitFor(()=>expect(selection).toHaveBeenLastCalledWith({'1':true}));
  });
  it('shows empty, loading and error states', () => {
    const {rerender}=render(<DynamicTable columns={columns}/>);
    expect(screen.getByText('No records found')).toBeInTheDocument();
    rerender(<DynamicTable columns={columns} loading/>);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    rerender(<DynamicTable columns={columns} error={new Error('Offline')}/>);
    expect(screen.getByRole('alert')).toHaveTextContent('Offline');
  });
  it('exports all filtered client rows and surfaces handler failures', async () => {
    const handler=vi.fn(async()=>{throw new Error('Export unavailable');});
    render(<DynamicTable columns={columns} data={data} pageSize={1} pageSizeOptions={[1,2]} exportHandlers={{csv:handler}}/>);
    fireEvent.click(screen.getByText('Export CSV'));
    expect(handler.mock.calls[0][0].rows).toEqual(data);
    expect(await screen.findByRole('alert')).toHaveTextContent('Export unavailable');
  });
  it('ignores stale server results and aborts requests when changing page', async () => {
    const pending=[];
    const dataSource=vi.fn(args=>new Promise(resolve=>pending.push({args,resolve})));
    const {unmount}=render(<DynamicTable columns={columns} dataSource={dataSource}/>);
    await waitFor(()=>expect(pending).toHaveLength(1));
    fireEvent.change(screen.getByLabelText('Search'),{target:{value:'Grace'}});
    await waitFor(()=>expect(pending).toHaveLength(2));
    expect(pending[0].args.signal.aborted).toBe(true);
    pending[1].resolve({rows:[data[1]],rowCount:1});
    expect(await screen.findByText('Grace')).toBeInTheDocument();
    pending[0].resolve({rows:[data[0]],rowCount:1});
    await waitFor(()=>expect(screen.queryByText('Ada')).not.toBeInTheDocument());
    unmount();
    expect(pending[1].args.signal.aborted).toBe(true);
  });
  it('sends pagination and sorting to the server and shows request errors', async () => {
    const dataSource=vi.fn(async({pagination})=> {
      if (pagination.pageIndex === 1) throw new Error('Server unavailable');
      return {rows:[data[1],data[0]],rowCount:4};
    });
    render(<DynamicTable columns={columns} dataSource={dataSource} pageSize={2} pageSizeOptions={[2,4]}/>);
    await screen.findByText('Grace');
    fireEvent.click(screen.getByText('Name'));
    await waitFor(()=>expect(dataSource.mock.lastCall[0].sorting).toEqual([{id:'name',desc:false}]));
    fireEvent.click(screen.getByRole('button',{name:'Go to next page'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Server unavailable');
    expect(dataSource.mock.lastCall[0].pagination.pageIndex).toBe(1);
  });
  it('retains selected IDs across server pages', async () => {
    const dataSource=vi.fn(async({pagination})=>({rows:[data[pagination.pageIndex]],rowCount:2}));
    const selection=vi.fn();
    render(<DynamicTable columns={columns} dataSource={dataSource} getRowId={row=>String(row.id)}
      pageSize={1} pageSizeOptions={[1,2]} enableRowSelection onRowSelectionChange={selection}/>);
    await screen.findByText('Ada');
    fireEvent.click(screen.getByRole('checkbox',{name:'Select row'}));
    fireEvent.click(screen.getByRole('button',{name:'Go to next page'}));
    await screen.findByText('Grace');
    expect(screen.getByRole('checkbox',{name:'Select row'})).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox',{name:'Select row'}));
    await waitFor(()=>expect(selection).toHaveBeenLastCalledWith({'1':true,'2':true}));
  });
  it('leaves the loading state when switching from a pending server request to client data', async () => {
    const dataSource=()=>new Promise(()=>{});
    const {rerender}=render(<DynamicTable columns={columns} dataSource={dataSource}/>);
    await screen.findByRole('progressbar');
    rerender(<DynamicTable columns={columns} data={data}/>);
    expect(await screen.findByText('Ada')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

});
