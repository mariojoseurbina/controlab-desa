import React from 'react';
import { Box, AppBar, Toolbar, Typography, Button, IconButton, useTheme, useMediaQuery, Avatar } from '@mui/material';
import { Logout, Menu as MenuIcon, Psychology } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar'; // 👈 RUTA CORREGIDA (sin /Sidebar/Sidebar)

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          background: 'linear-gradient(90deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
          boxShadow: '0 4px 20px 0 rgba(0,0,0,0.4)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Toolbar sx={{ minHeight: '70px' }}>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          {/* LOGO PREMIUM */}
          <Typography variant="h5" noWrap component="div" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.05)',
              padding: '6px',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <Psychology sx={{ fontSize: 34, color: '#60a5fa', filter: 'drop-shadow(0 0 8px rgba(96,165,250,0.8))' }} />
            </Box>
            <Box component="span" sx={{ 
              fontWeight: 900, 
              letterSpacing: 1.5, 
              background: 'linear-gradient(45deg, #60a5fa, #c084fc, #f472b6)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)'
            }}>
               CONTROLAB
            </Box>
            <Box component="span" sx={{ fontWeight: 300, color: '#cbd5e1', letterSpacing: 3, fontSize: '0.85em', marginTop: '3px' }}>
               A.I.
            </Box>
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(0,0,0,0.2)', padding: '5px 15px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: '#6366f1', fontSize: '0.9rem', fontWeight: 'bold' }}>
              {(user?.nombre_completo || user?.usuario || 'A')[0].toUpperCase()}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 500, color: '#e2e8f0', letterSpacing: 0.5 }}>
              {user?.nombre_completo || user?.usuario || 'Administrador'}
            </Typography>
          </Box>

          <Button 
            color="inherit" 
            onClick={handleLogout} 
            sx={{ 
              ml: 3, 
              fontWeight: 'bold', 
              opacity: 0.8, 
              '&:hover': { opacity: 1, background: 'rgba(255,255,255,0.1)' },
              borderRadius: '20px',
              padding: '6px 16px'
            }} 
            startIcon={<Logout />}
          >
            Salir
          </Button>
        </Toolbar>
      </AppBar>

      {/* Sidebar - AHORA CON LA RUTA CORRECTA */}
      <Sidebar 
        open={!isMobile || mobileOpen} 
        onClose={handleDrawerToggle}
      />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 200px)` },
          ml: { sm: '200px' },
          mt: 8,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;