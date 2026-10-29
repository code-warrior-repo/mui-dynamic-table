import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DynamicTable from '../src/DynamicTable.jsx';
describe('DynamicTable', () => {
 const columns=[{accessorKey:'name',header:'Name'},{accessorKey:'email',header:'Email'}];
 const data=[{name:'Ada',email:'ada@example.com'},{name:'Grace',email:'grace@example.com'}];
 it('renders dynamic columns and data', () => {render(<DynamicTable title="Customers" columns={columns} data={data}/>); expect(screen.getByText('Ada')).toBeInTheDocument(); expect(screen.getByText('Email')).toBeInTheDocument();});
 it('filters globally', () => {render(<DynamicTable columns={columns} data={data}/>); fireEvent.change(screen.getByLabelText('Search'),{target:{value:'Grace'}}); expect(screen.getByText('Grace')).toBeInTheDocument(); expect(screen.queryByText('Ada')).not.toBeInTheDocument();});
 it('shows empty message', () => {render(<DynamicTable columns={columns} data={[]}/>); expect(screen.getByText('No records found')).toBeInTheDocument();});
});
