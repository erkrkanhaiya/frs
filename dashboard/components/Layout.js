import { Box } from '@mui/material';
import Navigation from './Navigation';

export default function Layout({ children }) {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navigation />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: '240px', // Match Navigation width
          bgcolor: 'background.default',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}