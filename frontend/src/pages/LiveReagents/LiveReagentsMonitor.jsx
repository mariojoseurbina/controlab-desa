import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  Badge,
  Tabs,
  Tab,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Science as ScienceIcon,
  LocalShipping as BoxIcon,
  PlayArrow as PlayIcon,
  Refresh as RefreshIcon,
  SmartToy as SmartToyIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Assessment as AssessmentIcon,
  NotificationsActive as PulseIcon,
  PictureAsPdf as PdfIcon,
  Storage as StorageIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const TOP_20_REACTIVOS_INITIAL = [
  { id: 1, nombre: 'GLUCOSA GOD-PAP', equipo: 'Mindray BS-200', frascos_caja: 6, vol_frasco: 100, consumo: 0.36, cajas: 5, frasco_activo_ml: 82.4, qc_hoy: 4, pac_hoy: 124 },
  { id: 2, nombre: 'ALT / GPT (TRANSAMINASA)', equipo: 'Mindray BS-200', frascos_caja: 6, vol_frasco: 100, consumo: 0.42, cajas: 3, frasco_activo_ml: 45.0, qc_hoy: 6, pac_hoy: 88 },
  { id: 3, nombre: 'AST / GOT (TRANSAMINASA)', equipo: 'Mindray BS-200', frascos_caja: 6, vol_frasco: 100, consumo: 0.42, cajas: 4, frasco_activo_ml: 60.2, qc_hoy: 6, pac_hoy: 85 },
  { id: 4, nombre: 'COLESTEROL TOTAL', equipo: 'Mindray BS-200', frascos_caja: 4, vol_frasco: 100, consumo: 0.35, cajas: 1, frasco_activo_ml: 18.5, qc_hoy: 2, pac_hoy: 94 },
  { id: 5, nombre: 'TRIGLICÉRIDOS GPO-PAP', equipo: 'Mindray BS-200', frascos_caja: 4, vol_frasco: 100, consumo: 0.35, cajas: 4, frasco_activo_ml: 91.0, qc_hoy: 2, pac_hoy: 90 },
  { id: 6, nombre: 'CREATININA CINÉTICA', equipo: 'Architect C4000', frascos_caja: 6, vol_frasco: 120, consumo: 0.50, cajas: 2, frasco_activo_ml: 32.0, qc_hoy: 4, pac_hoy: 110 },
  { id: 7, nombre: 'UREA UREASA-GLDH', equipo: 'Architect C4000', frascos_caja: 6, vol_frasco: 120, consumo: 0.48, cajas: 3, frasco_activo_ml: 77.5, qc_hoy: 4, pac_hoy: 105 },
  { id: 8, nombre: 'ÁCIDO ÚRICO', equipo: 'Mindray BS-200', frascos_caja: 4, vol_frasco: 100, consumo: 0.38, cajas: 5, frasco_activo_ml: 88.0, qc_hoy: 2, pac_hoy: 62 },
  { id: 9, nombre: 'BILIRRUBINA TOTAL', equipo: 'Architect C4000', frascos_caja: 4, vol_frasco: 80, consumo: 0.40, cajas: 2, frasco_activo_ml: 54.0, qc_hoy: 3, pac_hoy: 45 },
  { id: 10, nombre: 'BILIRRUBINA DIRECTA', equipo: 'Architect C4000', frascos_caja: 4, vol_frasco: 80, consumo: 0.40, cajas: 2, frasco_activo_ml: 41.2, qc_hoy: 3, pac_hoy: 45 },
  { id: 11, nombre: 'PROTEÍNA C REACTIVA (PCR)', equipo: 'Maglumi CL900i', frascos_caja: 2, vol_frasco: 50, consumo: 0.20, cajas: 6, frasco_activo_ml: 38.0, qc_hoy: 2, pac_hoy: 30 },
  { id: 12, nombre: 'HEMOGLOBINA GLICADA (HbA1c)', equipo: 'Mindray BC-5380', frascos_caja: 2, vol_frasco: 100, consumo: 0.30, cajas: 3, frasco_activo_ml: 65.0, qc_hoy: 2, pac_hoy: 52 },
  { id: 13, nombre: 'TSH ULTRASENSIBLE', equipo: 'Maglumi CL900i', frascos_caja: 2, vol_frasco: 50, consumo: 0.15, cajas: 4, frasco_activo_ml: 22.4, qc_hoy: 2, pac_hoy: 41 },
  { id: 14, nombre: 'T4 LIBRE (FT4)', equipo: 'Maglumi CL900i', frascos_caja: 2, vol_frasco: 50, consumo: 0.15, cajas: 3, frasco_activo_ml: 31.0, qc_hoy: 2, pac_hoy: 38 },
  { id: 15, nombre: 'PSA TOTAL (ANTÍGENO PROSTÁTICO)', equipo: 'Maglumi CL900i', frascos_caja: 2, vol_frasco: 50, consumo: 0.15, cajas: 5, frasco_activo_ml: 44.5, qc_hoy: 2, pac_hoy: 24 },
  { id: 16, nombre: 'FAL (FOSFATASA ALCALINA)', equipo: 'Mindray BS-200', frascos_caja: 4, vol_frasco: 100, consumo: 0.40, cajas: 2, frasco_activo_ml: 12.0, qc_hoy: 2, pac_hoy: 35 },
  { id: 17, nombre: 'CALCIO ARSENAZO III', equipo: 'Architect C4000', frascos_caja: 4, vol_frasco: 100, consumo: 0.35, cajas: 3, frasco_activo_ml: 70.0, qc_hoy: 2, pac_hoy: 40 },
  { id: 18, nombre: 'MAGNESIO XYLIDYL BLUE', equipo: 'Architect C4000', frascos_caja: 4, vol_frasco: 100, consumo: 0.35, cajas: 4, frasco_activo_ml: 84.0, qc_hoy: 2, pac_hoy: 28 },
  { id: 19, nombre: 'ELECTROLITOS SODIO (Na+)', equipo: 'ISE Analyser 9000', frascos_caja: 2, vol_frasco: 250, consumo: 0.60, cajas: 2, frasco_activo_ml: 140.0, qc_hoy: 4, pac_hoy: 70 },
  { id: 20, nombre: 'ELECTROLITOS POTASIO (K+)', equipo: 'ISE Analyser 9000', frascos_caja: 2, vol_frasco: 250, consumo: 0.60, cajas: 2, frasco_activo_ml: 135.0, qc_hoy: 4, pac_hoy: 70 }
];

const LiveReagentsMonitor = () => {
  const [reactivos, setReactivos] = useState(TOP_20_REACTIVOS_INITIAL);
  const [useRealDbData, setUseRealDbData] = useState(false);
  const [loadingDb, setLoadingDb] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [lastEvent, setLastEvent] = useState(null);
  const [pulseId, setPulseId] = useState(null);
  const [autoSimulate, setAutoSimulate] = useState(false);

  // Cargar datos reales desde la BD cuando se activa el Switch de Producción
  useEffect(() => {
    if (useRealDbData) {
      loadRealDbReactivos();
    } else {
      setReactivos(TOP_20_REACTIVOS_INITIAL);
    }
  }, [useRealDbData]);

  const loadRealDbReactivos = async () => {
    try {
      setLoadingDb(true);
      const res = await fetch(`${API_BASE_URL}/inventory`);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || [];
        // Filtrar reactivos cargados desde la Ficha de Ingreso
        const dbReactivos = items
          .filter(i => i.categoria === 'Reactivo' || i.grupo === 'REACTIVO' || i.consumo_indicado > 0)
          .map((item, idx) => ({
            id: item.id || idx + 100,
            nombre: item.nombre,
            equipo: item.equipo_asociado || 'Autoanalizador LIS',
            frascos_caja: parseFloat(item.frascos_por_caja) || 1,
            vol_frasco: parseFloat(item.volumen_por_frasco_ml) || 100,
            consumo: parseFloat(item.consumo_indicado) || 0.36,
            cajas: parseFloat(item.stock_actual) || 0,
            frasco_activo_ml: parseFloat(item.volumen_por_frasco_ml) || 100,
            qc_hoy: 0,
            pac_hoy: 0
          }));

        if (dbReactivos.length > 0) {
          setReactivos(dbReactivos);
        } else {
          alert("ℹ️ No hay reactivos cargados aún en la Base de Datos con Ficha de Ingreso. Mostrando plantilla demo.");
          setReactivos(TOP_20_REACTIVOS_INITIAL);
          setUseRealDbData(false);
        }
      }
    } catch (e) {
      console.error("Error cargando BD real:", e);
    } finally {
      setLoadingDb(false);
    }
  };

  // Simulación del Webhook Sniffer en vivo si está activado
  useEffect(() => {
    let interval = null;
    if (autoSimulate && reactivos.length > 0) {
      interval = setInterval(() => {
        simularPruebaSnifferAleatoria();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [autoSimulate, reactivos]);

  const simularPruebaSnifferAleatoria = () => {
    if (reactivos.length === 0) return;
    const randomIndex = Math.floor(Math.random() * reactivos.length);
    const target = reactivos[randomIndex];
    ejecutarDescuentoPrueba(target.id, target.nombre, target.consumo);
  };

  const ejecutarDescuentoPrueba = (id, nombre, consumo) => {
    setReactivos(prev => prev.map(item => {
      if (item.id === id) {
        let nuevoFrascoMl = item.frasco_activo_ml - consumo;
        let nuevasCajas = item.cajas;

        // Si el frasco se agota, activa automáticamente el siguiente frasco de la caja
        if (nuevoFrascoMl <= 0) {
          if (nuevasCajas > 0) {
            nuevasCajas -= (1 / (item.frascos_caja || 1));
            nuevoFrascoMl = item.vol_frasco - consumo;
          } else {
            nuevoFrascoMl = 0;
          }
        }

        return {
          ...item,
          frasco_activo_ml: Math.max(0, parseFloat(nuevoFrascoMl.toFixed(2))),
          cajas: Math.max(0, parseFloat(nuevasCajas.toFixed(2))),
          pac_hoy: item.pac_hoy + 1
        };
      }
      return item;
    }));

    setPulseId(id);
    setLastEvent({
      time: new Date().toLocaleTimeString(),
      reactivo: nombre,
      descuento: consumo,
      pacienteId: `PAC-${Math.floor(1000 + Math.random() * 9000)}`
    });

    setTimeout(() => setPulseId(null), 1500);
  };

  const handlePonerFrascoEnMarcha = (id) => {
    setReactivos(prev => prev.map(item => {
      if (item.id === id) {
        const cajasRestantes = Math.max(0, item.cajas - (1 / (item.frascos_caja || 1)));
        return {
          ...item,
          cajas: parseFloat(cajasRestantes.toFixed(2)),
          frasco_activo_ml: item.vol_frasco
        };
      }
      return item;
    }));
    alert("✅ Frasco nuevo puesto en marcha en el autoanalizador.");
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
      
      {/* HEADER DE IMPACTO */}
      <Paper sx={{ p: 2.5, mb: 3, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 3 }}>
        <Grid container alignItems="center" spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ScienceIcon sx={{ fontSize: 36, color: '#38bdf8' }} />
              <Box>
                <Typography variant="h5" fontWeight="900" sx={{ color: '#f8fafc', letterSpacing: 0.5 }}>
                  CONTROL-AB IA — REAGENT COMMAND CENTER
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  Monitor de Consumo de Reactivos en Tiempo Real (Sniffer LIS Webhook & Cerebro IA)
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            {/* SWITCH MODO PRESENTACIÓN DEMO VS MODO PRODUCCIÓN REAL */}
            <Paper sx={{ px: 1.5, py: 0.5, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 2 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={useRealDbData} 
                    onChange={(e) => setUseRealDbData(e.target.checked)} 
                    color="secondary"
                  />
                }
                label={
                  <Typography variant="caption" fontWeight="800" sx={{ color: useRealDbData ? '#a855f7' : '#38bdf8' }}>
                    {useRealDbData ? "💾 DATOS REALES (BD / FICHA INGRESO)" : "📱 MODO DEMO PRESENTACIÓN"}
                  </Typography>
                }
              />
            </Paper>

            <Chip 
              icon={<PulseIcon sx={{ color: autoSimulate ? '#4ade80 !important' : '#cbd5e1 !important' }} />}
              label={autoSimulate ? "🟢 STREAM SNIFFER CONECTADO" : "⚪ ESPERA RED"} 
              sx={{ 
                backgroundColor: autoSimulate ? 'rgba(74, 222, 128, 0.15)' : 'rgba(148, 163, 184, 0.1)', 
                color: autoSimulate ? '#4ade80' : '#94a3b8',
                fontWeight: '700',
                border: autoSimulate ? '1px solid #22c55e' : '1px solid #475569'
              }} 
            />
            <Button
              variant="contained"
              size="small"
              onClick={() => setAutoSimulate(!autoSimulate)}
              sx={{
                backgroundColor: autoSimulate ? '#ef4444' : '#0284c7',
                '&:hover': { backgroundColor: autoSimulate ? '#dc2626' : '#0369a1' },
                fontWeight: '700'
              }}
            >
              {autoSimulate ? "Pausar Sniffer" : "Simular Sniffer en Vivo"}
            </Button>
          </Grid>
        </Grid>

        {/* FEED DE ÚLTIMO EVENTO SNIFFER */}
        {lastEvent && (
          <Alert 
            icon={<PulseIcon />} 
            severity="success" 
            sx={{ mt: 2, backgroundColor: '#022c22', border: '1px solid #059669', color: '#6ee7b7' }}
          >
            <b>[SNIFFER EVENT {lastEvent.time}]</b> {lastEvent.pacienteId} corrió <b>{lastEvent.reactivo}</b>. Se descontaron <b>-{lastEvent.descuento} mL</b> del frasco activo en el analizador.
          </Alert>
        )}
      </Paper>

      {/* NAVEGACIÓN ENTRE TABS */}
      <Box sx={{ borderBottom: 1, borderColor: '#334155', mb: 3 }}>
        <Tabs 
          value={tabIndex} 
          onChange={(e, v) => setTabIndex(v)} 
          textColor="inherit"
          IndicatorColor="primary"
          sx={{
            '& .MuiTab-root': { color: '#94a3b8', fontWeight: '700', textTransform: 'none', fontSize: '1rem' },
            '& .Mui-selected': { color: '#38bdf8' }
          }}
        >
          <Tab label={`🎛️ Monitor ${useRealDbData ? 'Producción (Fichas Reales)' : 'Top 20 Demo'} en Vivo`} />
          <Tab label="🧠 Reporte Diario del Cerebro IA" />
        </Tabs>
      </Box>

      {/* TAB 0: MONITOR REACTIVOS EN VIVO */}
      {tabIndex === 0 && (
        <Grid container spacing={2.5}>
          {reactivos.map((r) => {
            const volFrasco = r.vol_frasco || 100;
            const pctFrasco = Math.round((r.frasco_activo_ml / volFrasco) * 100);
            const pruebasEnFrasco = r.consumo > 0 ? Math.floor(r.frasco_activo_ml / r.consumo) : 0;
            const pruebasEnCajas = r.consumo > 0 ? Math.floor((r.cajas * (r.frascos_caja || 1) * volFrasco) / r.consumo) : 0;
            const pruebasTotales = pruebasEnFrasco + pruebasEnCajas;
            const isPulsing = pulseId === r.id;

            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={r.id}>
                <Card 
                  sx={{ 
                    backgroundColor: isPulsing ? '#1e3a8a' : '#1e293b', 
                    border: isPulsing ? '2px solid #38bdf8' : (pctFrasco < 20 ? '1px solid #ef4444' : '1px solid #334155'), 
                    color: '#f8fafc',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    boxShadow: isPulsing ? '0 0 15px rgba(56, 189, 248, 0.5)' : 'none'
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#f8fafc', lineHeight: 1.2 }}>
                        {r.nombre}
                      </Typography>
                      {pctFrasco < 20 ? (
                        <Chip label="Stock Bajo" size="small" color="error" />
                      ) : (
                        <Chip label={`${(r.equipo || 'Equipo').split(' ')[0]}`} size="small" sx={{ backgroundColor: '#0f172a', color: '#94a3b8' }} />
                      )}
                    </Box>

                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mb: 1.5 }}>
                      Dosis: {r.consumo} mL/test | {r.frascos_caja} frascos x {r.vol_frasco} mL
                    </Typography>

                    {/* INDICADOR DE LÍQUIDO EN FRASCO EN USO */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight="700" sx={{ color: '#cbd5e1' }}>
                          🧪 Frasco en Uso: {r.frasco_activo_ml} / {r.vol_frasco} mL
                        </Typography>
                        <Typography variant="caption" fontWeight="800" sx={{ color: pctFrasco < 20 ? '#f87171' : '#38bdf8' }}>
                          {pctFrasco}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={pctFrasco} 
                        sx={{ 
                          height: 10, 
                          borderRadius: 5,
                          backgroundColor: '#0f172a',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: pctFrasco < 20 ? '#ef4444' : (pctFrasco < 50 ? '#f59e0b' : '#10b981')
                          }
                        }}
                      />
                    </Box>

                    <Divider sx={{ borderColor: '#334155', my: 1.5 }} />

                    {/* JERARQUÍA DE STOCK */}
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Box sx={{ backgroundColor: '#0f172a', p: 1, borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>📦 Cajas en Nevera</Typography>
                          <Typography variant="body1" fontWeight="900" sx={{ color: '#f8fafc' }}>
                            {r.cajas} Cajas
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ backgroundColor: '#0f172a', p: 1, borderRadius: 2, textAlign: 'center' }}>
                          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block' }}>⚡ Pruebas Restantes</Typography>
                          <Typography variant="body1" fontWeight="900" sx={{ color: '#38bdf8' }}>
                            ~{pruebasTotales.toLocaleString()}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'space-between' }}>
                    <Button 
                      size="small" 
                      variant="outlined"
                      onClick={() => handlePonerFrascoEnMarcha(r.id)}
                      sx={{ color: '#38bdf8', borderColor: '#0284c7', fontSize: '0.7rem' }}
                    >
                      Poner Frasco Nuevo
                    </Button>
                    <Button 
                      size="small" 
                      variant="contained"
                      onClick={() => ejecutarDescuentoPrueba(r.id, r.nombre, r.consumo)}
                      sx={{ backgroundColor: '#059669', fontSize: '0.7rem', '&:hover': { backgroundColor: '#047857' } }}
                    >
                      +1 Test (-{r.consumo}mL)
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* TAB 1: REPORTE DIARIO CEREBRO IA */}
      {tabIndex === 1 && (
        <Paper sx={{ p: 3, backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SmartToyIcon sx={{ fontSize: 36, color: '#a855f7' }} />
              <Box>
                <Typography variant="h6" fontWeight="800" sx={{ color: '#f8fafc' }}>
                  REPORTE DIARIO DE GESTIÓN Y EFICIENCIA DE REACTIVOS (CEREBRO IA)
                </Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  Informe Consolidado Inteligente — Cierre de Jornada Operativa
                </Typography>
              </Box>
            </Box>
            <Button variant="contained" startIcon={<PdfIcon />} sx={{ backgroundColor: '#7c3aed' }}>
              Exportar Reporte PDF
            </Button>
          </Box>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Pruebas Totales Procesadas Hoy</Typography>
                <Typography variant="h4" fontWeight="900" sx={{ color: '#38bdf8', mt: 0.5 }}>1,274</Typography>
                <Typography variant="caption" sx={{ color: '#4ade80' }}>1,216 Pacientes | 58 Controles/QC</Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Gasto de Reactivo ($ USD)</Typography>
                <Typography variant="h4" fontWeight="900" sx={{ color: '#facc15', mt: 0.5 }}>$ 314.50 USD</Typography>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Valor en Kárdex Diario</Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Eficiencia Promedio Inserto</Typography>
                <Typography variant="h4" fontWeight="900" sx={{ color: '#4ade80', mt: 0.5 }}>98.4 %</Typography>
                <Typography variant="caption" sx={{ color: '#4ade80' }}>Baja tasa de desperdicio</Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={3}>
              <Paper sx={{ p: 2, backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: 2 }}>
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>Alertas Predictivas de Recompra</Typography>
                <Typography variant="h4" fontWeight="900" sx={{ color: '#f87171', mt: 0.5 }}>2 Items</Typography>
                <Typography variant="caption" sx={{ color: '#f87171' }}>Colesterol y FAL en nivel crítico</Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* CEREBRO IA INSIGHTS */}
          <Typography variant="subtitle1" fontWeight="800" sx={{ color: '#c084fc', mb: 2 }}>
            🧠 CONCLUSIONES E INSIGHTS EMITIDOS POR EL CEREBRO CONTROL-AB IA:
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Alert severity="info" sx={{ backgroundColor: '#1e1b4b', border: '1px solid #4338ca', color: '#e0e7ff' }}>
              <b>1. Rendimiento Óptimo:</b> El reactivo <b>GLUCOSA GOD-PAP</b> presentó un rendimiento perfecto con un ahorro del +1.8% sobre la especificación del inserto comercial.
            </Alert>
            <Alert severity="warning" sx={{ backgroundColor: '#451a03', border: '1px solid #b45309', color: '#fef3c7' }}>
              <b>2. Desviación de Consumo:</b> Las <b>Transaminasas ALT/AST</b> presentaron un sobreconsumo del +8.5% debido a 6 corridas de Calibraciones repetidas por la mañana en el equipo Mindray.
            </Alert>
            <Alert severity="error" sx={{ backgroundColor: '#450a0a', border: '1px solid #b91c1c', color: '#fee2e2' }}>
              <b>3. Sugerencia de Orden de Compra Predictiva:</b> Al ritmo de consumo actual, la disponibilidad de <b>COLESTEROL TOTAL</b> se agotará en <b>1.8 días</b> (queda 1 Caja). Se recomienda generar una Orden de Compra por 2 Cajas de inmediato.
            </Alert>
          </Box>
        </Paper>
      )}

    </Box>
  );
};

export default LiveReagentsMonitor;
