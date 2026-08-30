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
import { StockChart, MovementChart } from '../../components/Charts';
import { dashboardService } from '../../services/dashboardService';

// Componente de Métrica Mejorado
const TarjetaMetrica = ({ titulo, valor, icono, color, subtitulo, tendencia }) => (
  <Card 
    sx={{ 
      height: '100%', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      border: `1px solid ${color === 'error' ? '#ffcdd2' : color === 'warning' ? '#ffecb3' : '#c8e6c9'}`
    }}
  >
    <CardContent>
      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
        <Box flex={1}>
          <Typography color="textSecondary" gutterBottom variant="h6" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {titulo}
          </Typography>
          <Typography variant="h3" component="div" sx={{ 
            color: color === 'error' ? '#d32f2f' : color === 'warning' ? '#f57c00' : '#2e7d32',
            fontWeight: 'bold',
            mb: 1
          }}>
            {valor}
          </Typography>
          {subtitulo && (
            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.75rem' }}>
              {subtitulo}
            </Typography>
          )}
          {tendencia && (
            <Chip 
              label={tendencia} 
              size="small" 
              color={tendencia.includes('↑') ? 'success' : 'error'}
              sx={{ mt: 1, height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <Box 
          sx={{ 
            color: color === 'error' ? '#d32f2f' : color === 'warning' ? '#f57c00' : '#1976d2',
            backgroundColor: color === 'error' ? '#ffebee' : color === 'warning' ? '#fff3e0' : '#e3f2fd',
            borderRadius: '50%',
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icono}
        </Box>
      </Box>
    </CardContent>
  </Card>
);

// Componente de Alerta Compacta
const AlertaStock = ({ alerta, onReabastecer }) => {
  const getNivelCriticidad = (stockActual, stockMinimo) => {
    if (stockActual === 0) return { nivel: 'CRÍTICO', color: 'error' };
    if (stockActual < stockMinimo) return { nivel: 'BAJO', color: 'warning' };
    return { nivel: 'NORMAL', color: 'success' };
  };

  const { nivel, color } = getNivelCriticidad(alerta.stock_actual, alerta.stock_minimo);
  const porcentaje = Math.min((alerta.stock_actual / alerta.stock_minimo) * 100, 100);

  return (
    <ListItem 
      sx={{ 
        border: '1px solid',
        borderColor: color === 'error' ? '#f44336' : color === 'warning' ? '#1aff00ff' : '#4caf50',
        borderRadius: 2,
        mb: 1,
        backgroundColor: color === 'error' ? '#ffebee' : color === 'warning' ? '#fff3e0' : 'transparent'
      }}
    >
      <ListItemText
        primary={
          <Typography variant="subtitle2" fontWeight="bold">
            {alerta.nombre}
          </Typography>
        }
        secondary={
          <Box sx={{ mt: 1 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="body2">
                Stock: <strong>{alerta.stock_actual}</strong> / Mín: {alerta.stock_minimo}
              </Typography>
              <Chip 
                label={nivel} 
                color={color} 
                size="small"
                sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
              />
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={porcentaje} 
              color={color}
              sx={{ height: 6, borderRadius: 3 }}
            />
          </Box>
        }
      />
      <IconButton 
        color="primary" 
        size="small"
        onClick={() => onReabastecer(alerta)}
        sx={{ ml: 1 }}
      >
        <AddShoppingCart />
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
    // Lógica para reabastecer el item
    console.log('Reabastecer:', alerta);
    // Aquí puedes integrar con tu servicio de reabastecimiento
  };

  if (cargando) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px" flexDirection="column">
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6">Cargando dashboard...</Typography>
      </Box>
    );
  }

  const itemsCriticosCount = alertasStock.filter(a => a.stock_actual === 0).length;
  const itemsBajosCount = alertasStock.filter(a => a.stock_actual > 0 && a.stock_actual < a.stock_minimo).length;

  return (
    <Box p={1} sx={{ backgroundColor: '#f8f9fa', minHeight: '50vh' }}>
      {/* Header Mejorado */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ 
          fontWeight: 'bold', 
          color: '#2c5530',
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}>
          <Biotech sx={{ fontSize: 20}} />
          Panel de Control - CONTROLAB IA 
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Gestión de Inventario para Laboratorios Clínicos con Inteligencia Artificial
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {/* Métricas Principales Mejoradas */}
        <Grid item xs={10} sm={6} md={3}>
          <TarjetaMetrica
            titulo="Total de Items"
            valor={metricas?.totalItems || 0}
            icono={<Inventory2 sx={{ fontSize: 30 }} />}
            color="primary"
            subtitulo="En inventario"
            tendencia="↗ +2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TarjetaMetrica
            titulo="Items Críticos"
            valor={itemsCriticosCount}
            icono={<Warning sx={{ fontSize: 30 }} />}
            color="error"
            subtitulo="Necesitan atención urgente"
            tendencia="↑ 1"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TarjetaMetrica
            titulo="Movimientos Hoy"
            valor={metricas?.movimientosHoy || 0}
            icono={<TrendingUp sx={{ fontSize: 30 }} />}
            color="info"
            subtitulo="Entradas y salidas"
            tendencia="→ Estable"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <TarjetaMetrica
            titulo="Stock Saludable"
            valor={`${((metricas?.totalItems - itemsCriticosCount - itemsBajosCount) / metricas?.totalItems * 100 || 0).toFixed(1)}%`}
            icono={<LocalHospital sx={{ fontSize: 30 }} />}
            color="success"
            subtitulo="Por encima del mínimo"
            tendencia="↗ 5%"
          />
        </Grid>

        {/* Sección de Alertas Mejorada */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3, 
            height: '100%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0'
          }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#d32f2f' }}>
                🚨 Alertas de Stock Crítico
              </Typography>
              <Chip 
                label={`${itemsCriticosCount} críticos`} 
                color="error" 
                size="small"
              />
            </Box>
            
            {alertasStock.length === 0 ? (
              <Alert severity="success" sx={{ mt: 1 }}>
                ✅ No hay alertas críticas en este momento
              </Alert>
            ) : (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
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
                
                {/* Separador para items bajos */}
                {alertasStock.filter(a => a.stock_actual > 0 && a.stock_actual < a.stock_minimo).length > 0 && (
                  <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, color: 'warning.main' }}>
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
            
            {alertasStock.length > 0 && (
              <Button 
                variant="outlined" 
                fullWidth 
                sx={{ mt: 2 }}
                startIcon={<AddShoppingCart />}
              >
                Generar Orden de Compra Masiva
              </Button>
            )}
          </Paper>
        </Grid>

        {/* Movimientos Recientes Mejorados */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            border: '1px solid #e0e0e0'
          }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              📋 Movimientos Recientes
            </Typography>
            {movimientosRecientes.length === 0 ? (
              <Alert severity="info" sx={{ mt: 1 }}>
                ℹ️ No hay movimientos recientes para mostrar
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell align="center">Tipo</TableCell>
                      <TableCell align="right">Cantidad</TableCell>
                      <TableCell align="right">Fecha</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {movimientosRecientes.slice(0, 5).map((movimiento) => (
                      <TableRow key={movimiento.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {movimiento.nombre}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={movimiento.tipo_movimiento} 
                            color={movimiento.tipo_movimiento === 'ENTRADA' ? 'success' : 'error'}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            color={movimiento.tipo_movimiento === 'ENTRADA' ? 'success.main' : 'error.main'}
                            fontWeight="bold"
                          >
                            {movimiento.tipo_movimiento === 'ENTRADA' ? '+' : '-'}{movimiento.cantidad}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
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
                sx={{ mt: 1 }}
                startIcon={<Visibility />}
              >
                Ver todos los movimientos
              </Button>
            )}
          </Paper>
        </Grid>

        {/* Gráficos (manteniendo los existentes) */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <StockChart />
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <MovementChart />
          </Paper>
        </Grid>

        {/* Resumen del Sistema Mejorado */}
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3, 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            boxShadow: '0 6px 20px rgba(0,0,0,0.2)'
          }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: 'white' }}>
              📊 Resumen del Sistema
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" fontWeight="bold" color="white">
                    {metricas?.totalReactivos || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    <Science sx={{ fontSize: 16, mr: 0.5 }} />
                    Reactivos Activos
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" fontWeight="bold" color="white">
                    {itemsBajosCount}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    <Warning sx={{ fontSize: 16, mr: 0.5 }} />
                    Items con Stock Bajo
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" fontWeight="bold" color="white">
                    {((metricas?.totalItems - itemsCriticosCount - itemsBajosCount) / metricas?.totalItems * 100 || 0).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    <LocalHospital sx={{ fontSize: 16, mr: 0.5 }} />
                    Stock Saludable
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" fontWeight="bold" color="white">
                    {metricas?.totalItems || 0}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                    <Inventory2 sx={{ fontSize: 16, mr: 0.5 }} />
                    Total en Inventario
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