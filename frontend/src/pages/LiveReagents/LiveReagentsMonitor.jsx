import React, { useState, useEffect } from 'react';
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
  Tab
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
  Cancel as CancelIcon
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

  // Acción: Validación Ágil de 3 Pruebas (Agotar caja y activar automáticamente la siguiente de la nevera)
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

  return (
    <Box sx={{ p: 3, backgroundColor: '#0b1120', minHeight: '100vh', color: '#f8fafc' }}>
      {/* HEADER PRINCIPAL TIPO CENTRO DE COMANDO */}
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 3, 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
          borderRadius: 3,
          border: '1px solid #334155'
        }}
      >
        <Grid container alignItems="center" justifyContent="space-between" spacing={2}>
          <Grid item xs={12} md={7}>
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

          <Grid item xs={12} md={5}>
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

      {/* CONTENIDO SEGÚN PESTAÑA */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={12}>
          <CircularProgress size={45} sx={{ color: '#38bdf8' }} />
        </Box>
      ) : activeTab === 0 ? (
        /* PESTAÑA 0: REACTIVOS ACTIVOS EN ANALIZADORES */
        cajasEnUso.length === 0 ? (
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
              Centro de Control en Espera: Sin Reactivos Activos en Analizadores
            </Typography>
            <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 650, mx: 'auto', mb: 3 }}>
              Actualmente todas las cajas transferidas al laboratorio se encuentran en estado <strong>CERRADA / SELLADA</strong> en la nevera.
              En cuanto el bioanalista monte un frasco y active la caja, aparecerá aquí con su monitor visual de 4 frascos en tiempo real.
            </Typography>
            <Box display="flex" justifyContent="center" gap={2}>
              <Chip 
                icon={<LockIcon sx={{ color: '#f59e0b !important' }} />}
                label={cajasCerradas.length + " Cajas Cerradas en Nevera del Laboratorio"}
                sx={{ backgroundColor: '#1e293b', color: '#f59e0b', fontWeight: 600, border: '1px solid #475569' }}
              />
            </Box>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {cajasEnUso.map((caja) => {
            const totalFrascos = caja.totalFrascos || 4;
            const volFrasco = caja.volPorFrasco || 45;
            const totalVolCaja = caja.totalVolCaja || (totalFrascos * volFrasco);
            const pctFrasco = caja.porcentajeRestante !== undefined ? caja.porcentajeRestante : Math.round((caja.mlRestantesFrasco / volFrasco) * 100);
            
            // Contar cuántas cajas cerradas en reserva existen de este mismo reactivo
            const cajasEnNevera = cajasCerradas.filter(c => c.inventarioId === caja.inventarioId).length;

            // Pruebas totales de la caja completa (sumatoria de todos los frascos) y pruebas restantes
            const pruebasPorCajaTotal = caja.pruebasPorCaja || (totalFrascos * (caja.pruebasPorFrasco || 180));
            const pruebasRestantesCajaTotal = caja.pruebasRestantesCaja !== undefined 
              ? caja.pruebasRestantesCaja 
              : Math.max(0, Math.floor((caja.mlRestantesCaja !== undefined ? caja.mlRestantesCaja : totalVolCaja) / 0.25));

            // Generar los frascos dinámicamente si no vienen precargados
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

            return (
              <Grid item xs={12} md={6} lg={6} xl={4} key={caja.id}>
                <Card 
                  sx={{ 
                    backgroundColor: '#1e293b', 
                    border: pctFrasco < 20 ? '2px solid #ef4444' : '1px solid #334155', 
                    color: '#f8fafc',
                    borderRadius: 3.5,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'visible',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
                      borderColor: '#38bdf8'
                    }
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* ENCABEZADO DE TARJETA: REACTIVO + ANALIZADOR */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight="900" sx={{ color: '#f8fafc', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                          {caja.productoNombre}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', mt: 0.3, display: 'block' }}>
                          Marca: <strong style={{ color: '#cbd5e1' }}>{caja.marca || 'Wiener Lab'}</strong> | Lote: <strong style={{ color: '#38bdf8' }}>{caja.numeroLote}</strong>
                        </Typography>
                      </Box>
                      <Chip 
                        size="small"
                        icon={<AnalyzerIcon sx={{ fontSize: 15 }} />}
                        label={caja.equipoAsociado || 'CM 260i'} 
                        sx={{ 
                          backgroundColor: '#0f172a', 
                          color: '#38bdf8', 
                          fontWeight: 800, 
                          border: '1px solid #334155',
                          px: 0.5
                        }} 
                      />
                    </Box>

                    {/* TÍTULO DEL RACK DE FRASCOS */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                        🧪 Ficha: {totalFrascos} frascos x {volFrasco} mL ({pruebasPorCajaTotal} Test Totales)
                      </Typography>
                      <Chip 
                        size="small"
                        label={`Frasco ${caja.frascoActual} de ${totalFrascos} Activo`}
                        sx={{ 
                          height: 20, 
                          fontSize: '0.65rem', 
                          fontWeight: 800, 
                          backgroundColor: 'rgba(16, 185, 129, 0.15)', 
                          color: '#10b981', 
                          border: '1px solid rgba(16, 185, 129, 0.4)' 
                        }} 
                      />
                    </Box>

                      {/* RACK VISUAL DE LOS 4 FRASCOS */}
                      <Grid container spacing={1.5} sx={{ mb: 2.5 }}>
                        {frascos.map((frasco) => {
                          const esAgotado = frasco.estado === 'AGOTADO';
                          const esEnUso = frasco.estado === 'EN USO';
                          const esSellado = frasco.estado === 'SELLADO';

                          return (
                            <Grid item xs={3} key={frasco.numero}>
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
                                  borderRadius: 2.5,
                                  p: 1,
                                  textAlign: 'center',
                                  transition: 'all 0.3s ease',
                                  boxShadow: esEnUso ? '0 0 14px rgba(16, 185, 129, 0.25)' : 'none',
                                  position: 'relative'
                                }}
                              >
                                {/* NÚMERO Y ESTADO DEL FRASCO */}
                                <Typography 
                                  variant="caption" 
                                  fontWeight="900" 
                                  sx={{ 
                                    display: 'block', 
                                    color: esAgotado ? '#f87171' : esEnUso ? '#10b981' : '#94a3b8',
                                    fontSize: '0.75rem'
                                  }}
                                >
                                  F{frasco.numero}
                                </Typography>

                                {/* BADGE DE ESTADO */}
                                <Box sx={{ my: 0.5 }}>
                                  {esAgotado && (
                                    <Chip 
                                      label="AGOTADO" 
                                      size="small" 
                                      sx={{ 
                                        height: 18, 
                                        fontSize: '0.6rem', 
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
                                        height: 18, 
                                        fontSize: '0.6rem', 
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
                                        height: 18, 
                                        fontSize: '0.6rem', 
                                        fontWeight: 800, 
                                        backgroundColor: '#334155', 
                                        color: '#94a3b8' 
                                      }} 
                                    />
                                  )}
                                </Box>

                                {/* CILINDRO / TUBO VISUAL DE REACTIVO */}
                                <Box 
                                  sx={{ 
                                    width: '100%', 
                                    height: 48, 
                                    backgroundColor: '#0f172a', 
                                    borderRadius: 2, 
                                    my: 0.8, 
                                    position: 'relative', 
                                    overflow: 'hidden',
                                    border: '1px solid rgba(255,255,255,0.06)'
                                  }}
                                >
                                  {/* Columna de Líquido */}
                                  <Box 
                                    sx={{ 
                                      position: 'absolute',
                                      bottom: 0,
                                      left: 0,
                                      right: 0,
                                      height: `${frasco.porcentaje}%`,
                                      background: esAgotado 
                                        ? '#ef4444' 
                                        : esEnUso 
                                          ? 'linear-gradient(180deg, #38bdf8 0%, #10b981 100%)' 
                                          : 'linear-gradient(180deg, #64748b 0%, #475569 100%)',
                                      transition: 'height 0.6s ease',
                                      borderRadius: '0 0 7px 7px'
                                    }} 
                                  />
                                  {/* Menisco / Indicador de porcentaje flotante */}
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      position: 'absolute', 
                                      top: '50%', 
                                      left: '50%', 
                                      transform: 'translate(-50%, -50%)', 
                                      fontWeight: 900, 
                                      fontSize: '0.65rem',
                                      color: '#ffffff',
                                      textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                                    }}
                                  >
                                    {frasco.porcentaje}%
                                  </Typography>
                                </Box>

                                {/* VOLUMEN NUMÉRICO */}
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    display: 'block', 
                                    fontWeight: 800, 
                                    fontSize: '0.68rem',
                                    color: esAgotado ? '#ef4444' : esEnUso ? '#38bdf8' : '#cbd5e1'
                                  }}
                                >
                                  {frasco.mlRestantes} mL
                                </Typography>
                              </Box>
                            </Grid>
                          );
                        })}
                      </Grid>

                      <Divider sx={{ borderColor: '#334155', mb: 2 }} />

                      {/* STOCK EN NEVERA, PRUEBAS FRASCO ACTIVO Y PRUEBAS CAJA COMPLETA */}
                      <Grid container spacing={1.2}>
                        <Grid item xs={4}>
                          <Box sx={{ backgroundColor: '#0f172a', p: 1.2, borderRadius: 2, textAlign: 'center', border: '1px solid #1e293b' }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontWeight: 700, fontSize: '0.72rem' }}>
                              📦 En Nevera
                            </Typography>
                            <Typography variant="body1" fontWeight="900" sx={{ color: cajasEnNevera > 0 ? '#38bdf8' : '#ef4444', my: 0.2 }}>
                              {cajasEnNevera} Cajas
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.62rem', display: 'block' }}>
                              Stock Reserva
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ backgroundColor: '#0f172a', p: 1.2, borderRadius: 2, textAlign: 'center', border: '1px solid #1e293b' }}>
                            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontWeight: 700, fontSize: '0.72rem' }}>
                              ⚡ Frasco Activo
                            </Typography>
                            <Typography variant="body1" fontWeight="900" sx={{ color: '#10b981', my: 0.2 }}>
                              ~{caja.pruebasRestantesFrasco}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.62rem', display: 'block' }}>
                              de {caja.pruebasPorFrasco || 180} test
                            </Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={4}>
                          <Box sx={{ 
                            backgroundColor: 'rgba(56, 189, 248, 0.08)', 
                            p: 1.2, 
                            borderRadius: 2, 
                            textAlign: 'center', 
                            border: '1px solid rgba(56, 189, 248, 0.25)'
                          }}>
                            <Typography variant="caption" sx={{ color: '#38bdf8', display: 'block', fontWeight: 800, fontSize: '0.72rem' }}>
                              🧪 Caja Completa
                            </Typography>
                            <Typography variant="body1" fontWeight="900" sx={{ color: '#f8fafc', my: 0.2 }}>
                              ~{pruebasRestantesCajaTotal}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#38bdf8', fontSize: '0.62rem', display: 'block', fontWeight: 700 }}>
                              Total: {pruebasPorCajaTotal} test
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>

                      {/* CONTEO EN VIVO DESDE SNIFFER */}
                      <Box 
                        sx={{ 
                          mt: 1.5, 
                          p: 1.5, 
                          borderRadius: 2, 
                          backgroundColor: 'rgba(56, 189, 248, 0.08)', 
                          border: '1px solid rgba(56, 189, 248, 0.2)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <Box>
                          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontWeight: 600 }}>
                            Pruebas Hoy (Sniffer LIS)
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="900" sx={{ color: '#38bdf8' }}>
                            {caja.pruebasConsumidasHoy} pruebas
                          </Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontWeight: 600 }}>
                            Volumen Descontado
                          </Typography>
                          <Typography variant="subtitle1" fontWeight="900" sx={{ color: '#a855f7' }}>
                            {caja.mlConsumidosHoy.toFixed(2)} mL
                          </Typography>
                        </Box>
                      </Box>

                      {/* BARRA DE ACCIONES DE VALIDACIÓN Y CONTROL */}
                      <Box sx={{ mt: 2, display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                        {caja.frascoActual < totalFrascos && (
                          <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            disabled={actionLoading}
                            startIcon={<FastForwardIcon />}
                            onClick={() => handleSiguienteFrasco(caja.id)}
                            sx={{
                              borderColor: '#334155',
                              color: '#cbd5e1',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              textTransform: 'none',
                              '&:hover': { borderColor: '#38bdf8', color: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.08)' }
                            }}
                          >
                            ⏩ Montar Frasco {caja.frascoActual + 1}
                          </Button>
                        )}
                        <Button
                          fullWidth
                          variant="contained"
                          size="small"
                          disabled={actionLoading}
                          startIcon={<FlashIcon />}
                          onClick={() => handleValidarTransicion3Pruebas(caja.id)}
                          sx={{
                            background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.75rem',
                            textTransform: 'none',
                            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #0369a1 0%, #0f766e 100%)'
                            }
                          }}
                        >
                          ⚡ Validar Transición (3 Pruebas)
                        </Button>
                      </Box>

                      {/* FOOTER */}
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1.5, textAlign: 'center' }}>
                        Abierto por: {caja.usuarioApertura || 'Bioanalista'} | Caja Total: {caja.mlRestantesCaja} / {totalVolCaja} mL (~{pruebasRestantesCajaTotal} de {pruebasPorCajaTotal} test restantes)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
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
              Cuando una caja termine sus 4 frascos en el analizador o se valide su transición, aparecerá archivada aquí con su trazabilidad.
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
