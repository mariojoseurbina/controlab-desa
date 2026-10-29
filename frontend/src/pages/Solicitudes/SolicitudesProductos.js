import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, IconButton, Tooltip, TextField, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem,
  Autocomplete, CircularProgress, Card, CardContent, Alert,
  InputAdornment, Fab, Fade, Skeleton, Divider, Badge,
  List, ListItem, ListItemText, ListItemSecondaryAction, Collapse
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  CheckCircle as ApproveIcon,
  LocalShipping as DeliverIcon,
  Cancel as RejectIcon,
  Refresh as RefreshIcon,
  Inventory as InventoryIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Assignment as AssignmentIcon,
  MoveToInbox as InboxIcon,
  Store as WarehouseIcon,
  ListAlt as ListAltIcon,
  Print as PrintIcon,
  Visibility as ViewIcon,
  ArrowForward as NextIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

// ─── Constantes ────────────────────────────────────────
const PRIORIDAD_COLORS = {
  Alta:  { bg: '#FEE2E2', color: '#DC2626', border: '#DC262640', label: '🔴 Alta' },
  Media: { bg: '#FEF3C7', color: '#D97706', border: '#D9770640', label: '🟡 Media' },
  Baja:  { bg: '#DCFCE7', color: '#16A34A', border: '#16A34A40', label: '🟢 Baja' },
};

const ESTADO_CONFIG = {
  Pendiente:    { color: 'warning',  icon: '⏳', label: 'Pendiente',    next: ['Aprobada', 'Rechazada'] },
  Aprobada:     { color: 'info',     icon: '✅', label: 'Aprobada',     next: ['En Despacho', 'Rechazada'] },
  'En Despacho':{ color: 'primary',  icon: '🚚', label: 'En Despacho',  next: ['Entregada'] },
  Entregada:    { color: 'success',  icon: '📦', label: 'Entregada',    next: [] },
  Rechazada:    { color: 'error',    icon: '❌', label: 'Rechazada',    next: [] },
};

const AREAS = [
  'Laboratorio', 'Hematología', 'Bioquímica', 'Inmunología',
  'Uroanálisis', 'Banco de Sangre', 'Microbiología', 'Administración',
  'Emergencias', 'UCI', 'Hospitalización', 'Consulta Externa'
];

// ─── Componente: Fila expandible ─────────────────────────
function FilaPedido({ pedido, onEstado, onVerDetalle }) {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const p = PRIORIDAD_COLORS[pedido.prioridad] || PRIORIDAD_COLORS.Media;
  const e = ESTADO_CONFIG[pedido.estado] || ESTADO_CONFIG.Pendiente;

  const cargarItems = async () => {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (items.length > 0) return;
    setLoadingItems(true);
    try {
      const { data } = await api.get(`/solicitudes/${pedido.id}`);
      if (data.success) setItems(data.items);
    } catch (_) {}
    setLoadingItems(false);
  };

  return (
    <>
      <TableRow
        sx={{
          '&:hover': { bgcolor: '#f9fafb' },
          transition: 'background 0.15s',
          borderLeft: expanded ? '3px solid #6366f1' : '3px solid transparent',
        }}
      >
        {/* Número */}
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton size="small" onClick={cargarItems} sx={{ color: '#6366f1' }}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#1e293b', fontFamily: 'monospace' }}>
                {pedido.numero_pedido}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {pedido.total_items} ítem{pedido.total_items !== 1 ? 's' : ''}
              </Typography>
            </Box>
          </Box>
        </TableCell>

        {/* Solicitante */}
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{pedido.solicitante_nombre}</Typography>
          <Typography variant="caption" color="text.secondary">{pedido.area_solicitante}</Typography>
        </TableCell>

        {/* Fecha */}
        <TableCell>
          <Typography variant="caption">
            {pedido.fecha_solicitud ? new Date(pedido.fecha_solicitud).toLocaleDateString('es-VE', {
              day: '2-digit', month: 'short', year: 'numeric'
            }) : '-'}
          </Typography>
        </TableCell>

        {/* Prioridad */}
        <TableCell>
          <Chip
            size="small"
            label={p.label}
            sx={{ bgcolor: p.bg, color: p.color, fontWeight: 700, fontSize: '0.7rem', border: `1px solid ${p.border}` }}
          />
        </TableCell>

        {/* Estado */}
        <TableCell>
          <Chip
            size="small"
            label={`${e.icon} ${e.label}`}
            color={e.color}
            sx={{ fontWeight: 700, fontSize: '0.72rem' }}
          />
        </TableCell>

        {/* Acciones */}
        <TableCell>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="Ver detalle">
              <IconButton size="small" onClick={() => onVerDetalle(pedido)} sx={{ color: '#6366f1' }}>
                <ViewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {e.next.map(nuevoEstado => (
              <Tooltip key={nuevoEstado} title={nuevoEstado}>
                <IconButton
                  size="small"
                  onClick={() => onEstado(pedido.id, nuevoEstado)}
                  color={
                    nuevoEstado === 'Rechazada' ? 'error' :
                    nuevoEstado === 'Entregada' ? 'success' :
                    nuevoEstado === 'Aprobada' ? 'primary' : 'default'
                  }
                >
                  {nuevoEstado === 'Aprobada'     && <ApproveIcon fontSize="small" />}
                  {nuevoEstado === 'En Despacho'  && <InboxIcon fontSize="small" />}
                  {nuevoEstado === 'Entregada'    && <DeliverIcon fontSize="small" />}
                  {nuevoEstado === 'Rechazada'    && <RejectIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        </TableCell>
      </TableRow>

      {/* Fila expandida con ítems */}
      <TableRow>
        <TableCell colSpan={6} sx={{ p: 0, border: expanded ? undefined : 'none' }}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ bgcolor: '#f8fafc', px: 4, py: 2, borderBottom: '1px solid #e5e7eb' }}>
              {loadingItems ? (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <CircularProgress size={16} />
                  <Typography variant="caption" color="text.secondary">Cargando ítems...</Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {['Código', 'Producto', 'Cant. Solicitada', 'Stock Disponible', 'Unidad', 'Vencimiento', 'Estado Ítem'].map(h => (
                        <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: '#6b7280', bgcolor: 'transparent', border: 'none' }}>
                          {h}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map(item => (
                      <TableRow key={item.id} sx={{ '&:hover': { bgcolor: '#eef2ff' } }}>
                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#6b7280' }}>{item.codigo_item || '-'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{item.nombre_item}</Typography>
                          {item.observacion_item && (
                            <Typography variant="caption" color="text.secondary">💬 {item.observacion_item}</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#6366f1' }}>
                            {Number(item.cantidad_solicitada)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.stock_actual != null ? Number(item.stock_actual).toFixed(0) : 'N/A'}
                            color={item.stock_actual > 10 ? 'success' : item.stock_actual > 0 ? 'warning' : 'error'}
                            variant="outlined"
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell><Typography variant="caption">{item.unidad}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {item.fecha_vencimiento ? new Date(item.fecha_vencimiento).toLocaleDateString('es-VE') : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={item.estado_item || 'Pendiente'}
                            color={item.estado_item === 'Entregado' ? 'success' : 'warning'}
                            sx={{ fontWeight: 600, fontSize: '0.68rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {pedido.observaciones && (
                <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2, py: 0.5, fontSize: '0.78rem' }}>
                  <b>Observaciones:</b> {pedido.observaciones}
                </Alert>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

// ─── Componente principal ───────────────────────────────
export default function SolicitudesProductos() {
  const { enqueueSnackbar } = useSnackbar();

  // ── Estado general ──
  const [solicitudes, setSolicitudes]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [busqueda, setBusqueda]         = useState('');
  const [stats, setStats]               = useState({ pendientes: 0, aprobadas: 0, en_despacho: 0, entregadas: 0, rechazadas: 0, total: 0 });

  // ── Catálogo Almacén Central (Para realizar solicitudes) ──
  const [tabActual, setTabActual]                       = useState(0); // 0: Catálogo Central, 1: Historial Solicitudes
  const [catalogoCentral, setCatalogoCentral]           = useState([]);
  const [loadingCentral, setLoadingCentral]             = useState(false);
  const [busquedaCentral, setBusquedaCentral]           = useState('');
  const [filtroCategoriaCentral, setFiltroCategoriaCentral] = useState('Todas');

  // ── Dialogo nuevo pedido ──
  const [openDialog, setOpenDialog]             = useState(false);
  const [productoBusqueda, setProductoBusqueda] = useState('');
  const [productosEncontrados, setProductosEncontrados] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const [buscandoProductos, setBuscandoProductos]       = useState(false);
  const [carrito, setCarrito]                           = useState([]);   // ítems del pedido
  const [cantidadItem, setCantidadItem]                 = useState('');
  const [obsItem, setObsItem]                           = useState('');
  const [formPedido, setFormPedido]                     = useState({
    solicitante_nombre: '',
    area_solicitante: '',
    prioridad: 'Media',
    observaciones: '',
  });

  // ── Dialogo detalle ──
  const [pedidoDetalle, setPedidoDetalle]   = useState(null);
  const [itemsDetalle, setItemsDetalle]     = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // ── Carga de datos ──
  const cargarSolicitudes = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/solicitudes');
      if (data.success) setSolicitudes(data.solicitudes);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'desconocido';
      console.error('Error cargando solicitudes:', err?.response?.data || err);
      enqueueSnackbar(`Error cargando solicitudes: ${msg}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const cargarStats = useCallback(async () => {
    try {
      const { data } = await api.get('/solicitudes/stats');
      if (data.success) setStats(data.stats);
    } catch (_) {}
  }, []);

  useEffect(() => {
    cargarSolicitudes();
    cargarStats();
  }, [cargarSolicitudes, cargarStats]);

  // ── Búsqueda de productos (debounce 300ms) ──
  useEffect(() => {
    if (productoBusqueda.length < 2) { setProductosEncontrados([]); return; }
    const t = setTimeout(async () => {
      setBuscandoProductos(true);
      try {
        const { data } = await api.get('/solicitudes/productos/buscar', { params: { q: productoBusqueda } });
        if (data.success) setProductosEncontrados(data.productos);
      } catch (_) {}
      setBuscandoProductos(false);
    }, 300);
    return () => clearTimeout(t);
  }, [productoBusqueda]);

  // ── Agregar ítem al carrito ──
  const agregarAlCarrito = () => {
    if (!productoSeleccionado || !cantidadItem || Number(cantidadItem) <= 0) {
      enqueueSnackbar('Selecciona un producto e indica la cantidad', { variant: 'warning' });
      return;
    }
    const yaExiste = carrito.find(c => c.item_id === productoSeleccionado.id);
    if (yaExiste) {
      enqueueSnackbar('Este producto ya está en el pedido', { variant: 'info' });
      return;
    }
    setCarrito(prev => [...prev, {
      item_id:             productoSeleccionado.id,
      nombre_item:         productoSeleccionado.nombre,
      codigo_item:         productoSeleccionado.codigo,
      cantidad_solicitada: Number(cantidadItem),
      unidad:              productoSeleccionado.unidad || 'UND',
      stock_actual:        productoSeleccionado.stock_actual,
      observacion_item:    obsItem,
    }]);
    setProductoSeleccionado(null);
    setProductoBusqueda('');
    setCantidadItem('');
    setObsItem('');
  };

    const handleSolicitarProductoDirecto = (prod) => {
    setProductoSeleccionado(prod);
    setCantidadItem('1');
    setOpenDialog(true);
  };

  const quitarDelCarrito = (itemId) => {
    setCarrito(prev => prev.filter(c => c.item_id !== itemId));
  };

  // ── Enviar pedido ──
  const handleEnviarPedido = async () => {
    if (carrito.length === 0) {
      enqueueSnackbar('Agrega al menos un producto al pedido', { variant: 'warning' });
      return;
    }
    if (!formPedido.solicitante_nombre || !formPedido.area_solicitante) {
      enqueueSnackbar('Completa el nombre del solicitante y el área', { variant: 'warning' });
      return;
    }
    try {
      const { data } = await api.post('/solicitudes', { ...formPedido, items: carrito });
      if (data.success) {
        enqueueSnackbar(`✅ Pedido ${data.numero_pedido} creado exitosamente`, { variant: 'success' });
        cerrarDialog();
        cargarSolicitudes();
        cargarStats();
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'desconocido';
      console.error('Error enviando el pedido:', err?.response?.data || err);
      enqueueSnackbar(`Error enviando el pedido: ${msg}`, { variant: 'error' });
    }
  };

  // ── Cambiar estado ──
  const cambiarEstado = async (id, nuevoEstado) => {
    try {
      const { data } = await api.patch(`/solicitudes/${id}/estado`, {
        estado: nuevoEstado,
        atendido_por: 'Almacén Central'
      });
      if (data.success) {
        enqueueSnackbar(`Pedido marcado como: ${nuevoEstado}`, { variant: 'success' });
        cargarSolicitudes();
        cargarStats();
      }
    } catch (_) {
      enqueueSnackbar('Error actualizando estado', { variant: 'error' });
    }
  };

  // ── Ver detalle ──
  const verDetalle = async (pedido) => {
    setPedidoDetalle(pedido);
    setLoadingDetalle(true);
    try {
      const { data } = await api.get(`/solicitudes/${pedido.id}`);
      if (data.success) setItemsDetalle(data.items);
    } catch (_) {}
    setLoadingDetalle(false);
  };

  const cerrarDialog = () => {
    setOpenDialog(false);
    setCarrito([]);
    setProductoSeleccionado(null);
    setProductoBusqueda('');
    setCantidadItem('');
    setObsItem('');
    setFormPedido({ solicitante_nombre: '', area_solicitante: '', prioridad: 'Media', observaciones: '' });
  };

  // ── Filtrado ──
  const filtradas = solicitudes.filter(s => {
    const matchEstado  = filtroEstado === 'Todos' || s.estado === filtroEstado;
    const matchBusqueda = !busqueda ||
      s.numero_pedido?.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.solicitante_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      s.area_solicitante?.toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  // ══════════════════════════════════════════════════════
  return (
    <Box>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{
            fontWeight: 900,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            📋 Solicitudes Electrónicas
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Gestión de pedidos al almacén central — multi-producto por solicitud
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Actualizar">
            <IconButton onClick={() => { cargarSolicitudes(); cargarStats(); }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<CartIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: 3, px: 3, fontWeight: 700,
              boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
              '&:hover': { boxShadow: '0 6px 20px rgba(99,102,241,0.5)' }
            }}
          >
            Nueva Solicitud
          </Button>
        </Box>
      </Box>

      {/* ── Stats ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 2, mb: 3 }}>
        {[
          { label: 'Pendientes',    value: stats.pendientes,   color: '#f59e0b', emoji: '⏳' },
          { label: 'Aprobadas',     value: stats.aprobadas,    color: '#3b82f6', emoji: '✅' },
          { label: 'En Despacho',   value: stats.en_despacho,  color: '#8b5cf6', emoji: '🚚' },
          { label: 'Entregadas',    value: stats.entregadas,   color: '#10b981', emoji: '📦' },
          { label: 'Rechazadas',    value: stats.rechazadas,   color: '#ef4444', emoji: '❌' },
        ].map(stat => (
          <Card key={stat.label} elevation={0} sx={{
            borderRadius: 3,
            border: `2px solid ${stat.color}22`,
            background: `linear-gradient(135deg, ${stat.color}08, ${stat.color}04)`,
            transition: 'all 0.2s',
            cursor: 'pointer',
            '&:hover': { transform: 'translateY(-3px)', boxShadow: `0 8px 24px ${stat.color}25` }
          }}
          onClick={() => setFiltroEstado(stat.label === 'En Despacho' ? 'En Despacho' : stat.label.replace('s',''))}
          >
            <CardContent sx={{ textAlign: 'center', py: 2, px: 1 }}>
              <Typography sx={{ fontSize: '1.8rem' }}>{stat.emoji}</Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: stat.color, lineHeight: 1 }}>
                {stat.value || 0}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#6b7280' }}>{stat.label}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* ── Filtros ── */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid #e5e7eb', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Buscar por número, solicitante o área..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9ca3af' }} /></InputAdornment> }}
          sx={{ minWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {['Todos', 'Pendiente', 'Aprobada', 'En Despacho', 'Entregada', 'Rechazada'].map(est => (
            <Chip
              key={est}
              label={`${ESTADO_CONFIG[est]?.icon || '📋'} ${est}`}
              onClick={() => setFiltroEstado(est)}
              variant={filtroEstado === est ? 'filled' : 'outlined'}
              color={est === 'Todos' ? 'default' : (ESTADO_CONFIG[est]?.color || 'default')}
              sx={{ fontWeight: 600, cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Paper>

      {/* ── Tabla ── */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 3, border: '1px solid #e5e7eb' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ background: 'linear-gradient(135deg, #f8fafc, #eef2ff)' }}>
              {['Nº Pedido / Ítems', 'Solicitante / Área', 'Fecha', 'Prioridad', 'Estado', 'Acciones'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 800, color: '#374151', fontSize: '0.78rem', py: 1.5 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              [...Array(4)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(6)].map((_, j) => <TableCell key={j}><Skeleton animation="wave" /></TableCell>)}
                </TableRow>
              ))
            ) : filtradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                  <AssignmentIcon sx={{ fontSize: 56, color: '#d1d5db', mb: 1 }} />
                  <Typography color="text.secondary" variant="h6" sx={{ fontWeight: 300 }}>
                    No hay solicitudes {filtroEstado !== 'Todos' ? `con estado "${filtroEstado}"` : ''}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filtradas.map(s => (
              <FilaPedido key={s.id} pedido={s} onEstado={cambiarEstado} onVerDetalle={verDetalle} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ════════════════════════════════════════════════════════════
          DIALOG: Nueva Solicitud (carrito multi-producto)
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={openDialog} onClose={cerrarDialog} maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
        <DialogTitle sx={{
          fontWeight: 800,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: 'white',
          display: 'flex', alignItems: 'center', gap: 1.5
        }}>
          <CartIcon />
          Nueva Solicitud de Insumos
          {carrito.length > 0 && (
            <Badge badgeContent={carrito.length} color="error" sx={{ ml: 'auto' }}>
              <Chip label={`${carrito.length} ítem${carrito.length !== 1 ? 's' : ''} en pedido`}
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }} />
            </Badge>
          )}
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>

            {/* ── Sección: Datos del solicitante ── */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#374151', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                👤 Datos del Solicitante
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <TextField
                  label="Nombre del solicitante *"
                  fullWidth
                  value={formPedido.solicitante_nombre}
                  onChange={e => setFormPedido(p => ({ ...p, solicitante_nombre: e.target.value }))}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
                <TextField
                  select
                  label="Área solicitante *"
                  fullWidth
                  value={formPedido.area_solicitante}
                  onChange={e => setFormPedido(p => ({ ...p, area_solicitante: e.target.value }))}
                  InputProps={{ sx: { borderRadius: 2 } }}
                >
                  {AREAS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </TextField>
                <TextField
                  select
                  label="Prioridad"
                  value={formPedido.prioridad}
                  onChange={e => setFormPedido(p => ({ ...p, prioridad: e.target.value }))}
                  InputProps={{ sx: { borderRadius: 2 } }}
                >
                  <MenuItem value="Alta">🔴 Alta — Urgente</MenuItem>
                  <MenuItem value="Media">🟡 Media — Normal</MenuItem>
                  <MenuItem value="Baja">🟢 Baja — Sin urgencia</MenuItem>
                </TextField>
                <TextField
                  label="Observaciones generales"
                  value={formPedido.observaciones}
                  onChange={e => setFormPedido(p => ({ ...p, observaciones: e.target.value }))}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />
              </Box>
            </Box>

            <Divider />

            {/* ── Sección: Agregar productos ── */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#374151', mb: 1.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                🔍 Agregar Insumos al Pedido
              </Typography>

              <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                {/* Autocomplete de búsqueda */}
                <Box sx={{ flex: 2, minWidth: 260 }}>
                  <Autocomplete
                    options={productosEncontrados}
                    getOptionLabel={opt => `${opt.nombre} (${opt.codigo || ''})`}
                    loading={buscandoProductos}
                    value={productoSeleccionado}
                    onInputChange={(_, val) => setProductoBusqueda(val)}
                    onChange={(_, val) => setProductoSeleccionado(val)}
                    renderOption={(props, opt) => (
                      <Box component="li" {...props} sx={{ flexDirection: 'column', alignItems: 'flex-start !important', py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{opt.nombre}</Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Typography variant="caption" color="text.secondary">
                            📦 Stock: <b style={{ color: opt.stock_actual > 0 ? '#10b981' : '#ef4444' }}>
                              {Number(opt.stock_actual || 0).toFixed(0)} {opt.unidad}
                            </b>
                          </Typography>
                          {opt.marca && <Typography variant="caption" color="text.secondary">🏷️ {opt.marca}</Typography>}
                          {opt.categoria && <Typography variant="caption" color="text.secondary">📂 {opt.categoria}</Typography>}
                        </Box>
                      </Box>
                    )}
                    renderInput={params => (
                      <TextField
                        {...params}
                        label="Buscar insumo (nombre, código o marca)..."
                        variant="outlined"
                        fullWidth
                        InputProps={{
                          ...params.InputProps,
                          sx: { borderRadius: 2 },
                          startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#9ca3af' }} /></InputAdornment>,
                          endAdornment: (
                            <>{buscandoProductos && <CircularProgress size={18} />}{params.InputProps.endAdornment}</>
                          )
                        }}
                      />
                    )}
                  />
                </Box>

                {/* Cantidad */}
                <TextField
                  label="Cantidad"
                  type="number"
                  value={cantidadItem}
                  onChange={e => setCantidadItem(e.target.value)}
                  sx={{ width: 120 }}
                  InputProps={{ sx: { borderRadius: 2 } }}
                  inputProps={{ min: 1 }}
                />

                {/* Nota del ítem */}
                <TextField
                  label="Nota (opcional)"
                  value={obsItem}
                  onChange={e => setObsItem(e.target.value)}
                  sx={{ flex: 1, minWidth: 160 }}
                  InputProps={{ sx: { borderRadius: 2 } }}
                />

                {/* Botón agregar */}
                <Button
                  variant="contained"
                  onClick={agregarAlCarrito}
                  disabled={!productoSeleccionado || !cantidadItem}
                  sx={{
                    bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' },
                    borderRadius: 2, px: 2, whiteSpace: 'nowrap', alignSelf: 'center'
                  }}
                  startIcon={<AddIcon />}
                >
                  Agregar
                </Button>
              </Box>

              {/* Preview del producto seleccionado */}
              {productoSeleccionado && (
                <Fade in>
                  <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}
                    icon={<InventoryIcon />}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{productoSeleccionado.nombre}</Typography>
                    <Typography variant="caption">
                      Código: {productoSeleccionado.codigo}
                      &nbsp;|&nbsp; Stock: <b>{Number(productoSeleccionado.stock_actual || 0).toFixed(0)}</b> {productoSeleccionado.unidad}
                      {productoSeleccionado.marca && ` | ${productoSeleccionado.marca}`}
                      {productoSeleccionado.fecha_vencimiento && ` | Vence: ${new Date(productoSeleccionado.fecha_vencimiento).toLocaleDateString('es-VE')}`}
                    </Typography>
                  </Alert>
                </Fade>
              )}
            </Box>

            {/* ── Carrito ── */}
            {carrito.length > 0 && (
              <Fade in>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#374151', mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    🛒 Resumen del Pedido
                    <Chip size="small" label={`${carrito.length} ítem${carrito.length !== 1 ? 's' : ''}`}
                      sx={{ bgcolor: '#eef2ff', color: '#6366f1', fontWeight: 700, ml: 1 }} />
                  </Typography>
                  <Paper elevation={0} sx={{ border: '2px solid #e0e7ff', borderRadius: 3, overflow: 'hidden' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#eef2ff' }}>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Insumo</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Stock</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Cantidad</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>Nota</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {carrito.map((item, idx) => (
                          <TableRow key={idx} sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.nombre_item}</Typography>
                              <Typography variant="caption" color="text.secondary">{item.codigo_item}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={item.stock_actual != null ? Number(item.stock_actual).toFixed(0) : 'N/A'}
                                color={item.stock_actual > 0 ? 'success' : 'error'}
                                variant="outlined"
                                sx={{ fontWeight: 700, fontSize: '0.68rem' }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 800, color: '#6366f1' }}>
                                {item.cantidad_solicitada} {item.unidad}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">{item.observacion_item || '-'}</Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton size="small" color="error" onClick={() => quitarDelCarrito(item.item_id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Paper>
                </Box>
              </Fade>
            )}
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e5e7eb', bgcolor: '#f8fafc', gap: 1 }}>
          <Button onClick={cerrarDialog} sx={{ borderRadius: 2, color: '#6b7280' }}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleEnviarPedido}
            disabled={carrito.length === 0 || !formPedido.solicitante_nombre || !formPedido.area_solicitante}
            startIcon={<NextIcon />}
            sx={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: 2, px: 4, fontWeight: 700,
              boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
            }}
          >
            Enviar Solicitud ({carrito.length} ítem{carrito.length !== 1 ? 's' : ''})
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          DIALOG: Detalle del pedido
      ════════════════════════════════════════════════════════════ */}
      <Dialog
        open={!!pedidoDetalle}
        onClose={() => { setPedidoDetalle(null); setItemsDetalle([]); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        {pedidoDetalle && (
          <>
            <DialogTitle sx={{
              fontWeight: 800,
              background: 'linear-gradient(135deg, #f8fafc, #eef2ff)',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'center', gap: 1
            }}>
              <AssignmentIcon sx={{ color: '#6366f1' }} />
              {pedidoDetalle.numero_pedido}
              <Chip
                size="small"
                label={`${ESTADO_CONFIG[pedidoDetalle.estado]?.icon} ${pedidoDetalle.estado}`}
                color={ESTADO_CONFIG[pedidoDetalle.estado]?.color}
                sx={{ ml: 1, fontWeight: 700 }}
              />
            </DialogTitle>
            <DialogContent sx={{ p: 3 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Solicitante</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{pedidoDetalle.solicitante_nombre}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Área</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{pedidoDetalle.area_solicitante}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Fecha solicitud</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {new Date(pedidoDetalle.fecha_solicitud).toLocaleString('es-VE')}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Prioridad</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {PRIORIDAD_COLORS[pedidoDetalle.prioridad]?.label}
                  </Typography>
                </Box>
                {pedidoDetalle.observaciones && (
                  <Box sx={{ gridColumn: '1/-1' }}>
                    <Typography variant="caption" color="text.secondary">Observaciones</Typography>
                    <Typography variant="body2">{pedidoDetalle.observaciones}</Typography>
                  </Box>
                )}
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5 }}>📦 Ítems del Pedido</Typography>
              {loadingDetalle ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f8fafc' }}>
                        {['Insumo', 'Solicitado', 'Entregado', 'Stock', 'Unidad', 'Estado'].map(h => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {itemsDetalle.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.nombre_item}</Typography>
                            <Typography variant="caption" color="text.secondary">{item.codigo_item}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: '#6366f1' }}>
                              {Number(item.cantidad_solicitada)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 700 }}>
                              {item.cantidad_entregada != null ? Number(item.cantidad_entregada) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip size="small"
                              label={item.stock_actual != null ? Number(item.stock_actual).toFixed(0) : 'N/A'}
                              color={item.stock_actual > 10 ? 'success' : item.stock_actual > 0 ? 'warning' : 'error'}
                              variant="outlined" sx={{ fontWeight: 700, fontSize: '0.68rem' }} />
                          </TableCell>
                          <TableCell><Typography variant="caption">{item.unidad}</Typography></TableCell>
                          <TableCell>
                            <Chip size="small"
                              label={item.estado_item || 'Pendiente'}
                              color={item.estado_item === 'Entregado' ? 'success' : 'warning'}
                              sx={{ fontWeight: 600, fontSize: '0.68rem' }} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e5e7eb' }}>
              <Button onClick={() => { setPedidoDetalle(null); setItemsDetalle([]); }} sx={{ borderRadius: 2 }}>
                Cerrar
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── FAB Móvil ── */}
      <Fab
        color="primary"
        onClick={() => setOpenDialog(true)}
        sx={{
          position: 'fixed', bottom: 24, right: 24,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: { xs: 'flex', md: 'none' },
          boxShadow: '0 6px 20px rgba(99,102,241,0.5)'
        }}
      >
        <CartIcon />
      </Fab>
    </Box>
  );
}
