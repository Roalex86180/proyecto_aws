// src/components/ComunaDataTable.tsx

import { Typography, Box, CircularProgress } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';

interface ComunaData {
  comuna: string;
  total: string;
}
interface DataTableProps {
  title: string;
  data: ComunaData[];
  loading: boolean;
}

export default function ComunaDataTable({ title, data, loading }: DataTableProps) {
  const columns: GridColDef[] = [
    { field: 'comuna', headerName: 'Comuna', flex: 1 },
    { field: 'total', headerName: 'Total', width: 150, type: 'number' },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>{title}</Typography>
      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={data.map(row => ({ ...row, id: row.comuna }))}
          columns={columns}
          hideFooter
          sx={{
            border: 1,
            borderColor: 'divider',
            '& .MuiDataGrid-columnHeader': { backgroundColor: '#1D66A5', color: 'white', fontWeight: 'bold' },
          }}
        />
      </Box>
    </Box>
  );
};