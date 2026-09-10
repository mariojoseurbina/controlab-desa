import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  TextField,
  InputAdornment,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel
} from '@mui/material';
import {
  QrCodeScanner as ScannerIcon,
  Inventory as BoxIcon,
  Science as ScienceIcon,
  CheckCircle as CheckIcon,
  LockOpen as LockOpenIcon,
  Lock as LockIcon,
  HourglassEmpty as WaitingIcon,
  Sync as SyncIcon,
  Biotech as AnalyzerIcon,
  Refresh as RefreshIcon,
  WarningAmber as WarningIcon,
  Speed as SpeedIcon,
  CheckCircleOutline as SuccessIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';

// Helper para formatear fechas a DD/MM/AAAA evitando el desfase de zona horaria (UTC rollback)
const formatDate = (dateValue) => {
  if (!dateValue) return 'Hoy';
  try {
    const s = String(dateValue);
    // Si viene en formato ISO (ej: 2026-09-07T...) o YYYY-MM-DD
    if (s.includes('-')) {
      const datePart = s.split('T')[0];
      const parts = datePart.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      }
    }
    const d = new Date(dateValue);
    if (!isNaN(d.getTime())) {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (_) {}
  return String(dateValue);
};

const GestionCajasFrascos = () => {
  const [cajasData, setCajasData] = useState({
    cajasCerradas: [],
    cajasEnUso: [],
    cajasAgotadas: [],
    resumen: { totalCerradas: 0, totalEnUso: 0, totalAgotadas: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [equipoFiltro, setEquipoFiltro] = useState('TODOS'); // 'TODOS' | 'CM 260i' | 'Mindray BS-230'
  
  // Estado para escáner
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState(null);
  const scanInputRef = useRef(null);

  // Modal para confirmar apertura manual
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCaja, setSelectedCaja] = useState(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('CM 260i');
  const [actionLoading, setActionLoading] = useState(false);

  // Cargar datos
  const fetchCajas = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const response = await api.get('/cajas/laboratorio');
      if (response.data && response.data.success) {
        setCajasData(response.data.data);
      }
    } catch (err) {
      console.error('Error al cargar datos de cajas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Cargar al inicio y refrescar periódicamente para captar sniffer en vivo
  useEffect(() => {
    fetchCajas();
    const interval = setInterval(() => {
      fetchCajas(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Mantener foco en el input del escáner
  useEffect(() => {
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [selectedTab]);

  // Al abrir el modal, preseleccionar el equipo según la marca del reactivo
  const handleOpenModal = (caja) => {
    setSelectedCaja(caja);
    const marca = (caja.marca || '').toLowerCase();
    if (marca.includes('mindray')) {
      setEquipoSeleccionado('Mindray BS-230');
    } else {
      setEquipoSeleccionado('CM 260i');
    }
    setModalOpen(true);
  };

  // Manejar escaneo (con pistola láser o teclado)
  const handleScanSubmit = async (e) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    setScanning(true);
    setScanMessage(null);

    try {
      const response = await api.post('/cajas/escanear', {
        barcode: code,
        equipo: equipoFiltro === 'TODOS' ? undefined : equipoFiltro
      });

      if (response.data && response.data.success) {
        setScanMessage({
          type: 'success',
          text: response.data.message || 'Código procesado exitosamente.'
        });
        setBarcodeInput('');
        await fetchCajas(true);
        if (response.data.accion === 'CAJA_ABIERTA') {
          setSelectedTab(1);
        }
      } else {
        setScanMessage({
          type: 'warning',
          text: response.data?.message || 'Código no reconocido en el inventario.'
        });
      }
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error al procesar el código de barras.'
      });
    } finally {
      setScanning(false);
      if (scanInputRef.current) scanInputRef.current.focus();
    }
  };

  // Abrir Caja por el Bioanalista (Disparo)
  const handleAbrirCaja = async () => {
    if (!selectedCaja) return;
    setActionLoading(true);
    try {
      const response = await api.post('/cajas/abrir', {
        loteId: selectedCaja.id,
        equipo: equipoSeleccionado
      });

      if (response.data && response.data.success) {
        setScanMessage({
          type: 'success',
          text: response.data.message
        });
        setModalOpen(false);
        await fetchCajas(true);
        setSelectedTab(1);
      }
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error al abrir la caja.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Montar Siguiente Frasco de la misma caja
  const handleSiguienteFrasco = async (caja) => {
    setActionLoading(true);
    try {
      const response = await api.post('/cajas/siguiente-frasco', {
        loteId: caja.id
      });

      if (response.data && response.data.success) {
        setScanMessage({
          type: 'success',
          text: response.data.message
        });
        await fetchCajas(true);
      }
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error al colocar siguiente frasco.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtrado por equipo seleccionado
  const filtrarPorEquipo = (lista) => {
    if (equipoFiltro === 'TODOS') return lista;
    return lista.filter((c) => {
      const eq = c.equipoAsociado || '';
      const marca = (c.marca || '').toLowerCase();
      if (equipoFiltro === 'Mindray BS-230') {
        return eq.includes('Mindray') || eq.includes('BS-230') || marca.includes('mindray');
      }
      return eq.includes('CM 260i') || marca.includes('wiener');
    });
  };

  const cerradasFiltradas = filtrarPorEquipo(cajasData.cajasCerradas);
  const enUsoFiltradas = filtrarPorEquipo(cajasData.cajasEnUso);
  const agotadasFiltradas = filtrarPorEquipo(cajasData.cajasAgotadas);

  return (
    <Container maxWidth="xl" sx={{ mt: 3, mb: 6 }}>
      {/* HEADER PRINCIPAL */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
          <Grid item xs={12} md={6}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  p: 1.2,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  color: '#f59e0b'
                }}
              >
                <BoxIcon sx={{ fontSize: 32 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: '-0.5px' }}>
                  📦 Gestión de Cajas y Frascos de Reactivos
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 0.3 }}>
                  Química Clínica: Control de Transferencias, Apertura por Bioanalista y Deducción Sniffer en Tiempo Real
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box display="flex" gap={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} alignItems="center" flexWrap="wrap">
              <Chip
                icon={<AnalyzerIcon sx={{ color: '#10b981 !important' }} />}
                label="CM 260i (192.168.10.188)"
                size="small"
                sx={{
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  fontWeight: 600,
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}
              />
              <Chip
                icon={<AnalyzerIcon sx={{ color: '#06b6d4 !important' }} />}
                label="Mindray BS-230 (192.168.30.148)"
                size="small"
                sx={{
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  color: '#06b6d4',
                  fontWeight: 600,
                  border: '1px solid rgba(6, 182, 212, 0.3)'
                }}
              />
              <Chip
                icon={<SyncIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none', color: '#38bdf8 !important' }} />}
                label={refreshing ? 'Sincronizando...' : 'Sniffer En Vivo'}
                size="small"
                sx={{
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  fontWeight: 600,
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              />
              <Tooltip title="Actualizar datos">
                <IconButton
                  onClick={() => fetchCajas(false)}
                  sx={{ color: '#cbd5e1', '&:hover': { color: '#ffffff', backgroundColor: 'rgba(255,255,255,0.1)' } }}
                >
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        {/* NOTA OPERATIVA DEL FLUJO */}
        <Box
          sx={{
            mt: 2.5,
            p: 1.5,
            borderRadius: 2,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}
        >
          <SuccessIcon sx={{ color: '#10b981', fontSize: 24, flexShrink: 0 }} />
          <Typography variant="caption" sx={{ color: '#cbd5e1', lineHeight: 1.4 }}>
            <strong>Regla Operativa (Área de Química):</strong> Al transferir del Almacén Central al Laboratorio, la caja permanece <strong>CERRADA</strong>.
            Es el <strong>Bioanalista</strong> quien dispara la apertura al montar el frasco faltante en el analizador (<strong>Wiener CM 260i</strong> o <strong>Mindray BS-230</strong>).
            A partir de ese instante el Sniffer descuenta el consumo real de las pruebas. <em>(Fase 2 posterior: Área de Hematología)</em>.
          </Typography>
        </Box>
      </Paper>

      {/* ESTACIÓN DE PISTOLEO / ESCÁNER */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          backgroundColor: '#ffffff',
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={7}>
            <form onSubmit={handleScanSubmit}>
              <TextField
                inputRef={scanInputRef}
                fullWidth
                size="medium"
                placeholder="Escanee con la pistola láser el código de barra de la caja o frasco (GS1-128)..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                disabled={scanning}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <ScannerIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        variant="contained"
                        type="submit"
                        disabled={scanning || !barcodeInput.trim()}
                        sx={{
                          backgroundColor: '#f59e0b',
                          '&:hover': { backgroundColor: '#d97706' },
                          color: '#ffffff',
                          fontWeight: 600,
                          px: 3
                        }}
                      >
                        {scanning ? <CircularProgress size={20} color="inherit" /> : 'Procesar'}
                      </Button>
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 2,
                    fontSize: '1rem',
                    backgroundColor: '#f8fafc',
                    '& fieldset': { borderColor: '#cbd5e1' },
                    '&:hover fieldset': { borderColor: '#f59e0b !important' },
                    '&.Mui-focused fieldset': { borderColor: '#f59e0b !important' }
                  }
                }}
              />
            </form>
          </Grid>

          <Grid item xs={12} md={5}>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Simular lectura:
              </Typography>
              <Chip
                size="small"
                label="📦 Caja Wiener (GS1-128)"
                onClick={() => setBarcodeInput('017791778040338410LDK0527060')}
                sx={{ cursor: 'pointer', backgroundColor: '#f1f5f9', '&:hover': { backgroundColor: '#e2e8f0' } }}
              />
              <Chip
                size="small"
                label="🧪 Frasco Rotor (2331586700451)"
                onClick={() => setBarcodeInput('2331586700451')}
                sx={{ cursor: 'pointer', backgroundColor: '#f1f5f9', '&:hover': { backgroundColor: '#e2e8f0' } }}
              />
            </Box>
          </Grid>
        </Grid>

        {/* ALERTA DE RESULTADO DE ESCANEO */}
        {scanMessage && (
          <Box sx={{ mt: 2 }}>
            <Alert
              severity={scanMessage.type}
              onClose={() => setScanMessage(null)}
              sx={{ borderRadius: 2 }}
            >
              {scanMessage.text}
            </Alert>
          </Box>
        )}
      </Paper>

      {/* TABS DE ESTADO & FILTRO DE EQUIPO */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          backgroundColor: '#ffffff',
          borderRadius: 3,
          border: '1px solid #e2e8f0'
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ px: 2, borderBottom: '1px solid #e2e8f0' }}>
          <Tabs
            value={selectedTab}
            onChange={(e, v) => setSelectedTab(v)}
            indicatorColor="primary"
            textColor="primary"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.95rem',
                py: 2
              }
            }}
          >
            <Tab
              icon={<LockIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <span>Cajas Cerradas en Espera</span>
                  <Chip
                    size="small"
                    label={cerradasFiltradas.length}
                    sx={{
                      backgroundColor: selectedTab === 0 ? '#f59e0b' : '#e2e8f0',
                      color: selectedTab === 0 ? '#ffffff' : '#475569',
                      fontWeight: 700,
                      height: 20
                    }}
                  />
                </Box>
              }
            />
            <Tab
              icon={<LockOpenIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <span>En Uso en Analizadores</span>
                  <Chip
                    size="small"
                    label={enUsoFiltradas.length}
                    sx={{
                      backgroundColor: selectedTab === 1 ? '#10b981' : '#e2e8f0',
                      color: selectedTab === 1 ? '#ffffff' : '#475569',
                      fontWeight: 700,
                      height: 20
                    }}
                  />
                </Box>
              }
            />
            <Tab
              icon={<CheckIcon sx={{ fontSize: 20 }} />}
              iconPosition="start"
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <span>Cajas Agotadas / Historial</span>
                  <Chip
                    size="small"
                    label={agotadasFiltradas.length}
                    sx={{
                      backgroundColor: '#e2e8f0',
                      color: '#475569',
                      fontWeight: 700,
                      height: 20
                    }}
                  />
                </Box>
              }
            />
          </Tabs>

          {/* FILTRO RÁPIDO DE EQUIPO */}
          <Box display="flex" alignItems="center" gap={1} py={1}>
            <FilterIcon sx={{ color: '#64748b', fontSize: 18 }} />
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              Filtrar por Equipo:
            </Typography>
            <Chip
              size="small"
              label="Todos Química"
              clickable
              color={equipoFiltro === 'TODOS' ? 'primary' : 'default'}
              variant={equipoFiltro === 'TODOS' ? 'filled' : 'outlined'}
              onClick={() => setEquipoFiltro('TODOS')}
              sx={{ fontWeight: 600 }}
            />
            <Chip
              size="small"
              label="CM 260i"
              clickable
              color={equipoFiltro === 'CM 260i' ? 'success' : 'default'}
              variant={equipoFiltro === 'CM 260i' ? 'filled' : 'outlined'}
              onClick={() => setEquipoFiltro('CM 260i')}
              sx={{ fontWeight: 600 }}
            />
            <Chip
              size="small"
              label="Mindray BS-230"
              clickable
              color={equipoFiltro === 'Mindray BS-230' ? 'info' : 'default'}
              variant={equipoFiltro === 'Mindray BS-230' ? 'filled' : 'outlined'}
              onClick={() => setEquipoFiltro('Mindray BS-230')}
              sx={{ fontWeight: 600 }}
            />
          </Box>
        </Box>

        {/* CONTENIDO DEL TAB */}
        <Box sx={{ p: 3 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={8}>
              <CircularProgress size={40} />
            </Box>
          ) : (
            <>
              {/* TAB 0: CAJAS CERRADAS (EN ESPERA DEL BIOANALISTA) */}
              {selectedTab === 0 && (
                <div>
                  {cerradasFiltradas.length === 0 ? (
                    <Box textAlign="center" py={6}>
                      <WaitingIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        No hay cajas cerradas en espera {equipoFiltro !== 'TODOS' ? `para ${equipoFiltro}` : 'en el Laboratorio'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Transfiera cajas desde el Almacén Central para recibirlas en esta sección.
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2.5}>
                      {cerradasFiltradas.map((caja) => {
                        const esMindray = (caja.marca || '').toLowerCase().includes('mindray');
                        const sugerenciaEquipo = esMindray ? 'Mindray BS-230' : 'CM 260i';
                        return (
                          <Grid item xs={12} sm={6} lg={4} key={caja.id}>
                            <Card
                              elevation={0}
                              sx={{
                                border: '1px solid #e2e8f0',
                                borderRadius: 2.5,
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 8px 16px -4px rgba(0,0,0,0.08)',
                                  borderColor: '#f59e0b'
                                }
                              }}
                            >
                              <CardContent sx={{ pb: 1 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                                  <Chip
                                    icon={<LockIcon sx={{ fontSize: 14, color: '#d97706 !important' }} />}
                                    size="small"
                                    label="CERRADA / SELLADA"
                                    sx={{
                                      backgroundColor: '#fef3c7',
                                      color: '#b45309',
                                      fontWeight: 700,
                                      fontSize: '0.75rem'
                                    }}
                                  />
                                  <Chip
                                    size="small"
                                    label={caja.marca || 'Wiener'}
                                    variant="outlined"
                                    sx={{ fontSize: '0.7rem' }}
                                  />
                                </Box>

                                <Typography variant="subtitle1" fontWeight={700} color="#1e293b" gutterBottom>
                                  {caja.productoNombre}
                                </Typography>

                                <Box
                                  sx={{
                                    backgroundColor: '#f8fafc',
                                    p: 1.5,
                                    borderRadius: 1.5,
                                    border: '1px solid #f1f5f9',
                                    my: 1.5
                                  }}
                                >
                                  <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        Número de Lote
                                      </Typography>
                                      <Typography variant="body2" fontWeight={700} color="#0f172a">
                                        {caja.numeroLote}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        Vencimiento
                                      </Typography>
                                      <Typography variant="body2" fontWeight={600} color="#0f172a">
                                        {formatDate(caja.fechaVencimiento)}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        Contenido Caja
                                      </Typography>
                                      <Typography variant="body2" fontWeight={600} color="#0f172a">
                                        {caja.totalFrascos} frascos × {caja.volPorFrasco}ml
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary" display="block">
                                        Pruebas Teóricas
                                      </Typography>
                                      <Typography variant="body2" fontWeight={600} color="#0f172a">
                                        ~{caja.pruebasPorCaja} pruebas
                                      </Typography>
                                    </Grid>
                                  </Grid>
                                </Box>

                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                  <Typography variant="caption" color="text.secondary">
                                    Presentación: {caja.presentacion || 'Estándar'}
                                  </Typography>
                                  <Chip
                                    size="small"
                                    icon={<AnalyzerIcon sx={{ fontSize: 13 }} />}
                                    label={sugerenciaEquipo}
                                    sx={{ fontSize: '0.65rem', height: 20, backgroundColor: '#f1f5f9' }}
                                  />
                                </Box>
                              </CardContent>

                              <Divider />

                              <CardActions sx={{ p: 2, pt: 1.5 }}>
                                <Button
                                  fullWidth
                                  variant="contained"
                                  startIcon={<LockOpenIcon />}
                                  onClick={() => handleOpenModal(caja)}
                                  sx={{
                                    backgroundColor: '#f59e0b',
                                    '&:hover': { backgroundColor: '#d97706' },
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    borderRadius: 2
                                  }}
                                >
                                  Abrir Caja y Colocar Frasco
                                </Button>
                              </CardActions>
                            </Card>
                          </Grid>
                        );
                      })}
                    </Grid>
                  )}
                </div>
              )}

              {/* TAB 1: CAJAS ABIERTAS / EN USO EN ANALIZADORES */}
              {selectedTab === 1 && (
                <div>
                  {enUsoFiltradas.length === 0 ? (
                    <Box textAlign="center" py={6}>
                      <AnalyzerIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        No hay cajas abiertas en uso {equipoFiltro !== 'TODOS' ? `en ${equipoFiltro}` : 'en este momento'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Abra una caja desde la pestaña "Cajas Cerradas en Espera" o escanee el código de barra para iniciar.
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2.5}>
                      {enUsoFiltradas.map((caja) => (
                        <Grid item xs={12} sm={6} lg={4} key={caja.id}>
                          <Card
                            elevation={0}
                            sx={{
                              border: '2px solid #10b981',
                              borderRadius: 2.5,
                              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
                            }}
                          >
                            <CardContent sx={{ pb: 1 }}>
                              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                <Chip
                                  icon={<SuccessIcon sx={{ fontSize: 14, color: '#047857 !important' }} />}
                                  size="small"
                                  label={`EN USO EN ${caja.equipoAsociado || 'CM 260i'}`}
                                  sx={{
                                    backgroundColor: '#d1fae5',
                                    color: '#065f46',
                                    fontWeight: 700,
                                    fontSize: '0.75rem'
                                  }}
                                />
                                <Chip
                                  size="small"
                                  label={"Frasco " + caja.frascoActual + " de " + caja.totalFrascos}
                                  sx={{
                                    backgroundColor: '#e0e7ff',
                                    color: '#3730a3',
                                    fontWeight: 700
                                  }}
                                />
                              </Box>

                              <Typography variant="subtitle1" fontWeight={700} color="#0f172a" gutterBottom>
                                {caja.productoNombre}
                              </Typography>

                              {/* BARRA DE CONSUMO DE FRASCO ACTUAL */}
                              <Box sx={{ mt: 2, mb: 1.5 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                  <Typography variant="caption" fontWeight={600} color="text.secondary">
                                    Nivel Frasco {caja.frascoActual} ({caja.mlRestantesFrasco}ml restantes)
                                  </Typography>
                                  <Typography variant="caption" fontWeight={700} color="#10b981">
                                    {caja.porcentajeRestante}%
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={caja.porcentajeRestante}
                                  sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: '#e2e8f0',
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: caja.porcentajeRestante > 25 ? '#10b981' : '#ef4444',
                                      borderRadius: 4
                                    }
                                  }}
                                />
                              </Box>

                              {/* MÉTRICAS SNIFFER EN VIVO */}
                              <Box
                                sx={{
                                  backgroundColor: '#f8fafc',
                                  p: 1.5,
                                  borderRadius: 1.5,
                                  border: '1px solid #e2e8f0',
                                  my: 1.5
                                }}
                              >
                                <Grid container spacing={1}>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      Pruebas Hoy (Sniffer)
                                    </Typography>
                                    <Typography variant="body1" fontWeight={800} color="#2563eb">
                                      {caja.pruebasConsumidasHoy} pruebas
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      ml Consumidos Hoy
                                    </Typography>
                                    <Typography variant="body1" fontWeight={800} color="#7c3aed">
                                      {caja.mlConsumidosHoy.toFixed(2)} ml
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      Pruebas Restantes Frasco
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} color="#0f172a">
                                      ~{caja.pruebasRestantesFrasco} pruebas
                                    </Typography>
                                  </Grid>
                                  <Grid item xs={6}>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      Lote de la Caja
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} color="#0f172a">
                                      {caja.numeroLote}
                                    </Typography>
                                  </Grid>
                                </Grid>
                              </Box>

                              <Typography variant="caption" color="text.secondary" display="block">
                                Abierto por: <strong>{caja.usuarioApertura || 'Bioanalista'}</strong> en <strong>{caja.equipoAsociado || 'CM 260i'}</strong> el {formatDate(caja.fechaApertura)}
                              </Typography>
                            </CardContent>

                            <Divider />

                            <CardActions sx={{ p: 2, pt: 1.5 }}>
                              <Button
                                fullWidth
                                variant="outlined"
                                startIcon={<SyncIcon />}
                                disabled={actionLoading || caja.frascoActual >= caja.totalFrascos}
                                onClick={() => handleSiguienteFrasco(caja)}
                                sx={{
                                  borderColor: '#2563eb',
                                  color: '#2563eb',
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  borderRadius: 2,
                                  '&:hover': {
                                    borderColor: '#1d4ed8',
                                    backgroundColor: 'rgba(37, 99, 235, 0.05)'
                                  }
                                }}
                              >
                                {caja.frascoActual >= caja.totalFrascos
                                  ? 'Último Frasco en Uso'
                                  : 'Colocar Siguiente Frasco (' + (caja.frascoActual + 1) + '/' + caja.totalFrascos + ')'}
                              </Button>
                            </CardActions>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </div>
              )}

              {/* TAB 2: HISTORIAL Y AGOTADAS */}
              {selectedTab === 2 && (
                <div>
                  {agotadasFiltradas.length === 0 ? (
                    <Box textAlign="center" py={6}>
                      <CheckIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 1 }} />
                      <Typography variant="h6" color="text.secondary">
                        Aún no hay cajas agotadas registradas
                      </Typography>
                    </Box>
                  ) : (
                    <Grid container spacing={2}>
                      {agotadasFiltradas.map((caja) => (
                        <Grid item xs={12} sm={6} md={4} key={caja.id}>
                          <Paper sx={{ p: 2, border: '1px solid #e2e8f0', borderRadius: 2 }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {caja.productoNombre}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Lote: {caja.numeroLote} | Equipo: {caja.equipoAsociado} | Total pruebas: {caja.pruebasConsumidasHoy}
                            </Typography>
                            <Chip size="small" label="Agotada" color="default" sx={{ mt: 1 }} />
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </div>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* MODAL DE CONFIRMACIÓN DE APERTURA POR EL BIOANALISTA */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <LockOpenIcon sx={{ color: '#f59e0b' }} />
          Confirmar Apertura de Caja y Colocación de Frasco
        </DialogTitle>
        <DialogContent dividers>
          {selectedCaja && (
            <Box>
              <Typography variant="body1" fontWeight={600} gutterBottom>
                ¿Desea abrir la caja y colocar el primer frasco en el analizador clínico?
              </Typography>
              <Box sx={{ backgroundColor: '#f8fafc', p: 2, borderRadius: 2, my: 2, border: '1px solid #e2e8f0' }}>
                <Typography variant="subtitle2" color="#0f172a">
                  <strong>Reactivo:</strong> {selectedCaja.productoNombre}
                </Typography>
                <Typography variant="subtitle2" color="#0f172a">
                  <strong>Marca:</strong> {selectedCaja.marca || 'Wiener'}
                </Typography>
                <Typography variant="subtitle2" color="#0f172a">
                  <strong>Lote:</strong> {selectedCaja.numeroLote}
                </Typography>
                <Typography variant="subtitle2" color="#0f172a">
                  <strong>Contenido:</strong> {selectedCaja.totalFrascos} frascos × {selectedCaja.volPorFrasco}ml
                </Typography>
              </Box>

              {/* SELECTOR DE EQUIPO ANALIZADOR (QUÍMICA CLÍNICA) */}
              <Box sx={{ my: 2, p: 1.5, backgroundColor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
                <FormControl component="fieldset">
                  <FormLabel component="legend" sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.85rem', mb: 0.5 }}>
                    Seleccione el Analizador de Química donde colocará el Frasco:
                  </FormLabel>
                  <RadioGroup
                    row
                    value={equipoSeleccionado}
                    onChange={(e) => setEquipoSeleccionado(e.target.value)}
                  >
                    <FormControlLabel
                      value="CM 260i"
                      control={<Radio size="small" color="primary" />}
                      label={<Typography variant="body2" fontWeight={600}>Wiener CM 260i (192.168.10.188)</Typography>}
                    />
                    <FormControlLabel
                      value="Mindray BS-230"
                      control={<Radio size="small" color="primary" />}
                      label={<Typography variant="body2" fontWeight={600}>Mindray BS-230 (192.168.30.148)</Typography>}
                    />
                  </RadioGroup>
                </FormControl>
              </Box>

              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Al confirmar, la caja pasará a <strong>ABIERTO / EN USO EN {equipoSeleccionado}</strong>.
                El Sniffer capturará las tramas de este equipo y descontará automáticamente las pruebas realizadas.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalOpen(false)} color="inherit" sx={{ fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAbrirCaja}
            disabled={actionLoading}
            sx={{
              backgroundColor: '#f59e0b',
              '&:hover': { backgroundColor: '#d97706' },
              color: '#ffffff',
              fontWeight: 700,
              px: 3
            }}
          >
            {actionLoading ? <CircularProgress size={20} color="inherit" /> : `Confirmar y Colocar en ${equipoSeleccionado}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default GestionCajasFrascos;
