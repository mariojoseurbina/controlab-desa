import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Grid, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Alert, Snackbar,
  CircularProgress, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, Tabs, Tab, Tooltip, createFilterOptions
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
  TrendingDown as ExitIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const customFilterOptions = createFilterOptions({
  limit: 50,
  stringify: (option) => `${option.codigo} ${option.nombre} ${option.referencia_abreviada || ''} ${option.equipo_asociado || ''}`
});

// MODAL MEMOIZADO: REGISTRAR MOVIMIENTO (ENTRADA / SALIDA)
const MovementModalForm = memo(({ open, onClose, products, onProductSelect, onSubmitSuccess, showSnackbar }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    item_id: '',
    tipo_movimiento: 'ENTRADA',
    cantidad: '',
    motivo: 'Ajuste manual de inventario',
    referencia: '',
    almacen_id: 1 // Default Almacén Central
  });

  useEffect(() => {
    if (open) {
      if (onProductSelect) {
        setSelectedProduct(onProductSelect);
        setFormData(prev => ({ ...prev, item_id: onProductSelect.id }));
      } else {
        setSelectedProduct(null);
        setFormData({
          item_id: '',
          tipo_movimiento: 'ENTRADA',
          cantidad: '',
          motivo: 'Ajuste manual de inventario',
          referencia: '',
          almacen_id: 1
        });
      }
    }
  }, [open, onProductSelect]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetItemId = selectedProduct ? selectedProduct.id : formData.item_id;
    if (!targetItemId) {
      showSnackbar('Por favor selecciona un producto', 'error');
      return;
    }
    if (!formData.cantidad || parseFloat(formData.cantidad) <= 0) {
      showSnackbar('Ingresa una cantidad válida', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const payload = {
        item_id: parseInt(targetItemId, 10),
        tipo_movimiento: formData.tipo_movimiento,
        cantidad: parseFloat(formData.cantidad),
        motivo: formData.motivo.trim(),
        referencia: formData.referencia ? formData.referencia.trim() : `MOV-${Date.now().toString().slice(-6)}`,
        almacen_id: parseInt(formData.almacen_id, 10)
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
        showSnackbar(result.message || 'Movimiento registrado exitosamente');
        onClose();
        onSubmitSuccess();
      } else {
        showSnackbar(result.error || 'Error al registrar movimiento', 'error');
      }
    } catch (err) {
      console.error('Error registrando movimiento:', err);
      showSnackbar('Error de conexión con el servidor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ bgcolor: '#0f172a', color: 'white', py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <SwapVertIcon sx={{ color: formData.tipo_movimiento === 'ENTRADA' ? '#10b981' : '#ef4444' }} />
        <Typography variant="h6" fontWeight={900}>
          Registrar Movimiento de Inventario ({formData.tipo_movimiento})
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            
            {/* TIPO DE MOVIMIENTO */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                TIPO DE MOVIMIENTO *
              </Typography>
              <TextField
                select
                fullWidth
                value={formData.tipo_movimiento}
                onChange={(e) => setFormData({ ...formData, tipo_movimiento: e.target.value })}
              >
                <MenuItem value="ENTRADA">🟢 ENTRADA (Ingreso / Ajuste)</MenuItem>
                <MenuItem value="SALIDA">🔴 SALIDA (Egreso / Merma / Consumo)</MenuItem>
              </TextField>
            </Grid>

            {/* ALMACÉN AFECTADO */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                ALMACÉN *
              </Typography>
              <TextField
                select
                fullWidth
                value={formData.almacen_id}
                onChange={(e) => setFormData({ ...formData, almacen_id: e.target.value })}
              >
                <MenuItem value={1}>🏢 Almacén Central</MenuItem>
                <MenuItem value={2}>🔬 Almacén Laboratorio</MenuItem>
              </TextField>
            </Grid>

            {/* SELECCIÓN DE PRODUCTO */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                PRODUCTO *
              </Typography>
              <Autocomplete
                options={products}
                filterOptions={customFilterOptions}
                getOptionLabel={(option) => `[${option.codigo}] ${option.nombre} ${option.referencia_abreviada ? '(REF: ' + option.referencia_abreviada + ')' : ''}`}
                value={selectedProduct}
                onChange={(e, val) => {
                  setSelectedProduct(val);
                  if (val) setFormData(prev => ({ ...prev, item_id: val.id }));
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Selecciona el producto..."
                    required
                    variant="outlined"
                  />
                )}
              />
            </Grid>

            {/* CANTIDAD */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                CANTIDAD (CAJAS / UNIDADES) *
              </Typography>
              <TextField
                fullWidth
                type="number"
                placeholder="Ej. 5"
                required
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>

            {/* REFERENCIA / DOCUMENTO */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                NRO DE DOCUMENTO / REFERENCIA
              </Typography>
              <TextField
                fullWidth
                placeholder="Ej. AJU-2026-001"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              />
            </Grid>

            {/* MOTIVO */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                MOTIVO / CONCEPTO DEL MOVIMIENTO *
              </Typography>
              <TextField
                fullWidth
                placeholder="Ej. Ajuste por conteo físico, Devolución o Consumo directo"
                required
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
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
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
          sx={{
            bgcolor: formData.tipo_movimiento === 'ENTRADA' ? '#10b981' : '#ef4444',
            '&:hover': { bgcolor: formData.tipo_movimiento === 'ENTRADA' ? '#059669' : '#dc2626' },
            fontWeight: 800,
            px: 4,
            borderRadius: 2
          }}
        >
          {submitting ? 'Guardando...' : `Confirmar ${formData.tipo_movimiento}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

// MODAL MEMOIZADO: TRANSFERENCIA ENTRE ALMACENES
const TransferModalForm = memo(({ open, onClose, products, onProductSelect, onSubmitSuccess, showSnackbar }) => {
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
        setSelectedProduct(onProductSelect);
        setTransferData(prev => ({ ...prev, item_id: onProductSelect.id }));
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
  }, [open, onProductSelect]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const targetItemId = selectedProduct ? selectedProduct.id : transferData.item_id;
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

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const payload = {
        item_id: parseInt(targetItemId, 10),
        cantidad: parseFloat(transferData.cantidad),
        almacen_origen_id: parseInt(transferData.almacen_origen_id, 10),
        almacen_destino_id: parseInt(transferData.almacen_destino_id, 10),
        motivo: transferData.motivo || 'Transferencia entre depósitos',
        referencia: transferData.referencia || `TRANS-${Date.now().toString().slice(-6)}`
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
        showSnackbar(result.message || 'Transferencia realizada con éxito');
        onClose();
        onSubmitSuccess();

        if (payload.referencia) {
          window.open(`${API_BASE_URL}/movements/transfer/pdf?referencia=${encodeURIComponent(payload.referencia)}`, '_blank');
        }
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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
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
                getOptionLabel={(option) => `[${option.codigo}] ${option.nombre} ${option.referencia_abreviada ? '(REF: ' + option.referencia_abreviada + ')' : ''}`}
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

            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                CANTIDAD A TRANSFERIR (CAJAS) *
              </Typography>
              <TextField
                fullWidth
                type="number"
                placeholder="Ej. 2"
                required
                value={transferData.cantidad}
                onChange={(e) => setTransferData({ ...transferData, cantidad: e.target.value })}
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>

            {/* BANNER DE DESGLOSE AUTOMÁTICO SEGÚN FICHA DE PRODUCTO */}
            {selectedProduct && transferData.cantidad && parseFloat(transferData.cantidad) > 0 && String(transferData.almacen_destino_id) === '2' && (
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 3 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#166534', textTransform: 'uppercase', display: 'block', mb: 0.5 }}>
                    🔬 Desglose Operativo según Ficha de Producto (ISO 15189):
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: '#0f172a' }}>
                    {transferData.cantidad} Cajas ➔ { (parseFloat(transferData.cantidad) * (selectedProduct.pruebas_teoricas_caja || selectedProduct.rendimiento_teorico || 500)).toLocaleString() } Determinaciones / Pruebas Operativas disponibles en Almacén Laboratorio
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#475569', mt: 0.5, display: 'block' }}>
                    El Sniffer descontará las pruebas consumidas directamente de estas determinaciones en Almacén Laboratorio.
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
                onChange={(e) => setTransferData({ ...transferData, motivo: e.target.value })}
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
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting}
          sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 800, px: 4, borderRadius: 2 }}
        >
          {submitting ? 'Procesando...' : 'Confirmar Transferencia y Emitir PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

// COMPONENTE PRINCIPAL HUB ALMACÉN / DEPÓSITO
const WarehousesHub = () => {
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
  const [warehouseFilter, setWarehouseFilter] = useState('all');

  // KPI Metrics
  const [kpis, setKpis] = useState({ totalCentral: 0, totalLaboratorio: 0, totalGlobal: 0, totalMovimientos: 0 });

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
        setMovements(data.movements || []);
        setKpis(prev => ({ ...prev, totalMovimientos: data.movements.length || 0 }));
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
        referencia_abreviada: productItem.item_referencia
      });
    } else {
      setSelectedProductForAction(null);
    }
    setOpenTransferModal(true);
  };

  const handleDownloadPdf = (referencia) => {
    if (!referencia) return;
    window.open(`${API_BASE_URL}/movements/transfer/pdf?referencia=${encodeURIComponent(referencia)}`, '_blank');
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

  // Movements Search Filtering (Memoized)
  const filteredMovements = useMemo(() => {
    const search = movementSearch.toLowerCase();
    return movements.filter(m => {
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
  }, [movements, movementSearch, warehouseFilter]);

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
                  {kpis.totalCentral} <Typography component="span" variant="subtitle2" color="textSecondary">Cajas</Typography>
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
                  {kpis.totalLaboratorio} <Typography component="span" variant="subtitle2" color="textSecondary">Cajas</Typography>
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
                  Total Movimientos Registrados
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                  {kpis.totalMovimientos}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: '#f5f3ff', borderRadius: 3, color: '#8b5cf6' }}>
                <HistoryIcon fontSize="large" />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* PESTAÑAS MULTI-TAB DE NAVEGACIÓN UNIFICADA */}
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
          <Tab icon={<HistoryIcon />} iconPosition="start" label="Historial de Movimientos (Entradas, Salidas y Transferencias)" />
        </Tabs>
      </Paper>

      {/* PESTAÑA 0: STOCK POR ALMACÉN / DEPÓSITO */}
      {tabValue === 0 && (
        <Box>
          <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: 'white' }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12}>
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
                  filteredStock.map((row) => (
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
                          label={`${row.stock_central} Cajas`}
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
                          label={`${row.stock_laboratorio} Cajas`}
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
                        {row.stock_total_global} Cajas
                      </TableCell>

                      <TableCell align="center">
                        <Box display="flex" gap={1} justifyContent="center">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<SwapVertIcon />}
                            onClick={() => handleOpenMovementModal(row)}
                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 1.5 }}
                          >
                            Movimiento
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<TransferIcon />}
                            onClick={() => handleOpenTransferModal(row)}
                            sx={{ borderRadius: 2, fontWeight: 700, textTransform: 'none', px: 1.5 }}
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
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={36} sx={{ color: '#0284c7', mb: 1.5 }} />
                      <Typography variant="body2" color="textSecondary" fontWeight={700}>
                        Cargando historial de movimientos...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#64748b' }}>
                      <HistoryIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                      <Typography variant="subtitle1" fontWeight={800} color="#1e293b">
                        No se encontraron movimientos registrados
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((m) => (
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

                      <TableCell align="right" sx={{ fontWeight: 900, fontSize: 15, color: m.tipo_movimiento === 'ENTRADA' ? '#166534' : m.tipo_movimiento === 'SALIDA' ? '#991b1b' : '#1e40af' }}>
                        {m.tipo_movimiento === 'ENTRADA' ? `+${m.cantidad}` : m.tipo_movimiento === 'SALIDA' ? `-${m.cantidad}` : m.cantidad}
                      </TableCell>

                      <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                        {m.almacen_nombre || 'Almacén Central'}
                      </TableCell>

                      <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                        {m.almacen_destino_nombre || '-'}
                      </TableCell>

                      <TableCell sx={{ fontSize: 12 }}>
                        <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#1e293b' }}>
                          {m.motivo}
                        </Typography>
                        {m.referencia && (
                          <Typography variant="caption" color="textSecondary">
                            Ref: {m.referencia}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell align="center">
                        {m.tipo_movimiento === 'TRANSFERENCIA' && m.referencia ? (
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
          </TableContainer>
        </Box>
      )}

      {/* MODAL 1: REGISTRAR MOVIMIENTO DE INVENTARIO (ENTRADA / SALIDA) */}
      <MovementModalForm
        open={openMovementModal}
        onClose={() => setOpenMovementModal(false)}
        products={products}
        onProductSelect={selectedProductForAction}
        onSubmitSuccess={() => { loadStockSummary(); loadMovements(); }}
        showSnackbar={showSnackbar}
      />

      {/* MODAL 2: TRANSFERENCIA ENTRE ALMACENES */}
      <TransferModalForm
        open={openTransferModal}
        onClose={() => setOpenTransferModal(false)}
        products={products}
        onProductSelect={selectedProductForAction}
        onSubmitSuccess={() => { loadStockSummary(); loadMovements(); }}
        showSnackbar={showSnackbar}
      />

    </Box>
  );
};

export default WarehousesHub;
