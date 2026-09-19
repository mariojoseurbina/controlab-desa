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
import { useNavigate } from 'react-router-dom';
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
  Biotech,
  MoveToInbox,
  NotificationsActive,
  OpenInNew
} from '@mui/icons-material';
import StockChart from '../../components/Charts/StockChart';
import MovementChart from '../../components/Charts/MovementChart';
import { dashboardService } from '../../services/dashboardService';

// Componente de Métrica Compacto (sin cambios)
const TarjetaMetrica = ({ titulo, valor, icono, color, subtitulo, tendencia, onClick }) => (
  <Card 
    onClick={onClick}
    sx={{ 
      height: '100%', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: `1px solid ${color === 'error' ? '#ffcdd2' : color === 'warning' ? '#ffecb3' : '#c8e6c9'}`,
      borderRadius: '10px',
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease',
      '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' } : {}
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
              color={tendencia.includes('↑') ? 'error' : 'success'}
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

// Componente de Alerta de Reposición Urgente en Analizador (Penúltimo / Último Frasco)
const AlertaReposicionAnalizador = ({ alerta, onIrAReposicion }) => {
  const esUltimo = alerta.esUltimoFrasco;
  const badgeColor = esUltimo ? '#ef4444' : '#f59e0b';
  const badgeBg = esUltimo ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)';
  const borderColor = esUltimo ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)';

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        mb: 1.5,
        borderRadius: 2.5,
        backgroundColor: '#0f172a',
        border: `1px solid ${borderColor}`,
        color: '#f8fafc',
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: esUltimo ? '#ef4444' : '#f59e0b',
          boxShadow: `0 4px 14px ${esUltimo ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`
        }
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5}>
        {/* Info del reactivo */}
        <Box flex={1} minWidth={240}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Chip
              label={esUltimo ? `🔴 ÚLTIMO FRASCO (${alerta.frascoActual}/${alerta.totalFrascos})` : `⚠️ PENÚLTIMO FRASCO (${alerta.frascoActual}/${alerta.totalFrascos})`}
              size="small"
              sx={{
                fontWeight: 900,
                fontSize: '0.68rem',
                backgroundColor: badgeBg,
                color: badgeColor,
                border: `1px solid ${badgeColor}`
              }}
            />
            <Chip
              label={alerta.equipo || 'CM 260i'}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '0.65rem',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.3)'
              }}
            />
          </Box>
          <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#f8fafc', fontSize: '0.92rem' }}>
            {alerta.itemNombre}
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
            Lote: <strong style={{ color: '#38bdf8' }}>{alerta.numeroLote}</strong> | Marca: {alerta.marca} | Presentación: {alerta.presentacion}
          </Typography>
        </Box>

        {/* Métricas restantes y Stock Central */}
        <Box display="flex" gap={1.2} alignItems="center" flexWrap="wrap">
          <Box
            sx={{
              backgroundColor: 'rgba(30, 41, 59, 0.9)',
              p: 0.8,
              px: 1.2,
              borderRadius: 2,
              border: '1px solid #334155',
              textAlign: 'center',
              minWidth: 105
            }}
          >
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.62rem', display: 'block' }}>
              En Analizador
            </Typography>
            <Typography variant="body2" fontWeight="900" sx={{ color: '#34d399', fontSize: '0.85rem' }}>
              ~{alerta.pruebasRestantesCaja} tests
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.6rem' }}>
              {alerta.mlRestantesCaja} mL en caja
            </Typography>
          </Box>

          <Box
            sx={{
              backgroundColor: 'rgba(30, 41, 59, 0.9)',
              p: 0.8,
              px: 1.2,
              borderRadius: 2,
              border: '1px solid #334155',
              textAlign: 'center',
              minWidth: 105
            }}
          >
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.62rem', display: 'block' }}>
              Almacén Central
            </Typography>
            <Typography variant="body2" fontWeight="900" sx={{ color: alerta.stockAlmacenCentral > 0 ? '#38bdf8' : '#ef4444', fontSize: '0.85rem' }}>
              {alerta.stockAlmacenCentral} Cajas
            </Typography>
            <Typography variant="caption" sx={{ color: alerta.stockAlmacenCentral > 0 ? '#38bdf8' : '#f87171', fontSize: '0.6rem' }}>
              {alerta.stockAlmacenCentral > 0 ? 'Disponible para Lab' : '¡Sin Reserva!'}
            </Typography>
          </Box>

          <Button
            variant="contained"
            size="small"
            onClick={() => onIrAReposicion(alerta)}
            startIcon={<MoveToInbox sx={{ fontSize: 16 }} />}
            sx={{
              background: esUltimo 
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' 
                : 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.75rem',
              textTransform: 'none',
              px: 1.8,
              py: 0.8,
              boxShadow: esUltimo ? '0 4px 12px rgba(239, 68, 68, 0.35)' : '0 4px 12px rgba(245, 158, 11, 0.35)',
              '&:hover': {
                filter: 'brightness(1.1)'
              }
            }}
          >
            📦 Reponer Caja
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

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
  const navigate = useNavigate();
  const [metricas, setMetricas] = useState(null);
  const [alertasStock, setAlertasStock] = useState([]);
  const [alertasReposicionAnalizador, setAlertasReposicionAnalizador] = useState([]);
  const [movimientosRecientes, setMovimientosRecientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatosDashboard();
    // Refresco periódico automático cada 30 segundos mientras la sesión esté activa
    const interval = setInterval(() => {
      cargarDatosDashboard();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const cargarDatosDashboard = async () => {
    try {
      const data = await dashboardService.getDashboardMetrics();
      setMetricas(data.metrics);
      setAlertasStock(data.stockAlerts || []);
      setAlertasReposicionAnalizador(data.alertasReposicionAnalizador || []);
      setMovimientosRecientes(data.recentMovements || []);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleReabastecer = (alerta) => {
    console.log('Reabastecer:', alerta);
    navigate('/cajas-frascos');
  };

  const handleIrAReposicion = (alerta) => {
    navigate('/cajas-frascos');
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
  const totalCriticosAnalizador = alertasReposicionAnalizador.length;

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
      <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box>
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

        <Button
          variant="outlined"
          size="small"
          onClick={() => navigate('/live-reagents')}
          startIcon={<Science sx={{ fontSize: 16 }} />}
          sx={{
            borderColor: '#0284c7',
            color: '#0284c7',
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 2,
            '&:hover': { backgroundColor: 'rgba(2, 132, 199, 0.08)', borderColor: '#0369a1' }
          }}
        >
          🔬 Monitor de Reactivos en Vivo
        </Button>
      </Box>

      {/* SECCIÓN CRÍTICA DESTACADA: ALERTA DE REPOSICIÓN DESDE ALMACÉN CENTRAL */}
      {totalCriticosAnalizador > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 3,
            backgroundColor: '#090d16',
            border: '2px solid rgba(239, 68, 68, 0.6)',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.15)'
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
            <Box display="flex" alignItems="center" gap={1.2}>
              <NotificationsActive sx={{ color: '#ef4444', fontSize: 24 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight="900" sx={{ color: '#f8fafc', fontSize: '1rem', lineHeight: 1.2 }}>
                  🚨 REPOSICIÓN URGENTE DESDE ALMACÉN CENTRAL (REACTIVOS EN ANALIZADOR)
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                  Los siguientes reactivos en uso en analizador están en su <strong>penúltimo o último frasco</strong>. El encargado de inventario debe extraer una nueva caja del Almacén Central para el Laboratorio.
                </Typography>
              </Box>
            </Box>
            <Chip
              label={`${totalCriticosAnalizador} Requieren Reposición`}
              color="error"
              size="small"
              sx={{ fontWeight: 900, fontSize: '0.75rem' }}
            />
          </Box>

          {/* Lista de reactivos en penúltimo/último frasco */}
          <Box sx={{ mt: 1.5, maxHeight: 380, overflowY: 'auto', pr: 0.5 }}>
            {alertasReposicionAnalizador.map((alerta) => (
              <AlertaReposicionAnalizador
                key={alerta.loteId}
                alerta={alerta}
                onIrAReposicion={handleIrAReposicion}
              />
            ))}
          </Box>
        </Paper>
      )}

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