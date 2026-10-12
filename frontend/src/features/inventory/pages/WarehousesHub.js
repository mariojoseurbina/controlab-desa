import React, { useState, useEffect, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, TextField, Grid, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TablePagination, Chip, IconButton, Alert, Snackbar,
  CircularProgress, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, Tabs, Tab, Tooltip, createFilterOptions, Divider
} from '@mui/material';
import {
  Warehouse as WarehouseIcon,
  CompareArrows as TransferIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Inventory as InventoryIcon,
  History as HistoryIcon,
  PictureAsPdf as PdfIcon,
  Add as PlusIcon,
  CheckCircle as CheckIcon,
  Biotech as BiotechIcon,
  SwapVert as SwapVertIcon,
  TrendingUp as EntryIcon,
  TrendingDown as ExitIcon,
  ListAlt as ListAltIcon,
  TableChart as ExcelIcon,
  ShoppingCart as CartIcon,
  Delete as DeleteIcon,
  AddShoppingCart as AddCartIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const customFilterOptions = createFilterOptions({
  limit: 50,
  stringify: (option) => `${option.codigo} ${option.nombre} ${option.referencia_abreviada || ''} ${option.equipo_asociado || ''}`
});

// Descargador directo de comprobante PDF mediante Blob (inmune a bloqueadores de popups)
const downloadTransferPdfBlob = async (referencia) => {
  if (!referencia) return false;
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/movements/transfer/pdf?referencia=${encodeURIComponent(referencia)}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      throw new Error(`Error ${res.status}: Fallo al generar comprobante PDF`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `Comprobante_Transferencia_${referencia}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1500);
    return true;
  } catch (err) {
    console.error('Error al descargar PDF:', err);
    return false;
  }
};

// Descargador directo de comprobante PDF de Movimiento / Salida mediante Blob
const downloadMovementPdfBlob = async (referencia) => {
  if (!referencia) return false;
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE_URL}/movements/movement/pdf?referencia=${encodeURIComponent(referencia)}`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) {
      throw new Error(`Error ${res.status}: Fallo al generar comprobante PDF de movimiento`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `Comprobante_Movimiento_${referencia}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1500);
    return true;
  } catch (err) {
    console.error('Error al descargar PDF de movimiento:', err);
    return false;
  }
};

// REGLA DE NEGOCIO: BIFURCACIÓN DE FAMILIAS (Detección Robusta)
const obtenerUnidadManejo = (item) => {
  if (!item) return 'UND';
  
  const cat = (item.item_categoria || item.categoria || '').toLowerCase();
  const name = (item.item_nombre || item.nombre || '').toLowerCase();
  
  const isReactivo = cat.includes('reactiv') || name.includes('reactiv');
  const isCalibrador = cat.includes('calib') || name.includes('calib');
  const isControl = cat.includes('control') || name.includes('control');
  
  const isFamilyA = isReactivo || isCalibrador || isControl;
  
  return isFamilyA ? 'Cajas' : (item.unidad_manejo || item.unidad || 'UND');
};

// CLASIFICACIÓN DE MOVIMIENTOS: BIFURCACIÓN DE SNIFFER VS ALMACÉN
// REGLA DE NEGOCIO PERMANENTE: NORMALIZACION UNIVERSAL A MAYUSCULAS Y LIMPIEZA DE CARACTERES
const normalizarTextoMayusculas = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/Ã¡/g, 'Á')
    .replace(/Ã©/g, 'É')
    .replace(/Ã­/g, 'Í')
    .replace(/Ã³/g, 'Ó')
    .replace(/Ãº/g, 'Ú')
    .replace(/Ã±/g, 'Ñ')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Â/g, '')
    .trim()
    .toUpperCase();
};

const isSnifferMovement = (m) => {
  if (!m) return false;
  const tipo = (m.tipo_movimiento || '').toUpperCase();
  const motivo = (m.motivo || '').toLowerCase();
  const ref = (m.referencia || '').toLowerCase();
  return tipo === 'CONSUMO' || motivo.includes('sniffer') || ref.includes('sniffer') || motivo.includes('consumo sniffer');
};

// MODAL MEMOIZADO: REGISTRAR MOVIMIENTO (ENTRADA / SALIDA CON CARRITO MASIVO)
const MovementModalForm = memo(({ open, onClose, products, stockSummary, onProductSelect, onSubmitSuccess, showSnackbar }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentQty, setCurrentQty] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [formData, setFormData] = useState({
    tipo_movimiento: 'SALIDA',
    almacen_id: 1, // Default Almacén Central
    motivo: 'Salida masiva de inventario',
    referencia: `SAL-${Date.now().toString().slice(-6)}`
  });

  useEffect(() => {
    if (open) {
      const initRef = `SAL-${Date.now().toString().slice(-6)}`;
      setCartItems([]);
      setCurrentQty('');
      if (onProductSelect) {
        const found = (products || []).find(p => p.id === onProductSelect.id || p.codigo === onProductSelect.codigo) || onProductSelect;
        setSelectedProduct(found);
        setFormData({
          tipo_movimiento: 'SALIDA',
          almacen_id: 1,
          motivo: 'Salida masiva de inventario',
          referencia: initRef
        });
      } else {
        setSelectedProduct(null);
        setFormData({
          tipo_movimiento: 'SALIDA',
          almacen_id: 1,
          motivo: 'Salida masiva de inventario',
          referencia: initRef
        });
      }
    }
  }, [open, onProductSelect, products]);

  // Stock disponible del producto seleccionado en el almacén elegido
  const currentAvailableStock = useMemo(() => {
    if (!selectedProduct) return null;
    const targetId = selectedProduct.id || selectedProduct.item_id;
    const summaryItem = (stockSummary || []).find(s => s.item_id === targetId);
    if (!summaryItem) return 0;
    const almid = parseInt(formData.almacen_id, 10);
    if (almid === 1) return Number(summaryItem.stock_central) || 0;
    if (almid === 2) return Number(summaryItem.stock_laboratorio) || 0;
    return Number(summaryItem.stock_actual) || 0;
  }, [selectedProduct, formData.almacen_id, stockSummary]);

  const getProductStock = (itemId) => {
    const summaryItem = (stockSummary || []).find(s => s.item_id === itemId);
    if (!summaryItem) return 0;
    const almid = parseInt(formData.almacen_id, 10);
    if (almid === 1) return Number(summaryItem.stock_central) || 0;
    if (almid === 2) return Number(summaryItem.stock_laboratorio) || 0;
    return Number(summaryItem.stock_actual) || 0;
  };

  const handleAddToCart = () => {
    if (!selectedProduct) {
      showSnackbar('Por favor selecciona un producto para agregar', 'error');
      return;
    }
    const qty = parseFloat(currentQty);
    if (!qty || qty <= 0) {
      showSnackbar('Ingresa una cantidad válida mayor a cero', 'error');
      return;
    }

    const targetId = selectedProduct.id || selectedProduct.item_id;
    const unidad = obtenerUnidadManejo(selectedProduct);
    const presentacion = selectedProduct.presentacion || selectedProduct.item_presentacion || unidad;
    const stockDisp = currentAvailableStock !== null ? currentAvailableStock : getProductStock(targetId);

    // Validación de stock si es salida
    if (formData.tipo_movimiento === 'SALIDA') {
      const alreadyInCart = cartItems.filter(item => item.item_id === targetId).reduce((sum, item) => sum + item.cantidad, 0);
      if (alreadyInCart + qty > stockDisp) {
        showSnackbar(`Stock insuficiente. Disponible: ${stockDisp} ${unidad}. Ya en carrito: ${alreadyInCart}`, 'error');
        return;
      }
    }

    const existingIndex = cartItems.findIndex(item => item.item_id === targetId);
    if (existingIndex >= 0) {
      const updated = [...cartItems];
      updated[existingIndex].cantidad += qty;
      setCartItems(updated);
      showSnackbar(`Cantidad acumulada en el carrito (${updated[existingIndex].cantidad} ${unidad})`);
    } else {
      setCartItems(prev => [
        ...prev,
        {
          id_temp: Date.now() + Math.random(),
          item_id: targetId,
          codigo: selectedProduct.codigo,
          nombre: selectedProduct.nombre,
          referencia: selectedProduct.referencia_abreviada || selectedProduct.referencia || '',
          presentacion: presentacion,
          unidad: unidad,
          cantidad: qty,
          stock_disponible: stockDisp
        }
      ]);
      showSnackbar('Producto agregado al carrito');
    }

    setSelectedProduct(null);
    setCurrentQty('');
  };

  const handleRemoveFromCart = (id_temp) => {
    setCartItems(prev => prev.filter(item => item.id_temp !== id_temp));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    let itemsToSubmit = [...cartItems];

    // Auto-agregar si el usuario seleccionó un producto y colocó cantidad pero no presionó el botón agregar
    if (itemsToSubmit.length === 0 && selectedProduct && currentQty && parseFloat(currentQty) > 0) {
      const targetId = selectedProduct.id || selectedProduct.item_id;
      const unidad = obtenerUnidadManejo(selectedProduct);
      const stockDisp = currentAvailableStock !== null ? currentAvailableStock : getProductStock(targetId);
      const qty = parseFloat(currentQty);

      if (formData.tipo_movimiento === 'SALIDA' && qty > stockDisp) {
        showSnackbar(`Stock insuficiente en almacén. Disponible: ${stockDisp} ${unidad}`, 'error');
        return;
      }

      itemsToSubmit.push({
        item_id: targetId,
        codigo: selectedProduct.codigo,
        nombre: selectedProduct.nombre,
        referencia: selectedProduct.referencia_abreviada || '',
        presentacion: selectedProduct.presentacion || unidad,
        unidad: unidad,
        cantidad: qty,
        stock_disponible: stockDisp
      });
    }

    if (itemsToSubmit.length === 0) {
      showSnackbar('Debes agregar al menos un producto al carrito de salida', 'error');
      return;
    }

    if (!formData.motivo || !formData.motivo.trim()) {
      showSnackbar('Por favor indica el motivo o concepto del movimiento', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const finalReferencia = formData.referencia ? formData.referencia.trim() : `SAL-${Date.now().toString().slice(-6)}`;

      const payload = {
        tipo_movimiento: formData.tipo_movimiento,
        almacen_id: parseInt(formData.almacen_id, 10),
        referencia: finalReferencia,
        motivo: formData.motivo.trim(),
        items: itemsToSubmit.map(it => ({
          item_id: parseInt(it.item_id, 10),
          cantidad: parseFloat(it.cantidad)
        }))
      };

      const res = await fetch(`${API_BASE_URL}/movements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showSnackbar(result.message || 'Salida masiva de mercancía registrada exitosamente');
        downloadMovementPdfBlob(finalReferencia);
        onClose();
        onSubmitSuccess();
      } else {
        showSnackbar(result.error || 'Error al registrar salida de inventario', 'error');
      }
    } catch (err) {
      console.error('Error registrando movimiento:', err);
      showSnackbar('Error de conexión con el servidor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalCantidadCart = cartItems.reduce((acc, it) => acc + (parseFloat(it.cantidad) || 0), 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ bgcolor: '#0f172a', color: 'white', py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <SwapVertIcon sx={{ color: formData.tipo_movimiento === 'ENTRADA' ? '#10b981' : '#ef4444', fontSize: 28 }} />
          <Typography variant="h6" fontWeight={900}>
            Registrar Movimiento de Inventario ({formData.tipo_movimiento})
          </Typography>
        </Box>
        <Chip
          icon={<CartIcon sx={{ color: 'white !important', fontSize: 16 }} />}
          label={`${cartItems.length} en Carrito`}
          sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontWeight: 800 }}
        />
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ mt: 1 }}>
          
          {/* SECCIÓN 1: DATOS GENERALES DEL DOCUMENTO / DESTINO */}
          <Paper elevation={0} sx={{ p: 2.5, mb: 3, bgcolor: '#f8fafc', borderRadius: 3, border: '1px solid #e2e8f0' }}>
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a" mb={2} display="flex" alignItems="center" gap={1}>
              <ListAltIcon fontSize="small" sx={{ color: '#0284c7' }} />
              1. Datos Generales del Documento / Destino
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={800} color="#475569" mb={0.5} display="block">
                  TIPO DE MOVIMIENTO *
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={formData.tipo_movimiento}
                  onChange={(e) => setFormData({ ...formData, tipo_movimiento: e.target.value })}
                >
                  <MenuItem value="SALIDA">🔴 SALIDA (Egreso / Merma / Consumo)</MenuItem>
                  <MenuItem value="ENTRADA">🟢 ENTRADA (Ingreso / Ajuste)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={800} color="#475569" mb={0.5} display="block">
                  ALMACÉN DE ORIGEN / AFECTADO *
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={formData.almacen_id}
                  onChange={(e) => setFormData({ ...formData, almacen_id: e.target.value })}
                >
                  <MenuItem value={1}>🏢 Almacén Central</MenuItem>
                  <MenuItem value={2}>🔬 Almacén Laboratorio</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={800} color="#475569" mb={0.5} display="block">
                  NRO DE DOCUMENTO / REFERENCIA *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ej. SAL-2026-001"
                  value={formData.referencia}
                  onChange={(e) => setFormData({ ...formData, referencia: e.target.value.toUpperCase() })}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" fontWeight={800} color="#475569" mb={0.5} display="block">
                  MOTIVO / CONCEPTO / DESTINO *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Ej. Despacho a Sucursales, Merma o Ajuste físico"
                  required
                  value={formData.motivo}
                  onChange={(e) => setFormData({ ...formData, motivo: e.target.value.toUpperCase() })}
                  inputProps={{ style: { textTransform: 'uppercase' } }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* SECCIÓN 2: AGREGAR PRODUCTO AL CARRITO */}
          <Paper elevation={0} sx={{ p: 2.5, mb: 3, bgcolor: '#ffffff', borderRadius: 3, border: '1px solid #cbd5e1' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a" display="flex" alignItems="center" gap={1}>
                <AddCartIcon fontSize="small" sx={{ color: '#0284c7' }} />
                2. Agregar Producto a la Salida
              </Typography>
              {selectedProduct && (
                <Chip
                  label={`Stock Disp.: ${currentAvailableStock !== null ? currentAvailableStock : 0} ${obtenerUnidadManejo(selectedProduct)}`}
                  size="small"
                  sx={{
                    bgcolor: (currentAvailableStock || 0) > 0 ? '#dcfce7' : '#fee2e2',
                    color: (currentAvailableStock || 0) > 0 ? '#166534' : '#991b1b',
                    fontWeight: 800
                  }}
                />
              )}
            </Box>

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                <Typography variant="caption" fontWeight={800} color="#475569" mb={0.5} display="block">
                  PRODUCTO A DESPACHAR *
                </Typography>
                <Autocomplete
                  options={products || []}
                  filterOptions={customFilterOptions}
                  isOptionEqualToValue={(option, val) => !val || option.id === val.id || option.codigo === val.codigo}
                  getOptionLabel={(option) => `[${option.codigo}] ${option.nombre} ${option.referencia_abreviada ? '(REF: ' + option.referencia_abreviada + ')' : ''}`}
                  value={selectedProduct}
                  onChange={(e, val) => setSelectedProduct(val)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      placeholder="Selecciona o busca el producto..."
                      variant="outlined"
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={4} md={3}>
                <Typography variant="caption" fontWeight={800} color="#475569" mb={0.5} display="block">
                  PRESENTACIÓN COMERCIAL
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  disabled
                  value={selectedProduct ? (selectedProduct.presentacion || selectedProduct.item_presentacion || obtenerUnidadManejo(selectedProduct)) : ''}
                  placeholder="Automático"
                  sx={{ bgcolor: '#f1f5f9', borderRadius: 1 }}
                />
              </Grid>

              <Grid item xs={12} sm={4} md={2}>
                <Typography variant="caption" fontWeight={800} color="#475569" mb={0.5} display="block">
                  CANTIDAD ({selectedProduct ? obtenerUnidadManejo(selectedProduct).toUpperCase() : 'UND'}) *
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  placeholder="Ej. 2"
                  value={currentQty}
                  onChange={(e) => setCurrentQty(e.target.value)}
                  inputProps={{ min: 1, step: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddToCart();
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4} md={2} sx={{ display: 'flex', alignItems: 'flex-end', pt: { xs: 0, sm: '20px !important' } }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleAddToCart}
                  startIcon={<AddCartIcon />}
                  sx={{
                    bgcolor: '#0284c7',
                    '&:hover': { bgcolor: '#0369a1' },
                    fontWeight: 800,
                    borderRadius: 2,
                    py: 0.9,
                    textTransform: 'none'
                  }}
                >
                  + Carrito
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* SECCIÓN 3: TABLA DE PRODUCTOS EN EL CARRITO */}
          <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a" display="flex" alignItems="center" gap={1}>
                <CartIcon fontSize="small" sx={{ color: '#0f172a' }} />
                3. Lista de Productos para Despacho ({cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'})
              </Typography>
              {cartItems.length > 0 && (
                <Chip
                  label={`Total a salir: ${totalCantidadCart} unidades/cajas`}
                  size="small"
                  sx={{ bgcolor: '#0f172a', color: 'white', fontWeight: 800 }}
                />
              )}
            </Box>

            <TableContainer sx={{ maxHeight: 280 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f8fafc' }}>
                    <TableCell sx={{ fontWeight: 800, color: '#475569', width: 40 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>PRODUCTO / REACTIVO</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#475569' }}>PRESENTACIÓN</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>STOCK DISP.</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#475569' }}>CANTIDAD</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#475569', width: 60 }}>ACCIÓN</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cartItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                        <CartIcon sx={{ fontSize: 36, color: '#cbd5e1', mb: 1, display: 'block', mx: 'auto' }} />
                        <Typography variant="body2" fontWeight={600}>
                          El carrito está vacío. Agrega productos arriba para realizar una salida masiva única.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    cartItems.map((item, idx) => (
                      <TableRow key={item.id_temp} hover>
                        <TableCell sx={{ fontWeight: 700, color: '#64748b' }}>{idx + 1}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={800} color="#0f172a">
                            {item.nombre}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
                            [{item.codigo}] {item.referencia ? `REF: ${item.referencia}` : ''}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={item.presentacion} size="small" sx={{ bgcolor: '#e2e8f0', color: '#334155', fontWeight: 700, fontSize: 11 }} />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${item.stock_disponible} ${item.unidad}`}
                            size="small"
                            sx={{ bgcolor: '#f0fdf4', color: '#15803d', fontWeight: 800, fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${item.cantidad} ${item.unidad}`}
                            size="small"
                            sx={{
                              bgcolor: formData.tipo_movimiento === 'SALIDA' ? '#fee2e2' : '#dcfce7',
                              color: formData.tipo_movimiento === 'SALIDA' ? '#b91c1c' : '#15803d',
                              fontWeight: 900,
                              fontSize: 12
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => handleRemoveFromCart(item.id_temp)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} sx={{ fontWeight: 700, color: '#64748b' }}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || (cartItems.length === 0 && (!selectedProduct || !currentQty))}
          startIcon={<PdfIcon />}
          sx={{
            bgcolor: formData.tipo_movimiento === 'ENTRADA' ? '#10b981' : '#ef4444',
            '&:hover': { bgcolor: formData.tipo_movimiento === 'ENTRADA' ? '#059669' : '#dc2626' },
            fontWeight: 800,
            px: 3.5,
            py: 1.1,
            borderRadius: 2.5,
            boxShadow: formData.tipo_movimiento === 'ENTRADA' ? '0 10px 15px -3px rgba(16, 185, 129, 0.3)' : '0 10px 15px -3px rgba(239, 68, 68, 0.3)'
          }}
        >
          {submitting
            ? 'Procesando...'
            : `Confirmar ${formData.tipo_movimiento} (${cartItems.length > 0 ? cartItems.length : (selectedProduct && currentQty ? 1 : 0)} productos)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

// MODAL MEMOIZADO: TRANSFERENCIA ENTRE ALMACENES
const TransferModalForm = memo(({ open, onClose, products, stockSummary, onProductSelect, onSubmitSuccess, showSnackbar }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [transferData, setTransferData] = useState({
    item_id: '',
    cantidad: '',
    almacen_origen_id: 1,
    almacen_destino_id: 2,
    motivo: 'Suministro operativo a laboratorio',
    referencia: `TRANS-${Date.now().toString().slice(-6)}`
  });

  useEffect(() => {
    if (open) {
      if (onProductSelect) {
        const found = (products || []).find(p => p.id === onProductSelect.id || p.codigo === onProductSelect.codigo) || onProductSelect;
        const presentacionFinal = found.presentacion || onProductSelect.presentacion || onProductSelect.item_presentacion || '';
        setSelectedProduct({
          ...found,
          presentacion: presentacionFinal,
          equipo_asociado: found.equipo_asociado || onProductSelect.equipo_asociado
        });
        setTransferData({
          item_id: found.id || found.item_id,
          cantidad: '',
          almacen_origen_id: 1,
          almacen_destino_id: 2,
          motivo: 'Suministro operativo a laboratorio',
          referencia: `TRANS-${Date.now().toString().slice(-6)}`
        });
      } else {
        setSelectedProduct(null);
        setTransferData({
          item_id: '',
          cantidad: '',
          almacen_origen_id: 1,
          almacen_destino_id: 2,
          motivo: 'Suministro operativo a laboratorio',
          referencia: `TRANS-${Date.now().toString().slice(-6)}`
        });
      }
    }
  }, [open, onProductSelect, products]);

  // LOTES DISPONIBLES EN ALMACEN CENTRAL
  const [availableLots, setAvailableLots] = useState([]);
  const [loadingLots, setLoadingLots] = useState(false);
  const [selectedLots, setSelectedLots] = useState({});

  useEffect(() => {
    const targetId = selectedProduct ? (selectedProduct.id || selectedProduct.item_id) : transferData.item_id;
    if (open && targetId && parseInt(transferData.almacen_origen_id, 10) === 1) {
      setLoadingLots(true);
      const token = localStorage.getItem('token');
      fetch(`${API_BASE_URL}/movements/lotes-disponibles?item_id=${targetId}&almacen_id=1`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      })
        .then(r => r.json())
        .then(data => {
          if (data.success && Array.isArray(data.lotes)) {
            setAvailableLots(data.lotes);
            setSelectedLots({});
          } else {
            setAvailableLots([]);
            setSelectedLots({});
          }
        })
        .catch(() => {
          setAvailableLots([]);
          setSelectedLots({});
        })
        .finally(() => setLoadingLots(false));
    } else {
      setAvailableLots([]);
      setSelectedLots({});
    }
  }, [open, selectedProduct, transferData.item_id, transferData.almacen_origen_id]);

  const handleLotQuantityChange = (lotId, val, maxAvail) => {
    let num = parseInt(val, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > maxAvail) num = maxAvail;

    const next = { ...selectedLots };
    if (num > 0) {
      next[lotId] = num;
    } else {
      delete next[lotId];
    }
    setSelectedLots(next);

    const totalFromLots = Object.values(next).reduce((sum, q) => sum + (parseInt(q, 10) || 0), 0);
    setTransferData(prev => ({
      ...prev,
      cantidad: totalFromLots > 0 ? String(totalFromLots) : ''
    }));
  };

  const handleManualCantidadChange = (val) => {
    setTransferData(prev => ({ ...prev, cantidad: val }));
    const targetQty = parseInt(val, 10) || 0;
    if (availableLots && availableLots.length > 0 && targetQty > 0) {
      let remaining = targetQty;
      const nextLots = {};
      for (const lot of availableLots) {
        if (remaining <= 0) break;
        const take = Math.min(lot.cajas_disponibles, remaining);
        if (take > 0) {
          nextLots[lot.lote_id] = take;
          remaining -= take;
        }
      }
      setSelectedLots(nextLots);
    } else if (!val || targetQty === 0) {
      setSelectedLots({});
    }
  };

  // CÁLCULO DE STOCK DISPONIBLE EN EL ALMACÉN DE ORIGEN
  const availableStockOrigen = useMemo(() => {
    if (!selectedProduct) return null;
    const targetId = selectedProduct.id || selectedProduct.item_id;
    const summaryItem = (stockSummary || []).find(s => s.item_id === targetId);
    if (!summaryItem) return 0;
    const origenId = parseInt(transferData.almacen_origen_id, 10);
    if (origenId === 1) {
      return Number(summaryItem.stock_central) || 0;
    } else if (origenId === 2) {
      return Number(summaryItem.stock_laboratorio) || 0;
    }
    return 0;
  }, [selectedProduct, transferData.almacen_origen_id, stockSummary]);

  // BIFURCACION LOGICA EN FRONTEND
  const esFamiliaA = useMemo(() => {
    if (!selectedProduct) return false;
    const cat = selectedProduct.item_categoria || selectedProduct.categoria || '';
    const unidad = selectedProduct.unidad || selectedProduct.unidad_manejo || '';
    return ['Reactivo', 'Calibrador', 'Control', 'Reactivos', 'Calibradores', 'Controles'].includes(cat) || unidad === 'Cajas';
  }, [selectedProduct]);

  const unidadDisplay = obtenerUnidadManejo(selectedProduct);

  const cantidadNum = parseFloat(transferData.cantidad) || 0;
  const isZeroStock = selectedProduct !== null && availableStockOrigen !== null && availableStockOrigen <= 0;
  const isExceeded = selectedProduct !== null && availableStockOrigen !== null && cantidadNum > availableStockOrigen;
  const origenNombre = parseInt(transferData.almacen_origen_id, 10) === 1 ? 'Almacén Central' : 'Almacén Laboratorio';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetItemId = selectedProduct ? (selectedProduct.id || selectedProduct.item_id) : transferData.item_id;
    if (!targetItemId) {
      showSnackbar('Por favor selecciona un producto a transferir', 'error');
      return;
    }
    if (!transferData.cantidad || parseFloat(transferData.cantidad) <= 0) {
      showSnackbar('Ingresa una cantidad válida a transferir', 'error');
      return;
    }
    if (String(transferData.almacen_origen_id) === String(transferData.almacen_destino_id)) {
      showSnackbar('El almacén de origen y destino deben ser diferentes', 'error');
      return;
    }

    // REGLA ESTRICTA: NUNCA PUEDE SER MAYOR A LA CANTIDAD EXISTENTE EN EL ALMACÉN
    if (availableStockOrigen !== null && availableStockOrigen <= 0) {
      showSnackbar(`REGLA DE CONTROL: El ${origenNombre} no posee cajas disponibles de este producto (Stock: 0).`, 'error');
      return;
    }
    if (availableStockOrigen !== null && parseFloat(transferData.cantidad) > availableStockOrigen) {
      showSnackbar(`REGLA DE CONTROL: La cantidad a transferir (${transferData.cantidad} cajas) NUNCA puede ser mayor al stock existente en ${origenNombre} (${availableStockOrigen} cajas).`, 'error');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const lotesPayload = Object.entries(selectedLots)
        .filter(([_, q]) => parseFloat(q) > 0)
        .map(([lId, q]) => ({ lote_id: parseInt(lId, 10), cantidad: parseFloat(q) }));

      const payload = {
        item_id: parseInt(targetItemId, 10),
        cantidad: parseFloat(transferData.cantidad),
        almacen_origen_id: parseInt(transferData.almacen_origen_id, 10),
        almacen_destino_id: parseInt(transferData.almacen_destino_id, 10),
        motivo: transferData.motivo || 'Transferencia entre depósitos',
        referencia: transferData.referencia || `TRANS-${Date.now().toString().slice(-6)}`,
        lotes_transferir: lotesPayload.length > 0 ? lotesPayload : undefined
      };

      const res = await fetch(`${API_BASE_URL}/movements/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok) {
        showSnackbar(result.message || 'Transferencia realizada con éxito', 'success');

        // Descarga directa e inmediata del comprobante PDF oficial (inmune a bloqueadores)
        if (payload.referencia) {
          showSnackbar('Descargando comprobante oficial en PDF...', 'info');
          await downloadTransferPdfBlob(payload.referencia);
        }

        onClose();
        onSubmitSuccess();
      } else {
        showSnackbar(result.error || 'Error procesando transferencia', 'error');
      }
    } catch (err) {
      console.error('Error enviando transferencia:', err);
      showSnackbar('Error de comunicación con el servidor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ bgcolor: '#0f172a', color: 'white', py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <TransferIcon sx={{ color: '#0284c7' }} />
        <Typography variant="h6" fontWeight={900}>
          Transferencia de Stock entre Depósitos
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                PRODUCTO A TRANSFERIR *
              </Typography>
              <Autocomplete
                options={products}
                filterOptions={customFilterOptions}
                isOptionEqualToValue={(option, val) => !val || option.id === val.id || option.codigo === val.codigo}
                getOptionLabel={(option) => `[${option.codigo}] ${option.nombre} ${option.presentacion ? ' • (' + option.presentacion + ')' : (option.referencia_abreviada ? ' (REF: ' + option.referencia_abreviada + ')' : '')}`}
                value={selectedProduct}
                onChange={(e, val) => {
                  setSelectedProduct(val);
                  if (val) setTransferData(prev => ({ ...prev, item_id: val.id }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Busca el producto a trasladar..."
                    required
                    variant="outlined"
                  />
                )}
              />
            </Grid>

            {/* PRESENTACIÓN COMERCIAL EXTRAÍDA DE LA FICHA TÉCNICA DEL PRODUCTO */}
            {selectedProduct && (
              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: '#f8fafc',
                    border: '1.5px solid #0284c7',
                    borderRadius: 2.5,
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    gap: 1.5,
                    boxShadow: '0 2px 8px -2px rgba(2, 132, 199, 0.15)'
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Box sx={{ p: 1, bgcolor: '#e0f2fe', borderRadius: 2, color: '#0284c7', display: 'flex' }}>
                      <BiotechIcon sx={{ fontSize: 26 }} />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
                        Presentación Comercial (Ficha de Producto)
                      </Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#0f172a', fontSize: 15 }}>
                        📦 {selectedProduct.presentacion || selectedProduct.item_presentacion || 'Presentación estándar por caja'}
                      </Typography>
                    </Box>
                  </Box>

                  {selectedProduct.equipo_asociado && (
                    <Chip
                      label={`Equipo: ${selectedProduct.equipo_asociado}`}
                      size="small"
                      sx={{ fontWeight: 800, bgcolor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}
                    />
                  )}
                </Paper>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                ALMACÉN ORIGEN *
              </Typography>
              <TextField
                select
                fullWidth
                value={transferData.almacen_origen_id}
                onChange={(e) => setTransferData({ ...transferData, almacen_origen_id: e.target.value })}
              >
                <MenuItem value={1}>🏢 Almacén Central</MenuItem>
                <MenuItem value={2}>🔬 Almacén Laboratorio</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                ALMACÉN DESTINO *
              </Typography>
              <TextField
                select
                fullWidth
                value={transferData.almacen_destino_id}
                onChange={(e) => setTransferData({ ...transferData, almacen_destino_id: e.target.value })}
              >
                <MenuItem value={1}>🏢 Almacén Central</MenuItem>
                <MenuItem value={2}>🔬 Almacén Laboratorio</MenuItem>
              </TextField>
            </Grid>

            {/* BANNER DINÁMICO DE VALIDACIÓN DE STOCK DISPONIBLE EN ALMACÉN ORIGEN */}
            {selectedProduct && availableStockOrigen !== null && (
              <Grid item xs={12}>
                {availableStockOrigen > 0 ? (
                  <Alert severity="info" sx={{ borderRadius: 2.5, fontWeight: 700, bgcolor: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
                    📦 Existencia actual en <strong>{origenNombre}</strong>: <strong>{availableStockOrigen} {unidadDisplay}</strong> disponibles para transferir.
                  </Alert>
                ) : (
                  <Alert severity="error" sx={{ borderRadius: 2.5, fontWeight: 800, bgcolor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' }}>
                    ⛔ ALMACÉN ORIGEN SIN EXISTENCIAS: <strong>{origenNombre}</strong> posee <strong>0 {unidadDisplay}</strong> de este producto. La cantidad a transferir nunca puede ser mayor al stock existente.
                  </Alert>
                )}
              </Grid>
            )}

            {/* SELECCIÓN Y ASIGNACIÓN DE LOTES (CUANDO ORIGEN ES ALMACÉN CENTRAL) */}
            {esFamiliaA && parseInt(transferData.almacen_origen_id, 10) === 1 && selectedProduct && (
              <Grid item xs={12}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    bgcolor: '#f8fafc',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: 3
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <InventoryIcon sx={{ color: '#0284c7', fontSize: 22 }} />
                      <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                        IDENTIFICACIÓN Y ASIGNACIÓN DE LOTES (ALMACÉN CENTRAL)
                      </Typography>
                    </Box>
                    {loadingLots && <CircularProgress size={18} />}
                  </Box>

                  {loadingLots ? (
                    <Typography variant="caption" color="text.secondary">
                      Consultando lotes disponibles en Almacén Central...
                    </Typography>
                  ) : availableLots.length === 0 ? (
                    <Alert severity="warning" sx={{ py: 0.5, borderRadius: 2 }}>
                      No se encontraron registros de lotes específicos para este producto en Central. Puede ingresar la cantidad manualmente a continuación.
                    </Alert>
                  ) : (
                    <>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1.5 }}>
                        Indique la cantidad exacta de cajas a despachar por cada lote. Puede transferir cajas del mismo lote o de lotes distintos:
                      </Typography>

                      <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                        <Table size="small">
                          <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 800, color: '#334155' }}>N° LOTE</TableCell>
                              <TableCell sx={{ fontWeight: 800, color: '#334155' }}>VENCIMIENTO</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800, color: '#334155' }}>DISPONIBLES</TableCell>
                              <TableCell align="center" sx={{ fontWeight: 800, color: '#0284c7', width: 150 }}>A TRANSFERIR</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {availableLots.map((lot) => {
                              const qty = selectedLots[lot.lote_id] || '';
                              const venc = lot.fecha_vencimiento ? new Date(lot.fecha_vencimiento).toLocaleDateString('es-ES') : 'N/A';
                              const isSelected = Boolean(selectedLots[lot.lote_id] && selectedLots[lot.lote_id] > 0);
                              return (
                                <TableRow key={lot.lote_id} hover sx={{ bgcolor: isSelected ? '#f0fdf4' : 'inherit' }}>
                                  <TableCell>
                                    <Chip
                                      label={lot.numero_lote || 'S/L'}
                                      size="small"
                                      sx={{ fontWeight: 800, bgcolor: isSelected ? '#bbf7d0' : '#e0f2fe', color: isSelected ? '#166534' : '#0369a1' }}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Typography variant="body2" fontWeight={600} color="#334155">
                                      {venc}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="center">
                                    <Chip
                                      label={`${lot.cajas_disponibles} cajas`}
                                      size="small"
                                      sx={{ fontWeight: 700, bgcolor: '#f1f5f9', color: '#475569' }}
                                    />
                                  </TableCell>
                                  <TableCell align="center">
                                    <TextField
                                      type="number"
                                      size="small"
                                      value={qty}
                                      onChange={(e) => handleLotQuantityChange(lot.lote_id, e.target.value, lot.cajas_disponibles)}
                                      placeholder="0"
                                      inputProps={{
                                        min: 0,
                                        max: lot.cajas_disponibles,
                                        step: 1,
                                        style: { textAlign: 'center', fontWeight: 800, padding: '4px 8px' }
                                      }}
                                      sx={{ width: 90 }}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {Object.keys(selectedLots).length > 0 && (
                        <Box mt={1.5} p={1.5} bgcolor="#ecfdf5" borderRadius={2} border="1px solid #a7f3d0" display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" fontWeight={800} color="#065f46">
                            TOTAL CAJAS ASIGNADAS POR LOTE:
                          </Typography>
                          <Chip
                            label={`${Object.values(selectedLots).reduce((a, b) => a + (parseInt(b, 10) || 0), 0)} cajas listas para despacho`}
                            color="success"
                            sx={{ fontWeight: 900 }}
                          />
                        </Box>
                      )}
                    </>
                  )}
                </Paper>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                CANTIDAD TOTAL A TRANSFERIR *
              </Typography>
              <TextField
                fullWidth
                type="number"
                placeholder={isZeroStock ? `0 ${unidadDisplay} disponibles` : "Ej. 2"}
                required
                disabled={isZeroStock}
                error={isExceeded || (isZeroStock && cantidadNum > 0)}
                helperText={
                  isExceeded
                    ? `⚠️ REGLA: La cantidad (${cantidadNum} cajas) NUNCA puede ser mayor al stock en almacén (${availableStockOrigen} cajas).`
                    : isZeroStock
                    ? "Sin existencias en el almacén de origen seleccionado"
                    : availableStockOrigen !== null
                    ? `Máximo permitido: ${availableStockOrigen} ${unidadDisplay}`
                    : ""
                }
                value={transferData.cantidad}
                onChange={(e) => handleManualCantidadChange(e.target.value)}
                inputProps={{
                  min: 1,
                  max: availableStockOrigen > 0 ? availableStockOrigen : 1,
                  step: 1
                }}
              />
            </Grid>

            {/* BANNER DINÁMICO DE BIFURCACIÓN DE RUTAS */}
            {selectedProduct && (
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ height: '100%', p: 1.5, bgcolor: esFamiliaA ? '#fef3c7' : '#f0fdfa', border: `1px solid ${esFamiliaA ? '#fde68a' : '#ccfbf1'}`, borderRadius: 2, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: esFamiliaA ? '#92400e' : '#115e59', textTransform: 'uppercase' }}>
                    Flujo de Transferencia
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: esFamiliaA ? '#b45309' : '#0f766e', mt: 0.5, lineHeight: 1.2 }}>
                    {esFamiliaA 
                      ? 'Envío EN TRÁNSITO para Recepción Electrónica (Trazabilidad estricta).'
                      : 'Transferencia DIRECTA e INMEDIATA a stock de Laboratorio.'}
                  </Typography>
                </Paper>
              </Grid>
            )}

            {/* BANNER DE DESGLOSE OPERATIVO */}
            {esFamiliaA && selectedProduct && transferData.cantidad && parseFloat(transferData.cantidad) > 0 && String(transferData.almacen_destino_id) === '2' && !isExceeded && !isZeroStock && (
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 3 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                    🔬 Desglose Operativo según Ficha de Producto (ISO 15189):
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: '#0f172a' }}>
                    {transferData.cantidad} {unidadDisplay} ➔ { (parseFloat(transferData.cantidad) * (selectedProduct.pruebas_teoricas_caja || selectedProduct.rendimiento_teorico || 500)).toLocaleString() } Determinaciones disponibles en Almacén Laboratorio
                  </Typography>
                </Paper>
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                REFERENCIA DE ENVÍO / NRO GUÍA
              </Typography>
              <TextField
                fullWidth
                placeholder="Ej. TRANS-0099"
                value={transferData.referencia}
                onChange={(e) => setTransferData({ ...transferData, referencia: e.target.value })}
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                MOTIVO DEL TRASLADO
              </Typography>
              <TextField
                fullWidth
                placeholder="Ej. Suministro semanal a laboratorio operativo"
                value={transferData.motivo}
                onChange={(e) => setTransferData({ ...transferData, motivo: e.target.value.toUpperCase() })}
                inputProps={{ style: { textTransform: 'uppercase' } }}
              />
            </Grid>

          </Grid>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 3 }}>
        <Button onClick={onClose} sx={{ fontWeight: 700, color: '#64748b' }}>
          Cancelar
        </Button>
        <Button
          type="submit"
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || isZeroStock || isExceeded || !transferData.cantidad || parseFloat(transferData.cantidad) <= 0}
          sx={{
            bgcolor: '#0284c7',
            '&:hover': { bgcolor: '#0369a1' },
            fontWeight: 800,
            px: 4,
            py: 1.2,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}
        >
          {submitting ? (
            <>
              <CircularProgress size={18} sx={{ color: 'white' }} />
              Emitiendo PDF y Guardando...
            </>
          ) : (
            'Confirmar Transferencia y Emitir PDF'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

// COMPONENTE PRINCIPAL HUB ALMACÉN / DEPÓSITO
const WarehousesHub = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);

  // States
  const [stockSummary, setStockSummary] = useState([]);
  const [movements, setMovements] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(true);

  // Search & Filters
  const [stockSearch, setStockSearch] = useState('');
  const [movementSearch, setMovementSearch] = useState('');
  const [snifferSearch, setSnifferSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');

  // Pagination States (Stock, Movements & Sniffer)
  const [stockPage, setStockPage] = useState(0);
  const [stockRowsPerPage, setStockRowsPerPage] = useState(50);
  const [movementPage, setMovementPage] = useState(0);
  const [movementRowsPerPage, setMovementRowsPerPage] = useState(25);
  const [snifferPage, setSnifferPage] = useState(0);
  const [snifferRowsPerPage, setSnifferRowsPerPage] = useState(25);

  // Reset pagination when search queries or filters change
  useEffect(() => {
    setStockPage(0);
  }, [stockSearch]);

  useEffect(() => {
    setMovementPage(0);
  }, [movementSearch, warehouseFilter]);

  useEffect(() => {
    setSnifferPage(0);
  }, [snifferSearch]);

  // KPI Metrics
  const [kpis, setKpis] = useState({ totalCentral: 0, totalLaboratorio: 0, totalGlobal: 0, totalMovimientos: 0, totalMovAlmacen: 0, totalMovSniffer: 0 });

  // Dialog States & Selected Items
  const [openMovementModal, setOpenMovementModal] = useState(false);
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [selectedProductForAction, setSelectedProductForAction] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadStockSummary();
    loadMovements();
    loadCatalog();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const loadStockSummary = async () => {
    try {
      setLoadingStock(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/almacenes/stock-summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStockSummary(data.data || []);
        setKpis(prev => ({
          ...prev,
          totalCentral: data.totalStockCentral || 0,
          totalLaboratorio: data.totalStockLaboratorio || 0,
          totalGlobal: data.totalStockGlobal || 0
        }));
      }
    } catch (err) {
      console.error('Error cargando stock por almacén:', err);
      showSnackbar('Error al conectar con el servidor', 'error');
    } finally {
      setLoadingStock(false);
    }
  };

  const loadMovements = async () => {
    try {
      setLoadingMovements(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/movements`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.movements) {
        const movs = data.movements || [];
        setMovements(movs);
        const snifferCount = movs.filter(isSnifferMovement).length;
        const almacenCount = movs.length - snifferCount;
        setKpis(prev => ({
          ...prev,
          totalMovimientos: movs.length,
          totalMovAlmacen: almacenCount,
          totalMovSniffer: snifferCount
        }));
      }
    } catch (err) {
      console.error('Error cargando movimientos:', err);
    } finally {
      setLoadingMovements(false);
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`);
      if (res.ok) {
        const data = await res.json();
        const itemsList = Array.isArray(data) ? data : (data.items || data.data || []);
        setProducts(itemsList);
      }
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    }
  };

  const handleOpenMovementModal = (productItem = null) => {
    if (productItem) {
      setSelectedProductForAction({
        id: productItem.item_id,
        codigo: productItem.item_codigo,
        nombre: productItem.item_nombre,
        referencia_abreviada: productItem.item_referencia
      });
    } else {
      setSelectedProductForAction(null);
    }
    setOpenMovementModal(true);
  };

  const handleOpenTransferModal = (productItem = null) => {
    if (productItem) {
      setSelectedProductForAction({
        id: productItem.item_id,
        codigo: productItem.item_codigo,
        nombre: productItem.item_nombre,
        referencia_abreviada: productItem.item_referencia,
        presentacion: productItem.item_presentacion || productItem.presentacion,
        equipo_asociado: productItem.item_equipo || productItem.equipo_asociado
      });
    } else {
      setSelectedProductForAction(null);
    }
    setOpenTransferModal(true);
  };

  const handleDownloadPdf = async (referencia) => {
    if (!referencia) return;
    showSnackbar('Generando y descargando comprobante PDF oficial...', 'info');
    let ok = false;
    if (referencia.startsWith('TRANS-')) {
      ok = await downloadTransferPdfBlob(referencia);
    } else {
      ok = await downloadMovementPdfBlob(referencia);
      if (!ok) ok = await downloadTransferPdfBlob(referencia);
    }
    if (ok) {
      showSnackbar('Comprobante PDF descargado exitosamente', 'success');
    } else {
      showSnackbar('No se pudo descargar el comprobante PDF', 'error');
    }
  };

  const handleExportStockExcel = () => {
    if (!stockSummary || stockSummary.length === 0) {
      showSnackbar('No hay existencias para exportar', 'warning');
      return;
    }

    const rowsToExport = stockSummary.map((item, idx) => ({
      'N°': idx + 1,
      'Código / REF': item.item_codigo || 'N/A',
      'Producto': item.item_nombre || 'Desconocido',
      'Referencia': item.item_referencia || '',
      'Categoría': item.item_categoria || 'General',
      'Autoanalizador': item.item_equipo || 'General',
      'Marca': item.item_marca || 'N/A',
      'Stock Almacén Central (Unidad)': Number(item.stock_central) || 0,
      'Stock Almacén Laboratorio (Unidad)': Number(item.stock_laboratorio) || 0,
      'Stock Total Global (Unidad)': Number(item.stock_total_global) || 0,
      'Pruebas Teóricas / Caja': Number(item.rendimiento_teorico) || 500,
      'Total Determinaciones Disponibles': (Number(item.stock_total_global) || 0) * (Number(item.rendimiento_teorico) || 500),
      'Estado Stock': (Number(item.stock_total_global) || 0) <= 0 ? 'AGOTADO' : ((Number(item.stock_total_global) || 0) <= 2 ? 'CRÍTICO' : 'DISPONIBLE')
    }));

    const ws = XLSX.utils.json_to_sheet(rowsToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock_Almacenes");
    XLSX.writeFile(wb, `Reporte_Stock_Almacenes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showSnackbar('Reporte de Stock exportado exitosamente a Excel', 'success');
  };

  // Stock Search Filtering (Memoized)
  const filteredStock = useMemo(() => {
    const search = stockSearch.toLowerCase();
    return stockSummary.filter(item => (
      (item.item_nombre && item.item_nombre.toLowerCase().includes(search)) ||
      (item.item_codigo && item.item_codigo.toLowerCase().includes(search)) ||
      (item.item_referencia && item.item_referencia.toLowerCase().includes(search)) ||
      (item.item_marca && item.item_marca.toLowerCase().includes(search)) ||
      (item.item_equipo && item.item_equipo.toLowerCase().includes(search))
    ));
  }, [stockSummary, stockSearch]);

  // Paginated Stock (50 items per view by default)
  const paginatedStock = useMemo(() => {
    const from = stockPage * stockRowsPerPage;
    return filteredStock.slice(from, from + stockRowsPerPage);
  }, [filteredStock, stockPage, stockRowsPerPage]);

  // Movimientos exclusivos de Almacén (Operativos)
  const warehouseMovements = useMemo(() => {
    return movements.filter(m => !isSnifferMovement(m));
  }, [movements]);

  // Movimientos automáticos del Sniffer
  const snifferMovements = useMemo(() => {
    return movements.filter(isSnifferMovement);
  }, [movements]);

  // Movements Search Filtering (Memoized)
  const filteredMovements = useMemo(() => {
    const search = movementSearch.toLowerCase();
    return warehouseMovements.filter(m => {
      const matchesSearch =
        (m.item_nombre && m.item_nombre.toLowerCase().includes(search)) ||
        (m.item_codigo && m.item_codigo.toLowerCase().includes(search)) ||
        (m.referencia && m.referencia.toLowerCase().includes(search)) ||
        (m.motivo && m.motivo.toLowerCase().includes(search)) ||
        (m.almacen_nombre && m.almacen_nombre.toLowerCase().includes(search));

      const matchesWarehouse = warehouseFilter === 'all' ||
        String(m.almacen_id) === String(warehouseFilter) ||
        String(m.almacen_destino_id) === String(warehouseFilter);

      return matchesSearch && matchesWarehouse;
    });
  }, [warehouseMovements, movementSearch, warehouseFilter]);

  // Paginated Movements (25 items per view by default)
  const paginatedMovements = useMemo(() => {
    const from = movementPage * movementRowsPerPage;
    return filteredMovements.slice(from, from + movementRowsPerPage);
  }, [filteredMovements, movementPage, movementRowsPerPage]);

  // Sniffer Search Filtering (Memoized)
  const filteredSnifferMovements = useMemo(() => {
    const search = snifferSearch.toLowerCase();
    return snifferMovements.filter(m => {
      return (
        (m.item_nombre && m.item_nombre.toLowerCase().includes(search)) ||
        (m.item_codigo && m.item_codigo.toLowerCase().includes(search)) ||
        (m.referencia && m.referencia.toLowerCase().includes(search)) ||
        (m.motivo && m.motivo.toLowerCase().includes(search)) ||
        (m.item_equipo && m.item_equipo.toLowerCase().includes(search))
      );
    });
  }, [snifferMovements, snifferSearch]);

  const paginatedSnifferMovements = useMemo(() => {
    const from = snifferPage * snifferRowsPerPage;
    return filteredSnifferMovements.slice(from, from + snifferRowsPerPage);
  }, [filteredSnifferMovements, snifferPage, snifferRowsPerPage]);

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      
      {/* Snackbar Notificación */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, fontWeight: 700 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Header Ejecutivo del Módulo Almacén / Depósito */}
      <Paper
        elevation={6}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #0f172a 0%, #0369a1 100%)',
          color: 'white',
          borderBottom: '4px solid #0284c7'
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(2, 132, 199, 0.25)', borderRadius: 3, border: '1px solid rgba(186, 230, 253, 0.3)' }}>
              <WarehouseIcon sx={{ fontSize: 42, color: '#7dd3fc' }} />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: '#7dd3fc', fontWeight: 800 }}>
                CONTROLAB IA • MÓDULO DE ALMACENES Y DEPÓSITOS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>
                Almacén / Depósito
              </Typography>
              <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5 }}>
                Control de existencias por depósito, registro de movimientos (Entrada/Salida) y transferencias entre sedes
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={1.5} flexWrap="wrap">
            <IconButton
              onClick={() => { loadStockSummary(); loadMovements(); }}
              sx={{ color: '#cbd5e1', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
              title="Actualizar almacenes"
            >
              <RefreshIcon />
            </IconButton>

            {/* BOTÓN 1: REGISTRAR MOVIMIENTO (ENTRADA / SALIDA) */}
            <Button
              variant="contained"
              onClick={() => handleOpenMovementModal()}
              startIcon={<SwapVertIcon />}
              sx={{
                bgcolor: '#10b981',
                '&:hover': { bgcolor: '#059669' },
                borderRadius: 3,
                px: 2.5,
                py: 1.2,
                fontWeight: 800,
                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)'
              }}
            >
              + Registrar Movimiento (Entrada/Salida)
            </Button>

            {/* BOTÓN 2: TRANSFERIR STOCK */}
            <Button
              variant="contained"
              onClick={() => handleOpenTransferModal()}
              startIcon={<TransferIcon />}
              sx={{
                bgcolor: '#0284c7',
                '&:hover': { bgcolor: '#0369a1' },
                borderRadius: 3,
                px: 2.5,
                py: 1.2,
                fontWeight: 800,
                boxShadow: '0 10px 15px -3px rgba(2, 132, 199, 0.4)'
              }}
            >
              🔄 Transferir Stock entre Depósitos
            </Button>

            {/* BOTÓN 3: CONTEO INICIAL MASIVO */}
            <Button
              variant="contained"
              onClick={() => navigate('/warehouses/conteo-inicial')}
              startIcon={<ListAltIcon />}
              sx={{
                bgcolor: '#7c3aed',
                '&:hover': { bgcolor: '#6d28d9' },
                borderRadius: 3,
                px: 2.5,
                py: 1.2,
                fontWeight: 800,
                boxShadow: '0 10px 15px -3px rgba(124, 58, 237, 0.4)'
              }}
            >
              📋 Conteo Inicial (Carga Masiva)
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Tarjetas KPI de Resumen de Almacenes */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, borderLeft: '6px solid #0284c7', bgcolor: 'white' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Almacén Central (Depósito Principal)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                  {kpis.totalCentral} <Typography component="span" variant="subtitle2" color="textSecondary">Total Múltiple</Typography>
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: '#f0f9ff', borderRadius: 3, color: '#0284c7' }}>
                <WarehouseIcon fontSize="large" />
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, borderLeft: '6px solid #166534', bgcolor: 'white' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Almacén Laboratorio (Operativo)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                  {kpis.totalLaboratorio} <Typography component="span" variant="subtitle2" color="textSecondary">Total Múltiple</Typography>
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 3, color: '#166534' }}>
                <BiotechIcon fontSize="large" />
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, borderLeft: '6px solid #8b5cf6', bgcolor: 'white' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Movimientos de Almacén
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                  {kpis.totalMovAlmacen || 0}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 600 }}>
                  {kpis.totalMovSniffer || 0} consumos en pestaña Sniffer
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: '#f5f3ff', borderRadius: 3, color: '#8b5cf6' }}>
                <HistoryIcon fontSize="large" />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* PESTAÑAS MULTI-TAB DE NAVEGACIÓN UNIFICADA (3 PESTAÑAS) */}
      <Paper elevation={2} sx={{ mb: 4, borderRadius: 3, bgcolor: 'white' }}>
        <Tabs
          value={tabValue}
          onChange={(e, val) => setTabValue(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': { py: 2, fontWeight: 800, fontSize: 14 }
          }}
        >
          <Tab icon={<WarehouseIcon />} iconPosition="start" label="Stock por Almacén / Depósito" />
          <Tab icon={<SwapVertIcon />} iconPosition="start" label={`Movimientos de Almacén (${kpis.totalMovAlmacen || 0})`} />
          <Tab icon={<BiotechIcon />} iconPosition="start" label={`Consumos Sniffer / Analizadores (${kpis.totalMovSniffer || 0})`} />
        </Tabs>
      </Paper>

      {/* PESTAÑA 0: STOCK POR ALMACÉN / DEPÓSITO */}
      {tabValue === 0 && (
        <Box>
          <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: 'white' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={7}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar existencias por Nombre, REF (P/N), Código, Marca o Autoanalizador..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={5} display="flex" justifyContent="flex-end" gap={1.5}>
                <Button
                  variant="contained"
                  startIcon={<ExcelIcon />}
                  onClick={handleExportStockExcel}
                  sx={{
                    bgcolor: '#10b981',
                    '&:hover': { bgcolor: '#059669' },
                    fontWeight: 800,
                    px: 3,
                    py: 1,
                    borderRadius: 2.5,
                    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  📊 Exportar Reporte de Stock (Excel)
                </Button>
              </Grid>
            </Grid>
          </Paper>

          <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Table sx={{ minWidth: 950 }}>
              <TableHead sx={{ bgcolor: '#0f172a' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Código / REF</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Producto</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Autoanalizador</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800, textAlign: 'center' }}>🏢 Stock Almacén Central</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800, textAlign: 'center' }}>🔬 Stock Almacén Laboratorio</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800, textAlign: 'center' }}>Stock Total Global</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800, textAlign: 'center' }}>Acciones Rápidas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingStock ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={36} sx={{ color: '#0284c7', mb: 1.5 }} />
                      <Typography variant="body2" color="textSecondary" fontWeight={700}>
                        Cargando inventario consolidado de almacenes...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#64748b' }}>
                      <WarehouseIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                      <Typography variant="subtitle1" fontWeight={800} color="#1e293b">
                        No se encontraron existencias registradas
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStock.map((row) => (
                    <TableRow key={row.item_id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e40af', display: 'block' }}>
                          {row.item_codigo}
                        </Typography>
                        {row.item_referencia && (
                          <Typography variant="caption" color="textSecondary">
                            REF: {row.item_referencia}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell sx={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>
                        {row.item_nombre}
                      </TableCell>

                      <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>
                        {row.item_equipo || 'General'}
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={`${row.stock_central} ${obtenerUnidadManejo(row)}`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor: row.stock_central > 0 ? '#eff6ff' : '#f1f5f9',
                            color: row.stock_central > 0 ? '#1e40af' : '#94a3b8',
                            border: `1px solid ${row.stock_central > 0 ? '#bfdbfe' : '#cbd5e1'}`
                          }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Chip
                          label={`${row.stock_laboratorio} ${obtenerUnidadManejo(row)}`}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor: row.stock_laboratorio > 0 ? '#f0fdf4' : '#f1f5f9',
                            color: row.stock_laboratorio > 0 ? '#166534' : '#94a3b8',
                            border: `1px solid ${row.stock_laboratorio > 0 ? '#bbf7d0' : '#cbd5e1'}`
                          }}
                        />
                      </TableCell>

                      <TableCell align="center" sx={{ fontWeight: 900, color: '#0f172a', fontSize: 15 }}>
                        {row.stock_total_global} {obtenerUnidadManejo(row)}
                      </TableCell>

                      <TableCell align="center">
                        <Box display="flex" gap={1} justifyContent="center">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<SwapVertIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenMovementModal(row);
                            }}
                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 1.5, cursor: 'pointer', '&:active': { transform: 'scale(0.97)' } }}
                          >
                            Movimiento
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<TransferIcon />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTransferModal(row);
                            }}
                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 1.5, cursor: 'pointer', '&:active': { transform: 'scale(0.97)' } }}
                          >
                            Transferir
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={filteredStock.length}
              rowsPerPage={stockRowsPerPage}
              page={stockPage}
              onPageChange={(e, newPage) => setStockPage(newPage)}
              onRowsPerPageChange={(e) => {
                setStockRowsPerPage(parseInt(e.target.value, 10));
                setStockPage(0);
              }}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`}
              sx={{
                bgcolor: 'white',
                borderTop: '1px solid #e2e8f0',
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontWeight: 600,
                  color: '#475569',
                  fontSize: 13
                },
                '.MuiTablePagination-select': {
                  fontWeight: 700,
                  color: '#0f172a'
                }
              }}
            />
          </TableContainer>
        </Box>
      )}

      {/* PESTAÑA 1: HISTORIAL DE MOVIMIENTOS DE INVENTARIO */}
      {tabValue === 1 && (
        <Box>
          <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: 'white' }}>
            <Grid container spacing={2} alignItems="center" justifyContent="space-between">
              <Grid item xs={12} md={7}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar en el historial por Producto, Código, Lote, Documento o Motivo..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={4} display="flex" justifyContent="flex-end">
                <TextField
                  select
                  size="small"
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                  sx={{ minWidth: 240 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <WarehouseIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                >
                  <MenuItem value="all">Todos los Almacenes</MenuItem>
                  <MenuItem value="1">Almacén Central</MenuItem>
                  <MenuItem value="2">Almacén Laboratorio</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Paper>

          <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Table sx={{ minWidth: 950 }}>
              <TableHead sx={{ bgcolor: '#0f172a' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Fecha / Hora</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Tipo Movimiento</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Producto</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Presentación de Manejo</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800, textAlign: 'right' }}>Cantidad</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Almacén Origen</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Almacén Destino</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Motivo / Referencia</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800, textAlign: 'center' }}>Comprobante</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingMovements ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={36} sx={{ color: '#0284c7', mb: 1.5 }} />
                      <Typography variant="body2" color="textSecondary" fontWeight={700}>
                        Cargando historial de movimientos...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: '#64748b' }}>
                      <HistoryIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                      <Typography variant="subtitle1" fontWeight={800} color="#1e293b">
                        No se encontraron movimientos registrados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMovements.map((m) => (
                    <TableRow key={m.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                        {m.fecha_movimiento ? new Date(m.fecha_movimiento).toLocaleString('es-VE') : '-'}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={m.tipo_movimiento}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            bgcolor: m.tipo_movimiento === 'ENTRADA' ? '#f0fdf4' : m.tipo_movimiento === 'TRANSFERENCIA' ? '#eff6ff' : '#fef2f2',
                            color: m.tipo_movimiento === 'ENTRADA' ? '#166534' : m.tipo_movimiento === 'TRANSFERENCIA' ? '#1e40af' : '#991b1b',
                            border: `1px solid ${m.tipo_movimiento === 'ENTRADA' ? '#bbf7d0' : m.tipo_movimiento === 'TRANSFERENCIA' ? '#bfdbfe' : '#fecaca'}`
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" fontWeight={800} color="#0f172a">
                          {m.item_nombre}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748b' }}>
                          {m.item_codigo}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={m.item_presentacion || m.item_unidad_manejo || 'UND'}
                          size="small"
                          sx={{ bgcolor: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: 11 }}
                        />
                        {m.item_unidad_manejo && m.item_unidad_manejo !== m.item_presentacion && (
                          <Typography variant="caption" display="block" color="textSecondary" fontWeight={700}>
                            Unidad: {m.item_unidad_manejo}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="right" sx={{ fontWeight: 900, fontSize: 15, color: m.tipo_movimiento === 'ENTRADA' ? '#166534' : m.tipo_movimiento === 'SALIDA' ? '#991b1b' : '#1e40af' }}>
                        {m.tipo_movimiento === 'ENTRADA' ? `+${m.cantidad}` : m.tipo_movimiento === 'SALIDA' ? `-${m.cantidad}` : m.cantidad} {m.item_unidad_manejo ? `(${m.item_unidad_manejo})` : ''}
                      </TableCell>

                      <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                        {m.almacen_nombre || 'Almacén Central'}
                      </TableCell>

                      <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                        {m.almacen_destino_nombre || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: 12 }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#1e293b' }}>
                          {normalizarTextoMayusculas(m.motivo)}
                        </Typography>
                        {m.referencia && (
                          <Typography variant="caption" color="textSecondary">
                            Ref: {normalizarTextoMayusculas(m.referencia)}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="center">
                        {m.referencia && (m.tipo_movimiento === 'TRANSFERENCIA' || m.tipo_movimiento === 'SALIDA' || m.tipo_movimiento === 'ENTRADA') ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<PdfIcon />}
                            onClick={() => handleDownloadPdf(m.referencia)}
                            sx={{ borderRadius: 2, fontWeight: 700, fontSize: 11, textTransform: 'none' }}
                          >
                            PDF
                          </Button>
                        ) : (
                          <Typography variant="caption" color="textSecondary">-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={filteredMovements.length}
              rowsPerPage={movementRowsPerPage}
              page={movementPage}
              onPageChange={(e, newPage) => setMovementPage(newPage)}
              onRowsPerPageChange={(e) => {
                setMovementRowsPerPage(parseInt(e.target.value, 10));
                setMovementPage(0);
              }}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`}
              sx={{
                bgcolor: 'white',
                borderTop: '1px solid #e2e8f0',
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontWeight: 600,
                  color: '#475569',
                  fontSize: 13
                },
                '.MuiTablePagination-select': {
                  fontWeight: 700,
                  color: '#0f172a'
                }
              }}
            />
          </TableContainer>
        </Box>
      )}

      {/* PESTAÑA 2: CONSUMOS AUTOMÁTICOS DEL SNIFFER (ANALIZADORES) */}
      {tabValue === 2 && (
        <Box>
          <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: 'white' }}>
            <Grid container spacing={2} alignItems="center" justifyContent="space-between">
              <Grid item xs={12} md={7}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar consumos automáticos por Producto, Código, Analizador o Lote..."
                  value={snifferSearch}
                  onChange={(e) => setSnifferSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} md={5} display="flex" justifyContent="flex-end" alignItems="center">
                <Chip
                  icon={<BiotechIcon />}
                  label={`Total Consumos Sniffer: ${filteredSnifferMovements.length}`}
                  sx={{ bgcolor: '#f0fdf4', color: '#166534', fontWeight: 800, px: 1 }}
                />
              </Grid>
            </Grid>
          </Paper>

          <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Table sx={{ minWidth: 950 }}>
              <TableHead sx={{ bgcolor: '#0f172a' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Fecha / Hora</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Tipo</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Producto / Reactivo</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Presentación</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800, textAlign: 'right' }}>Cantidad Consumida</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Equipo / Analizador</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Detalle de Consumo (Lote y Remanente)</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Referencia</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingMovements ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={36} sx={{ color: '#0284c7', mb: 1.5 }} />
                      <Typography variant="body2" color="textSecondary" fontWeight={700}>
                        Cargando consumos automáticos del Sniffer...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredSnifferMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#64748b' }}>
                      <BiotechIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                      <Typography variant="subtitle1" fontWeight={800} color="#1e293b">
                        No se encontraron consumos automáticos registrados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedSnifferMovements.map((m) => {
                    const equipoMatch = m.motivo ? m.motivo.match(/-\s*([A-Za-z0-9\s]+)$/) : null;
                    const equipoDisplay = m.item_equipo || (equipoMatch ? equipoMatch[1].trim() : 'Analizador LIS');
                    return (
                      <TableRow key={m.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                          {m.fecha_movimiento ? new Date(m.fecha_movimiento).toLocaleString('es-VE') : '-'}
                        </TableCell>

                        <TableCell>
                          <Chip
                            label="CONSUMO"
                            size="small"
                            sx={{
                              fontWeight: 800,
                              bgcolor: '#fff1f2',
                              color: '#be123c',
                              border: '1px solid #fecdd3'
                            }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontWeight={800} color="#0f172a">
                            {m.item_nombre}
                          </Typography>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748b' }}>
                            {m.item_codigo} {m.item_referencia ? `• REF: ${m.item_referencia}` : ''}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={m.item_presentacion || m.item_unidad_manejo || 'UND'}
                            size="small"
                            sx={{ bgcolor: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: 11 }}
                          />
                        </TableCell>

                        <TableCell align="right" sx={{ fontWeight: 900, fontSize: 14, color: '#be123c' }}>
                          -{m.cantidad}
                        </TableCell>

                        <TableCell>
                          <Chip
                            icon={<BiotechIcon sx={{ fontSize: '15px !important' }} />}
                            label={equipoDisplay}
                            size="small"
                            sx={{ bgcolor: '#e0f2fe', color: '#0369a1', fontWeight: 800, fontSize: 11 }}
                          />
                        </TableCell>

                        <TableCell sx={{ fontSize: 12 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#1e293b' }}>
                            {m.motivo}
                          </Typography>
                        </TableCell>

                        <TableCell sx={{ fontSize: 12, color: '#64748b' }}>
                          {m.referencia ? (
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                              {m.referencia}
                            </Typography>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={filteredSnifferMovements.length}
              rowsPerPage={snifferRowsPerPage}
              page={snifferPage}
              onPageChange={(e, newPage) => setSnifferPage(newPage)}
              onRowsPerPageChange={(e) => {
                setSnifferRowsPerPage(parseInt(e.target.value, 10));
                setSnifferPage(0);
              }}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`}
              sx={{
                bgcolor: 'white',
                borderTop: '1px solid #e2e8f0',
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontWeight: 600,
                  color: '#475569',
                  fontSize: 13
                },
                '.MuiTablePagination-select': {
                  fontWeight: 700,
                  color: '#0f172a'
                }
              }}
            />
          </TableContainer>
        </Box>
      )}

      {/* MODAL 1: REGISTRAR MOVIMIENTO DE INVENTARIO (ENTRADA / SALIDA) */}
      <MovementModalForm
        open={openMovementModal}
        onClose={() => setOpenMovementModal(false)}
        products={products}
        stockSummary={stockSummary}
        onProductSelect={selectedProductForAction}
        onSubmitSuccess={() => { loadStockSummary(); loadMovements(); }}
        showSnackbar={showSnackbar}
      />

      {/* MODAL 2: TRANSFERENCIA ENTRE ALMACENES */}
      <TransferModalForm
        open={openTransferModal}
        onClose={() => setOpenTransferModal(false)}
        products={products}
        stockSummary={stockSummary}
        onProductSelect={selectedProductForAction}
        onSubmitSuccess={() => { loadStockSummary(); loadMovements(); }}
        showSnackbar={showSnackbar}
      />

    </Box>
  );
};

export default WarehousesHub;
