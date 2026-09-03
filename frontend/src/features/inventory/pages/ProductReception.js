import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Grid, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Alert, Snackbar,
  CircularProgress, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, Tooltip, createFilterOptions
} from '@mui/material';
import {
  Add as PlusIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  LocalShipping as ShippingIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Warehouse as WarehouseIcon,
  Business as SupplierIcon,
  QrCode2 as QrCodeIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const customFilterOptions = createFilterOptions({
  limit: 50,
  stringify: (option) => `${option.codigo_barra || ''} ${option.codigo} ${option.nombre} ${option.referencia_abreviada || ''} ${option.equipo_asociado || ''}`
});

// COMPONENTE MODAL AISLADO (MEMOIZADO): Garantiza tipeo y escaneo ultra fluido a 60 FPS
const ReceptionModalForm = memo(({ open, onClose, products, suppliers, onAddSupplierClick, onSubmitSuccess, showSnackbar }) => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [scannedMessage, setScannedMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    cantidad_cajas: '',
    presentacion_empaque: 'Cajas',
    lote: '',
    fecha_fabricacion: '',
    fecha_vencimiento: '',
    almacen_id: 1,
    proveedor_id: '',
    nro_factura: '',
    nota_entrega: '',
    codigo_barra: '',
    precio_recepcion_usd: '',
    referencia_documento: ''
  });

  useEffect(() => {
    if (open) {
      setSelectedProduct(null);
      setScannedMessage('');
      setFormData({
        cantidad_cajas: '',
        presentacion_empaque: 'Cajas',
        lote: '',
        fecha_fabricacion: '',
        fecha_vencimiento: '',
        almacen_id: 1,
        proveedor_id: '',
        nro_factura: '',
        nota_entrega: '',
        codigo_barra: '',
        precio_recepcion_usd: '',
        referencia_documento: ''
      });
    }
  }, [open]);

  const handleProductSelect = (event, newValue) => {
    setSelectedProduct(newValue);
    if (newValue) {
      setFormData(prev => ({
        ...prev,
        codigo_barra: newValue.codigo_barra || prev.codigo_barra,
        precio_recepcion_usd: newValue.precio_costo || prev.precio_recepcion_usd,
        presentacion_empaque: newValue.presentacion || prev.presentacion_empaque
      }));
    }
  };

  // Manejador inteligente de Escaneo de Código de Barras
  const handleBarcodeScanChange = (e) => {
    const codeVal = e.target.value;
    setFormData(prev => ({ ...prev, codigo_barra: codeVal }));
    setScannedMessage('');

    if (!codeVal || codeVal.trim().length < 3) return;

    const cleanCode = codeVal.trim().toLowerCase();
    const matched = products.find(p => (
      (p.codigo_barra && p.codigo_barra.toLowerCase() === cleanCode) ||
      (p.codigo && p.codigo.toLowerCase() === cleanCode) ||
      (p.referencia && p.referencia.toLowerCase() === cleanCode) ||
      (p.referencia_abreviada && p.referencia_abreviada.toLowerCase() === cleanCode)
    ));

    if (matched) {
      setSelectedProduct(matched);
      setScannedMessage(`✅ Producto identificado: [${matched.codigo}] ${matched.nombre}`);
      setFormData(prev => ({
        ...prev,
        cantidad_cajas: prev.cantidad_cajas ? String(parseFloat(prev.cantidad_cajas) + 1) : '1',
        precio_recepcion_usd: matched.precio_costo || prev.precio_recepcion_usd,
        presentacion_empaque: matched.presentacion || prev.presentacion_empaque
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      showSnackbar('Por favor selecciona o escanea un producto del catálogo', 'error');
      return;
    }
    if (!formData.cantidad_cajas || !formData.lote || !formData.almacen_id) {
      showSnackbar('Completa los campos obligatorios: Producto, Cantidad, Lote y Almacén', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const payload = {
        item_id: selectedProduct.id,
        cantidad_cajas: parseFloat(formData.cantidad_cajas),
        presentacion_empaque: formData.presentacion_empaque || 'Cajas',
        lote: formData.lote.trim(),
        fecha_fabricacion: formData.fecha_fabricacion || null,
        fecha_vencimiento: formData.fecha_vencimiento || null,
        almacen_id: parseInt(formData.almacen_id, 10),
        proveedor_id: formData.proveedor_id ? parseInt(formData.proveedor_id, 10) : null,
        nro_factura: formData.nro_factura.trim(),
        nota_entrega: formData.nota_entrega.trim(),
        codigo_barra: formData.codigo_barra.trim(),
        precio_recepcion_usd: formData.precio_recepcion_usd ? parseFloat(formData.precio_recepcion_usd) : 0,
        referencia_documento: formData.referencia_documento.trim()
      };

      const res = await fetch(`${API_BASE_URL}/reception`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        showSnackbar(result.message || 'Ingreso registrado correctamente');
        onClose();
        onSubmitSuccess();
      } else {
        showSnackbar(result.error || 'Error al registrar recepción', 'error');
      }
    } catch (err) {
      console.error('Error guardando recepción:', err);
      showSnackbar('Error de comunicación con el servidor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ bgcolor: '#0f172a', color: 'white', py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <ShippingIcon sx={{ color: '#10b981' }} />
        <Typography variant="h6" fontWeight={900}>
          Nuevo Ingreso de Mercancía (Recepción de Compras)
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            
            {/* 1. CAMPO PROVEEDOR (CON BOTÓN DE ADICIÓN RÁPIDA) */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                PROVEEDOR
              </Typography>
              <Box display="flex" gap={1}>
                <TextField
                  select
                  fullWidth
                  value={formData.proveedor_id}
                  onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })}
                >
                  <MenuItem value="">-- Seleccionar Proveedor --</MenuItem>
                  {suppliers.map(sup => (
                    <MenuItem key={sup.id} value={sup.id}>{sup.nombre}</MenuItem>
                  ))}
                </TextField>
                <Tooltip title="Agregar Nuevo Proveedor">
                  <Button
                    variant="contained"
                    onClick={onAddSupplierClick}
                    sx={{ minWidth: 48, px: 1, bgcolor: '#2563eb', '&:hover': { bgcolor: '#1d4ed8' }, borderRadius: 2 }}
                  >
                    <PlusIcon />
                  </Button>
                </Tooltip>
              </Box>
            </Grid>

            {/* 2. CAMPO NRO DE FACTURA */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                NRO DE FACTURA
              </Typography>
              <TextField
                fullWidth
                placeholder="Ej. FACT-2026-8812"
                value={formData.nro_factura}
                onChange={(e) => setFormData({ ...formData, nro_factura: e.target.value })}
              />
            </Grid>

            {/* 3. CAMPO NOTA DE ENTREGA */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                NRO NOTA DE ENTREGA
              </Typography>
              <TextField
                fullWidth
                placeholder="Ej. NE-2026-441"
                value={formData.nota_entrega}
                onChange={(e) => setFormData({ ...formData, nota_entrega: e.target.value })}
              />
            </Grid>

            {/* 4. CAMPO CÓDIGO DE BARRAS (ESCÁNER INTELIGENTE DE CÓDIGO DE BARRAS) */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                CÓDIGO DE BARRAS (ESCÁNER / GTIN / P/N)
              </Typography>
              <TextField
                fullWidth
                placeholder="Escanea el código de barras aquí..."
                value={formData.codigo_barra}
                onChange={handleBarcodeScanChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeIcon color="primary" />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            {/* MENSAJE DE IDENTIFICACIÓN AUTOMÁTICA POR ESCÁNER */}
            {scannedMessage && (
              <Grid item xs={12}>
                <Alert severity="success" icon={<CheckIcon />} sx={{ borderRadius: 2, fontWeight: 800 }}>
                  {scannedMessage}
                </Alert>
              </Grid>
            )}

            {/* 5. CAMPO PRODUCTO A INGRESAR * (BUSCADOR AUTOCOMPLETE) */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                PRODUCTO A INGRESAR *
              </Typography>
              <Autocomplete
                options={products}
                filterOptions={customFilterOptions}
                getOptionLabel={(option) => `[${option.codigo}] ${option.nombre} ${option.referencia_abreviada ? '(REF: ' + option.referencia_abreviada + ')' : ''}`}
                value={selectedProduct}
                onChange={handleProductSelect}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Busca por Nombre, REF (P/N), Código o Autoanalizador..."
                    required
                    variant="outlined"
                  />
                )}
              />
            </Grid>

            {/* 6. CAMPO PRESENTACIÓN * */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                PRESENTACIÓN *
              </Typography>
              <TextField
                select
                fullWidth
                value={formData.presentacion_empaque}
                onChange={(e) => setFormData({ ...formData, presentacion_empaque: e.target.value })}
              >
                <MenuItem value="Cajas">📦 Cajas</MenuItem>
                <MenuItem value="Paquete">🛍️ Paquete</MenuItem>
                <MenuItem value="Bulto">🧱 Bulto</MenuItem>
                <MenuItem value="Galón">🪣 Galón</MenuItem>
                <MenuItem value="Unidad">🧪 Unidad</MenuItem>
              </TextField>
            </Grid>

            {/* 7. CAMPO CANTIDAD * */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                CANTIDAD *
              </Typography>
              <TextField
                fullWidth
                type="number"
                placeholder="Ej. 10"
                required
                value={formData.cantidad_cajas}
                onChange={(e) => setFormData({ ...formData, cantidad_cajas: e.target.value })}
                inputProps={{ min: 1, step: 1 }}
              />
            </Grid>

            {/* 8. LOTE ASOCIADO AL PRODUCTO * */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                LOTE ASOCIADO AL PRODUCTO *
              </Typography>
              <TextField
                fullWidth
                placeholder="Ej. LOT-2026-9912"
                required
                value={formData.lote}
                onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
              />
            </Grid>

            {/* 9. FECHA DE FABRICACIÓN */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                FECHA DE FABRICACIÓN
              </Typography>
              <TextField
                fullWidth
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.fecha_fabricacion}
                onChange={(e) => setFormData({ ...formData, fecha_fabricacion: e.target.value })}
              />
            </Grid>

            {/* 10. FECHA DE VENCIMIENTO */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                FECHA DE VENCIMIENTO
              </Typography>
              <TextField
                fullWidth
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.fecha_vencimiento}
                onChange={(e) => setFormData({ ...formData, fecha_vencimiento: e.target.value })}
              />
            </Grid>

            {/* 11. ALMACÉN DE DESTINO * */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                ALMACÉN DE DESTINO *
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

            {/* 12. VALOR EN DÓLARES SEGÚN RECEPCIÓN ($ USD) */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                VALOR EN DÓLARES SEGÚN RECEPCIÓN ($ USD)
              </Typography>
              <TextField
                fullWidth
                type="number"
                placeholder="Ej. 112.50"
                value={formData.precio_recepcion_usd}
                onChange={(e) => setFormData({ ...formData, precio_recepcion_usd: e.target.value })}
                inputProps={{ step: 0.01 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />
            </Grid>

            {/* 13. NRO DE GUÍA DE RECEPCIÓN / ORDEN DE COMPRA */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
                NRO DE GUÍA DE RECEPCIÓN / ORDEN DE COMPRA
              </Typography>
              <TextField
                fullWidth
                placeholder="Ej. OC-2026-00891"
                value={formData.referencia_documento}
                onChange={(e) => setFormData({ ...formData, referencia_documento: e.target.value })}
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
          sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' }, fontWeight: 800, px: 4, borderRadius: 2 }}
        >
          {submitting ? 'Procesando...' : 'Confirmar Ingreso de Mercancía'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

// COMPONENTE PRINCIPAL
const ProductReception = () => {
  const [receptions, setReceptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');

  // KPI Metrics
  const [kpis, setKpis] = useState({ totalRecepciones: 0, totalCajas: 0, totalIngresadoUSD: 0 });

  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [openAddSupplierModal, setOpenAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadData();
    loadCatalog();
    loadSuppliers();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/reception`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReceptions(data.data || []);
        setKpis({
          totalRecepciones: data.totalRecepciones || 0,
          totalCajas: data.totalCajas || 0,
          totalIngresadoUSD: data.totalIngresadoUSD || 0
        });
      }
    } catch (err) {
      console.error('Error cargando recepciones:', err);
      showSnackbar('Error al conectar con el servidor', 'error');
    } finally {
      setLoading(false);
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
      console.error('Error cargando catálogo de productos:', err);
    }
  };

  const loadSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/reception/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando proveedores:', err);
    }
  };

  const handleCreateSupplierOnTheFly = async (e) => {
    e.preventDefault();
    if (!newSupplierName || !newSupplierName.trim()) {
      showSnackbar('Ingresa el nombre del proveedor', 'error');
      return;
    }

    try {
      setAddingSupplier(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/reception/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: newSupplierName.trim() })
      });
      const result = await res.json();
      if (result.success && result.supplier) {
        showSnackbar(result.message || 'Proveedor agregado correctamente');
        await loadSuppliers();
        setOpenAddSupplierModal(false);
        setNewSupplierName('');
      } else {
        showSnackbar(result.error || 'Error creando proveedor', 'error');
      }
    } catch (err) {
      console.error('Error creando proveedor:', err);
      showSnackbar('Error de conexión con el servidor', 'error');
    } finally {
      setAddingSupplier(false);
    }
  };

  // Filtrado de recepciones MEMOIZADO (cero lag en tipeo)
  const filteredReceptions = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return receptions.filter(r => {
      const matchesSearch =
        (r.item_nombre && r.item_nombre.toLowerCase().includes(search)) ||
        (r.item_codigo && r.item_codigo.toLowerCase().includes(search)) ||
        (r.item_referencia && r.item_referencia.toLowerCase().includes(search)) ||
        (r.lote_numero && r.lote_numero.toLowerCase().includes(search)) ||
        (r.proveedor_nombre && r.proveedor_nombre.toLowerCase().includes(search)) ||
        (r.nro_factura && r.nro_factura.toLowerCase().includes(search)) ||
        (r.nota_entrega && r.nota_entrega.toLowerCase().includes(search)) ||
        (r.codigo_barra && r.codigo_barra.toLowerCase().includes(search)) ||
        (r.referencia && r.referencia.toLowerCase().includes(search)) ||
        (r.almacen_nombre && r.almacen_nombre.toLowerCase().includes(search));

      const matchesWarehouse = warehouseFilter === 'all' || String(r.almacen_id) === String(warehouseFilter);

      return matchesSearch && matchesWarehouse;
    });
  }, [receptions, searchTerm, warehouseFilter]);

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

      {/* Header Ejecutivo de Ingreso y Recepción */}
      <Paper
        elevation={6}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #0f172a 0%, #065f46 100%)',
          color: 'white',
          borderBottom: '4px solid #10b981'
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(16, 185, 129, 0.25)', borderRadius: 3, border: '1px solid rgba(110, 231, 183, 0.3)' }}>
              <ShippingIcon sx={{ fontSize: 42, color: '#6ee7b7' }} />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: '#6ee7b7', fontWeight: 800 }}>
                CONTROLAB IA • MÓDULO DE INGRESO Y LOGÍSTICA
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>
                Ingreso de Productos - Recepción
              </Typography>
              <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5 }}>
                Recepción oficial de mercancía enviada por Compras, escaneo de código de barras, asignación de lotes y trazabilidad
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={2}>
            <IconButton
              onClick={loadData}
              sx={{ color: '#cbd5e1', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
              title="Actualizar recepciones"
            >
              <RefreshIcon />
            </IconButton>

            <Button
              variant="contained"
              onClick={() => setOpenModal(true)}
              startIcon={<PlusIcon />}
              sx={{
                bgcolor: '#10b981',
                '&:hover': { bgcolor: '#059669' },
                borderRadius: 3,
                px: 3,
                py: 1.2,
                fontWeight: 800,
                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)'
              }}
            >
              Nuevo Ingreso de Mercancía
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Tarjetas KPI de Resumen */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, borderLeft: '6px solid #10b981', bgcolor: 'white' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Recepciones
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                  {kpis.totalRecepciones}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: '#ecfdf5', borderRadius: 3, color: '#10b981' }}>
                <ShippingIcon fontSize="large" />
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, borderLeft: '6px solid #2563eb', bgcolor: 'white' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Unidades Recibidas
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                  {kpis.totalCajas} <Typography component="span" variant="subtitle2" color="textSecondary">Unidades</Typography>
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: '#eff6ff', borderRadius: 3, color: '#2563eb' }}>
                <InventoryIcon fontSize="large" />
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, borderLeft: '6px solid #8b5cf6', bgcolor: 'white' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Valor Inversión ($ USD)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                  $ {kpis.totalIngresadoUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: '#f5f3ff', borderRadius: 3, color: '#8b5cf6' }}>
                <MoneyIcon fontSize="large" />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Buscador Inteligente y Filtros por Almacén */}
      <Paper elevation={2} sx={{ p: 2.5, mb: 4, borderRadius: 3, bgcolor: 'white' }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={7}>
            <TextField
              fullWidth
              size="small"
              placeholder="Búsqueda inteligente por Producto, Código de Barras, REF (P/N), Lote, Proveedor o Factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* TABLA EJECUTIVA DE RECEPCIONES (MEMOIZADA) */}
      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Table sx={{ minWidth: 1000 }}>
          <TableHead sx={{ bgcolor: '#0f172a' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>Fecha Ingreso</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>Código / REF / Barras</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>Producto</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>Lote / Vencimiento</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>Proveedor</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>Factura / Nota Entrega</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800, textAlign: 'center' }}>Almacén</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800, textAlign: 'right' }}>Cantidad</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800, textAlign: 'right' }}>Precio Unit. ($)</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800, textAlign: 'right' }}>Valor Total ($)</TableCell>
            </TableRow>
          </TableHead>
          <</TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={36} sx={{ color: '#10b981', mb: 1.5 }} />
                  <Typography variant="body2" color="textSecondary" fontWeight={700}>
                    Cargando historial de recepciones...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredReceptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6, color: '#64748b' }}>
                  <ShippingIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight={800} color="#1e293b">
                    No se encontraron recepciones registradas
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Haz clic en "Nuevo Ingreso de Mercancía" para registrar el primer ingreso.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredReceptions.map((row) => (
                <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                  <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    {row.fecha_ingreso ? new Date(row.fecha_ingreso).toLocaleString('es-VE') : '-'}
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e40af', display: 'block' }}>
                      {row.item_codigo}
                    </Typography>
                    {row.item_referencia && (
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                        REF: {row.item_referencia}
                      </Typography>
                    )}
                    {row.codigo_barra && (
                      <Chip
                        icon={<QrCodeIcon style={{ fontSize: 12 }} />}
                        label={row.codigo_barra}
                        size="small"
                        sx={{ fontSize: 10, height: 18, bgcolor: '#f1f5f9', fontWeight: 700, mt: 0.5 }}
                      />
                    )}
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>
                    {row.item_nombre}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={row.lote_numero}
                      size="small"
                      sx={{ fontWeight: 800, bgcolor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', mb: 0.5 }}
                    />
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#991b1b' }}>
                      Venc: {row.fecha_vencimiento ? new Date(row.fecha_vencimiento).toLocaleDateString('es-VE') : 'Indefinido'}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    {row.proveedor_nombre}
                  </TableCell>

                  <TableCell sx={{ fontSize: 12 }}>
                    {row.nro_factura && (
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#1e293b' }}>
                        Fact: {row.nro_factura}
                      </Typography>
                    )}
                    {row.nota_entrega && (
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#2563eb' }}>
                        N.E.: {row.nota_entrega}
                      </Typography>
                    )}
                    {!row.nro_factura && !row.nota_entrega && (
                      <Typography variant="caption" color="textSecondary">-</Typography>
                    )}
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      label={row.almacen_nombre}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        bgcolor: row.almacen_id === 2 ? '#f0fdf4' : '#eff6ff',
                        color: row.almacen_id === 2 ? '#166534' : '#1e40af',
                        border: `1px solid ${row.almacen_id === 2 ? '#bbf7d0' : '#bfdbfe'}`
                      }}
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 900, color: '#10b981' }}>
                      +{row.cantidad_cajas}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {row.presentacion_empaque || 'Cajas'}
                    </Typography>
                  </TableCell>

                  <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>
                    $ {row.precio_recepcion_usd.toFixed(2)}
                  </TableCell>

                  <TableCell align="right" sx={{ fontWeight: 900, color: '#0f172a', fontSize: 15 }}>
                    $ {row.valor_total_usd.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          TableBody>
        </Table>
      </TableContainer>

      {/* MODAL CON FORMULARIO MEMOIZADO (Tipeo instantáneo sin lag) */}
      <ReceptionModalForm
        open={openModal}
        onClose={() => setOpenModal(false)}
        products={products}
        suppliers={suppliers}
        onAddSupplierClick={() => setOpenAddSupplierModal(true)}
        onSubmitSuccess={loadData}
        showSnackbar={showSnackbar}
      />

      {/* MINI MODAL: AGREGAR NUEVO PROVEEDOR AL INSTANTE */}
      <Dialog open={openAddSupplierModal} onClose={() => setOpenAddSupplierModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ bgcolor: '#2563eb', color: 'white', py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SupplierIcon />
          <Typography variant="subtitle1" fontWeight={800}>
            Agregar Nuevo Proveedor
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 3 }}>
          <Typography variant="body2" color="textSecondary" mb={2}>
            Ingresa el nombre del proveedor para agregarlo a la lista permanente:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Ej. LabCare Internacional C.A."
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAddSupplierModal(false)} sx={{ color: '#64748b' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreateSupplierOnTheFly}
            variant="contained"
            disabled={addingSupplier}
            sx={{ bgcolor: '#2563eb', fontWeight: 800 }}
          >
            {addingSupplier ? 'Guardando...' : 'Guardar Proveedor'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ProductReception;
