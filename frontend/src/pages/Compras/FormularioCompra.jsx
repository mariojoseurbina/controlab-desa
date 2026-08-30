import React, { useState, useEffect } from 'react';
import {
  Container, Card, CardContent, CardHeader, Grid, TextField, Button,
  MenuItem, FormControl, InputLabel, Select, Box, Typography, Alert,
  CircularProgress, Paper, Autocomplete, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Chip
} from '@mui/material';
import {
  Save as GuardarIcon, Cancel as CancelarIcon, Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';

const PRESENTACIONES = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'caja', label: 'Caja' },
  { value: 'paquete', label: 'Paquete' },
  { value: 'bulto', label: 'Bulto' },
  { value: 'frasco', label: 'Frasco' },
  { value: 'vial', label: 'Vial' },
  { value: 'kit', label: 'Kit' },
  { value: 'ampolla', label: 'Ampolla' },
  { value: 'galon', label: 'Galón' },
  { value: 'rollo', label: 'Rollo' },
  { value: 'paleta', label: 'Paleta' }
];

const FormularioCompra = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const esEdicion = Boolean(id);

  // Cabecera de la factura (Master)
  const [formData, setFormData] = useState({
    proveedor_id: '',
    numero_factura: '',
    fecha_compra: new Date().toISOString().split('T')[0],
    fecha_recibido: '',
    moneda_factura: 'USD',
    tasa_cambio: '36.50',
    estado: 'pendiente',
    creado_por: 'admin'
  });

  // Ítem actual en edición (antes de agregarlo al carrito)
  const [currentItem, setCurrentItem] = useState({
    item_id: '',
    cantidad: '',
    precio_unitario: '',
    porcentaje_impuesto: '0',
    presentacion: 'unidad'
  });

  // Lista de ítems a comprar (Detail)
  const [cartItems, setCartItems] = useState([]);

  const [items, setItems] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [abrirDialogoProveedor, setAbrirDialogoProveedor] = useState(false);
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState('');
  const [guardandoProveedor, setGuardandoProveedor] = useState(false);

  useEffect(() => {
    cargarDatosIniciales();
    if (esEdicion) {
      cargarCompraExistente();
    }
  }, [esEdicion, id]);

  const cargarDatosIniciales = async () => {
    try {
      const response = await api.get('/inventory');
      if (response.data && response.data.items) {
        setItems(response.data.items);
      }
      const responseProvs = await api.get('/compras/proveedores');
      if (responseProvs.data && responseProvs.data.proveedores) {
        setProveedores(responseProvs.data.proveedores);
      }
    } catch (error) {
      console.error('Error cargando catálogo o proveedores:', error);
      setError('Error cargando catálogo o proveedores');
    }
  };

  const crearProveedor = async () => {
    try {
      setGuardandoProveedor(true);
      setError('');
      const response = await api.post('/compras/proveedores', { nombre: nuevoProveedorNombre });
      if (response.data && response.data.proveedor) {
        const nuevo = response.data.proveedor;
        setProveedores(prev => [...prev, nuevo]);
        setFormData(prev => ({ ...prev, proveedor_id: String(nuevo.id) }));
        setNuevoProveedorNombre('');
        setAbrirDialogoProveedor(false);
      }
    } catch (err) {
      setError('Error al crear el proveedor: ' + (err.response?.data?.error || err.message));
    } finally {
      setGuardandoProveedor(false);
    }
  };

  const cargarCompraExistente = async () => {
    try {
      setCargando(true);
      const response = await api.get(`/compras/${id}`);
      if (response.data && response.data.compra) {
        const compra = response.data.compra;
        setFormData({
          proveedor_id: compra.proveedor_id ? String(compra.proveedor_id) : '',
          numero_factura: compra.numero_factura || '',
          fecha_compra: compra.fecha_compra ? compra.fecha_compra.split('T')[0] : '',
          fecha_recibido: compra.fecha_recibido ? compra.fecha_recibido.split('T')[0] : '',
          moneda_factura: compra.moneda_factura || 'USD',
          tasa_cambio: compra.tasa_cambio !== null ? String(compra.tasa_cambio) : '36.50',
          estado: compra.estado || 'pendiente',
          creado_por: compra.creado_por || 'admin'
        });
        
        // Si es edición, cargamos la compra como único item en el carrito
        setCartItems([{
          id_temporal: Date.now(),
          item_id: compra.item_id ? String(compra.item_id) : '',
          cantidad: compra.cantidad !== null ? String(compra.cantidad) : '',
          precio_unitario: compra.moneda_factura === 'VES'
            ? (compra.precio_unitario_ves !== null ? String(compra.precio_unitario_ves) : String(compra.precio_unitario))
            : (compra.precio_unitario_usd !== null ? String(compra.precio_unitario_usd) : String(compra.precio_unitario)),
          porcentaje_impuesto: compra.porcentaje_impuesto !== null ? String(compra.porcentaje_impuesto) : '0',
          estado: compra.estado || 'pendiente'
        }]);
      }
    } catch (error) {
      setError('Error cargando la compra');
    } finally {
      setCargando(false);
    }
  };

  const manejarCambioMaster = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const manejarCambioItem = (e) => {
    const { name, value } = e.target;
    setCurrentItem(prev => ({ ...prev, [name]: value }));
  };

  const agregarAlCarrito = () => {
    if (!currentItem.item_id || !currentItem.cantidad || !currentItem.precio_unitario) {
      setError('Complete los datos del producto (Producto, Cantidad, Precio)');
      return;
    }
    setError('');
    
    setCartItems(prev => [...prev, {
      id_temporal: Date.now(),
      ...currentItem,
      estado: formData.estado // Herada el estado de la factura
    }]);

    // Limpiar campos del item
    setCurrentItem({
      item_id: '',
      cantidad: '',
      precio_unitario: '',
      porcentaje_impuesto: '0',
      presentacion: 'unidad'
    });
  };

  const eliminarDelCarrito = (id_temporal) => {
    setCartItems(prev => prev.filter(i => i.id_temporal !== id_temporal));
  };

  const manejarEnvio = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    setExito('');

    try {
      if (!formData.proveedor_id || cartItems.length === 0) {
        setError('Debe seleccionar un proveedor y agregar al menos un producto a la factura.');
        setCargando(false);
        return;
      }

      if (esEdicion) {
        // Para edición individual (comportamiento legacy si se necesita)
        const itemToUpdate = cartItems[0];
        const payload = {
          ...formData,
          proveedor_id: parseInt(formData.proveedor_id),
          tasa_cambio: parseFloat(formData.tasa_cambio) || 1.0,
          item_id: parseInt(itemToUpdate.item_id),
          cantidad: parseFloat(itemToUpdate.cantidad),
          precio_unitario: parseFloat(itemToUpdate.precio_unitario),
          porcentaje_impuesto: parseFloat(itemToUpdate.porcentaje_impuesto) || 0.0,
          estado: formData.estado
        };
        await api.put(`/compras/${id}`, payload);
        setExito('Compra actualizada exitosamente');
      } else {
        // Para creación múltiple o simple (usa el nuevo endpoint /multiple)
        const payloadMultiple = {
          proveedor_id: parseInt(formData.proveedor_id),
          numero_factura: formData.numero_factura,
          fecha_compra: formData.fecha_compra,
          fecha_recibido: formData.fecha_recibido || null,
          moneda_factura: formData.moneda_factura,
          tasa_cambio: parseFloat(formData.tasa_cambio) || 1.0,
          creado_por: formData.creado_por,
          items: cartItems.map(i => ({
            item_id: parseInt(i.item_id),
            cantidad: parseFloat(i.cantidad),
            precio_unitario: parseFloat(i.precio_unitario),
            porcentaje_impuesto: parseFloat(i.porcentaje_impuesto) || 0.0,
            estado: formData.estado
          }))
        };
        await api.post('/compras/multiple', payloadMultiple);
        setExito('Factura registrada exitosamente con ' + cartItems.length + ' producto(s)');
      }
      
      setTimeout(() => {
        navigate('/compras');
      }, 1500);

    } catch (error) {
      setError('Error guardando la compra: ' + (error.response?.data?.error || error.message));
    } finally {
      setCargando(false);
    }
  };

  // Cálculo de totales en base al carrito
  const tasa = parseFloat(formData.tasa_cambio) || 1.0;
  
  let totalFacturaSubtotal = 0;
  let totalFacturaImpuesto = 0;

  cartItems.forEach(item => {
    const qty = parseFloat(item.cantidad) || 0;
    const price = parseFloat(item.precio_unitario) || 0;
    const ivaPct = parseFloat(item.porcentaje_impuesto) || 0;
    
    const lineSubtotal = qty * price;
    const lineTax = lineSubtotal * (ivaPct / 100);
    
    totalFacturaSubtotal += lineSubtotal;
    totalFacturaImpuesto += lineTax;
  });

  const totalFacturaGeneral = totalFacturaSubtotal + totalFacturaImpuesto;

  // Equivalencias
  let monedaEquiv = formData.moneda_factura === 'VES' ? 'USD' : 'VES';
  let subtotalEquiv = formData.moneda_factura === 'VES' ? (tasa > 0 ? totalFacturaSubtotal / tasa : 0) : totalFacturaSubtotal * tasa;
  let impuestoEquiv = formData.moneda_factura === 'VES' ? (tasa > 0 ? totalFacturaImpuesto / tasa : 0) : totalFacturaImpuesto * tasa;
  let totalEquiv = formData.moneda_factura === 'VES' ? (tasa > 0 ? totalFacturaGeneral / tasa : 0) : totalFacturaGeneral * tasa;

  if (cargando && esEdicion) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          {esEdicion ? 'Editar Compra' : 'Registrar Compra (Factura)'}
        </Typography>
        <Button variant="outlined" startIcon={<CancelarIcon />} onClick={() => navigate('/compras')}>
          Cancelar
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      {exito && <Alert severity="success" sx={{ mb: 3 }}>{exito}</Alert>}

      <form onSubmit={manejarEnvio}>
        <Grid container spacing={3}>
          {/* CABECERA FACTURA */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="1. Datos de la Factura" sx={{ bgcolor: '#f8fafc' }} />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={4}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Autocomplete
                        fullWidth
                        options={proveedores}
                        getOptionLabel={(option) => option.nombre || ''}
                        value={proveedores.find(p => String(p.id) === String(formData.proveedor_id)) || null}
                        onChange={(e, newVal) => setFormData(p => ({ ...p, proveedor_id: newVal ? String(newVal.id) : '' }))}
                        renderInput={(params) => <TextField {...params} label="Proveedor" required />}
                      />
                      <Button variant="outlined" onClick={() => setAbrirDialogoProveedor(true)} title="Agregar">+</Button>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField fullWidth label="N° Factura" name="numero_factura" value={formData.numero_factura} onChange={manejarCambioMaster} required />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <FormControl fullWidth required>
                      <InputLabel>Estado Gral.</InputLabel>
                      <Select name="estado" value={formData.estado} onChange={manejarCambioMaster} label="Estado Gral.">
                        <MenuItem value="pendiente">Pendiente</MenuItem>
                        <MenuItem value="recibido">Recibido</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField fullWidth label="Fecha Compra" name="fecha_compra" type="date" value={formData.fecha_compra} onChange={manejarCambioMaster} InputLabelProps={{ shrink: true }} required />
                  </Grid>
                  <Grid item xs={12} sm={2}>
                    <TextField fullWidth label="Fecha Recepción" name="fecha_recibido" type="date" value={formData.fecha_recibido} onChange={manejarCambioMaster} InputLabelProps={{ shrink: true }} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* ÁREA DE ITEMS (Solo si no es edición, o si lo es permitimos editar el array) */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader title="2. Productos de la Factura" sx={{ bgcolor: '#f8fafc' }} />
              <CardContent>
                {!esEdicion && (
                  <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#fcfcfc', border: '1px dashed #cbd5e1' }}>
                    <Typography variant="subtitle2" mb={2} color="textSecondary">Agregar Producto al Carrito</Typography>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <Autocomplete
                          options={items}
                          getOptionLabel={(opt) => opt.nombre ? `${opt.nombre} (${opt.codigo || ''})` : ''}
                          value={items.find(i => String(i.id) === String(currentItem.item_id)) || null}
                          onChange={(e, newVal) => {
                            let detectada = 'unidad';
                            if (newVal && newVal.unidad) {
                              const match = PRESENTACIONES.find(p => 
                                p.label.toLowerCase() === newVal.unidad.toLowerCase() || 
                                p.value.toLowerCase() === newVal.unidad.toLowerCase()
                              );
                              if (match) detectada = match.value;
                            }
                            setCurrentItem(p => ({ 
                              ...p, 
                              item_id: newVal ? String(newVal.id) : '',
                              presentacion: detectada
                            }));
                          }}
                          renderInput={(params) => <TextField {...params} label="Seleccionar Reactivo/Insumo" />}
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <FormControl fullWidth>
                          <InputLabel>Presentación</InputLabel>
                          <Select
                            name="presentacion"
                            value={currentItem.presentacion || 'unidad'}
                            onChange={manejarCambioItem}
                            label="Presentación"
                          >
                            {PRESENTACIONES.map(p => (
                              <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <TextField fullWidth label="Cantidad" name="cantidad" type="number" value={currentItem.cantidad} onChange={manejarCambioItem} />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <TextField fullWidth label={`Precio (${formData.moneda_factura})`} name="precio_unitario" type="number" value={currentItem.precio_unitario} onChange={manejarCambioItem} />
                      </Grid>
                      <Grid item xs={12} sm={1}>
                        <IconButton color="primary" onClick={agregarAlCarrito} sx={{ bgcolor: '#e0f2fe' }}>
                          <AddIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Paper>
                )}
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                      <TableRow>
                        <TableCell>Producto</TableCell>
                        <TableCell align="center">Presentación</TableCell>
                        <TableCell align="center">Cant.</TableCell>
                        <TableCell align="right">Precio Und.</TableCell>
                        <TableCell align="right">IVA</TableCell>
                        <TableCell align="right">Total Línea</TableCell>
                        {!esEdicion && <TableCell align="center">Acción</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cartItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                            No hay productos agregados a esta factura.
                          </TableCell>
                        </TableRow>
                      ) : (
                        cartItems.map((item) => {
                          const itemInfo = items.find(i => String(i.id) === String(item.item_id));
                          const lineSub = parseFloat(item.cantidad) * parseFloat(item.precio_unitario);
                          const lineTax = lineSub * (parseFloat(item.porcentaje_impuesto) / 100);
                          const lineTotal = lineSub + lineTax;
                          
                          return (
                            <TableRow key={item.id_temporal} hover>
                              <TableCell>{itemInfo ? itemInfo.nombre : 'Desconocido'}</TableCell>
                              <TableCell align="center">
                                <Chip 
                                  label={PRESENTACIONES.find(p => p.value === item.presentacion)?.label || item.presentacion || 'Unidad'} 
                                  size="small" 
                                  color="primary" 
                                  variant="outlined" 
                                />
                              </TableCell>
                              <TableCell align="center">{item.cantidad}</TableCell>
                              <TableCell align="right">{parseFloat(item.precio_unitario).toFixed(2)}</TableCell>
                              <TableCell align="right">{item.porcentaje_impuesto}%</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 'bold' }}>{lineTotal.toFixed(2)}</TableCell>
                              {!esEdicion && (
                                <TableCell align="center">
                                  <IconButton size="small" color="error" onClick={() => eliminarDelCarrito(item.id_temporal)}>
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              )}
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* DETALLES DE COSTOS GENERALES */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="3. Resumen Financiero" sx={{ bgcolor: '#f8fafc' }} />
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Moneda de Factura</InputLabel>
                      <Select name="moneda_factura" value={formData.moneda_factura} onChange={manejarCambioMaster} label="Moneda de Factura">
                        <MenuItem value="USD">USD ($)</MenuItem>
                        <MenuItem value="VES">VES (Bs.)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField fullWidth label="Tasa (VES/USD)" name="tasa_cambio" type="number" value={formData.tasa_cambio} onChange={manejarCambioMaster} inputProps={{ min: 0.0001, step: 0.01 }} required />
                  </Grid>
                  
                  {/* Global IVA control for the cart (optional usability improvement) */}
                  {!esEdicion && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="textSecondary" display="block" mb={1}>
                        Aplicar IVA global a productos cargados:
                      </Typography>
                      <Box display="flex" gap={1}>
                        <Button size="small" variant="outlined" onClick={() => {
                          setCartItems(prev => prev.map(i => ({ ...i, porcentaje_impuesto: '0' })));
                          setCurrentItem(p => ({ ...p, porcentaje_impuesto: '0' }));
                        }}>Exento (0%)</Button>
                        <Button size="small" variant="outlined" onClick={() => {
                          setCartItems(prev => prev.map(i => ({ ...i, porcentaje_impuesto: '16' })));
                          setCurrentItem(p => ({ ...p, porcentaje_impuesto: '16' }));
                        }}>IVA (16%)</Button>
                      </Box>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                        Total Factura ({formData.moneda_factura})
                      </Typography>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" color="textSecondary">Subtotal:</Typography>
                        <Typography variant="body2" fontWeight="bold">{totalFacturaSubtotal.toFixed(2)}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="body2" color="textSecondary">IVA Total:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="warning.dark">{totalFacturaImpuesto.toFixed(2)}</Typography>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      <Box display="flex" justifyContent="space-between" mb={1.5}>
                        <Typography variant="subtitle1" fontWeight="bold">Total Pagar:</Typography>
                        <Typography variant="subtitle1" fontWeight="bold" color="success.main">{totalFacturaGeneral.toFixed(2)}</Typography>
                      </Box>

                      <Typography variant="caption" color="textSecondary" fontWeight="bold" display="block" sx={{ mb: 1, mt: 2, textTransform: 'uppercase' }}>
                        Equivalencia ({monedaEquiv})
                      </Typography>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="textSecondary">Subtotal equiv:</Typography>
                        <Typography variant="caption">{subtotalEquiv.toFixed(2)}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="textSecondary">IVA equiv:</Typography>
                        <Typography variant="caption">{impuestoEquiv.toFixed(2)}</Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="caption" fontWeight="bold" color="textSecondary">Total equiv:</Typography>
                        <Typography variant="caption" fontWeight="bold">{totalEquiv.toFixed(2)}</Typography>
                      </Box>
                    </Paper>
                  </Grid>

                  <Grid item xs={12}>
                    <Button
                      fullWidth variant="contained" size="large" type="submit" disabled={cargando}
                      startIcon={cargando ? <CircularProgress size={20} /> : <GuardarIcon />}
                      sx={{ py: 1.5 }}
                    >
                      {cargando ? 'Guardando...' : (esEdicion ? 'Actualizar Compra' : 'Registrar Compra')}
                    </Button>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>

      <Dialog open={abrirDialogoProveedor} onClose={() => setAbrirDialogoProveedor(false)}>
        <DialogTitle>Agregar Proveedor</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Nombre" fullWidth variant="outlined" value={nuevoProveedorNombre} onChange={(e) => setNuevoProveedorNombre(e.target.value)} disabled={guardandoProveedor} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbrirDialogoProveedor(false)} disabled={guardandoProveedor}>Cancelar</Button>
          <Button onClick={crearProveedor} variant="contained" disabled={guardandoProveedor || !nuevoProveedorNombre.trim()}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default FormularioCompra;