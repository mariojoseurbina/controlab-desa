import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Box,
  Divider,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  ArrowBack as VolverIcon,
  Edit as EditarIcon,
  AttachMoney as DineroIcon,
  LocalShipping as ShippingIcon,
  AssignmentReturn as ReturnIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const DetalleCompra = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [compra, setCompra] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // States for actions
  const [openRecibirParcial, setOpenRecibirParcial] = useState(false);
  const [cantidadRecibida, setCantidadRecibida] = useState('');
  const [openDevolucion, setOpenDevolucion] = useState(false);
  const [cantidadDevolver, setCantidadDevolver] = useState('');
  const [observacionesDevolucion, setObservacionesDevolucion] = useState('');
  const [exitoMensaje, setExitoMensaje] = useState('');
  const [errorMensaje, setErrorMensaje] = useState('');

  const CONTACTOS = {
    'Lab Supplies C.A.': { contacto: 'Juan Pérez - 0412-555-1212', direccion: 'Av. Principal, Edif. Centro, Piso 3' },
    'Meditek Venezuela': { contacto: 'María Gómez - 0424-555-2121', direccion: 'Av. Francisco de Miranda, Chacao' },
    'BioAnalítica S.A.': { contacto: 'Carlos Rodríguez - 0416-555-3232', direccion: 'Zona Industrial del Este, Guarenas' },
    'Química Avanzada': { contacto: 'Laura Martínez - 0414-555-4343', direccion: 'Av. Intercomunal, Sector Las Garzas' },
  };

  const cargarCompra = async () => {
    try {
      setCargando(true);
      setError('');
      const response = await api.get(`/compras/${id}`);
      if (response.data && response.data.compra) {
        const c = response.data.compra;
        const info = CONTACTOS[c.proveedor_nombre] || { contacto: 'No especificado', direccion: 'No especificada' };
        setCompra({
          ...c,
          proveedor_contacto: info.contacto,
          direccion_entrega: info.direccion
        });
        setCantidadRecibida(Math.max(1, (Number(c.cantidad) || 1) - 1));
        setCantidadDevolver(Number(c.cantidad) || 0);
      }
    } catch (err) {
      console.error('Error cargando detalle de compra:', err);
      setError('Error al cargar la información de la compra');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCompra();
  }, [id]);

  const obtenerColorEstado = (estado) => {
    switch (estado) {
      case 'recibido': return 'success';
      case 'pendiente': return 'warning';
      case 'parcial': return 'info';
      case 'devuelto': return 'error';
      case 'cancelado': return 'error';
    }
  };

  const handleRecibirParcial = async () => {
    try {
      setErrorMensaje('');
      setExitoMensaje('');
      
      const response = await api.post(`/compras/${id}/recibir-parcial`, {
        cantidadRecibida: parseFloat(cantidadRecibida)
      });

      if (response.data && response.data.success) {
        setExitoMensaje('Entrega parcial registrada exitosamente. Se ha creado una nueva línea pendiente por el remanente.');
        setOpenRecibirParcial(false);
        await cargarCompra();
      }
    } catch (err) {
      console.error('Error al recibir compra parcial:', err);
      setErrorMensaje(err.response?.data?.error || 'Error al registrar la entrega parcial');
    }
  };

  const handleRecibirCompleto = async () => {
    try {
      setErrorMensaje('');
      setExitoMensaje('');
      
      const response = await api.put(`/compras/${id}`, {
        ...compra,
        estado: 'recibido'
      });

      if (response.data && response.data.success) {
        setExitoMensaje('Compra marcada como RECIBIDA completamente. Los registros han sido consolidados.');
        setTimeout(() => {
          navigate('/compras');
        }, 1500);
      }
    } catch (err) {
      console.error('Error al recibir compra completa:', err);
      setErrorMensaje(err.response?.data?.error || 'Error al marcar como recibida');
    }
  };

  const handleDevolucion = async () => {
    try {
      setErrorMensaje('');
      setExitoMensaje('');

      const response = await api.post(`/compras/${id}/devolucion`, {
        cantidadDevolver: parseFloat(cantidadDevolver),
        observaciones: observacionesDevolucion
      });

      if (response.data && response.data.success) {
        setExitoMensaje('Devolución registrada exitosamente. El stock del inventario ha sido actualizado.');
        setOpenDevolucion(false);
        await cargarCompra();
      }
    } catch (err) {
      console.error('Error al registrar devolución:', err);
      setErrorMensaje(err.response?.data?.error || 'Error al registrar la devolución');
    }
  };

  if (cargando) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !compra) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Button
          startIcon={<VolverIcon />}
          onClick={() => navigate('/compras')}
          sx={{ mb: 2 }}
        >
          Volver a Compras
        </Button>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'No se encontró la compra solicitada'}
        </Alert>
      </Container>
    );
  }

  const moneda = compra.moneda_factura || 'USD';
  const tasa = compra.tasa_cambio ? Number(compra.tasa_cambio) : 1.0;
  const pctIva = compra.porcentaje_impuesto ? Number(compra.porcentaje_impuesto) : 0;
  const cant = compra.cantidad ? Number(compra.cantidad) : 0;

  const unitUsd = compra.precio_unitario_usd !== null && compra.precio_unitario_usd !== undefined
    ? Number(compra.precio_unitario_usd)
    : Number(compra.precio_unitario);
  const subUsd = compra.subtotal_usd !== null && compra.subtotal_usd !== undefined
    ? Number(compra.subtotal_usd)
    : unitUsd * cant;
  const impUsd = compra.monto_impuesto_usd !== null && compra.monto_impuesto_usd !== undefined
    ? Number(compra.monto_impuesto_usd)
    : subUsd * (pctIva / 100);
  const totUsd = compra.total_linea_usd !== null && compra.total_linea_usd !== undefined
    ? Number(compra.total_linea_usd)
    : Number(compra.total_linea);

  const unitVes = compra.precio_unitario_ves !== null && compra.precio_unitario_ves !== undefined
    ? Number(compra.precio_unitario_ves)
    : unitUsd * tasa;
  const subVes = compra.subtotal_ves !== null && compra.subtotal_ves !== undefined
    ? Number(compra.subtotal_ves)
    : subUsd * tasa;
  const impVes = compra.monto_impuesto_ves !== null && compra.monto_impuesto_ves !== undefined
    ? Number(compra.monto_impuesto_ves)
    : impUsd * tasa;
  const totVes = compra.total_linea_ves !== null && compra.total_linea_ves !== undefined
    ? Number(compra.total_linea_ves)
    : totUsd * tasa;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          startIcon={<VolverIcon />}
          onClick={() => navigate('/compras')}
          sx={{ mb: 2 }}
        >
          Volver a Compras
        </Button>
        <Box display="flex" gap={2}>
          {compra.estado === 'pendiente' && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                onClick={handleRecibirCompleto}
              >
                Recibir Completo
              </Button>
              <Button
                variant="contained"
                color="info"
                startIcon={<ShippingIcon />}
                onClick={() => setOpenRecibirParcial(true)}
              >
                Recibir Parcial
              </Button>
            </>
          )}
          {(compra.estado === 'recibido' || compra.estado === 'parcial') && (
            <Button
              variant="contained"
              color="error"
              startIcon={<ReturnIcon />}
              onClick={() => setOpenDevolucion(true)}
            >
              Registrar Devolución
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<EditarIcon />}
            onClick={() => navigate(`/compras/editar/${compra.id}`)}
          >
            Editar Compra
          </Button>
        </Box>
      </Box>

      {exitoMensaje && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setExitoMensaje('')}>
          {exitoMensaje}
        </Alert>
      )}
      {errorMensaje && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMensaje('')}>
          {errorMensaje}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Información Principal */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                <Typography variant="h4" gutterBottom>
                  Compra #{compra.numero_factura || 'Sin Factura'}
                </Typography>
                <Chip 
                  label={compra.estado?.toUpperCase()} 
                  color={obtenerColorEstado(compra.estado)}
                  size="large"
                />
              </Box>
              
              <Grid container spacing={4}>
                {/* Información General */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Información General
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography><strong>Proveedor:</strong> {compra.proveedor_nombre}</Typography>
                    <Typography><strong>Contacto:</strong> {compra.proveedor_contacto}</Typography>
                    <Typography><strong>Producto:</strong> {compra.item_nombre}</Typography>
                    <Typography><strong>Dirección de Entrega:</strong> {compra.direccion_entrega}</Typography>
                  </Box>
                </Grid>

                {/* Fechas */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Fechas y Parámetros
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    <Typography><strong>Fecha de Compra:</strong> {compra.fecha_compra ? compra.fecha_compra.split('T')[0] : 'No asignada'}</Typography>
                    <Typography><strong>Fecha de Recepción:</strong> {compra.fecha_recibido ? compra.fecha_recibido.split('T')[0] : 'No recibida'}</Typography>
                    <Typography><strong>Moneda de Factura:</strong> {moneda} • <strong>IVA:</strong> {pctIva}%</Typography>
                    <Typography><strong>Tasa de Cambio:</strong> Bs. {tasa.toFixed(2)} por USD</Typography>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                {/* Detalles de Costo Multimoneda */}
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, backgroundColor: '#fcfcfc' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        Detalles de Costo y Factura Dual
                      </Typography>
                      <Chip label={`${cant} Unidades`} color="primary" />
                    </Box>

                    <Grid container spacing={4}>
                      {/* USD Column */}
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #2e7d32', height: '100%' }}>
                          <Typography variant="subtitle1" fontWeight="bold" color="success.main" gutterBottom>
                            Valores en Dólares (USD - $)
                          </Typography>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" color="textSecondary">Precio Unitario:</Typography>
                            <Typography variant="body2" fontWeight="bold">${unitUsd.toFixed(2)}</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" color="textSecondary">Subtotal Neto:</Typography>
                            <Typography variant="body2" fontWeight="bold">${subUsd.toFixed(2)}</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" color="textSecondary">Monto IVA ({pctIva}%):</Typography>
                            <Typography variant="body2" fontWeight="bold">${impUsd.toFixed(2)}</Typography>
                          </Box>
                          <Divider sx={{ my: 1.5 }} />
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="h6" fontWeight="bold">Total Línea:</Typography>
                            <Typography variant="h6" fontWeight="bold" color="success.main">${totUsd.toFixed(2)}</Typography>
                          </Box>
                        </Paper>
                      </Grid>

                      {/* VES Column */}
                      <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, borderLeft: '4px solid #1976d2', height: '100%' }}>
                          <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                            Valores en Bolívares (VES - Bs.)
                          </Typography>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" color="textSecondary">Precio Unitario:</Typography>
                            <Typography variant="body2" fontWeight="bold">Bs. {unitVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" color="textSecondary">Subtotal Neto:</Typography>
                            <Typography variant="body2" fontWeight="bold">Bs. {subVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2" color="textSecondary">Monto IVA ({pctIva}%):</Typography>
                            <Typography variant="body2" fontWeight="bold">Bs. {impVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                          </Box>
                          <Divider sx={{ my: 1.5 }} />
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="h6" fontWeight="bold">Total Línea:</Typography>
                            <Typography variant="h6" fontWeight="bold" color="primary.main">Bs. {totVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Información Adicional para Demo */}
        <Grid item xs={12}>
          <Card sx={{ backgroundColor: 'info.light', color: 'info.contrastText' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🚀 Beneficios Controlab IA - Módulo de Compras
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    • <strong>Gestión Automatizada:</strong> Integración completa con inventario
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Análisis Inteligente:</strong> IA sugiere mejores proveedores y precios
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    • <strong>Alertas Proactivas:</strong> Notificaciones de stock bajo y vencimientos
                  </Typography>
                  <Typography variant="body2">
                    • <strong>Reportes Avanzados:</strong> Análisis de costos y tendencias
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog para Recibir Parcial */}
      <Dialog open={openRecibirParcial} onClose={() => setOpenRecibirParcial(false)}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>🚛 Registrar Entrega Parcial</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Esta acción dividirá la compra. La cantidad que indiques se marcará como **RECIBIDA** y el remanente quedará **PENDIENTE** bajo una nueva línea con la misma factura.
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Cantidad Solicitada Original: <strong>{compra.cantidad}</strong>
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Cantidad Recibida"
            type="number"
            fullWidth
            variant="outlined"
            value={cantidadRecibida}
            onChange={(e) => setCantidadRecibida(e.target.value)}
            inputProps={{ min: 1, max: compra.cantidad - 1, step: "any" }}
            helperText={`Debe ser menor a la cantidad original (${compra.cantidad})`}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRecibirParcial(false)}>Cancelar</Button>
          <Button onClick={handleRecibirParcial} variant="contained" color="primary">
            Registrar Recepción
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Registrar Devolución */}
      <Dialog open={openDevolucion} onClose={() => setOpenDevolucion(false)}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>↩️ Registrar Devolución al Proveedor</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Indica la cantidad que vas a devolver por defectos. Esta cantidad se **restará del inventario** y se registrará un movimiento de salida.
          </Typography>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Cantidad Recibida Actual: <strong>{compra.cantidad}</strong>
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Cantidad a Devolver"
            type="number"
            fullWidth
            variant="outlined"
            value={cantidadDevolver}
            onChange={(e) => setCantidadDevolver(e.target.value)}
            inputProps={{ min: 0.1, max: compra.cantidad, step: "any" }}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Motivo / Observaciones"
            type="text"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={observacionesDevolucion}
            onChange={(e) => setObservacionesDevolucion(e.target.value)}
            placeholder="Ej: Lote vencido, frasco roto, reactivo no calibró..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDevolucion(false)}>Cancelar</Button>
          <Button onClick={handleDevolucion} variant="contained" color="error">
            Registrar Devolución
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DetalleCompra;