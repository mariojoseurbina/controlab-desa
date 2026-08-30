// // import React, { useState, useEffect } from 'react';
// import {
//   Grid,
//   Paper,
//   Typography,
//   Box,
//   Card,
//   CardContent,
//   Alert,
//   List,
//   ListItem,
//   ListItemText,
//   Chip,
//   CircularProgress,
//   Button,
//   IconButton,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   LinearProgress
// } from '@mui/material';
// import {
//   Inventory2,
//   Warning,
//   TrendingUp,
//   Science,
//   Receipt,
//   AddShoppingCart,
//   Visibility,
//   LocalHospital,
//   Biotech
// } from '@mui/icons-material';
// import { StockChart, MovementChart } from '../../components/Charts';
// import { dashboardService } from '../../services/dashboardService';

// // Componente de Métrica Compacto
// const TarjetaMetrica = ({ titulo, valor, icono, color, subtitulo, tendencia }) => (
//   <Card 
//     sx={{ 
//       height: '100%', 
//       background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
//       boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
//       border: `1px solid ${color === 'error' ? '#ffcdd2' : color === 'warning' ? '#ffecb3' : '#c8e6c9'}`,
//       borderRadius: '10px'
//     }}
//   >
//     <CardContent sx={{ p: 1.5 }}>
//       <Box display="flex" alignItems="flex-start" justifyContent="space-between">
//         <Box flex={1}>
//           <Typography color="textSecondary" gutterBottom variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
//             {titulo}
//           </Typography>
//           <Typography variant="h4" component="div" sx={{ 
//             color: color === 'error' ? '#d32f2f' : color === 'warning' ? '#f57c00' : '#2e7d32',
//             fontWeight: 'bold',
//             mb: 0.5,
//             fontSize: '1.5rem'
//           }}>
//             {valor}
//           </Typography>
//           {subtitulo && (
//             <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
//               {subtitulo}
//             </Typography>
//           )}
//           {tendencia && (
//             <Chip 
//               label={tendencia} 
//               size="small" 
//               color={tendencia.includes('↑') ? 'success' : 'error'}
//               sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }}
//             />
//           )}
//         </Box>
//         <Box 
//           sx={{ 
//             color: color === 'error' ? '#d32f2f' : color === 'warning' ? '#f57c00' : '#1976d2',
//             backgroundColor: color === 'error' ? '#ffebee' : color === 'warning' ? '#fff3e0' : '#e3f2fd',
//             borderRadius: '50%',
//             p: 0.8,
//             display: 'flex',
//             alignItems: 'center',
//             justifyContent: 'center'
//           }}
//         >
//           {React.cloneElement(icono, { sx: { fontSize: 22 } })}
//         </Box>
//       </Box>
//     </CardContent>
//   </Card>
// );

// // Componente de Alerta Compacta
// const AlertaStock = ({ alerta, onReabastecer }) => {
//   const getNivelCriticidad = (stockActual, stockMinimo) => {
//     if (stockActual === 0) return { nivel: 'CRÍTICO', color: 'error' };
//     if (stockActual < stockMinimo) return { nivel: 'BAJO', color: 'warning' };
//     return { nivel: 'NORMAL', color: 'success' };
//   };

//   const { nivel, color } = getNivelCriticidad(alerta.stock_actual, alerta.stock_minimo);
//   const porcentaje = Math.min((alerta.stock_actual / alerta.stock_minimo) * 100, 100);

//   return (
//     <ListItem 
//       sx={{ 
//         border: '1px solid',
//         borderColor: color === 'error' ? '#f44336' : color === 'warning' ? '#ff9800' : '#4caf50',
//         borderRadius: 1.5,
//         mb: 0.5,
//         backgroundColor: color === 'error' ? '#ffebee' : color === 'warning' ? '#fff3e0' : 'transparent',
//         py: 1,
//         px: 1.5
//       }}
//     >
//       <ListItemText
//         primary={
//           <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
//             {alerta.nombre}
//           </Typography>
//         }
//         secondary={
//           <Box sx={{ mt: 0.5 }}>
//             <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
//               <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
//                 Stock: <strong>{alerta.stock_actual}</strong> / Mín: {alerta.stock_minimo}
//               </Typography>
//               <Chip 
//                 label={nivel} 
//                 color={color} 
//                 size="small"
//                 sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: 20 }}
//               />
//             </Box>
//             <LinearProgress 
//               variant="determinate" 
//               value={porcentaje} 
//               color={color}
//               sx={{ height: 5, borderRadius: 2.5 }}
//             />
//           </Box>
//         }
//       />
//       <IconButton 
//         color="primary" 
//         size="small"
//         onClick={() => onReabastecer(alerta)}
//         sx={{ ml: 0.5 }}
//       >
//         <AddShoppingCart sx={{ fontSize: 18 }} />
//       </IconButton>
//     </ListItem>
//   );
// };

// const Dashboard = () => {
//   const [metricas, setMetricas] = useState(null);
//   const [alertasStock, setAlertasStock] = useState([]);
//   const [movimientosRecientes, setMovimientosRecientes] = useState([]);
//   const [cargando, setCargando] = useState(true);

//   useEffect(() => {
//     cargarDatosDashboard();
//   }, []);

//   const cargarDatosDashboard = async () => {
//     try {
//       const data = await dashboardService.getDashboardMetrics();
//       setMetricas(data.metrics);
//       setAlertasStock(data.stockAlerts);
//       setMovimientosRecientes(data.recentMovements);
//     } catch (error) {
//       console.error('Error cargando dashboard:', error);
//     } finally {
//       setCargando(false);
//     }
//   };

//   const handleReabastecer = (alerta) => {
//     console.log('Reabastecer:', alerta);
//   };

//   if (cargando) {
//     return (
//       <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px" flexDirection="column">
//         <CircularProgress size={50} sx={{ mb: 2 }} />
//         <Typography variant="h6" sx={{ fontSize: '1rem' }}>Cargando dashboard...</Typography>
//       </Box>
//     );
//   }

//   const itemsCriticosCount = alertasStock.filter(a => a.stock_actual === 0).length;
//   const itemsBajosCount = alertasStock.filter(a => a.stock_actual > 0 && a.stock_actual < a.stock_minimo).length;

//   return (
//     <Box 
//       sx={{ 
//         backgroundColor: '#f8f9fa', 
//         minHeight: '100vh',
//         p: 1.5,  // Reducido significativamente
//         pl: 1,   // Padding izquierdo mínimo
//       }}
//     >
//       {/* Header Compacto */}
//       <Box sx={{ mb: 2.5 }}>
//         <Typography variant="h5" gutterBottom sx={{ 
//           fontWeight: 'bold', 
//           color: '#2c5530',
//           display: 'flex',
//           alignItems: 'center',
//           gap: 1.5,
//           fontSize: '1.3rem'
//         }}>
//           <Biotech sx={{ fontSize: 24 }} />
//           Panel de Control - CONTROLAB IA 
//         </Typography>
//         <Typography variant="subtitle2" color="textSecondary" sx={{ fontSize: '0.85rem' }}>
//           Gestión de Inventario para Laboratorios Clínicos con IA
//         </Typography>
//       </Box>

//       <Grid container spacing={1.5}> {/* Espaciado reducido */}
//         {/* Métricas Principales Compactas */}
//         <Grid item xs={12} sm={6} md={3}>
//           <TarjetaMetrica
//             titulo="Total de Items"
//             valor={metricas?.totalItems || 0}
//             icono={<Inventory2 />}
//             color="primary"
//             subtitulo="En inventario"
//             tendencia="↗ +2"
//           />
//         </Grid>
//         <Grid item xs={12} sm={6} md={3}>
//           <TarjetaMetrica
//             titulo="Items Críticos"
//             valor={itemsCriticosCount}
//             icono={<Warning />}
//             color="error"
//             subtitulo="Atención urgente"
//             tendencia="↑ 1"
//           />
//         </Grid>
//         <Grid item xs={12} sm={6} md={3}>
//           <TarjetaMetrica
//             titulo="Movimientos Hoy"
//             valor={metricas?.movimientosHoy || 0}
//             icono={<TrendingUp />}
//             color="info"
//             subtitulo="Entradas y salidas"
//             tendencia="→ Estable"
//           />
//         </Grid>
//         <Grid item xs={12} sm={6} md={3}>
//           <TarjetaMetrica
//             titulo="Stock Saludable"
//             valor={`${((metricas?.totalItems - itemsCriticosCount - itemsBajosCount) / metricas?.totalItems * 100 || 0).toFixed(1)}%`}
//             icono={<LocalHospital />}
//             color="success"
//             subtitulo="Por encima del mínimo"
//             tendencia="↗ 5%"
//           />
//         </Grid>

//         {/* Sección de Alertas Compacta */}
//         <Grid item xs={12} md={6}>
//           <Paper sx={{ 
//             p: 2,  // Reducido
//             height: '100%',
//             boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
//             border: '1px solid #e0e0e0',
//             borderRadius: '10px'
//           }}>
//             <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
//               <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#d32f2f', fontSize: '0.95rem' }}>
//                 🚨 Alertas de Stock Crítico
//               </Typography>
//               <Chip 
//                 label={`${itemsCriticosCount} críticos`} 
//                 color="error" 
//                 size="small"
//                 sx={{ fontSize: '0.7rem' }}
//               />
//             </Box>
            
//             {alertasStock.length === 0 ? (
//               <Alert severity="success" sx={{ mt: 1, py: 0.5, fontSize: '0.8rem' }}>
//                 ✅ No hay alertas críticas
//               </Alert>
//             ) : (
//               <List sx={{ maxHeight: 350, overflow: 'auto' }}>
//                 {alertasStock
//                   .filter(alerta => alerta.stock_actual === 0)
//                   .map((alerta) => (
//                     <AlertaStock 
//                       key={alerta.id} 
//                       alerta={alerta} 
//                       onReabastecer={handleReabastecer}
//                     />
//                   ))
//                 }
                
//                 {alertasStock.filter(a => a.stock_actual > 0 && a.stock_actual < a.stock_minimo).length > 0 && (
//                   <Typography variant="subtitle2" sx={{ mt: 1.5, mb: 1, color: 'warning.main', fontSize: '0.8rem' }}>
//                     ⚠️ Items con Stock Bajo
//                   </Typography>
//                 )}
                
//                 {alertasStock
//                   .filter(alerta => alerta.stock_actual > 0 && alerta.stock_actual < alerta.stock_minimo)
//                   .map((alerta) => (
//                     <AlertaStock 
//                       key={alerta.id} 
//                       alerta={alerta} 
//                       onReabastecer={handleReabastecer}
//                     />
//                   ))
//                 }
//               </List>
//             )}
            
//             {alertasStock.length > 0 && (
//               <Button 
//                 variant="outlined" 
//                 fullWidth 
//                 sx={{ mt: 1.5, fontSize: '0.8rem', py: 0.6 }}
//                 startIcon={<AddShoppingCart sx={{ fontSize: 18 }} />}
//               >
//                 Generar Orden de Compra
//               </Button>
//             )}
//           </Paper>
//         </Grid>

//         {/* Movimientos Recientes Compactos */}
//         <Grid item xs={12} md={6}>
//           <Paper sx={{ 
//             p: 2,
//             boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
//             border: '1px solid #e0e0e0',
//             borderRadius: '10px'
//           }}>
//             <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
//               📋 Movimientos Recientes
//             </Typography>
//             {movimientosRecientes.length === 0 ? (
//               <Alert severity="info" sx={{ mt: 1, py: 0.5, fontSize: '0.8rem' }}>
//                 ℹ️ No hay movimientos recientes
//               </Alert>
//             ) : (
//               <TableContainer>
//                 <Table size="small">
//                   <TableHead>
//                     <TableRow>
//                       <TableCell sx={{ py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>Producto</TableCell>
//                       <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>Tipo</TableCell>
//                       <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>Cantidad</TableCell>
//                       <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>Fecha</TableCell>
//                     </TableRow>
//                   </TableHead>
//                   <TableBody>
//                     {movimientosRecientes.slice(0, 5).map((movimiento) => (
//                       <TableRow key={movimiento.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
//                         <TableCell sx={{ py: 0.8, fontSize: '0.75rem' }}>
//                           <Typography variant="body2" fontWeight="medium">
//                             {movimiento.nombre}
//                           </Typography>
//                         </TableCell>
//                         <TableCell align="center" sx={{ py: 0.8 }}>
//                           <Chip 
//                             label={movimiento.tipo_movimiento} 
//                             color={movimiento.tipo_movimiento === 'ENTRADA' ? 'success' : 'error'}
//                             size="small"
//                             variant="outlined"
//                             sx={{ fontSize: '0.65rem', height: 20 }}
//                           />
//                         </TableCell>
//                         <TableCell align="right" sx={{ py: 0.8, fontSize: '0.75rem' }}>
//                           <Typography 
//                             variant="body2" 
//                             color={movimiento.tipo_movimiento === 'ENTRADA' ? 'success.main' : 'error.main'}
//                             fontWeight="bold"
//                           >
//                             {movimiento.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{movimiento.cantidad}
//                           </Typography>
//                         </TableCell>
//                         <TableCell align="right" sx={{ py: 0.8, fontSize: '0.75rem' }}>
//                           <Typography variant="caption" color="textSecondary">
//                             {new Date(movimiento.fecha_movimiento).toLocaleDateString('es-ES')}
//                           </Typography>
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </TableContainer>
//             )}
//             {movimientosRecientes.length > 5 && (
//               <Button 
//                 fullWidth 
//                 sx={{ mt: 1, fontSize: '0.8rem', py: 0.6 }}
//                 startIcon={<Visibility sx={{ fontSize: 18 }} />}
//               >
//                 Ver todos los movimientos
//               </Button>
//             )}
//           </Paper>
//         </Grid>

//         {/* Gráficos Compactos */}
//         <Grid item xs={12} md={8}>
//           <Paper sx={{ 
//             p: 1.5, 
//             boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
//             borderRadius: '10px'
//           }}>
//             <StockChart />
//           </Paper>
//         </Grid>

//         <Grid item xs={12} md={4}>
//           <Paper sx={{ 
//             p: 1.5, 
//             boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
//             borderRadius: '10px'
//           }}>
//             <MovementChart />
//           </Paper>
//         </Grid>

//         {/* Resumen del Sistema Compacto */}
//         <Grid item xs={12}>
//           <Paper sx={{ 
//             p: 2, 
//             background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//             color: 'white',
//             boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
//             borderRadius: '10px'
//           }}>
//             <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'white', fontSize: '0.95rem' }}>
//               📊 Resumen del Sistema
//             </Typography>
//             <Grid container spacing={1.5}>
//               <Grid item xs={12} sm={6} md={3}>
//                 <Box textAlign="center">
//                   <Typography variant="h5" fontWeight="bold" color="white" sx={{ fontSize: '1.4rem' }}>
//                     {metricas?.totalReactivos || 0}
//                   </Typography>
//                   <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}>
//                     <Science sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
//                     Reactivos Activos
//                   </Typography>
//                 </Box>
//               </Grid>
//               <Grid item xs={12} sm={6} md={3}>
//                 <Box textAlign="center">
//                   <Typography variant="h5" fontWeight="bold" color="white" sx={{ fontSize: '1.4rem' }}>
//                     {itemsBajosCount}
//                   </Typography>
//                   <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}>
//                     <Warning sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
//                     Stock Bajo
//                   </Typography>
//                 </Box>
//               </Grid>
//               <Grid item xs={12} sm={6} md={3}>
//                 <Box textAlign="center">
//                   <Typography variant="h5" fontWeight="bold" color="white" sx={{ fontSize: '1.4rem' }}>
//                     {((metricas?.totalItems - itemsCriticosCount - itemsBajosCount) / metricas?.totalItems * 100 || 0).toFixed(1)}%
//                   </Typography>
//                   <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}>
//                     <LocalHospital sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
//                     Stock Saludable
//                   </Typography>
//                 </Box>
//               </Grid>
//               <Grid item xs={12} sm={6} md={3}>
//                 <Box textAlign="center">
//                   <Typography variant="h5" fontWeight="bold" color="white" sx={{ fontSize: '1.4rem' }}>
//                     {metricas?.totalItems || 0}
//                   </Typography>
//                   <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}>
//                     <Inventory2 sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
//                     Total Inventario
//                   </Typography>
//                 </Box>
//               </Grid>
//             </Grid>
//           </Paper>
//         </Grid>
//       </Grid>
//     </Box>
//   );
// };

// export default Dashboard;


// frontend/src/pages/Dashboard.js

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress
} from '@mui/material';
import {
  Inventory2,
  Warning,
  TrendingUp,
  Science,
  Receipt,
  AddShoppingCart,
  Visibility,
  LocalHospital,
  Biotech
} from '@mui/icons-material';
import StockChart from '../../components/Charts/StockChart';
import MovementChart from '../../components/Charts/MovementChart';
import { dashboardService } from '../../services/dashboardService';

// Componente de Métrica Compacto (sin cambios)
const TarjetaMetrica = ({ titulo, valor, icono, color, subtitulo, tendencia }) => (
  <Card 
    sx={{ 
      height: '100%', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: `1px solid ${color === 'error' ? '#ffcdd2' : color === 'warning' ? '#ffecb3' : '#c8e6c9'}`,
      borderRadius: '10px'
    }}
  >
    <CardContent sx={{ p: 1.5 }}>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
        <Box flex={1}>
          <Typography color="textSecondary" gutterBottom variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
            {titulo}
          </Typography>
          <Typography variant="h4" component="div" sx={{ 
            color: color === 'error' ? '#d32f2f' : color === 'warning' ? '#f57c00' : '#2e7d32',
            fontWeight: 'bold',
            mb: 0.5,
            fontSize: '1.5rem'
          }}>
            {valor}
          </Typography>
          {subtitulo && (
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
              {subtitulo}
            </Typography>
          )}
          {tendencia && (
            <Chip 
              label={tendencia} 
              size="small" 
              color={tendencia.includes('↑') ? 'success' : 'error'}
              sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }}
            />
          )}
        </Box>
        <Box 
          sx={{ 
            color: color === 'error' ? '#d32f2f' : color === 'warning' ? '#f57c00' : '#1976d2',
            backgroundColor: color === 'error' ? '#ffebee' : color === 'warning' ? '#fff3e0' : '#e3f2fd',
            borderRadius: '50%',
            p: 0.8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {React.cloneElement(icono, { sx: { fontSize: 22 } })}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// Componente de Alerta Compacta (sin cambios)
const AlertaStock = ({ alerta, onReabastecer }) => {
  const getNivelCriticidad = (stockActual, stockMinimo, stockCritico) => {
    if (stockActual <= stockCritico) return { nivel: 'CRÍTICO', color: 'error' };
    if (stockActual <= stockMinimo) return { nivel: 'BAJO', color: 'warning' };
    return { nivel: 'NORMAL', color: 'success' };
  };

  const { nivel, color } = getNivelCriticidad(alerta.stock_actual, alerta.stock_minimo, alerta.stock_critico);
  const porcentaje = Math.min((alerta.stock_actual / alerta.stock_minimo) * 100, 100);

  return (
    <ListItem 
      sx={{ 
        border: '1px solid',
        borderColor: color === 'error' ? '#f44336' : color === 'warning' ? '#ff9800' : '#4caf50',
        borderRadius: 1.5,
        mb: 0.5,
        backgroundColor: color === 'error' ? '#ffebee' : color === 'warning' ? '#fff3e0' : 'transparent',
        py: 1,
        px: 1.5
      }}
    >
      <ListItemText
        primary={
          <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.8rem' }}>
            {alerta.nombre}
          </Typography>
        }
        secondary={
          <Box sx={{ mt: 0.5 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                Stock: <strong>{alerta.stock_actual}</strong> / Mín: {alerta.stock_minimo}
              </Typography>
              <Chip 
                label={nivel} 
                color={color} 
                size="small"
                sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: 20 }}
              />
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={porcentaje} 
              color={color}
              sx={{ height: 5, borderRadius: 2.5 }}
            />
          </Box>
        }
      />
      <IconButton 
        color="primary" 
        size="small"
        onClick={() => onReabastecer(alerta)}
        sx={{ ml: 0.5 }}
      >
        <AddShoppingCart sx={{ fontSize: 18 }} />
      </IconButton>
    </ListItem>
  );
};

const Dashboard = () => {
  const [metricas, setMetricas] = useState(null);
  const [alertasStock, setAlertasStock] = useState([]);
  const [movimientosRecientes, setMovimientosRecientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatosDashboard();
  }, []);

  const cargarDatosDashboard = async () => {
    try {
      const data = await dashboardService.getDashboardMetrics();
      setMetricas(data.metrics);
      setAlertasStock(data.stockAlerts);
      setMovimientosRecientes(data.recentMovements);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleReabastecer = (alerta) => {
    console.log('Reabastecer:', alerta);
    // Aquí puedes abrir un modal o redirigir a órdenes de compra
  };

  if (cargando) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px" flexDirection="column">
        <CircularProgress size={50} sx={{ mb: 2 }} />
        <Typography variant="h6" sx={{ fontSize: '1rem' }}>Cargando dashboard...</Typography>
      </Box>
    );
  }

  const itemsCriticosCount = alertasStock.filter(a => a.stock_actual <= a.stock_critico).length;
  const itemsBajosCount = alertasStock.filter(a => a.stock_actual > a.stock_critico && a.stock_actual <= a.stock_minimo).length;
  const totalItems = metricas?.totalItems || 0;
  const saludablePercent = totalItems === 0 ? 0 : ((totalItems - itemsCriticosCount - itemsBajosCount) / totalItems * 100).toFixed(1);

  return (
    <Box 
      sx={{ 
        backgroundColor: '#f8f9fa', 
        minHeight: '100vh',
        p: 1.5,
        pl: 1,
      }}
    >
      {/* Header Compacto */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" gutterBottom sx={{ 
          fontWeight: 'bold', 
          color: '#2c5530',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          fontSize: '1.3rem'
        }}>
          <Biotech sx={{ fontSize: 24 }} />
          Panel de Control - CONTROLAB IA 
        </Typography>
        <Typography variant="subtitle2" color="textSecondary" sx={{ fontSize: '0.85rem' }}>
          Gestión de Inventario para Laboratorios Clínicos con IA
        </Typography>
      </Box>

      <Grid container spacing={1.5}>
        {/* Métricas Principales */}
        <Grid item xs={12} sm={6} md={3}>
          <TarjetaMetrica
            titulo="Total de Items"
            valor={totalItems}
            icono={<Inventory2 />}
            color="primary"
            subtitulo="En inventario"
            tendencia="↗ +2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TarjetaMetrica
            titulo="Items Críticos"
            valor={itemsCriticosCount}
            icono={<Warning />}
            color="error"
            subtitulo="Atención urgente"
            tendencia="↑ 1"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TarjetaMetrica
            titulo="Movimientos Hoy"
            valor={metricas?.movimientosHoy || 0}
            icono={<TrendingUp />}
            color="info"
            subtitulo="Entradas y salidas"
            tendencia="→ Estable"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TarjetaMetrica
            titulo="Stock Saludable"
            valor={`${saludablePercent}%`}
            icono={<LocalHospital />}
            color="success"
            subtitulo="Por encima del mínimo"
            tendencia="↗ 5%"
          />
        </Grid>

        {/* Alertas de Stock */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 2,
            height: '100%',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e0e0e0',
            borderRadius: '10px'
          }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: '#d32f2f', fontSize: '0.95rem' }}>
                🚨 Alertas de Stock Crítico
              </Typography>
              <Chip 
                label={`${itemsCriticosCount} críticos`} 
                color="error" 
                size="small"
                sx={{ fontSize: '0.7rem' }}
              />
            </Box>
            
            {alertasStock.length === 0 ? (
              <Alert severity="success" sx={{ mt: 1, py: 0.5, fontSize: '0.8rem' }}>
                ✅ No hay alertas críticas
              </Alert>
            ) : (
              <List sx={{ maxHeight: 350, overflow: 'auto' }}>
                {alertasStock
                  .filter(alerta => alerta.stock_actual === 0)
                  .map((alerta) => (
                    <AlertaStock 
                      key={alerta.id} 
                      alerta={alerta} 
                      onReabastecer={handleReabastecer}
                    />
                  ))
                }
                
                {alertasStock.filter(a => a.stock_actual > 0 && a.stock_actual < a.stock_minimo).length > 0 && (
                  <Typography variant="subtitle2" sx={{ mt: 1.5, mb: 1, color: 'warning.main', fontSize: '0.8rem' }}>
                    ⚠️ Items con Stock Bajo
                  </Typography>
                )}
                
                {alertasStock
                  .filter(alerta => alerta.stock_actual > 0 && alerta.stock_actual < alerta.stock_minimo)
                  .map((alerta) => (
                    <AlertaStock 
                      key={alerta.id} 
                      alerta={alerta} 
                      onReabastecer={handleReabastecer}
                    />
                  ))
                }
              </List>
            )}
          </Paper>
        </Grid>

        {/* Movimientos Recientes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid #e0e0e0',
            borderRadius: '10px'
          }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
              📋 Movimientos Recientes
            </Typography>
            {movimientosRecientes.length === 0 ? (
              <Alert severity="info" sx={{ mt: 1, py: 0.5, fontSize: '0.8rem' }}>
                ℹ️ No hay movimientos recientes
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>Producto</TableCell>
                      <TableCell align="center" sx={{ py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>Tipo</TableCell>
                      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>Cantidad</TableCell>
                      <TableCell align="right" sx={{ py: 0.5, fontSize: '0.75rem', fontWeight: 'bold' }}>Fecha</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movimientosRecientes.slice(0, 5).map((movimiento) => (
                      <TableRow key={movimiento.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                        <TableCell sx={{ py: 0.8, fontSize: '0.75rem' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {movimiento.nombre}
                          </Typography>
                        </TableCell>
                        <TableCell align="center" sx={{ py: 0.8 }}>
                          <Chip 
                            label={movimiento.tipo_movimiento} 
                            color={movimiento.tipo_movimiento === 'ENTRADA' ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.8, fontSize: '0.75rem' }}>
                          <Typography 
                            variant="body2" 
                            color={movimiento.tipo_movimiento === 'ENTRADA' ? 'success.main' : 'error.main'}
                            fontWeight="bold"
                          >
                            {movimiento.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{movimiento.cantidad}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.8, fontSize: '0.75rem' }}>
                          <Typography variant="caption" color="textSecondary">
                            {new Date(movimiento.fecha_movimiento).toLocaleDateString('es-ES')}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {movimientosRecientes.length > 5 && (
              <Button 
                fullWidth 
                sx={{ mt: 1, fontSize: '0.8rem', py: 0.6 }}
                startIcon={<Visibility sx={{ fontSize: 18 }} />}
              >
                Ver todos los movimientos
              </Button>
            )}
          </Paper>
        </Grid>

        {/* Gráficos de torta (profesionales) */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ 
            p: 1.5, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderRadius: '10px'
          }}>
            <StockChart />
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ 
            p: 1.5, 
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            borderRadius: '10px'
          }}>
            <MovementChart />
          </Paper>
        </Grid>

        {/* Resumen del Sistema */}
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 2, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            borderRadius: '10px'
          }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', color: 'white', fontSize: '0.95rem' }}>
              📊 Resumen del Sistema
            </Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h5" fontWeight="bold" color="white" sx={{ fontSize: '1.4rem' }}>
                    {metricas?.totalReactivos || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}>
                    <Science sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    Reactivos Activos
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h5" fontWeight="bold" color="white" sx={{ fontSize: '1.4rem' }}>
                    {itemsBajosCount}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}>
                    <Warning sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    Stock Bajo
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h5" fontWeight="bold" color="white" sx={{ fontSize: '1.4rem' }}>
                    {saludablePercent}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}>
                    <LocalHospital sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    Stock Saludable
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h5" fontWeight="bold" color="white" sx={{ fontSize: '1.4rem' }}>
                    {totalItems}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem' }}>
                    <Inventory2 sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    Total Inventario
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;