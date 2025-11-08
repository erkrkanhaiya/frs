import { useRouter } from 'next/router';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Videocam as CameraIcon,
  Notifications as AlertIcon,
  People as UserIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function Navigation() {
  const router = useRouter();
  const { logout } = useAuth();

  const menuItems = [
    { text: 'Dashboard', href: '/', icon: DashboardIcon },
    { text: 'Cameras', href: '/cameras', icon: CameraIcon },
    { text: 'Alert Rules', href: '/alert-rules', icon: AlertIcon },
    { text: 'Users', href: '/users', icon: UserIcon },
  ];

  const isActive = (href) => router.pathname === href;

  return (
    <Box
      component="nav"
      sx={{
        width: 240,
        flexShrink: 0,
        bgcolor: 'background.paper',
        borderRight: 1,
        borderColor: 'divider',
        height: '100vh',
        position: 'fixed',
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Face Watchlist
        </Typography>
      </Box>
      <List>
        {menuItems.map(({ text, href, icon: Icon }) => (
          <ListItemButton
            key={href}
            selected={isActive(href)}
            onClick={() => router.push(href)}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              },
            }}
          >
            <ListItemIcon>
              <Icon color={isActive(href) ? 'inherit' : 'action'} />
            </ListItemIcon>
            <ListItemText primary={text} />
          </ListItemButton>
        ))}
        <ListItemButton
          onClick={logout}
          sx={{
            marginTop: 2,
            color: 'error.main',
            '& .MuiListItemIcon-root': {
              color: 'error.main',
            },
          }}
        >
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </List>
    </Box>
  );
}