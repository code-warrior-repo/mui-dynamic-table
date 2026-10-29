'use client';
import React, { useMemo, useState } from 'react';
import { Button, Chip } from '@mui/material';
import { DynamicTable } from '@company/mui-dynamic-table';
export default function Page() {
 const [data, setData] = useState([{id:1,name:'Ada',status:'Active'},{id:2,name:'Grace',status:'Pending'}]);
 const columns = useMemo(() => [{accessorKey:'id',header:'ID'},{accessorKey:'name',header:'Name'},{accessorKey:'status',header:'Status',cell:({cell})=><Chip size="small" label={cell.getValue()}/> }],[]);
 return <DynamicTable title="Customers" columns={columns} data={data} getRowId={row=>String(row.id)} enableRowSelection enableColumnFilters rowActions={row=><Button size="small" onClick={()=>alert(row.name)}>View</Button>} toolbarActions={()=> <Button onClick={()=>setData(d=>[...d,{id:d.length+1,name:'New customer',status:'Active'}])}>Add demo row</Button>} exportFilename="customers"/>;
}
