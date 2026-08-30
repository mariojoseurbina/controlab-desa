import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Typography,
  Grid,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AgregarIcon,
  Visibility as VerIcon,
  Edit as EditarIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const ListaCompras = () => {
  const [compras, setCompras] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const navigate = useNavigate();

  const cargarCompras = async () => {
    setCargando(true);
    setError('');
    try {
      const response = await api.get('/compras');
      if (response.data && response.data.compras) {
        setCompras(response.data.compras);
      } else {
        setCompras([]);
      }
    } catch (error) {
      console.error('Error cargando compras:', error);
      setError('Error al conectar con la base de datos de compras');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCompras();
  }, []);

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'recibido': return 'success';
      case 'pendiente': return 'warning';
      case 'parcial': return 'info';
      case 'devuelto': return 'error';
      case 'cancelado': return 'error';
      default: return 'default';
    }
  };

  const totalInvertido = compras.reduce((sum, compra) => sum + compra.total_linea, 0);
  const comprasPendientes = compras.filter(c => c.estado === 'pendiente').length;

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Gestión de Compras
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Paper variant="outlined" sx={{ px: 1, display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>Filtro:</Typography>
            <Button 
              size="small" 
              variant={filtroEstado === 'todas' ? 'contained' : 'text'} 
              onClick={() => setFiltroEstado('todas')}
              sx={{ borderRadius: 2 }}
            >
              Todas
            </Button>
            <Button 
              size="small" 
              color="warning"
              variant={filtroEstado === 'pendiente' ? 'contained' : 'text'} 
              onClick={() => setFiltroEstado('pendiente')}
              sx={{ borderRadius: 2 }}
            >
              Pendientes
            </Button>
            <Button 
              size="small" 
              color="success"
              variant={filtroEstado === 'recibido' ? 'contained' : 'text'} 
              onClick={() => setFiltroEstado('recibido')}
              sx={{ borderRadius: 2 }}
            >
              Recibidas
            </Button>
            <Button 
              size="small" 
              color="info"
              variant={filtroEstado === 'parcial' ? 'contained' : 'text'} 
              onClick={() => setFiltroEstado('parcial')}
              sx={{ borderRadius: 2 }}
            >
              Parciales
            </Button>
            <Button 
              size="small" 
              color="error"
              variant={filtroEstado === 'devuelto' ? 'contained' : 'text'} 
              onClick={() => setFiltroEstado('devuelto')}
              sx={{ borderRadius: 2 }}
            >
              Devueltas
            </Button>
          </Paper>
          <Button
            variant="contained"
            startIcon={<AgregarIcon />}
            onClick={() => navigate('/compras/nueva')}
          >
            Nueva Compra
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Estadísticas */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Total Compras
            </Typography>
            <Typography variant="h4" color="primary">
              {compras.length}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Invertido Total
            </Typography>
            <Typography variant="h4" color="primary">
              ${totalInvertido.toFixed(2)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6" color="textSecondary">
              Pendientes
            </Typography>
            <Typography variant="h4" color="warning.main">
              {comprasPendientes}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Tabla de Compras */}
      <Card>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Factura</strong></TableCell>
                <TableCell><strong>Proveedor</strong></TableCell>
                <TableCell><strong>Producto</strong></TableCell>
                <TableCell><strong>Cantidad</strong></TableCell>
                <TableCell><strong>Precio Unit.</strong></TableCell>
                <TableCell><strong>Total</strong></TableCell>
                <TableCell><strong>Estado</strong></TableCell>
                <TableCell><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cargando ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={30} />
                  </TableCell>
                </TableRow>
              ) : compras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    No se encontraron compras registradas.
                  </TableCell>
                </TableRow>
              ) : (
                compras
                  .filter(c => filtroEstado === 'todas' || c.estado === filtroEstado)
                  .map((compra) => (
                  <TableRow key={compra.id}>
                    <TableCell>{compra.numero_factura}</TableCell>
                  <TableCell>{compra.proveedor_nombre}</TableCell>
                  <TableCell>{compra.item_nombre}</TableCell>
                  <TableCell>{compra.cantidad}</TableCell>
                  <TableCell>${compra.precio_unitario?.toFixed(2)}</TableCell>
                  <TableCell>${compra.total_linea?.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={compra.estado?.toUpperCase()} 
                      color={obtenerColorEstado(compra.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton 
                      size="small" 
                      onClick={() => navigate(`/compras/${compra.id}`)}
                      color="primary"
                    >
                      <VerIcon />
                    </IconButton>
                    <IconButton 
                      size="small"
                      onClick={() => navigate(`/compras/editar/${compra.id}`)}
                      color="secondary"
                    >
                      <EditarIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Información para la Demo */}
      <Card sx={{ mt: 3, backgroundColor: 'success.light', color: 'white' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            🚀 Módulo de Compras - Controlab IA
          </Typography>
          <Typography variant="body2">
            • <strong>Gestión completa</strong> de compras e inventario
          </Typography>
          <Typography variant="body2">
            • <strong>Integración automática</strong> con stock
          </Typography>
          <Typography variant="body2">
            • <strong>Reportes inteligentes</strong> con análisis de costos
          </Typography>
        </Box>
      </Card>
    </Container>
  );
};

export default ListaCompras;