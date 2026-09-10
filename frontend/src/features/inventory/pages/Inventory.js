import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Grid, MenuItem, Card, CardContent,
  IconButton, Chip, Alert, Snackbar, CircularProgress, InputAdornment, Divider,
  TablePagination
} from '@mui/material';
import {
  Add as PlusIcon,
  Search as SearchIcon,
  Visibility as EyeIcon,
  Edit as EditIcon,
  Delete as TrashIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Biotech as BiotechIcon,
  CheckCircle as CheckIcon,
  Assignment as DocumentIcon,
  Inventory as PackageIcon
} from '@mui/icons-material';

import ProductMasterForm from '../components/ProductMasterForm';
import ProductMasterSheet from '../components/ProductMasterSheet';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const getItemCategory = (item) => {
  if (!item) return 'Reactivo';
  const name = (item.nombre || '').toLowerCase();
  const cat = (item.categoria || '').toLowerCase();
  const grp = (item.grupo || '').toLowerCase();
  const desc = (item.descripcion || '').toLowerCase();

  if (cat.includes('calib') || grp.includes('calib') || desc.includes('calib') || name.includes('calibrator') || name.includes('calibrador')) {
    return 'Calibrador';
  }
  if (cat.includes('control') || grp.includes('control') || desc.includes('control') || name.includes('control')) {
    return 'Control';
  }
  if (cat.includes('soluc') || cat.includes('solut') || name.includes('solution') || name.includes('solucion') || name.includes('wash') || name.includes('cleaner') || name.includes('detergent')) {
    return 'Solucion';
  }
  if (cat.includes('consum') || grp.includes('consum') || name.includes('consumable') || name.includes('consumible')) {
    return 'Consumible';
  }
  return 'Reactivo';
};

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  
  // Modos de vista: 'list' | 'create' | 'edit' | 'view'
  const [viewMode, setViewMode] = useState('list');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadItems();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const loadItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/inventory`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      } else {
        showSnackbar('Error al cargar las fichas de productos', 'error');
      }
    } catch (error) {
      console.error('Error cargando inventario:', error);
      showSnackbar('Error de conexión con el servidor backend', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedProduct(null);
    setViewMode('create');
  };

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setViewMode('edit');
  };

  const handleViewSheet = (product) => {
    setSelectedProduct(product);
    setViewMode('view');
  };

  const handleDelete = async (id, nombre) => {
    if (!window.confirm(`¿Está seguro de eliminar la ficha del producto "${nombre}"?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showSnackbar('Ficha de producto eliminada exitosamente');
        if (selectedProduct?.id === id) setViewMode('list');
        loadItems();
      } else {
        showSnackbar('No se pudo eliminar el producto', 'error');
      }
    } catch (error) {
      console.error('Error eliminando item:', error);
      showSnackbar('Error en la comunicación con el servidor', 'error');
    }
  };

  const handleSubmitForm = async (formData) => {
    try {
      setIsSubmitting(true);
      const targetId = formData.id || selectedProduct?.id;
      const isEdit = Boolean(targetId) || viewMode === 'edit';
      const url = isEdit && targetId
        ? `${API_BASE_URL}/inventory/${targetId}`
        : `${API_BASE_URL}/inventory`;
      
      const method = isEdit && targetId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const result = await res.json();
        showSnackbar(isEdit ? 'Ficha actualizada correctamente' : 'Ficha de producto creada exitosamente');
        
        await loadItems();

        // Pasar inmediatamente a mostrar la Ficha Técnica Certificada (Datasheet PDF)
        const savedProduct = result.item || { ...formData, id: result.id || selectedProduct?.id };
        setSelectedProduct(savedProduct);
        setViewMode('view');
      } else {
        const errorData = await res.json();
        showSnackbar(errorData.error || 'Error al guardar la ficha del producto', 'error');
      }
    } catch (error) {
      console.error('Error guardando ficha:', error);
      showSnackbar('Error de conexión con el servidor', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrado de productos con clasificación inteligente multilingüe y por analizador
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch = !term ||
        (item.nombre && item.nombre.toLowerCase().includes(term)) ||
        (item.codigo && item.codigo.toLowerCase().includes(term)) ||
        (item.marca && item.marca.toLowerCase().includes(term)) ||
        (item.referencia_abreviada && item.referencia_abreviada.toLowerCase().includes(term)) ||
        (item.equipo_asociado && item.equipo_asociado.toLowerCase().includes(term));

      const detectedCat = getItemCategory(item);
      const matchesCategory = categoryFilter === 'all' || detectedCat === categoryFilter;

      const eq = (item.equipo_asociado || '').toLowerCase();
      let matchesEquipment = true;
      if (equipmentFilter === 'Mindray BS-230') {
        matchesEquipment = eq.includes('bs-230') || eq.includes('bs 230') || eq.includes('mindray');
      } else if (equipmentFilter === 'CM 260i') {
        matchesEquipment = eq.includes('cm 260') || eq.includes('cm260') || eq.includes('wiener');
      }

      return matchesSearch && matchesCategory && matchesEquipment;
    });
  }, [items, searchTerm, categoryFilter, equipmentFilter]);

  // Paginación: 10, 20, 50, 100 o Todos (-1)
  const paginatedItems = useMemo(() => {
    if (rowsPerPage === -1) return filteredItems;
    const startIndex = page * rowsPerPage;
    return filteredItems.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredItems, page, rowsPerPage]);

  // Contadores analíticos para filtros rápidos
  const counts = useMemo(() => {
    const total = items.length;
    const bs = items.filter(i => {
      const eq = (i.equipo_asociado || '').toLowerCase();
      return eq.includes('bs-230') || eq.includes('bs 230') || eq.includes('mindray');
    }).length;
    const cm = items.filter(i => {
      const eq = (i.equipo_asociado || '').toLowerCase();
      return eq.includes('cm 260') || eq.includes('cm260') || eq.includes('wiener');
    }).length;
    const reactivos = items.filter(i => getItemCategory(i) === 'Reactivo').length;
    const calibradores = items.filter(i => getItemCategory(i) === 'Calibrador').length;
    const controles = items.filter(i => getItemCategory(i) === 'Control').length;
    return { total, bs, cm, reactivos, calibradores, controles };
  }, [items]);

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      
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

      {/* RENDER VISTAS SEGÚN MODO */}
      {viewMode === 'create' || viewMode === 'edit' ? (
        <ProductMasterForm
          initialData={selectedProduct}
          onSubmit={handleSubmitForm}
          onCancel={() => setViewMode(selectedProduct ? 'view' : 'list')}
          isSubmitting={isSubmitting}
        />
      ) : viewMode === 'view' ? (
        <ProductMasterSheet
          product={selectedProduct}
          onEdit={() => setViewMode('edit')}
          onClose={() => setViewMode('list')}
        />
      ) : (
        /* VISTA PRINCIPAL: CATÁLOGO DE TARJETAS DE FICHAS MAESTRAS DE PRODUCTO */
        <Box space={3}>
          
          {/* Header Superior con Gradiente de Alta Gama */}
          <Paper
            elevation={6}
            sx={{
              p: 4,
              mb: 4,
              borderRadius: 4,
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)',
              color: 'white',
              borderBottom: '4px solid #2563eb'
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(59, 130, 246, 0.25)', borderRadius: 3, border: '1px solid rgba(147, 197, 253, 0.3)' }}>
                  <BiotechIcon sx={{ fontSize: 40, color: '#93c5fd' }} />
                </Box>
                <Box>
                  <Typography variant="overline" sx={{ letterSpacing: 2, color: '#93c5fd', fontWeight: 800 }}>
                    CONTROLAB IA • MÓDULO DE FICHAS MAESTRAS
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>
                    Catálogo Oficial de Fichas de Producto
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5 }}>
                    Información permanente, parámetros de laboratorio y certificados datasheets (Controlab IA)
                  </Typography>
                </Box>
              </Box>

              <Box display="flex" gap={2}>
                <IconButton
                  onClick={loadItems}
                  sx={{ color: '#cbd5e1', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                  title="Actualizar catálogo"
                >
                  <RefreshIcon />
                </IconButton>

                <Button
                  variant="contained"
                  onClick={handleCreateNew}
                  startIcon={<PlusIcon />}
                  sx={{
                    bgcolor: '#2563eb',
                    '&:hover': { bgcolor: '#1d4ed8' },
                    borderRadius: 3,
                    px: 3,
                    py: 1.2,
                    fontWeight: 800,
                    boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)'
                  }}
                >
                  Nueva Ficha de Producto
                </Button>
              </Box>
            </Box>
          </Paper>

          {/* Filtros, Búsqueda y Selector de Paginación */}
          <Paper elevation={2} sx={{ p: 2.5, mb: 3, borderRadius: 3, bgcolor: 'white' }}>
            <Grid container spacing={2} alignItems="center">
              {/* Barra de Búsqueda */}
              <Grid item xs={12} md={3.5}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Buscar código, reactivo, marca..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(0);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              {/* Filtro por Equipo / Analizador */}
              <Grid item xs={12} sm={4} md={2.5}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Analizador / Equipo"
                  value={equipmentFilter}
                  onChange={(e) => {
                    setEquipmentFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <MenuItem value="all">Todos los Equipos ({counts.total})</MenuItem>
                  <MenuItem value="Mindray BS-230">Mindray BS-230 ({counts.bs})</MenuItem>
                  <MenuItem value="CM 260i">Wiener Lab CM 260i ({counts.cm})</MenuItem>
                </TextField>
              </Grid>

              {/* Filtro por Categoría */}
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Categoría de Producto"
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setPage(0);
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <FilterIcon color="action" />
                      </InputAdornment>
                    ),
                  }}
                >
                  <MenuItem value="all">Todas las Categorías</MenuItem>
                  <MenuItem value="Reactivo">Reactivos ({counts.reactivos})</MenuItem>
                  <MenuItem value="Calibrador">Calibradores ({counts.calibradores})</MenuItem>
                  <MenuItem value="Control">Controles de Calidad ({counts.controles})</MenuItem>
                  <MenuItem value="Solucion">Soluciones</MenuItem>
                  <MenuItem value="Consumible">Consumibles</MenuItem>
                </TextField>
              </Grid>

              {/* Selector de Cantidad en Pantalla (10 - 20 - 50 - 100 - Todos) */}
              <Grid item xs={12} sm={4} md={3}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Mostrar en Pantalla"
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(0);
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontWeight: 700,
                      bgcolor: '#f8fafc'
                    }
                  }}
                >
                  <MenuItem value={10} sx={{ fontWeight: 600 }}>10 fichas por página</MenuItem>
                  <MenuItem value={20} sx={{ fontWeight: 600 }}>20 fichas por página</MenuItem>
                  <MenuItem value={50} sx={{ fontWeight: 600 }}>50 fichas por página</MenuItem>
                  <MenuItem value={100} sx={{ fontWeight: 600 }}>100 fichas por página</MenuItem>
                  <MenuItem value={-1} sx={{ fontWeight: 800, color: '#1e40af' }}>
                    Ver Todos ({filteredItems.length} fichas)
                  </MenuItem>
                </TextField>
              </Grid>
            </Grid>

            {/* Chips de Acceso Rápido por Analizador y Categoría */}
            <Box display="flex" flexWrap="wrap" gap={1} mt={2} pt={1.5} borderTop="1px solid #f1f5f9">
              <Chip
                label={`Todos (${counts.total})`}
                size="small"
                onClick={() => {
                  setEquipmentFilter('all');
                  setCategoryFilter('all');
                  setPage(0);
                }}
                color={equipmentFilter === 'all' && categoryFilter === 'all' ? 'primary' : 'default'}
                variant={equipmentFilter === 'all' && categoryFilter === 'all' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, cursor: 'pointer' }}
              />
              <Chip
                label={`Mindray BS-230 (${counts.bs})`}
                size="small"
                onClick={() => {
                  setEquipmentFilter(equipmentFilter === 'Mindray BS-230' ? 'all' : 'Mindray BS-230');
                  setPage(0);
                }}
                color={equipmentFilter === 'Mindray BS-230' ? 'primary' : 'default'}
                variant={equipmentFilter === 'Mindray BS-230' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, cursor: 'pointer' }}
              />
              <Chip
                label={`Wiener CM 260i (${counts.cm})`}
                size="small"
                onClick={() => {
                  setEquipmentFilter(equipmentFilter === 'CM 260i' ? 'all' : 'CM 260i');
                  setPage(0);
                }}
                color={equipmentFilter === 'CM 260i' ? 'primary' : 'default'}
                variant={equipmentFilter === 'CM 260i' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, cursor: 'pointer' }}
              />
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Chip
                label={`Reactivos (${counts.reactivos})`}
                size="small"
                onClick={() => {
                  setCategoryFilter(categoryFilter === 'Reactivo' ? 'all' : 'Reactivo');
                  setPage(0);
                }}
                color={categoryFilter === 'Reactivo' ? 'success' : 'default'}
                variant={categoryFilter === 'Reactivo' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, cursor: 'pointer' }}
              />
              <Chip
                label={`Calibradores (${counts.calibradores})`}
                size="small"
                onClick={() => {
                  setCategoryFilter(categoryFilter === 'Calibrador' ? 'all' : 'Calibrador');
                  setPage(0);
                }}
                color={categoryFilter === 'Calibrador' ? 'secondary' : 'default'}
                variant={categoryFilter === 'Calibrador' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, cursor: 'pointer' }}
              />
              <Chip
                label={`Controles (${counts.controles})`}
                size="small"
                onClick={() => {
                  setCategoryFilter(categoryFilter === 'Control' ? 'all' : 'Control');
                  setPage(0);
                }}
                color={categoryFilter === 'Control' ? 'info' : 'default'}
                variant={categoryFilter === 'Control' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 700, cursor: 'pointer' }}
              />
            </Box>
          </Paper>

          {/* BARRA SUPERIOR DE PAGINACIÓN */}
          {!loading && filteredItems.length > 0 && (
            <Paper
              elevation={1}
              sx={{
                p: 1,
                px: 2.5,
                mb: 3,
                borderRadius: 3,
                bgcolor: 'white',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
              }}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#334155' }}>
                  Mostrando fichas:
                </Typography>
                <Chip
                  label={`${page * (rowsPerPage > 0 ? rowsPerPage : filteredItems.length) + 1} – ${rowsPerPage > 0 ? Math.min((page + 1) * rowsPerPage, filteredItems.length) : filteredItems.length} de ${filteredItems.length}`}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    bgcolor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe'
                  }}
                />
                {(searchTerm || categoryFilter !== 'all' || equipmentFilter !== 'all') && (
                  <Button
                    size="small"
                    onClick={() => {
                      setSearchTerm('');
                      setCategoryFilter('all');
                      setEquipmentFilter('all');
                      setPage(0);
                    }}
                    sx={{ textTransform: 'none', fontSize: 12, fontWeight: 700, color: '#dc2626' }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </Box>

              <TablePagination
                rowsPerPageOptions={[10, 20, 50, 100, { label: 'Todos', value: -1 }]}
                component="div"
                count={filteredItems.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
                labelRowsPerPage="Mostrar por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`}
                sx={{
                  border: 'none',
                  '.MuiTablePagination-toolbar': { minHeight: 40, p: 0 },
                  '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                    fontWeight: 700,
                    color: '#475569',
                    fontSize: 13
                  },
                  '.MuiTablePagination-select': {
                    fontWeight: 800,
                    color: '#1e40af'
                  }
                }}
              />
            </Paper>
          )}

          {/* GALERÍA / GRID EJECUTIVA DE FICHAS DE PRODUCTOS */}
          {loading ? (
            <Box textAlign="center" py={8} bgcolor="white" borderRadius={4} border="1px solid #e2e8f0">
              <CircularProgress size={44} sx={{ color: '#2563eb', mb: 2 }} />
              <Typography variant="subtitle1" fontWeight={700} color="textSecondary">
                Cargando catálogo de fichas de producto...
              </Typography>
            </Box>
          ) : filteredItems.length === 0 ? (
            <Paper elevation={1} sx={{ p: 8, textAlign: 'center', borderRadius: 4, bgcolor: 'white' }}>
              <PackageIcon sx={{ fontSize: 60, color: '#cbd5e1', mb: 2 }} />
              <Typography variant="h6" fontWeight={800} color="#1e293b">
                No hay fichas registradas en el sistema
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, mb: 3 }}>
                Haz clic en "Nueva Ficha de Producto" para registrar el primer ítem en 2 sencillos pasos.
              </Typography>
              <Button
                variant="contained"
                onClick={handleCreateNew}
                sx={{ bgcolor: '#2563eb', borderRadius: 2, fontWeight: 700, px: 3 }}
              >
                Crear Primera Ficha
              </Button>
            </Paper>
          ) : (
            <>
              <Grid container spacing={3}>
              {paginatedItems.map((product) => (
                <Grid item xs={12} sm={6} md={4} key={product.id}>
                  <Card
                    elevation={3}
                    onClick={() => handleViewSheet(product)}
                    sx={{
                      borderRadius: 3,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: '1px solid #e2e8f0',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                        borderColor: '#2563eb'
                      }
                    }}
                  >
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                        <Chip
                          label={product.codigo}
                          size="small"
                          sx={{ fontFamily: 'monospace', fontWeight: 800, bgcolor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }}
                        />
                        {(() => {
                          const itemCat = getItemCategory(product);
                          const chipConfig = {
                            'Calibrador': { label: 'Calibrador', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                            'Control': { label: 'Control de Calidad', color: '#7e22ce', bg: '#faf5ff', border: '#e9d5ff' },
                            'Solucion': { label: 'Solución', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
                            'Consumible': { label: 'Consumible', color: '#d97706', bg: '#fffbeb', border: '#fef3c7' },
                            'Reactivo': { label: 'Reactivo', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' }
                          };
                          const chipProps = chipConfig[itemCat] || chipConfig['Reactivo'];
                          return (
                            <Chip
                              label={chipProps.label}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: 10,
                                color: chipProps.color,
                                bgcolor: chipProps.bg,
                                border: `1px solid ${chipProps.border}`
                              }}
                            />
                          );
                        })()}
                      </Box>

                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5, fontSize: 16 }}>
                        {product.nombre}
                      </Typography>
                      {product.referencia_abreviada && (
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1 }}>
                          Ref: {product.referencia_abreviada}
                        </Typography>
                      )}

                      <Divider sx={{ my: 1.5 }} />

                      <Box space={1} sx={{ fontSize: 12, color: '#475569' }}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="caption" color="textSecondary" fontWeight={600}>Marca:</Typography>
                          <Typography variant="caption" fontWeight={700}>{product.marca || '-'}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="caption" color="textSecondary" fontWeight={600}>Autoanalizador:</Typography>
                          <Typography variant="caption" fontWeight={700} color="indigo">{product.equipo_asociado || 'No asignado'}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Typography variant="caption" color="textSecondary" fontWeight={600}>Presentación:</Typography>
                          <Typography variant="caption" fontWeight={700}>{product.presentacion || `${product.unidad || 'Frasco'} (${product.frascos_por_caja || 1} x caja)`}</Typography>
                        </Box>
                        {product.pruebas_teoricas_caja && (
                          <Box display="flex" justifyContent="space-between">
                            <Typography variant="caption" color="textSecondary" fontWeight={600}>Rendimiento Caja:</Typography>
                            <Typography variant="caption" fontWeight={800} color="success.main">{product.pruebas_teoricas_caja} Pruebas Totales</Typography>
                          </Box>
                        )}
                      </Box>

                      <Divider sx={{ my: 1.5 }} />

                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box display="flex" alignItems="center" gap={0.5} color="#2563eb">
                          <DocumentIcon fontSize="small" />
                          <Typography variant="caption" fontWeight={800}>
                            Ver Ficha Oficial (PDF)
                          </Typography>
                        </Box>

                        <Box display="flex" onClick={(e) => e.stopPropagation()}>
                          <IconButton size="small" onClick={() => handleEdit(product)} color="primary">
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDelete(product.id, product.nombre)} color="error">
                            <TrashIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>

                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* BARRA INFERIOR DE PAGINACIÓN */}
            {!loading && filteredItems.length > 0 && (
              <Paper
                elevation={1}
                sx={{
                  p: 1,
                  px: 2.5,
                  mt: 4,
                  borderRadius: 3,
                  bgcolor: 'white',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 2
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748b' }}>
                  Total <b>{filteredItems.length}</b> fichas de producto encontradas
                </Typography>

                <TablePagination
                  rowsPerPageOptions={[10, 20, 50, 100, { label: 'Todos', value: -1 }]}
                  component="div"
                  count={filteredItems.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(e, newPage) => {
                    setPage(newPage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(parseInt(e.target.value, 10));
                    setPage(0);
                  }}
                  labelRowsPerPage="Mostrar por página:"
                  labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`}
                  sx={{
                    border: 'none',
                    '.MuiTablePagination-toolbar': { minHeight: 40, p: 0 },
                    '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                      fontWeight: 700,
                      color: '#475569',
                      fontSize: 13
                    },
                    '.MuiTablePagination-select': {
                      fontWeight: 800,
                      color: '#1e40af'
                    }
                  }}
                />
              </Paper>
            )}
            </>
          )}

        </Box>
      )}

    </Box>
  );
};

export default Inventory;