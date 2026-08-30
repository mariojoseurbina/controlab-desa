import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Search as SearchIcon
} from '@mui/icons-material';

// ✅ URL base de la API (desde variable de entorno)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [almacenes, setAlmacenes] = useState([]);
  const [selectedAlmacen, setSelectedAlmacen] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para notificaciones
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    loadAlmacenes();
  }, []);

  useEffect(() => {
    loadItems();
  }, [selectedAlmacen]);

  const loadAlmacenes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/almacenes`);
      if (response.ok) {
        const data = await response.json();
        setAlmacenes(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando almacenes:', error);
    }
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const url = selectedAlmacen === 'all' 
        ? `${API_BASE_URL}/inventory`
        : `${API_BASE_URL}/inventory?almacenId=${selectedAlmacen}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      } else {
        showSnackbar('Error cargando inventario', 'error');
      }
    } catch (error) {
      console.error('Error cargando items:', error);
      showSnackbar('Error de conexión con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
    } else {
      setEditingItem(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
  };

  const handleSubmit = async (dialogFormData) => {
    try {
      let response;
      // ✅ Usar API_BASE_URL
      const url = editingItem 
        ? `${API_BASE_URL}/inventory/${editingItem.id}`
        : `${API_BASE_URL}/inventory`;

      const method = editingItem ? 'PUT' : 'POST';

      // Convertir valores numéricos antes de enviar
      const payload = {
        ...dialogFormData,
        stock_actual: parseInt(dialogFormData.stock_actual) || 0,
        stock_minimo: parseInt(dialogFormData.stock_minimo) || 0,
        stock_critico: parseInt(dialogFormData.stock_critico) || 0,
        precio_costo: parseFloat(dialogFormData.precio_costo) || 0,
        precio_venta: parseFloat(dialogFormData.precio_venta) || 0,
      };

      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        handleCloseDialog();
        await loadItems();
        showSnackbar(
          editingItem ? 'Item actualizado exitosamente' : 'Item creado exitosamente',
          'success'
        );
      } else {
        const errorData = await response.json();
        showSnackbar(`Error: ${errorData.error || 'Error guardando item'}`, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showSnackbar('Error de conexión con el servidor', 'error');
    }
  };

  // ✅ FUNCIÓN CORREGIDA PARA ELIMINAR
  const handleDelete = async (id, itemName = '') => {
    // Buscar el item completo para validaciones
    const itemToDelete = items.find(item => item.id === id);
    
    if (!itemToDelete) {
      showSnackbar('Item no encontrado en la lista', 'error');
      return;
    }

    // Validar si tiene stock
    if (itemToDelete.stock_actual > 0) {
      if (!window.confirm(
        `⚠️ ADVERTENCIA\n\n` +
        `El item "${itemToDelete.nombre}" tiene stock actual: ${itemToDelete.stock_actual}\n\n` +
        `¿Desea eliminarlo de todas formas?`
      )) {
        return;
      }
    } else {
      // Confirmación normal para items sin stock
      if (!window.confirm(
        `¿Está seguro de eliminar el item?\n\n` +
        `Código: ${itemToDelete.codigo}\n` +
        `Nombre: ${itemToDelete.nombre}\n\n` +
        `Esta acción no se puede deshacer.`
      )) {
        return;
      }
    }

    // Marcar como eliminando
    setDeletingId(id);

    try {
      // ✅ Usar API_BASE_URL
      const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        // Eliminar del estado local sin recargar toda la lista
        setItems(prevItems => prevItems.filter(item => item.id !== id));
        showSnackbar(`✅ "${itemToDelete.nombre}" eliminado correctamente`, 'success');
      } else {
        // Intentar obtener mensaje de error del backend
        try {
          const errorData = await response.json();
          showSnackbar(`Error del servidor: ${errorData.error || errorData.message}`, 'error');
        } catch {
          showSnackbar(`Error ${response.status}: ${response.statusText}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error eliminando item:', error);
      showSnackbar('Error de conexión con el servidor', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Función para mostrar notificaciones
  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getStockStatus = (item) => {
    const actual = parseFloat(item.stock_actual) || 0;
    const critico = parseFloat(item.stock_critico) || 0;
    const minimo = parseFloat(item.stock_minimo) || 0;

    if (actual <= critico) {
      return { label: 'CRÍTICO', color: 'error' };
    } else if (actual <= minimo) {
      return { label: 'BAJO', color: 'warning' };
    } else {
      return { label: 'NORMAL', color: 'success' };
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Cargando inventario...
        </Typography>
      </Box>
    );
  }

  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.codigo.toLowerCase().includes(searchLower) ||
      item.nombre.toLowerCase().includes(searchLower) ||
      (item.categoria && item.categoria.toLowerCase().includes(searchLower)) ||
      (item.marca && item.marca.toLowerCase().includes(searchLower))
    );
  });

  return (
    <Box p={3}>
      {/* Notificaciones Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom sx={{ m: 0 }}>
          Gestión de Inventario
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <Typography variant="body2" color="textSecondary">
            Total items: {filteredItems.length}
          </Typography>
          <TextField
            size="small"
            placeholder="Buscar por código, nombre o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
            }}
            sx={{ minWidth: 280, backgroundColor: 'white', borderRadius: 1 }}
          />
          <TextField
            select
            size="small"
            label="Almacén / Sucursal"
            value={selectedAlmacen}
            onChange={(e) => setSelectedAlmacen(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="all">Todos los Almacenes</MenuItem>
            {almacenes.map((almacen) => (
              <MenuItem key={almacen.id} value={almacen.id}>
                {almacen.nombre}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nuevo Item
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Marca</TableCell>
              <TableCell>Stock Actual</TableCell>
              <TableCell>Stock Mínimo</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    {searchTerm ? 'No se encontraron resultados para la búsqueda.' : 'No hay items en el inventario. Crea el primero.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item) => {
                const status = getStockStatus(item);
                return (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {item.codigo}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.nombre}</TableCell>
                    <TableCell>
                      <Chip 
                        label={item.categoria} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {item.marca || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography 
                        fontWeight={ 
                          status.color === 'error' ? 'bold' : 'normal' 
                        }
                        color={
                          status.color === 'error' ? 'error' : 'inherit'
                        }
                      >
                        {item.stock_actual} {item.unidad}
                      </Typography>
                      {(item.categoria === 'Reactivo' || item.grupo === 'REACTIVO' || (item.frascos_por_caja && item.frascos_por_caja > 0) || (item.consumo_indicado && item.consumo_indicado > 0)) && (
                        <Typography variant="caption" sx={{ color: '#0369a1', display: 'block', fontWeight: '600' }}>
                          📦 {item.frascos_por_caja ? (item.stock_actual * item.frascos_por_caja).toFixed(0) : (item.stock_actual || 0)} Frascos
                          {item.pruebas_teoricas_caja ? ` (~${Math.round(item.stock_actual * item.pruebas_teoricas_caja).toLocaleString()} tests)` : ''}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{item.stock_minimo}</TableCell>
                    <TableCell>
                      <Chip 
                        label={status.label} 
                        color={status.color} 
                        size="small"
                        icon={status.color === 'error' ? <WarningIcon /> : undefined}
                      />
                    </TableCell>
                    <TableCell>{item.ubicacion}</TableCell>
                    <TableCell>
                      <IconButton 
                        color="primary" 
                        onClick={() => handleOpenDialog(item)}
                        title="Editar item"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => handleDelete(item.id, item.nombre)}
                        disabled={deletingId === item.id}
                        title="Eliminar item"
                      >
                        {deletingId === item.id ? (
                          <CircularProgress size={24} />
                        ) : (
                          <DeleteIcon />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para crear/editar - AHORA EXTRAÍDO A UN COMPONENTE CON ESTADO AISLADO PARA EVITAR LAG EN DIGITACIÓN */}
      <ItemFormDialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        onSubmit={handleSubmit} 
        editingItem={editingItem} 
      />
    </Box>
  );
};

// ============================================================================
// 🆕 COMPONENTE INTERNO CON ESTADO AISLADO PARA EL FORMULARIO DE ITEM
// Evita que cada pulsación de tecla re-renderice la tabla gigante de inventario
// ============================================================================
const ItemFormDialog = ({ open, onClose, onSubmit, editingItem }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    categoria: '',
    unidad: '',
    marca: '',
    stock_actual: 0,
    stock_minimo: 10,
    stock_critico: 5,
    proveedor: '',
    precio_costo: 0,
    precio_venta: 0,
    ubicacion: '',
    fecha_vencimiento: ''
  });

  // Cargar/limpiar datos cuando se abre el diálogo o cambia el item seleccionado
  useEffect(() => {
    if (open) {
      if (editingItem) {
        setFormData({
          codigo: editingItem.codigo || '',
          nombre: editingItem.nombre || '',
          descripcion: editingItem.descripcion || '',
          categoria: editingItem.categoria || '',
          unidad: editingItem.unidad || '',
          marca: editingItem.marca || '',
          stock_actual: editingItem.stock_actual || 0,
          stock_minimo: editingItem.stock_minimo || 10,
          stock_critico: editingItem.stock_critico || 5,
          proveedor: editingItem.proveedor || '',
          precio_costo: editingItem.precio_costo || 0,
          precio_venta: editingItem.precio_venta || 0,
          ubicacion: editingItem.ubicacion || '',
          fecha_vencimiento: editingItem.fecha_vencimiento ? editingItem.fecha_vencimiento.split('T')[0] : '',
          // 🆕 Campos en azul
          codigo_barra: editingItem.codigo_barra || '',
          referencia: editingItem.referencia || '',
          grupo: editingItem.grupo || 'REACTIVO',
          panel: editingItem.panel || '',
          control_asociado: editingItem.control_asociado || '',
          calibradores_asociados: editingItem.calibradores_asociados || '',
          unidad_manejo: editingItem.unidad_manejo || 'UND',
          cantidad_unidades: editingItem.cantidad_unidades || 100,
          unidad_test: editingItem.unidad_test || 180,
          costo_unitario_manejo: editingItem.costo_unitario_manejo || 0,
          aplica_iva: editingItem.aplica_iva || false,
          porcentaje_utilidad: editingItem.porcentaje_utilidad || 40,
          stock_maximo: editingItem.stock_maximo || 100,
          stock_promedio: editingItem.stock_promedio || 40,
          unidad_negocio: editingItem.unidad_negocio || 'ALM-LABORATORIO CLINICO',
          equipo_asociado: editingItem.equipo_asociado || '',
          consumo_indicado: editingItem.consumo_indicado || 0,
          consumo_real: editingItem.consumo_real || 0,
          desviacion_consumo: editingItem.desviacion_consumo || 0,
          // 📦 Jerarquía Cajas / Frascos / mL
          frascos_por_caja: editingItem.frascos_por_caja || 6,
          volumen_por_frasco_ml: editingItem.volumen_por_frasco_ml || 100,
          volumen_muerto_frasco_ml: editingItem.volumen_muerto_frasco_ml || 2.0,
          pruebas_teoricas_frasco: editingItem.pruebas_teoricas_frasco || 277,
          pruebas_teoricas_caja: editingItem.pruebas_teoricas_caja || 1666
        });
      } else {
        setFormData({
          codigo: '',
          nombre: '',
          descripcion: '',
          categoria: 'Reactivo',
          unidad: 'ml',
          marca: '',
          stock_actual: 0,
          stock_minimo: 10,
          stock_critico: 5,
          proveedor: '',
          precio_costo: 0,
          precio_venta: 0,
          ubicacion: '',
          fecha_vencimiento: '',
          // 🆕 Campos en azul por defecto
          codigo_barra: '',
          referencia: '',
          grupo: 'REACTIVO',
          panel: '',
          control_asociado: '',
          calibradores_asociados: '',
          unidad_manejo: 'UND',
          cantidad_unidades: 100,
          unidad_test: 180,
          costo_unitario_manejo: 0,
          aplica_iva: false,
          porcentaje_utilidad: 40,
          stock_maximo: 100,
          stock_promedio: 40,
          unidad_negocio: 'ALM-LABORATORIO CLINICO',
          equipo_asociado: '',
          consumo_indicado: 0,
          consumo_real: 0,
          desviacion_consumo: 0,
          // 📦 Jerarquía Cajas / Frascos / mL en 0 por defecto para carga manual
          frascos_por_caja: 0,
          volumen_por_frasco_ml: 0,
          volumen_muerto_frasco_ml: 0,
          pruebas_teoricas_frasco: 0,
          pruebas_teoricas_caja: 0
        });
      }
    }
  }, [open, editingItem]);

  const [tabIndex, setTabIndex] = useState(0);

  // Recálculo automático de precio de venta sugerido y costo unitario por manejo
  const handleCostOrMarginChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    const cost = parseFloat(field === 'precio_costo' ? value : updated.precio_costo) || 0;
    const margin = parseFloat(field === 'porcentaje_utilidad' ? value : updated.porcentaje_utilidad) || 0;
    const qtyUnid = parseFloat(field === 'cantidad_unidades' ? value : updated.cantidad_unidades) || 1;
    const hasIva = field === 'aplica_iva' ? value : updated.aplica_iva;

    const factorIva = hasIva ? 1.16 : 1.0;
    const costConIva = cost * factorIva;
    const suggestedPrice = costConIva * (1 + (margin / 100));
    
    updated.precio_venta = parseFloat(suggestedPrice.toFixed(2));
    updated.costo_unitario_manejo = parseFloat((costConIva / (qtyUnid > 0 ? qtyUnid : 1)).toFixed(4));
    setFormData(updated);
  };

  const handleUnidadCompraChange = (val) => {
    const updated = { ...formData, unidad: val };
    let num = 1;
    
    if (val.includes('Cajas de ')) {
      num = parseFloat(val.replace('Cajas de ', '').trim()) || 1;
    } else if (val.includes('*')) {
      const parts = val.split('*');
      num = parseFloat(parts[1]?.trim()) || 1;
    }

    if (val.includes('Cajas de ') || val.includes('*')) {
      updated.cantidad_unidades = num;
      
      const cost = parseFloat(updated.precio_costo) || 0;
      const margin = parseFloat(updated.porcentaje_utilidad) || 0;
      const factorIva = updated.aplica_iva ? 1.16 : 1.0;
      const costConIva = cost * factorIva;
      updated.costo_unitario_manejo = parseFloat((costConIva / (num > 0 ? num : 1)).toFixed(4));
      updated.precio_venta = parseFloat((costConIva * (1 + (margin / 100))).toFixed(2));
    }
    setFormData(updated);
  };

  const handleSubmitInternal = (e) => {
    e.preventDefault();
    
    const min = parseFloat(formData.stock_minimo);
    const crit = parseFloat(formData.stock_critico);
    const actual = parseFloat(formData.stock_actual);

    // Regla 1: No pueden ser negativos
    if (min < 0 || crit < 0) {
      alert("❌ ERROR: El Stock Mínimo y el Stock Crítico no pueden ser valores negativos.");
      return;
    }

    // Regla 2: Lógica matemática estricta
    if (crit > min) {
      alert("❌ ERROR: El Stock Crítico no puede ser mayor al Stock Mínimo.");
      return;
    }

    // Regla 3: Alerta Roja Inmediata si se guarda en estado crítico
    if (actual <= crit) {
      if(!window.confirm("⚠️ ALERTA ROJA ⚠️\n\nEstás guardando este producto con un stock actual que ya se encuentra en ESTADO CRÍTICO.\n\n¿Estás seguro de registrarlo así?")) {
        return;
      }
    }

    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ backgroundColor: '#0f172a', color: '#fff', pb: 1 }}>
        <Typography variant="h6" fontWeight="800">
          {editingItem ? 'Editar Ficha de Producto (Controlab IA)' : 'NUEVO ITEM - FICHA DE PRODUCTO ENRIQUECIDA'}
        </Typography>
        <Typography variant="caption" sx={{ color: '#94a3b8' }}>
          Incorporación de Campos de la Sugerencia de Ficha de Productos (Panel, Controles, LIS, IVA y Mermas)
        </Typography>
      </DialogTitle>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#f8fafc', px: 2, pt: 1 }}>
        <Tabs value={tabIndex} onChange={(e, val) => setTabIndex(val)} variant="scrollable" scrollButtons="auto">
          <Tab label="📋 1. Identificación & LIS" />
          <Tab label="🔬 2. Clasificación Clínica" />
          <Tab label="💰 3. Control Financiero" />
          <Tab label="📦 4. Stock & Almacén" />
          <Tab label="⚙️ 5. Equipos & Mermas" />
        </Tabs>
      </Box>

      <form onSubmit={handleSubmitInternal}>
        <DialogContent dividers sx={{ p: 3, backgroundColor: '#ffffff' }}>
          {/* TAB 0: Identificación & LIS */}
          {tabIndex === 0 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Código Interno *"
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Código de Barras (EAN/UPC)"
                  placeholder="Ej: 759123456789"
                  value={formData.codigo_barra}
                  onChange={(e) => setFormData({...formData, codigo_barra: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Referencia Abreviada LIS"
                  placeholder="Ej: FER, TSH, ALP, HIV"
                  value={formData.referencia}
                  onChange={(e) => setFormData({...formData, referencia: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Nombre del Producto *"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Marca / Fabricante"
                  placeholder="Ej: Roche, Mindray, Sysmex, Kemroy"
                  value={formData.marca}
                  onChange={(e) => setFormData({...formData, marca: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Categoría *"
                  value={formData.categoria}
                  onChange={(e) => setFormData({...formData, categoria: e.target.value})}
                  required
                >
                  <MenuItem value="Reactivo">Reactivo</MenuItem>
                  <MenuItem value="Calibrador">Calibrador</MenuItem>
                  <MenuItem value="Control">Control</MenuItem>
                  <MenuItem value="Kit">Kit</MenuItem>
                  <MenuItem value="Material">Material</MenuItem>
                  <MenuItem value="Equipo">Equipo</MenuItem>
                  <MenuItem value="Consumible">Consumible</MenuItem>
                  <MenuItem value="Plastico/Reutilizable">Plastico/Reutilizable</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  select
                  label="Unidad de Compra *"
                  value={formData.unidad}
                  onChange={(e) => handleUnidadCompraChange(e.target.value)}
                  required
                >
                  <MenuItem value="Cajas de 1">Cajas de 1</MenuItem>
                  <MenuItem value="Cajas de 5">Cajas de 5</MenuItem>
                  <MenuItem value="Cajas de 10">Cajas de 10</MenuItem>
                  <MenuItem value="Cajas de 15">Cajas de 15</MenuItem>
                  <MenuItem value="Cajas de 20">Cajas de 20</MenuItem>
                  <MenuItem value="Cajas de 25">Cajas de 25</MenuItem>
                  <MenuItem value="Cajas de 50">Cajas de 50</MenuItem>
                  <MenuItem value="Cajas de 100">Cajas de 100</MenuItem>
                  <MenuItem value="Cajas">Cajas</MenuItem>
                  <MenuItem value="Unidades">Unidades</MenuItem>
                  <MenuItem value="Viales">Viales</MenuItem>
                  <MenuItem value="Frascos">Frascos</MenuItem>
                  <MenuItem value="Tiras">Tiras</MenuItem>
                  <MenuItem value="Paquete">Paquete</MenuItem>
                  <MenuItem value="ml">ml</MenuItem>
                  <MenuItem value="gr">gr</MenuItem>
                  <MenuItem value="Litros">Litros</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  disabled
                  label="Unidad *"
                  value={`${formData.cantidad_unidades || 1} Unidades`}
                  sx={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: 1,
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: '#0f172a',
                      fontWeight: '800'
                    }
                  }}
                  helperText="Total de unidades (Gris sin modificación)"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="UNIDAD TEST (N° Pruebas / Determinaciones) *"
                  placeholder="Ej: 180, 200, 500"
                  value={formData.unidad_test}
                  onChange={(e) => setFormData({...formData, unidad_test: e.target.value})}
                  inputProps={{ min: 1, step: 1 }}
                  helperText="Número de determinaciones / tests (Campo modificable por el usuario)"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f0f9ff'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción Comercial / Indicaciones"
                  multiline
                  rows={2}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                />
              </Grid>
            </Grid>
          )}

          {/* TAB 1: Clasificación Clínica */}
          {tabIndex === 1 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Grupo Macro"
                  value={formData.grupo}
                  onChange={(e) => setFormData({...formData, grupo: e.target.value})}
                >
                  <MenuItem value="REACTIVO">REACTIVO</MenuItem>
                  <MenuItem value="CONTROLES">CONTROLES</MenuItem>
                  <MenuItem value="CALIBRADORES">CALIBRADORES</MenuItem>
                  <MenuItem value="PRUEBAS RAPIDAS">PRUEBAS RÁPIDAS</MenuItem>
                  <MenuItem value="INSUMOS">INSUMOS</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Panel Clínico"
                  value={formData.panel}
                  onChange={(e) => setFormData({...formData, panel: e.target.value})}
                >
                  <MenuItem value="TIROIDES">TIROIDES (TSH, T3, T4)</MenuItem>
                  <MenuItem value="TUMORAL">TUMORAL (PSA, CEA, CA-125)</MenuItem>
                  <MenuItem value="FERTILIDAD">FERTILIDAD (FSH, LH, Prolactina)</MenuItem>
                  <MenuItem value="DIABETES">DIABETES (Insulina, HbA1c)</MenuItem>
                  <MenuItem value="CARDIACO">CARDÍACO (Troponina, CK-MB)</MenuItem>
                  <MenuItem value="METABOLICA">METABÓLICA / QUÍMICA (Glucosa, Urea, Creatinina)</MenuItem>
                  <MenuItem value="INFECCIOSAS">INFECCIOSAS (HIV, Hepatitis, VDRL)</MenuItem>
                  <MenuItem value="INFLAMACION">INFLAMACIÓN (PCR, VSG)</MenuItem>
                  <MenuItem value="AUTOINMUNE">AUTOINMUNE (ANA, FR)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Control Asociado al Grupo"
                  placeholder="Ej: TIROIDES A-B, RT3, TUMORAL CONTROL"
                  value={formData.control_asociado}
                  onChange={(e) => setFormData({...formData, control_asociado: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Calibradores Asignados"
                  placeholder="Ej: Free T3 Calibrators Set"
                  value={formData.calibradores_asociados}
                  onChange={(e) => setFormData({...formData, calibradores_asociados: e.target.value})}
                />
              </Grid>
            </Grid>
          )}

          {/* TAB 2: Control Financiero */}
          {tabIndex === 2 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Precio Costo Factura (USD) *"
                  value={formData.precio_costo}
                  onChange={(e) => handleCostOrMarginChange('precio_costo', e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Compras con IVA"
                  value={formData.aplica_iva ? 'SI' : 'NO'}
                  onChange={(e) => handleCostOrMarginChange('aplica_iva', e.target.value === 'SI')}
                >
                  <MenuItem value="NO">NO (Exento de IVA)</MenuItem>
                  <MenuItem value="SI">SÍ (Aplica 16% IVA en compra)</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="% Utilidad de Ganancia Proyectada (%)"
                  value={formData.porcentaje_utilidad}
                  onChange={(e) => handleCostOrMarginChange('porcentaje_utilidad', e.target.value)}
                  inputProps={{ min: 0, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Precio Venta Sugerido al Paciente (USD)"
                  value={formData.precio_venta}
                  onChange={(e) => setFormData({...formData, precio_venta: e.target.value})}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Calculado dinámicamente: Costo x IVA x (1 + %Utilidad)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  disabled
                  label="Unidad de Manejo / Despacho *"
                  value={formData.unidad_manejo || 'UND'}
                  sx={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: 1,
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: '#334155',
                      fontWeight: '700'
                    }
                  }}
                  helperText="Unidad de manejo protegida (Gris sin modificación)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  disabled
                  label="Cantidad de Unidades (Por Caja) *"
                  value={`${formData.cantidad_unidades || 1} Unidades`}
                  sx={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: 1,
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: '#0f172a',
                      fontWeight: '800'
                    }
                  }}
                  helperText="Derivado automáticamente de Unidad de Compra (Gris sin modificación)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Costo Unitario por Manejo / Test ($)"
                  value={formData.costo_unitario_manejo}
                  onChange={(e) => setFormData({...formData, costo_unitario_manejo: e.target.value})}
                  inputProps={{ min: 0, step: 0.0001 }}
                  helperText="Calculado: Costo Factura / Cantidad de Unidades"
                />
              </Grid>
            </Grid>
          )}

          {/* TAB 3: Stock & Almacén */}
          {tabIndex === 3 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Stock Actual"
                  value={formData.stock_actual}
                  onChange={(e) => setFormData({...formData, stock_actual: e.target.value})}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Stock Mínimo *"
                  value={formData.stock_minimo}
                  onChange={(e) => setFormData({...formData, stock_minimo: e.target.value})}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="Stock Crítico *"
                  value={formData.stock_critico}
                  onChange={(e) => setFormData({...formData, stock_critico: e.target.value})}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Stock Máximo (2 a 3 Meses)"
                  value={formData.stock_maximo}
                  onChange={(e) => setFormData({...formData, stock_maximo: e.target.value})}
                  inputProps={{ min: 0 }}
                  helperText="Límite máximo para evitar sobre-inventario en compras"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Stock Promedio Mensual"
                  value={formData.stock_promedio}
                  onChange={(e) => setFormData({...formData, stock_promedio: e.target.value})}
                  inputProps={{ min: 0 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Unidad de Negocio (Área / Almacén)"
                  value={formData.unidad_negocio}
                  onChange={(e) => setFormData({...formData, unidad_negocio: e.target.value})}
                >
                  <MenuItem value="ALM-RESGUARDO">ALM-RESGUARDO</MenuItem>
                  <MenuItem value="ALM-PRINCIPAL">ALM-PRINCIPAL</MenuItem>
                  <MenuItem value="ALM-LABORATORIO CLINICO">ALM-LABORATORIO CLÍNICO</MenuItem>
                  <MenuItem value="ALM-ANATOMIA PATOLOGICA">ALM-ANATOMÍA PATOLÓGICA</MenuItem>
                  <MenuItem value="ALM-MOLECULAR">ALM-MOLECULAR</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ubicación Física Específica"
                  placeholder="Ej: Nevera 1 - Nivel 2 / Estante A-4"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Proveedor Sugerido"
                  value={formData.proveedor}
                  onChange={(e) => setFormData({...formData, proveedor: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Fecha de Vencimiento"
                  InputLabelProps={{ shrink: true }}
                  value={formData.fecha_vencimiento}
                  onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})}
                />
              </Grid>
            </Grid>
          )}

          {/* TAB 4: Equipos & Mermas (Jerarquía de Cajas / Frascos / mL) */}
          {tabIndex === 4 && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Equipo Autoanalizador Asociado"
                  placeholder="Ej: Mindray BC-5380, Architect C4000, Maglumi CL900i"
                  value={formData.equipo_asociado}
                  onChange={(e) => setFormData({...formData, equipo_asociado: e.target.value})}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Consumo Indicado por Fabricante (mL/test) *"
                  value={formData.consumo_indicado}
                  onChange={(e) => {
                    const cInd = parseFloat(e.target.value) || 0;
                    const vFras = parseFloat(formData.volumen_por_frasco_ml) || 100;
                    const fCaja = parseFloat(formData.frascos_por_caja) || 1;
                    const pFras = cInd > 0 ? Math.floor(vFras / cInd) : formData.unidad_test;
                    setFormData({
                      ...formData,
                      consumo_indicado: e.target.value,
                      pruebas_teoricas_frasco: pFras,
                      pruebas_teoricas_caja: pFras * fCaja
                    });
                  }}
                  inputProps={{ min: 0, step: 0.001 }}
                  helperText="Dosis por prueba según inserto comercial (ej: 0.36 mL)"
                />
              </Grid>

              {/* 📦 JERARQUÍA DE EMBALAJE Y CONTENIDO */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Frascos / Viales por Caja *"
                  value={formData.frascos_por_caja}
                  onChange={(e) => {
                    const fCaja = parseFloat(e.target.value) || 1;
                    const pFras = parseInt(formData.pruebas_teoricas_frasco) || 0;
                    setFormData({
                      ...formData,
                      frascos_por_caja: e.target.value,
                      pruebas_teoricas_caja: pFras * fCaja
                    });
                  }}
                  inputProps={{ min: 1, step: 1 }}
                  helperText="Cantidad de frascos contenidos en 1 caja (ej: 6)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Volumen por Frasco (mL) *"
                  value={formData.volumen_por_frasco_ml}
                  onChange={(e) => {
                    const vFras = parseFloat(e.target.value) || 100;
                    const cInd = parseFloat(formData.consumo_indicado) || 0;
                    const fCaja = parseFloat(formData.frascos_por_caja) || 1;
                    const pFras = cInd > 0 ? Math.floor(vFras / cInd) : formData.unidad_test;
                    setFormData({
                      ...formData,
                      volumen_por_frasco_ml: e.target.value,
                      pruebas_teoricas_frasco: pFras,
                      pruebas_teoricas_caja: pFras * fCaja
                    });
                  }}
                  inputProps={{ min: 1, step: 0.1 }}
                  helperText="Contenido neto por frasco (ej: 100 mL)"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Volumen Muerto Residual (mL)"
                  value={formData.volumen_muerto_frasco_ml}
                  onChange={(e) => setFormData({...formData, volumen_muerto_frasco_ml: e.target.value})}
                  inputProps={{ min: 0, step: 0.1 }}
                  helperText="Volumen residual no aspirable al fondo del frasco"
                />
              </Grid>

              {/* 🧪 RENDIMIENTO TEÓRICO */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Pruebas Teóricas por Frasco"
                  value={formData.pruebas_teoricas_frasco}
                  onChange={(e) => setFormData({...formData, pruebas_teoricas_frasco: e.target.value})}
                  helperText="Pruebas estimadas por 1 frasco (Volumen / Dosis Inserto)"
                  sx={{ backgroundColor: '#f8fafc' }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Pruebas Teóricas por Caja Completa"
                  value={formData.pruebas_teoricas_caja}
                  onChange={(e) => setFormData({...formData, pruebas_teoricas_caja: e.target.value})}
                  helperText="Pruebas totales proyectadas por 1 Caja"
                  sx={{ backgroundColor: '#f0fdf4' }}
                />
              </Grid>

              <Grid item xs={12}>
                <Alert severity="info" icon={false} sx={{ border: '1px solid #bfdbfe', backgroundColor: '#eff6ff' }}>
                  <Typography variant="subtitle2" fontWeight="700" color="#1e40af">
                    📊 Resumen de Conversión Jerárquica del Producto:
                  </Typography>
                  <Typography variant="body2" color="#1e3a8a">
                    • <b>1 CAJA</b> contiene <b>{formData.frascos_por_caja || 1} Frascos</b> ({((parseFloat(formData.frascos_por_caja) || 1) * (parseFloat(formData.volumen_por_frasco_ml) || 100)).toFixed(0)} mL totales).
                    <br />
                    • Rendimiento Teórico por Caja: <b>~{formData.pruebas_teoricas_caja || 0} Pruebas</b> (calculado a {formData.consumo_indicado || 0} mL/test).
                  </Typography>
                </Alert>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Consumo Real Registrado en Equipo (mL/test)"
                  value={formData.consumo_real}
                  onChange={(e) => setFormData({...formData, consumo_real: e.target.value})}
                  inputProps={{ min: 0, step: 0.001 }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Desviación de Consumo / Merma (+/- %)"
                  value={formData.desviacion_consumo}
                  onChange={(e) => setFormData({...formData, desviacion_consumo: e.target.value})}
                  inputProps={{ step: 0.1 }}
                  helperText="Cálculo de merma de reactivo por purgas o calibraciones"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, backgroundColor: '#f8fafc' }}>
          <Button onClick={onClose} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained" sx={{ backgroundColor: '#0f766e', px: 3, fontWeight: '700' }}>
            {editingItem ? 'Actualizar Ficha' : 'Guardar Ficha de Producto'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default Inventory;