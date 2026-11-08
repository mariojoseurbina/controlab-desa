import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
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
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
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
  FilterList as FilterIcon,
  ViewList as ListIcon,
  ViewModule as ModuleIcon
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
  const { user } = useAuth();
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
  const [candidatosModalOpen, setCandidatosModalOpen] = useState(false);
  const [candidatosScan, setCandidatosScan] = useState([]);
  const scanInputRef = useRef(null);

  // Modal para confirmar apertura manual
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCaja, setSelectedCaja] = useState(null);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState('CM 260i');
  const [actionLoading, setActionLoading] = useState(false);

  const [cajasEnTransito, setCajasEnTransito] = useState([]);
  const [loadingTransito, setLoadingTransito] = useState(false);
  const [viewMode, setViewMode] = useState('table');

  const [selectedLotes, setSelectedLotes] = useState([]);

  const handleToggleSelectLote = (loteId) => {
    setSelectedLotes(prev => 
      prev.includes(loteId) ? prev.filter(id => id !== loteId) : [...prev, loteId]
    );
  };

  const handleSelectAllLotes = () => {
    if (selectedLotes.length === cajasEnTransito.length) {
      setSelectedLotes([]);
    } else {
      setSelectedLotes(cajasEnTransito.map(c => c.id));
    }
  };

  const handleAccionMasiva = async (action) => {
    if (selectedLotes.length === 0) return;
    if (action === 'RECHAZAR') {
      const confirm = window.confirm('¿Está seguro que desea RECHAZAR y DEVOLVER las cajas seleccionadas al Almacén Central?');
      if (!confirm) return;
    }
    
    setActionLoading(true);
    try {
      const response = await api.post('/cajas/recepcion-masiva', {
        loteIds: selectedLotes,
        action: action,
        usuarioNombre: user?.nombre_completo || user?.nombre || user?.usuario || 'Bioanalista'
      });

      if (response.data && response.data.success) {
        setScanMessage({
          type: 'success',
          text: response.data.message || `${selectedLotes.length} cajas procesadas masivamente.`
        });
        
        // ABRIR ACTA DE RECEPCION O RECHAZO
        if (response.data.referencia) {
          const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
          window.open(`${API_BASE_URL}/movements/reception/pdf?referencia=${response.data.referencia}&action=${action}`, '_blank');
        }

        setSelectedLotes([]);
        await fetchCajas(true);
      }
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error en operación masiva.'
      });
    } finally {
      setActionLoading(false);
    }
  };


  // Cargar datos de laboratorio y cajas en tránsito desde almacén central
  const fetchCajas = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const [resLab, resTrans] = await Promise.all([
        api.get('/cajas/laboratorio'),
        api.get('/cajas/transito').catch(() => ({ data: { success: false, data: [] } }))
      ]);

      if (resLab.data && resLab.data.success) {
        setCajasData(resLab.data.data);
      }
      if (resTrans.data && resTrans.data.success) {
        setCajasEnTransito(resTrans.data.data || []);
      }
    } catch (err) {
      console.error('Error al cargar datos de cajas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Confirmación Electrónica de Recepción (1 Clic / Escáner)
  const handleConfirmarRecepcion = async (loteId, barcodeVal = null) => {
    setActionLoading(true);
    try {
      const response = await api.post('/cajas/confirmar-recepcion', {
        loteId,
        barcode: barcodeVal,
        usuarioNombre: user?.nombre_completo || user?.nombre || user?.usuario || 'Bioanalista'
      });

      if (response.data && response.data.success) {
        setScanMessage({
          type: 'success',
          text: response.data.message || 'Caja recibida electrónicamente en Laboratorio.'
        });
        await fetchCajas(true);
      }
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error al confirmar recepción electrónica.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Rechazar y Devolver Caja a Almacén Central
  const handleRechazarDevolucion = async (loteId) => {
    const motivo = prompt('Ingrese la razón del rechazo / devolución a Almacén Central:');
    if (motivo === null) return;

    setActionLoading(true);
    try {
      const response = await api.post('/cajas/rechazar-devolucion', {
        loteId,
        motivo: motivo || 'Devolución desde Recepción de Laboratorio'
      });

      if (response.data && response.data.success) {
        setScanMessage({
          type: 'info',
          text: response.data.message || 'Caja devuelta a Almacén Central.'
        });
        await fetchCajas(true);
      }
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error al devolver caja.'
      });
    } finally {
      setActionLoading(false);
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

  // Al abrir el modal, preseleccionar el equipo según el equipoAsociado del reactivo
  const handleOpenModal = (caja) => {
    setSelectedCaja(caja);
    const eq = (caja.equipoAsociado || '').toUpperCase();
    if (eq.includes('CL-900') || eq.includes('CL 900') || eq.includes('CLIA')) {
      setEquipoSeleccionado('Mindray CL-900i');
    } else if (eq.includes('5380')) {
      setEquipoSeleccionado('Mindray BC 5380');
    } else if (eq.includes('BS-230') || eq.includes('BS 230') || (caja.marca || '').toLowerCase().includes('mindray')) {
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
      const response = await api.post('/cajas/buscar-candidatos', {
        barcode: code,
        equipo: equipoFiltro === 'TODOS' ? undefined : equipoFiltro
      });

      if (response.data && response.data.success && response.data.candidatos && response.data.candidatos.length > 0) {
        setCandidatosScan(response.data.candidatos);
        setCandidatosModalOpen(true);
        setBarcodeInput('');
      } else {
        setScanMessage({
          type: 'warning',
          text: 'Sin coincidencias. Intente escaneando otro lote o nombre.'
        });
      }
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error de conexion.'
      });
    } finally {
      setScanning(false);
    }
  };

  const handleProcesarLote = async (loteId, equipoAsociado) => {
    const cand = candidatosScan.find(c => c.id === loteId);
    if (cand && (cand.estado === 'Activo' || cand.estado?.toLowerCase() === 'activo')) {
      setScanMessage({
        type: 'info',
        text: `ℹ️ La caja Lote: ${cand.lote} (${cand.producto}) ya fue abierta y se encuentra activa en producción.`
      });
      setCandidatosModalOpen(false);
      return;
    }
    if (cand && !cand.estaEnLab && cand.estadoTransferencia !== 'EN_TRANSITO') {
      setScanMessage({
        type: 'error',
        text: '⛔ Acción bloqueada: Esta caja se encuentra en Almacén Central. El Bioanalista solo puede abrir cajas transferidas y recibidas en el Almacén de Laboratorio.'
      });
      setCandidatosModalOpen(false);
      return;
    }
    setCandidatosModalOpen(false);
    setScanning(true);
    setScanMessage(null);
    try {
      const response = await api.post('/cajas/procesar-lote', {
        loteId,
        equipo: equipoFiltro === 'TODOS' ? equipoAsociado : equipoFiltro
      });
      if (response.data && response.data.success) {
        setScanMessage({
          type: 'success',
          text: response.data.message
        });
        await fetchCajas(true);
        if (response.data.accion === 'CAJA_ABIERTA') {
          setSelectedTab(1);
        }
      }
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error al procesar la caja.'
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
        equipo: equipoSeleccionado,
        usuarioNombre: user?.nombre_completo || user?.usuario || 'Bioanalista'
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
      const eq = (c.equipoAsociado || '').toUpperCase();
      const marca = (c.marca || '').toLowerCase();
      if (equipoFiltro === 'Mindray CL-900i' || equipoFiltro === 'CL-900i') {
        return eq.includes('CL-900') || eq.includes('CL 900') || eq.includes('CLIA');
      }
      if (equipoFiltro === 'Mindray BC-5380' || equipoFiltro === 'BC-5380') {
        return eq.includes('5380') || eq.includes('BC-5380');
      }
      if (equipoFiltro === 'Mindray BS-230') {
        return (eq.includes('BS-230') || eq.includes('BS 230')) ||
               (marca.includes('mindray') && !eq.includes('CL-900') && !eq.includes('CL 900') && !eq.includes('CLIA') && !eq.includes('5380'));
      }
      if (equipoFiltro === 'CM 260i') {
        return eq.includes('CM 260') || marca.includes('wiener');
      }
      return true;
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
                placeholder="Escanee con pistola láser o escriba Lote, Código de Producto, Nombre o Referencia (ej: 20206206, FER)..."
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
                        {scanning ? <CircularProgress size={20} color="inherit" /> : 'Procesar / Validar'}
                      </Button>
                    </InputAdornment>
                  ),
                  sx: {
                    borderRadius: 2,
                    fontSize: '0.95rem',
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
                Probar multicriterio:
              </Typography>
              <Chip
                size="small"
                label="🏷️ Lote: 20206206"
                onClick={() => setBarcodeInput('20206206')}
                sx={{ cursor: 'pointer', backgroundColor: '#f1f5f9', '&:hover': { backgroundColor: '#e2e8f0' } }}
              />
              <Chip
                size="small"
                label="📦 Código: REA-BQ-FER-BS-02"
                onClick={() => setBarcodeInput('REA-BQ-FER-BS-02')}
                sx={{ cursor: 'pointer', backgroundColor: '#f1f5f9', '&:hover': { backgroundColor: '#e2e8f0' } }}
              />
              <Chip
                size="small"
                label="🧪 Nombre: Ferretina"
                onClick={() => setBarcodeInput('Ferretina')}
                sx={{ cursor: 'pointer', backgroundColor: '#f1f5f9', '&:hover': { backgroundColor: '#e2e8f0' } }}
              />
              <Chip
                size="small"
                label="📷 GS1-128 Wiener"
                onClick={() => setBarcodeInput('017791778040338410LDK0527060')}
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

      {/* 🚚 CAJAS EN TRÁNSITO POR CONFIRMAR (RECEPCIÓN ELECTRÓNICA DE ALMACÉN CENTRAL) */}
      {cajasEnTransito && cajasEnTransito.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            mb: 3,
            backgroundColor: '#fffbebfb',
            borderRadius: 3,
            border: '2px solid #f59e0b'
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, val) => { if (val) setViewMode(val); }}
                size="small"
                sx={{ backgroundColor: '#ffffff' }}
              >
                <ToggleButton value="table" title="Vista de Lista">
                  <ListIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="cards" title="Vista de Tarjetas">
                  <ModuleIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box sx={{ p: 1, backgroundColor: '#fef3c7', borderRadius: 2, color: '#d97706' }}>
                  <WaitingIcon />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700} color="#92400e">
                    🚚 Cajas en Tránsito desde Almacén Central ({cajasEnTransito.length})
                  </Typography>
                  <Typography variant="caption" color="#b45309">
                    Escanee el código GS1-128 con la pistola láser o seleccione cajas masivamente
                  </Typography>
                </Box>
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Button 
                variant="contained" 
                color="success" 
                size="small"
                disabled={selectedLotes.length === 0 || actionLoading}
                onClick={() => handleAccionMasiva('RECIBIR')}
              >
                Recibir ({selectedLotes.length})
              </Button>
              <Button 
                variant="outlined" 
                color="error" 
                size="small"
                disabled={selectedLotes.length === 0 || actionLoading}
                onClick={() => handleAccionMasiva('RECHAZAR')}
              >
                Rechazar ({selectedLotes.length})
              </Button>
              <Chip label="Pendiente Recepción Lab" color="warning" size="small" sx={{ fontWeight: 700, ml: 1 }} />
            </Box>
          </Box>

          {viewMode === 'table' ? (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #fcd34d', borderRadius: 2, mb: 1 }}>
              <Table size="small">
                <TableHead sx={{ backgroundColor: '#fef3c7' }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox 
                        color="warning"
                        checked={selectedLotes.length === cajasEnTransito.length && cajasEnTransito.length > 0}
                        indeterminate={selectedLotes.length > 0 && selectedLotes.length < cajasEnTransito.length}
                        onChange={handleSelectAllLotes}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#92400e' }}>Producto</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#92400e' }}>Lote</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#92400e' }}>Código</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#92400e' }}>Despachado Por</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: '#92400e' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cajasEnTransito.map((trans) => (
                    <TableRow 
                      key={trans.id} 
                      hover
                      sx={{ 
                        backgroundColor: selectedLotes.includes(trans.id) ? 'rgba(245, 158, 11, 0.08)' : 'inherit',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox 
                          color="warning"
                          checked={selectedLotes.includes(trans.id)}
                          onChange={() => handleToggleSelectLote(trans.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#1e293b' }}>{trans.productoNombre}</TableCell>
                      <TableCell>
                        <Chip label={trans.numeroLote} size="small" variant="outlined" color="primary" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{trans.productoCodigo}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{trans.usuarioDespacho}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Recibir Caja Individual">
                          <IconButton 
                            size="small" 
                            color="success" 
                            onClick={() => handleConfirmarRecepcion(trans.id)}
                            disabled={actionLoading}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rechazar y Devolver a Almacén">
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleRechazarDevolucion(trans.id)}
                            disabled={actionLoading}
                          >
                            <WarningIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Grid container spacing={2}>
              {cajasEnTransito.map(trans => (
                <Grid item xs={12} sm={6} md={4} key={trans.id}>
                  <Card variant="outlined" sx={{ borderRadius: 2, borderColor: '#fcd34d', backgroundColor: '#ffffff', cursor: 'pointer' }} onClick={() => handleToggleSelectLote(trans.id)}>
                    <CardContent sx={{ p: 2, pb: 1 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Checkbox 
                            color="warning"
                            size="small"
                            sx={{ p: 0 }}
                            checked={selectedLotes.includes(trans.id)}
                            onChange={(e) => { e.stopPropagation(); handleToggleSelectLote(trans.id); }}
                          />
                          <Typography variant="subtitle1" fontWeight={700} color="#1e293b">
                            {trans.productoNombre}
                          </Typography>
                        </Box>
                        <Chip label={trans.numeroLote} size="small" variant="outlined" color="primary" sx={{ fontWeight: 700 }} />
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Código: <strong>{trans.productoCodigo}</strong>
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                        Despachado por: <strong>{trans.usuarioDespacho}</strong>
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        fullWidth
                        startIcon={<CheckIcon />}
                        onClick={(e) => { e.stopPropagation(); handleConfirmarRecepcion(trans.id); }}
                        disabled={actionLoading}
                        sx={{ fontWeight: 700 }}
                      >
                        Confirmar
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={(e) => { e.stopPropagation(); handleRechazarDevolucion(trans.id); }}
                        disabled={actionLoading}
                        sx={{ minWidth: '40px' }}
                        title="Rechazar y Devolver"
                      >
                        ↩️
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Paper>
      )}

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
              label="Todos los Equipos"
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
            <Chip
              size="small"
              label="Mindray CL-900i"
              clickable
              color={equipoFiltro === 'Mindray CL-900i' ? 'warning' : 'default'}
              variant={equipoFiltro === 'Mindray CL-900i' ? 'filled' : 'outlined'}
              onClick={() => setEquipoFiltro('Mindray CL-900i')}
              sx={{ fontWeight: 600 }}
            />
            <Chip
              size="small"
              label="Mindray BC-5380"
              clickable
              color={equipoFiltro === 'Mindray BC-5380' ? 'success' : 'default'}
              variant={equipoFiltro === 'Mindray BC-5380' ? 'filled' : 'outlined'}
              onClick={() => setEquipoFiltro('Mindray BC-5380')}
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
                        const sugerenciaEquipo = caja.equipoAsociado || (esMindray ? 'Mindray BS-230' : 'CM 260i');
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
                                {caja.usuarioApertura ? <>Abierto por: <strong>{caja.usuarioApertura}</strong> </> : ''} en <strong>{caja.equipoAsociado || 'CM 260i'}</strong> el {formatDate(caja.fechaApertura)}
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
      
      {/* MODAL DE CONFIRMACION PREVIA */}
      <Dialog open={candidatosModalOpen} onClose={() => setCandidatosModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#0f172a', color: '#fff' }}>
          Confirmacion Previa: Busqueda de Caja
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Hemos encontrado <b>{candidatosScan.length}</b> similitud(es). 
            Por favor, seleccione la caja exacta:
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell><b>Producto</b></TableCell>
                  <TableCell><b>Lote</b></TableCell>
                  <TableCell><b>Vencimiento (FEFO)</b></TableCell>
                  <TableCell><b>Estado actual</b></TableCell>
                  <TableCell><b>Ubicación</b></TableCell>
                  <TableCell><b>Equipo</b></TableCell>
                  <TableCell align="center"><b>Accion</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {candidatosScan.map((c) => (
                  <TableRow key={c.id} sx={{ backgroundColor: c.estaEnLab ? '#f0fdf4' : 'inherit' }}>
                    <TableCell sx={{ fontWeight: 600 }}>{c.producto}</TableCell>
                    <TableCell><Chip size="small" label={c.lote} sx={{ fontWeight: 700 }} /></TableCell>
                    <TableCell sx={{ color: '#d97706', fontWeight: 600 }}>
                      {c.fechaVencimiento ? new Date(c.fechaVencimiento).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {c.estadoTransferencia === 'EN_TRANSITO' 
                        ? <Chip size="small" label="En Tránsito" color="warning" />
                        : <Chip size="small" label={c.estado || 'Cerrado'} color={c.estado === 'Activo' ? 'success' : 'primary'} variant="outlined"/>
                      }
                    </TableCell>
                    <TableCell>
                      <Chip 
                        size="small" 
                        label={c.ubicacionTexto || (c.estaEnLab ? 'Almacén Laboratorio' : (c.estadoTransferencia === 'EN_TRANSITO' ? 'En Tránsito' : 'Almacén Central'))} 
                        sx={{ 
                          fontWeight: 700, 
                          backgroundColor: c.estaEnLab ? '#dcfce7' : (c.estadoTransferencia === 'EN_TRANSITO' ? '#fef3c7' : '#fee2e2'),
                          color: c.estaEnLab ? '#15803d' : (c.estadoTransferencia === 'EN_TRANSITO' ? '#b45309' : '#b91c1c'),
                          border: `1px solid ${c.estaEnLab ? '#86efac' : (c.estadoTransferencia === 'EN_TRANSITO' ? '#fde68a' : '#fca5a5')}`
                        }}
                      />
                    </TableCell>
                    <TableCell>{c.equipoAsociado}</TableCell>
                    <TableCell align="center">
                      {c.estaEnLab && (c.estado === 'Activo' || c.estado?.toLowerCase() === 'activo') ? (
                        <Tooltip title="Bloqueado: Esta caja ya fue abierta y sus frascos se encuentran activos en producción en el analizador.">
                          <span>
                            <Button 
                              variant="outlined" 
                              size="small"
                              disabled
                              sx={{ 
                                fontWeight: 700, 
                                opacity: 0.65,
                                color: '#15803d !important',
                                borderColor: '#86efac !important',
                                backgroundColor: '#f0fdf4 !important',
                                cursor: 'not-allowed',
                                textTransform: 'none'
                              }}
                            >
                              En Producción
                            </Button>
                          </span>
                        </Tooltip>
                      ) : c.estaEnLab ? (
                        <Button 
                          variant="contained" 
                          color="success" 
                          size="small"
                          sx={{ fontWeight: 700 }}
                          onClick={() => handleProcesarLote(c.id, c.equipoAsociado)}
                        >
                          Abrir en Lab
                        </Button>
                      ) : c.estadoTransferencia === 'EN_TRANSITO' ? (
                        <Button 
                          variant="contained" 
                          color="warning" 
                          size="small"
                          sx={{ fontWeight: 700 }}
                          onClick={() => handleProcesarLote(c.id, c.equipoAsociado)}
                        >
                          Recibir en Lab
                        </Button>
                      ) : (
                        <Tooltip title="Bloqueado: La caja está en Almacén Central. Primero debe transferirse y recibirse en Laboratorio.">
                          <span>
                            <Button 
                              variant="outlined" 
                              color="error" 
                              size="small"
                              disabled
                              sx={{ fontWeight: 700, opacity: 0.6 }}
                            >
                              En Almacén Central
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCandidatosModalOpen(false)} color="inherit">
            Cancelar Busqueda
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        {(() => {
          // Evaluar si existe una caja previa activa en el mismo analizador y canal
          const cajaActivaPrevia = selectedCaja ? (cajasData.cajasEnUso || []).find(c => {
            const eqCaja = (c.equipoAsociado || c.equipo || '').toUpperCase();
            const eqSel = (equipoSeleccionado || '').toUpperCase();
            const matchEquipo = eqCaja.includes(eqSel) || eqSel.includes(eqCaja) ||
              (eqSel.includes('CL-900') && eqCaja.includes('CL-900')) ||
              (eqSel.includes('BS-230') && eqCaja.includes('BS-230')) ||
              (eqSel.includes('260') && eqCaja.includes('260'));
            if (!matchEquipo) return false;

            const nomA = (c.productoNombre || '').toUpperCase().trim();
            const nomB = (selectedCaja.productoNombre || '').toUpperCase().trim();
            const simplificar = str => str.replace(/\(.*?\)/g, '').replace(/10\s*LTS|50\s*ML|100\s*DET|R1|R2/gi, '').trim();
            return nomA === nomB || simplificar(nomA) === simplificar(nomB) || (c.inventarioId && c.inventarioId === selectedCaja.inventarioId);
          }) : null;

          const esMismoLote = Boolean(cajaActivaPrevia && cajaActivaPrevia.numeroLote === selectedCaja?.numeroLote);
          const esSustitucion = Boolean(cajaActivaPrevia && cajaActivaPrevia.numeroLote !== selectedCaja?.numeroLote);

          return (
            <>
              <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
                {esSustitucion ? (
                  <WarningIcon sx={{ color: '#d97706', fontSize: 28 }} />
                ) : esMismoLote ? (
                  <SyncIcon sx={{ color: '#0284c7', fontSize: 28 }} />
                ) : (
                  <LockOpenIcon sx={{ color: '#16a34a', fontSize: 28 }} />
                )}
                <Box>
                  <Typography variant="h6" fontWeight={700} color={esSustitucion ? '#92400e' : esMismoLote ? '#0369a1' : '#0f172a'}>
                    {esSustitucion
                      ? '⚠️ Sustitución de Reactivo / Cambio de Lote en Analizador'
                      : esMismoLote
                      ? '🔄 Continuidad de Lote: Apertura de Siguiente Caja'
                      : 'Confirmar Apertura de Caja y Colocación de Frasco'}
                  </Typography>
                  <Typography variant="caption" color="#64748b">
                    Canal: {selectedCaja?.productoNombre || 'Reactivo Clínico'} | Equipo: {equipoSeleccionado}
                  </Typography>
                </Box>
              </DialogTitle>

              <DialogContent dividers sx={{ py: 2 }}>
                {selectedCaja && (
                  <Box>
                    {/* ALERTA DE ROL BIOANALISTA Y UBICACIÓN */}
                    <Alert severity="success" sx={{ mb: 2, fontWeight: 600, borderRadius: 2 }}>
                      📍 Caja verificada en Almacén de Laboratorio. Apertura y colocación autorizada exclusivamente para Bioanalistas.
                      Responsable: <strong>{user?.nombre_completo || user?.usuario || 'Bioanalista en Turno'}</strong>.
                    </Alert>

                    {/* COMPARATIVA EN CASO DE SUSTITUCIÓN DE LOTE O CAMBIO DE MARCA */}
                    {esSustitucion && (
                      <Paper sx={{ p: 2, mb: 2.5, backgroundColor: '#fffbeb', border: '2px solid #f59e0b', borderRadius: 2.5 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#92400e', display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                          <WarningIcon sx={{ color: '#f59e0b' }} />
                          ALERTA DE SUSTITUCIÓN DE CANAL: EN EL ROTOR SOLO PUEDE HABER 1 CAJA ACTIVA
                        </Typography>

                        <Grid container spacing={2}>
                          {/* CAJA SALIENTE */}
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ p: 1.5, backgroundColor: '#ffffff', borderRadius: 2, border: '1px solid #fcd34d' }}>
                              <Chip label="Caja Actual en Analizador (Saliente)" size="small" sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 700, mb: 1 }} />
                              <Typography variant="body2" fontWeight={700} color="#0f172a">
                                {cajaActivaPrevia.productoNombre}
                              </Typography>
                              <Typography variant="caption" display="block" color="#475569">
                                <strong>Marca:</strong> {cajaActivaPrevia.marca || 'Mindray'} | <strong>Lote:</strong> {cajaActivaPrevia.numeroLote}
                              </Typography>
                              <Typography variant="caption" display="block" color="#dc2626" fontWeight={600} sx={{ mt: 0.5 }}>
                                Pruebas Restantes: {cajaActivaPrevia.pruebasRestantes ?? 'N/D'}
                              </Typography>
                              <Typography variant="caption" display="block" color="#64748b" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                ➔ Se cerrará administrativamente como "Agotada por sustitución".
                              </Typography>
                            </Box>
                          </Grid>

                          {/* CAJA ENTRANTE */}
                          <Grid item xs={12} sm={6}>
                            <Box sx={{ p: 1.5, backgroundColor: '#ffffff', borderRadius: 2, border: '1px solid #86efac' }}>
                              <Chip label="Nueva Caja a Montar (Entrante)" size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 700, mb: 1 }} />
                              <Typography variant="body2" fontWeight={700} color="#0f172a">
                                {selectedCaja.productoNombre}
                              </Typography>
                              <Typography variant="caption" display="block" color="#475569">
                                <strong>Marca:</strong> {selectedCaja.marca || 'Wiener'} | <strong>Lote:</strong> {selectedCaja.numeroLote}
                              </Typography>
                              <Typography variant="caption" display="block" color="#16a34a" fontWeight={600} sx={{ mt: 0.5 }}>
                                Pruebas Teóricas: {selectedCaja.pruebasTeoricasCaja || selectedCaja.pruebasPorCaja || (selectedCaja.totalFrascos * selectedCaja.volPorFrasco)} pruebas
                              </Typography>
                              <Typography variant="caption" display="block" color="#15803d" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                                ➔ Se activará en el analizador e iniciará su ciclo de conteo limpio.
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    )}

                    {/* CONTINUIDAD DE LOTE */}
                    {esMismoLote && (
                      <Alert severity="info" sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}>
                        🔄 <strong>Continuidad de Lote:</strong> Se detectó que la caja previa en el equipo pertenece al mismo lote ({selectedCaja.numeroLote}).
                        Al abrir esta caja, la anterior se sella y el sistema continuará acumulando el conteo de pruebas, calibraciones y controles a nivel del Lote.
                      </Alert>
                    )}

                    {/* DETALLES DE LA CAJA SELECCIONADA */}
                    {!esSustitucion && (
                      <Box sx={{ backgroundColor: '#f8fafc', p: 2, borderRadius: 2, my: 2, border: '1px solid #e2e8f0' }}>
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="#0f172a">
                              <strong>Reactivo:</strong> {selectedCaja.productoNombre}
                            </Typography>
                            <Typography variant="subtitle2" color="#0f172a">
                              <strong>Marca:</strong> {selectedCaja.marca || 'Wiener / Mindray'}
                            </Typography>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Typography variant="subtitle2" color="#0f172a">
                              <strong>Lote:</strong> {selectedCaja.numeroLote}
                            </Typography>
                            <Typography variant="subtitle2" color="#0f172a">
                              <strong>Contenido:</strong> {selectedCaja.totalFrascos} frasco(s) × {selectedCaja.volPorFrasco}ml
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>
                    )}

                    {/* SELECTOR DE EQUIPO ANALIZADOR */}
                    <Box sx={{ my: 2, p: 2, backgroundColor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd' }}>
                      <FormControl component="fieldset" fullWidth>
                        <FormLabel component="legend" sx={{ fontWeight: 700, color: '#0369a1', fontSize: '0.85rem', mb: 1 }}>
                          Analizador donde se montará físicamente el Frasco:
                        </FormLabel>
                        <RadioGroup
                          row
                          value={equipoSeleccionado}
                          onChange={(e) => setEquipoSeleccionado(e.target.value)}
                        >
                          <FormControlLabel
                            value="CM 260i"
                            control={<Radio size="small" color="primary" />}
                            label={<Typography variant="body2" fontWeight={600}>Wiener CM 260i</Typography>}
                          />
                          <FormControlLabel
                            value="Mindray BS-230"
                            control={<Radio size="small" color="primary" />}
                            label={<Typography variant="body2" fontWeight={600}>Mindray BS-230</Typography>}
                          />
                          <FormControlLabel
                            value="Mindray CL-900i"
                            control={<Radio size="small" color="warning" />}
                            label={<Typography variant="body2" fontWeight={600}>Mindray CL-900i</Typography>}
                          />
                          <FormControlLabel
                            value="Mindray BC 5380"
                            control={<Radio size="small" color="success" />}
                            label={<Typography variant="body2" fontWeight={600}>Mindray BC 5380</Typography>}
                          />
                        </RadioGroup>
                      </FormControl>
                    </Box>

                    {/* DIAGRAMA VISUAL DE OPERACIÓN Y GARANTÍAS */}
                    <Box sx={{ mt: 2, p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1.5 }}>
                        Esquema Operativo de Laboratorio & Controlab Sniffer:
                      </Typography>
                      <Grid container spacing={1} alignItems="center">
                        <Grid item xs={12} sm={3.6}>
                          <Box sx={{ p: 1, bgcolor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 1.5, textAlign: 'center' }}>
                            <Typography variant="caption" fontWeight={700} color="#0f172a" display="block">1. Selección en Nevera</Typography>
                            <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.72rem' }}>Mindray o Wiener</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={0.6} sx={{ textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>➔</Grid>
                        <Grid item xs={12} sm={3.6}>
                          <Box sx={{ p: 1, bgcolor: esSustitucion ? '#fef3c7' : '#f0f9ff', border: `1px solid ${esSustitucion ? '#f59e0b' : '#38bdf8'}`, borderRadius: 1.5, textAlign: 'center' }}>
                            <Typography variant="caption" fontWeight={700} color={esSustitucion ? '#92400e' : '#0369a1'} display="block">
                              2. {esSustitucion ? 'Sustitución de Lote' : esMismoLote ? 'Continuidad de Lote' : 'Apertura de Canal'}
                            </Typography>
                            <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.72rem' }}>
                              {esSustitucion ? 'Cierra anterior y abre nuevo' : esMismoLote ? 'Acumula conteo del lote' : 'Canal libre en analizador'}
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={12} sm={0.6} sx={{ textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>➔</Grid>
                        <Grid item xs={12} sm={3.6}>
                          <Box sx={{ p: 1, bgcolor: '#f0fdf4', border: '1px solid #86efac', borderRadius: 1.5, textAlign: 'center' }}>
                            <Typography variant="caption" fontWeight={700} color="#166534" display="block">3. Sniffer Automático</Typography>
                            <Typography variant="caption" color="#64748b" sx={{ fontSize: '0.72rem' }}>Deducción exacta sin tocar nada</Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Typography variant="caption" color="#059669" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                          ✓ <strong>Cero error:</strong> El sistema advierte y compara antes de sustituir cualquier reactivo en el analizador.
                        </Typography>
                        <Typography variant="caption" color="#059669" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                          ✓ <strong>Trazabilidad 100%:</strong> Todo queda registrado con el Nombre y Apellido real del Bioanalista.
                        </Typography>
                        <Typography variant="caption" color="#059669" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}>
                          ✓ <strong>Sniffer dinámico:</strong> Siempre sabe con precisión matemática de cuál frasco activo descontar.
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </DialogContent>

              <DialogActions sx={{ p: 2.5, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <Button onClick={() => setModalOpen(false)} color="inherit" sx={{ fontWeight: 600, px: 2 }}>
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  onClick={handleAbrirCaja}
                  disabled={actionLoading}
                  sx={{
                    backgroundColor: esSustitucion ? '#d97706' : esMismoLote ? '#0284c7' : '#16a34a',
                    '&:hover': {
                      backgroundColor: esSustitucion ? '#b45309' : esMismoLote ? '#0369a1' : '#15803d'
                    },
                    color: '#ffffff',
                    fontWeight: 700,
                    px: 3,
                    py: 1,
                    borderRadius: 2
                  }}
                >
                  {actionLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : esSustitucion ? (
                    `Confirmar Sustitución y Montar en ${equipoSeleccionado}`
                  ) : esMismoLote ? (
                    `Confirmar Continuidad y Montar en ${equipoSeleccionado}`
                  ) : (
                    `Confirmar y Colocar en ${equipoSeleccionado}`
                  )}
                </Button>
              </DialogActions>
            </>
          );
        })()}
      </Dialog>
    </Container>
  );
};

export default GestionCajasFrascos;
