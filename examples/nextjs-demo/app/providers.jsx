'use client';
import React, { useMemo, useState } from 'react';
import { Box, Button, CssBaseline, Stack } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

export default function Providers({ children }) {
  const [mode, setMode] = useState('light');
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);
  return <ThemeProvider theme={theme}>
    <CssBaseline/>
    <Box sx={{p:{xs:1,sm:3},maxWidth:1200,mx:'auto'}}>
      <Stack direction="row" spacing={1} sx={{mb:2}}>
        <Button href="/">Client demo</Button>
        <Button href="/spring">Spring API demo</Button>
        <Button onClick={()=>setMode(mode==='light'?'dark':'light')}>Use {mode==='light'?'dark':'light'} theme</Button>
      </Stack>
      {children}
    </Box>
  </ThemeProvider>;
}
