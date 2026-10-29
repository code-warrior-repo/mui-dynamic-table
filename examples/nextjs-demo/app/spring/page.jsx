'use client';
import React, { useMemo } from 'react';
import { DynamicTable, createSpringDataSource, exportWithEndpoint } from '@company/mui-dynamic-table';
export default function SpringCustomers() {
 const columns = useMemo(()=>[{accessorKey:'id',header:'ID'},{accessorKey:'name',header:'Name'}],[]);
 const dataSource = useMemo(()=>createSpringDataSource({url:'/api/customers'}),[]);
 return <DynamicTable title="Spring customers" columns={columns} dataSource={dataSource} enableColumnFilters exportFilename="customers" exportHandlers={{xlsx:({state})=>exportWithEndpoint({url:'/api/customers/export/xlsx',filename:'customers.xlsx',method:'POST',body:state}),pdf:({state})=>exportWithEndpoint({url:'/api/customers/export/pdf',filename:'customers.pdf',method:'POST',body:state})}}/>;
}
