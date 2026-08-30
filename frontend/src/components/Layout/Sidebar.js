import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Toolbar,
  Collapse,
  Box,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  Science as ScienceIcon,
  SwapHoriz as MovementIcon,
  Assessment as ReportIcon,
  People as PeopleIcon,
  ShoppingCart as ComprasIcon,
  Biotech as KitsPruebaIcon,
  ExpandLess,
  ExpandMore,
  LocalOffer as DescuentoIcon,
  MonetizationOn as CostosIcon,
  SmartToy as SmartToyIcon,
  Radar as RadarIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Sidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = React.useState(false);

  const handleMenuItemClick = (path) => {
    navigate(path);
    if (window.innerWidth < 758) {
      onClose();
    }
  };

  const handleSubmenuToggle = () => {
    setOpenSubmenu(!openSubmenu);
  };

  const menuItems = [
    { 
      text: 'Controlab Brain', 
      icon: <SmartToyIcon />, 
      path: '/brain-agent' 
    },
    { 
      text: 'Panel de Control', 
      icon: <DashboardIcon />, 
      path: '/dashboard' 
    },
    { 
      text: 'Inventario General', 
      icon: <InventoryIcon />, 
      path: '/inventory' 
    },
    { 
      text: 'Catálogo de Reactivos', 
      icon: <ScienceIcon />, 
      path: '/reagents' 
    },
    { 
      text: '⚡ Monitor Top 20 Reactivos', 
      icon: <ScienceIcon style={{ color: '#0284c7' }} />, 
      path: '/live-reagents' 
    },
    { 
      text: 'Recetas (Kits de Pruebas)', 
      icon: <KitsPruebaIcon />, 
      path: '/reagents/test-kits' 
    },
    { 
      text: 'Movimientos', 
      icon: <MovementIcon />, 
      path: '/movements' 
    },
    { 
      text: 'Compras', 
      icon: <ComprasIcon />, 
      path: '/compras' 
    },
    { 
      text: 'Estructura de Costos', 
      icon: <CostosIcon />, 
      path: '/costos' 
    },
    { 
      text: 'Descuentos por Pruebas', 
      icon: <DescuentoIcon />, 
      path: '/descuentos' 
    },
    { 
      text: 'Reportes', 
      icon: <ReportIcon />, 
      path: '/reports' 
    },
    { 
      text: 'Usuarios', 
      icon: <PeopleIcon />, 
      path: '/users' 
    },
    { 
      text: 'Auditoría Red (Sniffer)', 
      icon: <RadarIcon />, 
      path: '/sniffer' 
    },
    { 
      text: 'Bitácora / Historial', 
      icon: <HistoryIcon />, 
      path: '/audit-log' 
    },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 75,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 300,
          boxSizing: 'border-box',
          position: 'fixed',
          height: '300vh',
          backgroundColor: '#FCFAF7',
          borderRight: '1px solid #F1ECE6',
        },
        display: { xs: 'none', sm: 'block' }
      }}
      open
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto', mt: 2 }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleMenuItemClick(item.path)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: '#FDF2F0',
                    borderRight: '4px solid #E07A5F',
                    '&:hover': {
                      backgroundColor: '#FBE9E7',
                    },
                  },
                  '&:hover': {
                    backgroundColor: '#F9F5F0',
                  },
                  py: 1.5,
                  mx: 1,
                  mb: 0.5,
                  borderRadius: 2,
                }}
              >
                <ListItemIcon sx={{ minWidth: 50, color: location.pathname === item.path ? '#E07A5F' : 'inherit' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.85rem',
                    fontWeight: location.pathname === item.path ? 700 : 500,
                    color: location.pathname === item.path ? '#E07A5F' : '#3D405B',
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );
};

export default Sidebar;