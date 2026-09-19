import React, { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  Button,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Pagination
} from '@mui/material';
import {
  Science as ScienceIcon,
  Refresh as RefreshIcon,
  NotificationsActive as PulseIcon,
  Biotech as AnalyzerIcon,
  Lock as LockIcon,
  HourglassEmpty as WaitingIcon,
  CheckCircleOutline as SuccessIcon,
  FastForward as FastForwardIcon,
  PlayArrow as PlayArrowIcon,
  History as HistoryIcon,
  Inventory2 as BoxIcon,
  FlashOn as FlashIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  WarningAmber as WarningIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';

const LiveReagentsMonitor = () => {
  const [cajasData, setCajasData] = useState({
    cajasCerradas: [],
    cajasEnUso: [],
    cajasAgotadas: [],
    resumen: { totalCerradas: 0, totalEnUso: 0, totalAgotadas: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 0: Activas en Analizador, 1: Historial de Agotadas, 2: Nevera / Reserva
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Controles de filtrado y búsqueda para alta escala (50+ reactivos)
  const [searchTerm, setSearchTerm] = useState('');
  const [equipoFiltro, setEquipoFiltro] = useState('TODOS'); // 'TODOS' | 'CM 260i' | 'Mindray BS-230'
  const [alertaFiltro, setAlertaFiltro] = useState('TODOS'); // 'TODOS' | 'CRITICOS' | 'MEDIO' | 'OPTIMO'
  const [pageSize, setPageSize] = useState(24); // 12 | 24 | 48 | 0 (todos)
  const [currentPage, setCurrentPage] = useState(1);

  const fetchMonitorData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const response = await api.get('/cajas/laboratorio');
      if (response.data && response.data.success) {
        setCajasData(response.data.data);
      }
    } catch (err) {
      console.error("Error al cargar datos reales del centro de comando:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMonitorData();
    const interval = setInterval(() => {
      fetchMonitorData(true);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  // Resetear página al cambiar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, equipoFiltro, alertaFiltro, pageSize]);

  // Acción: Pasar al siguiente frasco de la caja
  const handleSiguienteFrasco = async (loteId) => {
    try {
      setActionLoading(true);
      const res = await api.post('/cajas/siguiente-frasco', { loteId });
      if (res.data && res.data.success) {
        setSnackbar({
          open: true,
          message: res.data.message || 'Siguiente frasco activado.',
          severity: 'info'
        });
        await fetchMonitorData(true);
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error al cambiar frasco.',
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Acción: Validación Ágil de 3 Pruebas
  const handleValidarTransicion3Pruebas = async (loteId) => {
    try {
      setActionLoading(true);
      const res = await api.post('/cajas/validar-transicion', { loteId });
      if (res.data && res.data.success) {
        setSnackbar({
          open: true,
          message: res.data.message || 'Validación de 3 pruebas ejecutada: Caja agotada y nueva caja activada desde nevera.',
          severity: 'success'
        });
        await fetchMonitorData(false);
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Error en validación de transición.',
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  const cajasEnUso = cajasData.cajasEnUso || [];
  const cajasCerradas = cajasData.cajasCerradas || [];
  const cajasAgotadas = cajasData.cajasAgotadas || [];

  // Métricas globales KPI en tiempo real para todos los reactivos en uso
  const kpis = useMemo(() => {
    let totalHoy = 0;
    let totalAcum = 0;
    let totalCriticos = 0;
    let totalMedio = 0;
    let totalOptimo = 0;

    cajasEnUso.forEach(c => {
      totalHoy += Number(c.pruebasConsumidasHoy) || 0;
      totalAcum += Number(c.pruebasConsumidasTotal) || 0;
      const pct = c.porcentajeRestante !== undefined ? c.porcentajeRestante : 100;
      if (pct < 20) totalCriticos++;
      else if (pct <= 50) totalMedio++;
      else totalOptimo++;
    });

    return { totalHoy, totalAcum, totalCriticos, totalMedio, totalOptimo };
  }, [cajasEnUso]);

  // Filtrado de cajas en uso
  const cajasEnUsoFiltradas = useMemo(() => {
    return cajasEnUso.filter(c => {
      // 1. Buscador de texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const match = 
          (c.productoNombre && c.productoNombre.toLowerCase().includes(query)) ||
          (c.numeroLote && c.numeroLote.toLowerCase().includes(query)) ||
          (c.marca && c.marca.toLowerCase().includes(query)) ||
          (c.equipoAsociado && c.equipoAsociado.toLowerCase().includes(query));
        if (!match) return false;
      }

      // 2. Filtro de equipo
      if (equipoFiltro !== 'TODOS') {
        if (!c.equipoAsociado || !c.equipoAsociado.toLowerCase().includes(equipoFiltro.toLowerCase())) {
          return false;
        }
      }

      // 3. Filtro de alerta de stock
      const pct = c.porcentajeRestante !== undefined ? c.porcentajeRestante : 100;
      if (alertaFiltro === 'CRITICOS' && pct >= 20) return false;
      if (alertaFiltro === 'MEDIO' && (pct < 20 || pct > 50)) return false;
      if (alertaFiltro === 'OPTIMO' && pct <= 50) return false;

      return true;
    });
  }, [cajasEnUso, searchTerm, equipoFiltro, alertaFiltro]);

  // Paginación
  const totalPages = pageSize > 0 ? Math.ceil(cajasEnUsoFiltradas.length / pageSize) : 1;
  const paginatedCajasEnUso = useMemo(() => {
    if (pageSize <= 0) return cajasEnUsoFiltradas;
    const start = (currentPage - 1) * pageSize;
    return cajasEnUsoFiltradas.slice(start, start + pageSize);
  }, [cajasEnUsoFiltradas, currentPage, pageSize]);

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, backgroundColor: '#0b1120', minHeight: '100vh', color: '#f8fafc' }}>
      {/* HEADER PRINCIPAL TIPO CENTRO DE COMANDO */}
      <Paper 
        elevation={0}
        sx={{ 
          p: { xs: 2, md: 3 }, 
          mb: 3, 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
          borderRadius: 3,
          border: '1px solid #334155'
        }}
      >
        <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" gap={2}>
              <Box 
                sx={{ 
                  backgroundColor: 'rgba(56, 189, 248, 0.15)', 
                  p: 1.5, 
                  borderRadius: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  color: '#38bdf8'
                }}
              >
                <ScienceIcon sx={{ fontSize: 36 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight="900" sx={{ letterSpacing: '-0.5px', color: '#f8fafc' }}>
                  CONTROLAB IA — CENTRO DE CONTROL DE REACTIVOS
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.3 }}>
                  Monitor de Frascos y Cajas en Tiempo Real (Sniffer LIS Webhook & Cerebro IA)
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box display="flex" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} alignItems="center" gap={1.5} flexWrap="wrap">
              <Chip 
                icon={<AnalyzerIcon sx={{ color: '#10b981 !important' }} />}
                label="CM 260i (.10.188)" 
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                  color: '#10b981',
                  fontWeight: 700,
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }} 
              />
              <Chip 
                icon={<AnalyzerIcon sx={{ color: '#06b6d4 !important' }} />}
                label="Mindray BS-230 (.30.148)" 
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(6, 182, 212, 0.15)', 
                  color: '#06b6d4',
                  fontWeight: 700,
                  border: '1px solid rgba(6, 182, 212, 0.3)'
                }} 
              />
              <Chip 
                icon={<PulseIcon sx={{ color: '#38bdf8 !important' }} />}
                label={refreshing ? "SINCRONIZANDO..." : "STREAM SNIFFER CONECTADO"} 
                size="small"
                sx={{ 
                  backgroundColor: 'rgba(56, 189, 248, 0.15)', 
                  color: '#38bdf8',
                  fontWeight: 700,
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }} 
              />
              <Tooltip title="Actualizar ahora">
                <IconButton 
                  onClick={() => fetchMonitorData(false)}
                  sx={{ color: '#cbd5e1', '&:hover': { color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.1)' } }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        {/* BARRA DE KPIS GLOBALES */}
        {activeTab === 0 && (
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block' }}>
                  🧪 Reactivos en Analizadores
                </Typography>
                <Typography variant="h6" fontWeight="900" sx={{ color: '#38bdf8' }}>
                  {cajasEnUso.length} <Typography component="span" variant="caption" sx={{ color: '#64748b' }}>activos</Typography>
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block' }}>
                  ⚡ Pruebas Realizadas Hoy
                </Typography>
                <Typography variant="h6" fontWeight="900" sx={{ color: '#c084fc' }}>
                  {kpis.totalHoy} <Typography component="span" variant="caption" sx={{ color: '#64748b' }}>tests</Typography>
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, display: 'block' }}>
                  📈 Total Acumulado Sniffer
                </Typography>
                <Typography variant="h6" fontWeight="900" sx={{ color: '#34d399' }}>
                  {kpis.totalAcum} <Typography component="span" variant="caption" sx={{ color: '#64748b' }}>tests</Typography>
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: kpis.totalCriticos > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(51, 65, 85, 0.3)', border: kpis.totalCriticos > 0 ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid #334155' }}>
                <Typography variant="caption" sx={{ color: kpis.totalCriticos > 0 ? '#f87171' : '#94a3b8', fontWeight: 700, display: 'block' }}>
                  ⚠️ Nivel Crítico (&lt;20%)
                </Typography>
                <Typography variant="h6" fontWeight="900" sx={{ color: kpis.totalCriticos > 0 ? '#ef4444' : '#64748b' }}>
                  {kpis.totalCriticos} <Typography component="span" variant="caption" sx={{ color: '#64748b' }}>por reponer</Typography>
                </Typography>
              </Box>
            </Grid>
          </Grid>
        )}

        {/* PESTAÑAS DE VISTA */}
        <Box sx={{ borderBottom: 1, borderColor: '#334155', mt: 3 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, val) => setActiveTab(val)}
            textColor="inherit"
            sx={{
              '& .MuiTabs-indicator': { backgroundColor: '#38bdf8', height: 3 },
              '& .MuiTab-root': { color: '#94a3b8', fontWeight: 700, textTransform: 'none', fontSize: '0.95rem' },
              '& .Mui-selected': { color: '#38bdf8' }
            }}
          >
            <Tab 
              icon={<ScienceIcon sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
              label={`Reactivos en Analizador (${cajasEnUso.length})`} 
            />
            <Tab 
              icon={<HistoryIcon sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
              label={`Cajas Agotadas / Historial (${cajasAgotadas.length})`} 
            />
            <Tab 
              icon={<BoxIcon sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
              label={`Nevera / Reserva (${cajasCerradas.length} Cajas)`} 
            />
          </Tabs>
        </Box>
      </Paper>

      {/* TOOLBAR DE BÚSQUEDA Y FILTROS RÁPIDOS PARA ALTA ESCALA (50+ REACTIVOS) */}
      {activeTab === 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            backgroundColor: '#0f172a',
            borderRadius: 3,
            border: '1px solid #1e293b',
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
            gap: 2
          }}
        >
          {/* BUSCADOR EN VIVO */}
          <Box sx={{ flex: 1, maxWidth: { xs: '100%', md: 400 } }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar reactivo, lote, marca o analizador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#38bdf8', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')} sx={{ color: '#94a3b8' }}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  borderRadius: 2,
                  fontSize: '0.85rem',
                  '& fieldset': { borderColor: '#334155' },
                  '&:hover fieldset': { borderColor: '#38bdf8' }
                }
              }}
            />
          </Box>

          {/* FILTROS DE EQUIPO Y ALERTAS */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Filtro Equipo */}
            <Chip
              label="Todos Equipos"
              clickable
              size="small"
              onClick={() => setEquipoFiltro('TODOS')}
              sx={{
                fontWeight: 700,
                backgroundColor: equipoFiltro === 'TODOS' ? '#38bdf8' : '#1e293b',
                color: equipoFiltro === 'TODOS' ? '#0f172a' : '#94a3b8',
                border: '1px solid #334155'
              }}
            />
            <Chip
              label="CM 260i"
              clickable
              size="small"
              onClick={() => setEquipoFiltro('CM 260i')}
              sx={{
                fontWeight: 700,
                backgroundColor: equipoFiltro === 'CM 260i' ? '#10b981' : '#1e293b',
                color: equipoFiltro === 'CM 260i' ? '#0f172a' : '#94a3b8',
                border: '1px solid #334155'
              }}
            />
            <Chip
              label="Mindray BS-230"
              clickable
              size="small"
              onClick={() => setEquipoFiltro('Mindray BS-230')}
              sx={{
                fontWeight: 700,
                backgroundColor: equipoFiltro === 'Mindray BS-230' ? '#06b6d4' : '#1e293b',
                color: equipoFiltro === 'Mindray BS-230' ? '#0f172a' : '#94a3b8',
                border: '1px solid #334155'
              }}
            />

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, borderColor: '#334155' }} />

            {/* Filtro Alerta */}
            <Chip
              label={`🚨 Críticos (${kpis.totalCriticos})`}
              clickable
              size="small"
              onClick={() => setAlertaFiltro(alertaFiltro === 'CRITICOS' ? 'TODOS' : 'CRITICOS')}
              sx={{
                fontWeight: 700,
                backgroundColor: alertaFiltro === 'CRITICOS' ? '#ef4444' : '#1e293b',
                color: alertaFiltro === 'CRITICOS' ? '#ffffff' : (kpis.totalCriticos > 0 ? '#f87171' : '#94a3b8'),
                border: alertaFiltro === 'CRITICOS' ? '1px solid #ef4444' : '1px solid #334155'
              }}
            />

            {/* Selector de cantidad por página */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <Select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                sx={{
                  backgroundColor: '#1e293b',
                  color: '#f8fafc',
                  borderRadius: 2,
                  fontSize: '0.8rem',
                  height: 32,
                  '& .MuiSvgIcon-root': { color: '#94a3b8' },
                  '& fieldset': { borderColor: '#334155' }
                }}
              >
                <MenuItem value={12}>12 por página</MenuItem>
                <MenuItem value={24}>24 por página</MenuItem>
                <MenuItem value={48}>48 por página</MenuItem>
                <MenuItem value={0}>Ver Todos ({cajasEnUsoFiltradas.length})</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>
      )}

      {/* CONTENIDO SEGÚN PESTAÑA */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={12}>
          <CircularProgress size={45} sx={{ color: '#38bdf8' }} />
        </Box>
      ) : activeTab === 0 ? (
        /* PESTAÑA 0: REACTIVOS ACTIVOS EN ANALIZADORES */
        cajasEnUsoFiltradas.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              backgroundColor: '#0f172a',
              borderRadius: 3,
              border: '1px dashed #334155'
            }}
          >
            <WaitingIcon sx={{ fontSize: 64, color: '#64748b', mb: 2 }} />
            <Typography variant="h6" fontWeight={700} color="#f8fafc" gutterBottom>
              {searchTerm || equipoFiltro !== 'TODOS' || alertaFiltro !== 'TODOS'
                ? 'No se encontraron reactivos con los filtros aplicados'
                : 'Centro de Control en Espera: Sin Reactivos Activos en Analizadores'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 650, mx: 'auto', mb: 3 }}>
              {searchTerm || equipoFiltro !== 'TODOS' || alertaFiltro !== 'TODOS'
                ? 'Intenta restablecer la búsqueda o los filtros de equipo / alerta para ver los reactivos disponibles.'
                : 'En cuanto el bioanalista monte un frasco y active la caja, aparecerá aquí con su monitor visual en tiempo real.'}
            </Typography>
            {(searchTerm || equipoFiltro !== 'TODOS' || alertaFiltro !== 'TODOS') && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSearchTerm('');
                  setEquipoFiltro('TODOS');
                  setAlertaFiltro('TODOS');
                }}
                sx={{ borderColor: '#38bdf8', color: '#38bdf8', fontWeight: 700 }}
              >
                Limpiar Filtros de Búsqueda
              </Button>
            )}
          </Paper>
        ) : (
          <>
            {/* GRID PRINCIPAL RESPONSIVO DE TARJETAS */}
            <Grid container spacing={2.5}>
              {paginatedCajasEnUso.map((caja) => {
                const totalFrascos = caja.totalFrascos || 4;
                const volFrasco = caja.volPorFrasco || 45;
                const totalVolCaja = caja.totalVolCaja || (totalFrascos * volFrasco);
                const pctFrasco = caja.porcentajeRestante !== undefined ? caja.porcentajeRestante : Math.round((caja.mlRestantesFrasco / volFrasco) * 100);
                
                // Contar cuántas cajas cerradas en reserva existen de este mismo reactivo
                const cajasEnNevera = cajasCerradas.filter(c => c.inventarioId === caja.inventarioId).length;

                // Pruebas totales de la caja completa y pruebas restantes
                const pruebasPorCajaTotal = caja.pruebasPorCaja || (totalFrascos * (caja.pruebasPorFrasco || 180));
                const pruebasRestantesCajaTotal = caja.pruebasRestantesCaja !== undefined 
                  ? caja.pruebasRestantesCaja 
                  : Math.max(0, Math.floor((caja.mlRestantesCaja !== undefined ? caja.mlRestantesCaja : totalVolCaja) / 0.25));

                // Generar los frascos dinámicamente según la cantidad configurada en Ficha (1, 2, 4, 6, etc.)
                const frascos = caja.frascos || Array.from({ length: totalFrascos }, (_, i) => {
                  const num = i + 1;
                  if (num < caja.frascoActual) {
                    return { numero: num, estado: 'AGOTADO', mlRestantes: 0, volumenTotal: volFrasco, porcentaje: 0, esActual: false, color: '#ef4444' };
                  } else if (num === caja.frascoActual) {
                    const ag = caja.mlRestantesFrasco <= 0;
                    return { numero: num, estado: ag ? 'AGOTADO' : 'EN USO', mlRestantes: caja.mlRestantesFrasco, volumenTotal: volFrasco, porcentaje: pctFrasco, esActual: true, color: ag ? '#ef4444' : '#10b981' };
                  } else {
                    return { numero: num, estado: 'SELLADO', mlRestantes: volFrasco, volumenTotal: volFrasco, porcentaje: 100, esActual: false, color: '#64748b' };
                  }
                });

                // Ancho de columna dinámico para el rack de frascos
                const frascoColXs = totalFrascos === 1 ? 12 : totalFrascos === 2 ? 6 : totalFrascos === 6 ? 4 : 3;

                return (
                  <Grid item xs={12} sm={6} lg={4} xl={3} key={caja.id}>
                    <Card 
                      sx={{ 
                        backgroundColor: '#1e293b', 
                        border: pctFrasco < 20 ? '2px solid #ef4444' : '1px solid #334155', 
                        color: '#f8fafc',
                        borderRadius: 3.5,
                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                        transition: 'all 0.25s ease',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        position: 'relative',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
                          borderColor: '#38bdf8'
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2.5, pb: '16px !important' }}>
                        {/* ENCABEZADO DE TARJETA: REACTIVO + ANALIZADOR */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5, minHeight: 48 }}>
                          <Box sx={{ pr: 1 }}>
                            <Typography variant="subtitle1" fontWeight="900" sx={{ color: '#f8fafc', letterSpacing: '-0.3px', lineHeight: 1.2, fontSize: '0.95rem' }}>
                              {caja.productoNombre}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.3, display: 'block', fontSize: '0.72rem' }}>
                              Marca: <strong style={{ color: '#cbd5e1' }}>{caja.marca || 'Wiener Lab'}</strong> | Lote: <strong style={{ color: '#38bdf8' }}>{caja.numeroLote}</strong>
                            </Typography>
                          </Box>
                          <Chip 
                            size="small"
                            icon={<AnalyzerIcon sx={{ fontSize: 13 }} />}
                            label={caja.equipoAsociado || 'CM 260i'} 
                            sx={{ 
                              backgroundColor: '#0f172a', 
                              color: caja.equipoAsociado?.includes('Mindray') ? '#06b6d4' : '#38bdf8', 
                              fontWeight: 800, 
                              fontSize: '0.65rem',
                              border: '1px solid #334155',
                              height: 22,
                              px: 0.5
                            }} 
                          />
                        </Box>

                        {/* TÍTULO DEL RACK DE FRASCOS */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.68rem' }}>
                            🧪 Ficha: {totalFrascos}F x {volFrasco}mL ({pruebasPorCajaTotal} Test)
                          </Typography>
                          <Chip 
                            size="small"
                            label={`Frasco ${caja.frascoActual} de ${totalFrascos} Activo`}
                            sx={{ 
                              height: 18, 
                              fontSize: '0.62rem', 
                              fontWeight: 800, 
                              backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                              color: '#10b981', 
                              border: '1px solid rgba(16, 185, 129, 0.4)' 
                            }} 
                          />
                        </Box>

                        {/* RACK VISUAL DE FRASCOS (SOPORTA 1, 2, 4, 6 FRASCOS) */}
                        <Grid container spacing={1} sx={{ mb: 1.5 }}>
                          {frascos.map((frasco) => {
                            const esAgotado = frasco.estado === 'AGOTADO';
                            const esEnUso = frasco.estado === 'EN USO';
                            const esSellado = frasco.estado === 'SELLADO';

                            return (
                              <Grid item xs={frascoColXs} key={frasco.numero}>
                                <Box
                                  sx={{
                                    backgroundColor: esAgotado 
                                      ? 'rgba(239, 68, 68, 0.12)' 
                                      : esEnUso 
                                        ? 'rgba(16, 185, 129, 0.1)' 
                                        : 'rgba(15, 23, 42, 0.6)',
                                    border: esAgotado 
                                      ? '2px solid #ef4444' 
                                      : esEnUso 
                                        ? '2px solid #10b981' 
                                        : '1px solid #334155',
                                    borderRadius: 2,
                                    p: 0.8,
                                    textAlign: 'center',
                                    transition: 'all 0.3s ease',
                                    boxShadow: esEnUso ? '0 0 12px rgba(16, 185, 129, 0.25)' : 'none',
                                    position: 'relative'
                                  }}
                                >
                                  {/* NÚMERO Y ESTADO */}
                                  <Typography 
                                    variant="caption" 
                                    fontWeight="900" 
                                    sx={{ 
                                      display: 'block', 
                                      color: esAgotado ? '#f87171' : esEnUso ? '#10b981' : '#94a3b8',
                                      fontSize: '0.7rem'
                                    }}
                                  >
                                    F{frasco.numero}
                                  </Typography>

                                  {/* BADGE DE ESTADO */}
                                  <Box sx={{ my: 0.3 }}>
                                    {esAgotado && (
                                      <Chip 
                                        label="AGOTADO" 
                                        size="small" 
                                        sx={{ 
                                          height: 16, 
                                          fontSize: '0.55rem', 
                                          fontWeight: 900, 
                                          backgroundColor: '#ef4444', 
                                          color: '#ffffff' 
                                        }} 
                                      />
                                    )}
                                    {esEnUso && (
                                      <Chip 
                                        label="EN USO" 
                                        size="small" 
                                        sx={{ 
                                          height: 16, 
                                          fontSize: '0.55rem', 
                                          fontWeight: 900, 
                                          backgroundColor: '#10b981', 
                                          color: '#ffffff' 
                                        }} 
                                      />
                                    )}
                                    {esSellado && (
                                      <Chip 
                                        label="SELLADO" 
                                        size="small" 
                                        sx={{ 
                                          height: 16, 
                                          fontSize: '0.55rem', 
                                          fontWeight: 800, 
                                          backgroundColor: '#334155', 
                                          color: '#94a3b8' 
                                        }} 
                                      />
                                    )}
                                  </Box>

                                  {/* NIVEL GRÁFICO (FRASCO EN MINIATURA) */}
                                  <Box 
                                    sx={{ 
                                      height: 36, 
                                      width: '100%', 
                                      backgroundColor: '#0f172a', 
                                      borderRadius: 1.5, 
                                      position: 'relative', 
                                      overflow: 'hidden',
                                      border: '1px solid #334155',
                                      display: 'flex',
                                      alignItems: 'flex-end',
                                      my: 0.3
                                    }}
                                  >
                                    <Box 
                                      sx={{ 
                                        width: '100%', 
                                        height: `${frasco.porcentaje}%`, 
                                        backgroundColor: frasco.color,
                                        opacity: esEnUso ? 0.9 : 0.6,
                                        transition: 'height 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                        background: esEnUso 
                                          ? `linear-gradient(180deg, ${frasco.color} 0%, rgba(14, 165, 233, 0.8) 100%)` 
                                          : frasco.color
                                      }} 
                                    />
                                    <Typography 
                                      variant="caption" 
                                      sx={{ 
                                        position: 'absolute', 
                                        width: '100%', 
                                        textAlign: 'center', 
                                        top: '50%', 
                                        left: '50%', 
                                        transform: 'translate(-50%, -50%)', 
                                        fontWeight: 900, 
                                        fontSize: '0.62rem', 
                                        color: '#ffffff',
                                        textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                                      }}
                                    >
                                      {frasco.porcentaje}%
                                    </Typography>
                                  </Box>

                                  {/* VOLUMEN EN ML */}
                                  <Typography variant="caption" sx={{ color: '#cbd5e1', fontSize: '0.65rem', fontWeight: 800, display: 'block' }}>
                                    {frasco.mlRestantes} mL
                                  </Typography>
                                </Box>
                              </Grid>
                            );
                          })}
                        </Grid>

                        {/* 3 COLUMNAS DE MÉTRICAS (NEVERA, FRASCO ACTIVO, CAJA COMPLETA) */}
                        <Grid container spacing={1} sx={{ mb: 1 }}>
                          <Grid item xs={4}>
                            <Box sx={{ 
                              backgroundColor: 'rgba(15, 23, 42, 0.6)', 
                              p: 1, 
                              borderRadius: 2, 
                              textAlign: 'center', 
                              border: '1px solid #334155' 
                            }}>
                              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontWeight: 700, fontSize: '0.68rem' }}>
                                📦 En Nevera
                              </Typography>
                              <Typography variant="body2" fontWeight="900" sx={{ color: '#f59e0b', my: 0.1 }}>
                                {cajasEnNevera} Cajas
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.58rem', display: 'block' }}>
                                Stock Reserva
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box sx={{ 
                              backgroundColor: 'rgba(16, 185, 129, 0.08)', 
                              p: 1, 
                              borderRadius: 2, 
                              textAlign: 'center', 
                              border: '1px solid rgba(16, 185, 129, 0.25)' 
                            }}>
                              <Typography variant="caption" sx={{ color: '#34d399', display: 'block', fontWeight: 800, fontSize: '0.68rem' }}>
                                ⚡ Frasco Activo
                              </Typography>
                              <Typography variant="body2" fontWeight="900" sx={{ color: '#f8fafc', my: 0.1 }}>
                                ~{caja.pruebasRestantesFrasco || Math.floor((caja.mlRestantesFrasco || 0) / 0.25)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#34d399', fontSize: '0.58rem', display: 'block', fontWeight: 700 }}>
                                de {caja.pruebasPorFrasco || 180} test
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={4}>
                            <Box sx={{ 
                              backgroundColor: 'rgba(56, 189, 248, 0.08)', 
                              p: 1, 
                              borderRadius: 2, 
                              textAlign: 'center', 
                              border: '1px solid rgba(56, 189, 248, 0.25)' 
                            }}>
                              <Typography variant="caption" sx={{ color: '#38bdf8', display: 'block', fontWeight: 800, fontSize: '0.68rem' }}>
                                🧪 Caja Completa
                              </Typography>
                              <Typography variant="body2" fontWeight="900" sx={{ color: '#f8fafc', my: 0.1 }}>
                                ~{pruebasRestantesCajaTotal}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#38bdf8', fontSize: '0.58rem', display: 'block', fontWeight: 700 }}>
                                Total: {pruebasPorCajaTotal} test
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>

                        {/* CONTEO EN VIVO Y ACUMULADO TOTAL DESDE SNIFFER */}
                        <Box 
                          sx={{ 
                            mt: 1, 
                            p: 1.2, 
                            borderRadius: 2, 
                            backgroundColor: 'rgba(15, 23, 42, 0.75)', 
                            border: '1px solid rgba(56, 189, 248, 0.25)',
                            backdropFilter: 'blur(8px)'
                          }}
                        >
                          {/* Fila 1: Pruebas de Hoy */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 0.8, borderBottom: '1px dashed rgba(51, 65, 85, 0.8)' }}>
                            <Box>
                              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontWeight: 600, fontSize: '0.68rem' }}>
                                ⚡ Pruebas Hoy (Sniffer LIS)
                              </Typography>
                              <Typography variant="subtitle2" fontWeight="900" sx={{ color: '#38bdf8', lineHeight: 1.2 }}>
                                {caja.pruebasConsumidasHoy} <Typography component="span" variant="caption" sx={{ color: '#64748b' }}>pruebas</Typography>
                              </Typography>
                            </Box>
                            <Box textAlign="right">
                              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontWeight: 600, fontSize: '0.68rem' }}>
                                Volumen Hoy
                              </Typography>
                              <Typography variant="subtitle2" fontWeight="900" sx={{ color: '#a855f7', lineHeight: 1.2 }}>
                                {caja.mlConsumidosHoy.toFixed(2)} mL
                              </Typography>
                            </Box>
                          </Box>

                          {/* Desglose Analítico en Vivo: QC, Calibraciones, Repeticiones */}
                          {caja.desgloseHoy && (
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', pt: 0.8, pb: 0.8, borderBottom: '1px dashed rgba(51, 65, 85, 0.8)' }}>
                              <Chip
                                size="small"
                                label={`🎛️ QC: ${caja.desgloseHoy.qc?.count || 0}`}
                                sx={{ height: 20, fontSize: '0.62rem', backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#facc15', fontWeight: 700, border: '1px solid rgba(234, 179, 8, 0.3)' }}
                              />
                              <Chip
                                size="small"
                                label={`📐 Calib: ${caja.desgloseHoy.calibracion?.count || 0}`}
                                sx={{ height: 20, fontSize: '0.62rem', backgroundColor: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', fontWeight: 700, border: '1px solid rgba(168, 85, 247, 0.3)' }}
                              />
                              <Chip
                                size="small"
                                label={`🔄 Repet: ${caja.desgloseHoy.repeticion?.count || 0}`}
                                sx={{ height: 20, fontSize: '0.62rem', backgroundColor: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', fontWeight: 700, border: '1px solid rgba(244, 63, 94, 0.3)' }}
                              />
                            </Box>
                          )}

                          {/* Fila 2: Acumulado Total Histórico de la Caja */}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 0.8 }}>
                            <Box>
                              <Typography variant="caption" sx={{ color: '#34d399', display: 'block', fontWeight: 700, fontSize: '0.68rem' }}>
                                📈 Acumulado Total Caja
                              </Typography>
                              <Typography variant="subtitle2" fontWeight="900" sx={{ color: '#10b981', lineHeight: 1.2 }}>
                                {caja.pruebasConsumidasTotal || 0} <Typography component="span" variant="caption" sx={{ color: '#64748b' }}>de {pruebasPorCajaTotal} teóricas</Typography>
                              </Typography>
                            </Box>
                            <Box textAlign="right">
                              <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontWeight: 600, fontSize: '0.68rem' }}>
                                Vol. Total Descontado
                              </Typography>
                              <Typography variant="subtitle2" fontWeight="900" sx={{ color: '#e879f9', lineHeight: 1.2 }}>
                                {Number(caja.mlConsumidosTotal || 0).toFixed(2)} mL
                              </Typography>
                            </Box>
                          </Box>
                        </Box>



                        {/* FOOTER DE TARJETA */}
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1, textAlign: 'center', fontSize: '0.62rem' }}>
                          Abierto por: {caja.usuarioApertura || 'Bioanalista'} | Caja Total: {caja.mlRestantesCaja} / {totalVolCaja} mL (~{pruebasRestantesCajaTotal} de {pruebasPorCajaTotal} restantes)
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* CONTROLES DE PAGINACIÓN INFERIOR */}
            {pageSize > 0 && totalPages > 1 && (
              <Box display="flex" justifyContent="center" alignItems="center" mt={4} mb={2} gap={2}>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                  Mostrando {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, cajasEnUsoFiltradas.length)} de {cajasEnUsoFiltradas.length} reactivos
                </Typography>
                <Pagination
                  count={totalPages}
                  page={currentPage}
                  onChange={(e, page) => setCurrentPage(page)}
                  color="primary"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      color: '#94a3b8',
                      fontWeight: 700,
                      borderColor: '#334155',
                      '&.Mui-selected': {
                        backgroundColor: '#38bdf8',
                        color: '#0f172a',
                        fontWeight: 900
                      }
                    }
                  }}
                />
              </Box>
            )}
          </>
        )
      ) : activeTab === 1 ? (
        /* PESTAÑA 1: HISTORIAL DE CAJAS AGOTADAS */
        cajasAgotadas.length === 0 ? (
          <Paper elevation={0} sx={{ p: 5, textAlign: 'center', backgroundColor: '#0f172a', borderRadius: 3, border: '1px dashed #334155' }}>
            <SuccessIcon sx={{ fontSize: 50, color: '#10b981', mb: 1 }} />
            <Typography variant="h6" fontWeight={700} color="#f8fafc">
              No hay Cajas Agotadas
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              Cuando una caja termine sus frascos en el analizador o se valide su transición, aparecerá archivada aquí con su trazabilidad.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {cajasAgotadas.map((caja) => (
              <Grid item xs={12} sm={6} md={4} key={caja.id}>
                <Card sx={{ backgroundColor: '#1e293b', border: '1px solid #ef4444', borderRadius: 3, color: '#f8fafc' }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1" fontWeight="900" color="#f87171">
                        {caja.productoNombre}
                      </Typography>
                      <Chip label="AGOTADA" size="small" sx={{ backgroundColor: '#ef4444', color: '#fff', fontWeight: 900 }} />
                    </Box>
                    <Typography variant="body2" color="#94a3b8">
                      Lote: <strong>{caja.numeroLote}</strong> | {caja.marca}
                    </Typography>
                    <Typography variant="caption" color="#64748b" display="block" mt={1}>
                      Consumo final: {caja.pruebasConsumidasTotal || 0} pruebas ({caja.mlConsumidosTotal || 0} mL)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )
      ) : (
        /* PESTAÑA 2: CAJAS EN NEVERA / RESERVA */
        <Grid container spacing={3}>
          {cajasCerradas.map((caja) => (
            <Grid item xs={12} sm={6} md={4} key={caja.id}>
              <Card sx={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 3, color: '#f8fafc' }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight="900" color="#38bdf8">
                      {caja.productoNombre}
                    </Typography>
                    <Chip icon={<LockIcon sx={{ fontSize: 13, color: '#f59e0b !important' }} />} label="EN NEVERA" size="small" sx={{ backgroundColor: '#1e293b', color: '#f59e0b', fontWeight: 800 }} />
                  </Box>
                  <Typography variant="body2" color="#94a3b8">
                    Lote: <strong>{caja.numeroLote}</strong> | {caja.presentacion}
                  </Typography>
                  <Typography variant="caption" color="#64748b" display="block" mt={1}>
                    Capacidad: {caja.totalFrascos} frascos de {caja.volPorFrasco} mL ({caja.totalVolCaja || (caja.totalFrascos * caja.volPorFrasco)} mL = {caja.pruebasPorCaja || (caja.totalFrascos * (caja.pruebasPorFrasco || 180))} Test) | Listo para activación automática
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* SNACKBAR DE FEEDBACK */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity} 
          variant="filled"
          sx={{ width: '100%', fontWeight: 700 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default LiveReagentsMonitor;
