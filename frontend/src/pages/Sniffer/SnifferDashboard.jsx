import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../services/api';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Chip, 
  CircularProgress, 
  Tabs, 
  Tab,
  Grid, 
  Card, 
  CardContent,
  FormControlLabel,
  Switch,
  Tooltip
} from '@mui/material';
import RadarIcon from '@mui/icons-material/Radar';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HandymanIcon from '@mui/icons-material/Handyman';
import FilterListIcon from '@mui/icons-material/FilterList';
import ScienceIcon from '@mui/icons-material/Science';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const SnifferDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('ALL');
  const [hideAcks, setHideAcks] = useState(true);

  // ANALIZADORES REALES DEL LABORATORIO SEGÚN .ENV
  const EQUIPOS_LIST = [
    { key: 'ALL', label: 'Todos los Equipos', ip: 'Red General' },
    { key: 'CM_260I', label: 'CM 260i', ip: '192.168.10.188:5050' },
    { key: 'BS_230', label: 'Mindray BS-230', ip: '192.168.30.148:5050' }
  ];

  const fetchLogs = async () => {
    try {
      const response = await api.get('/sniffer/logs');
      if (response.data && response.data.success) {
        setLogs(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching sniffer logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Auto refresh every 2 seconds for a "live" feel
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  // Helper para extraer información real de la trama si viene como TEST_DESCONOCIDO o ACK
  const parseLogInfo = (log) => {
    let testName = log.test_name;
    let isAck = false;
    let isQry = false;

    if (log.raw_frame) {
      if (log.raw_frame.includes('ACK^R01') || log.raw_frame.includes('MSA|AA') || testName === 'HANDSHAKE_ACK') {
        isAck = true;
      } else if (log.raw_frame.includes('QRY^Q02') || testName === 'CONSULTA WORKLIST') {
        isQry = true;
        testName = 'CONSULTA WORKLIST';
      } else if (!testName || testName === 'TEST_DESCONOCIDO' || testName === 'RAW_FRAME' || /^\d+$/.test(testName)) {
        // Extraer analito del segmento HL7 OBX (ej. OBX|1|NM|13|Glucose (GOD-POD Method)|...)
        const obxFullMatch = log.raw_frame.match(/OBX\|\d+\|[A-Za-z0-9]+\|([^|^|\r\n]*)\|([^|^|\r\n]*)/);
        if (obxFullMatch) {
          const code = (obxFullMatch[1] || '').trim();
          const desc = (obxFullMatch[2] || '').trim();
          if (desc) {
            testName = desc;
          } else if (code) {
            testName = code;
          }
        }
      }
    }

    // Normalización de nombres de prueba para despliegue amigable
    let cleanName = testName || 'TEST_DESCONOCIDO';
    const upper = cleanName.toUpperCase();
    
    if (upper === '13' || upper.includes('GLUCOSE') || upper === 'GLUL' || upper === 'GLICEMIA' || upper === 'GLU') {
      cleanName = 'GLUCOSA / GLICEMIA';
    } else if (upper === '38' || upper === '39' || upper === '42' || upper.includes('HEMOGLOBIN') || upper.includes('HBA1C')) {
      cleanName = 'HEMOGLOBINA A1C';
    } else if (upper === 'UREL' || upper === 'UREA') {
      cleanName = 'UREA UV';
    } else if (upper === 'COLESTEROL' || upper === 'COL' || upper === 'CHOL') {
      cleanName = 'COLESTEROL TOTAL';
    } else if (upper === 'CRELC' || upper === 'CREA' || upper === 'CREATININA') {
      cleanName = 'CREATININA';
    } else if (upper === 'CAAIII' || upper === 'CALCIO') {
      cleanName = 'CALCIO';
    } else if (upper === 'URIL' || upper.includes('URICO')) {
      cleanName = 'ÁCIDO ÚRICO';
    } else if (upper === 'GOTL' || upper === 'GOT' || upper === 'AST') {
      cleanName = 'TRANSAMINASA GOT';
    } else if (upper === 'GPTL' || upper === 'GPT' || upper === 'ALT') {
      cleanName = 'TRANSAMINASA GPT';
    } else if (upper === 'BTL') {
      cleanName = 'BILIRRUBINA TOTAL';
    } else if (upper === 'BDL') {
      cleanName = 'BILIRRUBINA DIRECTA';
    } else if (upper === 'FOSFW') {
      cleanName = 'FÓSFORO';
    } else if (upper === 'TP') {
      cleanName = 'PROTEÍNAS TOTALES';
    } else if (upper === 'ALB') {
      cleanName = 'ALBÚMINA';
    } else if (upper === 'HDL') {
      cleanName = 'HDL COLESTEROL';
    } else if (upper === 'TRIGLICERIDOS' || upper === 'TRIG') {
      cleanName = 'TRIGLICÉRIDOS';
    }

    return {
      testName: isAck ? 'HANDSHAKE ACK' : (isQry ? 'CONSULTA WORKLIST' : cleanName),
      isAck,
      isQry
    };
  };

  // Filtrar logs según la pestaña seleccionada (por nombre de equipo o por IP) y switch de ACKs
  const filteredLogs = logs.filter(log => {
    const info = parseLogInfo(log);
    if (hideAcks && info.isAck) return false;

    if (selectedTab === 'ALL') return true;
    const origin = (log.equipo_origen || '').toLowerCase();
    const raw = (log.raw_frame || '').toLowerCase();

    if (selectedTab === 'CM_260I') {
      return origin.includes('cm 260') || origin.includes('cm260') || origin.includes('192.168.10.188') || origin.includes('wiener') || raw.includes('cm 260') || raw.includes('192.168.10.188');
    }
    if (selectedTab === 'BS_230') {
      return origin.includes('bs 230') || origin.includes('bs-230') || origin.includes('bs230') || origin.includes('192.168.30.148') || raw.includes('bs-230') || raw.includes('192.168.30.148');
    }
    return origin.includes(selectedTab.toLowerCase());
  });

  // Calcular métricas descartando handshakes de red y consultas LIS
  const clinicalTestLogs = logs.filter(l => {
    const info = parseLogInfo(l);
    return !info.isAck && !info.isQry;
  });

  const totalPruebas = clinicalTestLogs.length;
  const pruebasConDescuento = clinicalTestLogs.filter(l => Number(l.ml_descontados) > 0).length;
  const mermas = clinicalTestLogs.filter(log => log.is_qc === true || log.is_repeticion === true);
  const mermasPorPrueba = {};
  mermas.forEach(m => {
    const { testName } = parseLogInfo(m);
    if (testName && testName !== 'HANDSHAKE ACK' && testName !== 'CONSULTA WORKLIST') {
      mermasPorPrueba[testName] = (mermasPorPrueba[testName] || 0) + 1;
    }
  });

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={1}>
        <RadarIcon sx={{ fontSize: 40, color: 'error.main', mr: 2, animation: 'spin 2s linear infinite' }} />
        <Typography variant="h4" component="h1" fontWeight="bold">
          Centro de Auditoría de Red (CANS)
        </Typography>
        
        {/* Indicador de Escucha de Red */}
        <Box display="flex" alignItems="center" ml="auto" sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', px: 2, py: 0.8, borderRadius: '20px', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
          <span className="pulse-green"></span>
          <Typography variant="caption" sx={{ color: '#4caf50', fontWeight: 'bold', ml: 1, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Escucha Activa LAN
          </Typography>
        </Box>
      </Box>

      <Typography variant="body1" color="text.secondary" mb={4}>
        Monitoreo en tiempo real del tráfico ASTM/HL7 interceptado por el Microservicio Proxy.
      </Typography>

      {/* PANEL DE REPORTES OFFLINE */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ backgroundColor: '#fff', borderLeft: '5px solid #1976d2' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" color="text.secondary">Pruebas Clínicas Detectadas</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold" color="#3D405B">{totalPruebas}</Typography>
              <Typography variant="body2" color="text.secondary">
                {pruebasConDescuento} con descuento de reactivo activo
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ backgroundColor: '#fff', borderLeft: '5px solid #d32f2f' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <WarningAmberIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6" color="text.secondary">Total Mermas Detectadas</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold" color="#d32f2f">{mermas.length}</Typography>
              <Typography variant="body2" color="text.secondary">QC y Repeticiones identificadas</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ backgroundColor: '#fff', borderLeft: '5px solid #ff9800' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <HandymanIcon sx={{ color: '#ff9800', mr: 1 }} />
                <Typography variant="h6" color="text.secondary">Desglose de Fugas / Mermas</Typography>
              </Box>
              <Box maxHeight="80px" sx={{ overflowY: 'auto' }}>
                {Object.keys(mermasPorPrueba).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Sin mermas detectadas</Typography>
                ) : (
                  Object.entries(mermasPorPrueba).map(([test, count]) => (
                    <Box key={test} display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="body2" fontWeight="bold">{test}</Typography>
                      <Chip label={count} size="small" color="error" variant="outlined" sx={{ height: '20px' }} />
                    </Box>
                  ))
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* FILTRO POR EQUIPO / ANALIZADOR (IPS REALES DEL LABORATORIO) */}
      <Paper elevation={3} sx={{ mb: 2, backgroundColor: '#2d2d2d', borderRadius: '12px', overflow: 'hidden' }}>
        <Tabs 
          value={selectedTab} 
          onChange={handleTabChange} 
          indicatorColor="error" 
          textColor="inherit" 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            color: '#fff',
            '& .MuiTab-root': { py: 1.5, minWidth: '180px' },
            '& .Mui-selected': { color: '#f44336', backgroundColor: 'rgba(244, 67, 54, 0.08)' }
          }}
        >
          {EQUIPOS_LIST.map((eq) => (
            <Tab 
              key={eq.key} 
              value={eq.key} 
              label={
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{eq.label}</Typography>
                  <Typography variant="caption" sx={{ color: '#aaa', fontWeight: 'normal', fontSize: '0.75rem', mt: 0.3 }}>{eq.ip}</Typography>
                </Box>
              } 
            />
          ))}
        </Tabs>
      </Paper>

      {/* BARRA DE FILTRO Y CONTROL DE AUDITORÍA */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2} px={1}>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControlLabel
            control={
              <Switch 
                checked={hideAcks} 
                onChange={(e) => setHideAcks(e.target.checked)} 
                color="primary"
              />
            }
            label={
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                Ocultar Handshakes de red (ACK)
              </Typography>
            }
          />
          <Chip 
            label={`${filteredLogs.length} registros visibles`} 
            size="small" 
            sx={{ bgcolor: '#334155', color: '#cbd5e1', fontWeight: 600 }} 
          />
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4ade80' }} />
            <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
              Descuento activo (-ml)
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#fbbf24' }} />
            <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
              Auditado (Sin caja activa montada)
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ESTILOS CSS EXTRA PARA EL EFECTO PULSE */}
      <style>
        {`
          .pulse-green {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #4caf50;
            cursor: pointer;
            box-shadow: 0 0 0 rgba(76, 175, 80, 0.4);
            animation: pulseG 1.8s infinite;
          }
          @keyframes pulseG {
            0% {
              transform: scale(0.95);
              box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
            }
            70% {
              transform: scale(1);
              box-shadow: 0 0 0 8px rgba(76, 175, 80, 0);
            }
            100% {
              transform: scale(0.95);
              box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
            }
          }
        `}
      </style>

      <TableContainer component={Paper} elevation={3} sx={{ backgroundColor: '#1e1e1e', color: '#fff' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ backgroundColor: '#2d2d2d', color: '#fff', fontWeight: 'bold' }}>Fecha / Hora</TableCell>
              <TableCell sx={{ backgroundColor: '#2d2d2d', color: '#fff', fontWeight: 'bold' }}>Equipo / Analizador</TableCell>
              <TableCell sx={{ backgroundColor: '#2d2d2d', color: '#fff', fontWeight: 'bold' }}>Muestra / Paciente</TableCell>
              <TableCell sx={{ backgroundColor: '#2d2d2d', color: '#fff', fontWeight: 'bold' }}>Prueba</TableCell>
              <TableCell sx={{ backgroundColor: '#2d2d2d', color: '#fff', fontWeight: 'bold' }}>Clasificación de IA</TableCell>
              <TableCell sx={{ backgroundColor: '#2d2d2d', color: '#fff', fontWeight: 'bold' }}>Descuento ml</TableCell>
              <TableCell sx={{ backgroundColor: '#2d2d2d', color: '#fff', fontWeight: 'bold' }}>Trama Cruda (Red)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                  <CircularProgress color="error" />
                  <Typography mt={2} color="#fff">Escuchando la red...</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const { testName, isAck, isQry } = parseLogInfo(log);
                const hasDiscount = Number(log.ml_descontados) > 0;
                
                // Formatear nombre descriptivo del equipo
                let displayEquipo = log.equipo_origen || 'Desconocido';
                if (displayEquipo.includes('192.168.10.188') || displayEquipo.includes('CM 260') || displayEquipo.toLowerCase().includes('wiener')) {
                  displayEquipo = 'CM 260i (Inmunología)';
                } else if (displayEquipo.includes('192.168.30.148') || displayEquipo.includes('BS 230') || displayEquipo.includes('BS-230')) {
                  displayEquipo = 'Mindray BS 230 (Química)';
                }

                return (
                  <TableRow 
                    key={log.id} 
                    sx={{ 
                      backgroundColor: isAck 
                        ? 'rgba(71, 85, 105, 0.15)' 
                        : (log.is_qc 
                          ? 'rgba(211, 47, 47, 0.14)' 
                          : (log.is_repeticion ? 'rgba(2, 136, 209, 0.14)' : 'inherit')),
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' }
                    }}
                  >
                    <TableCell sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {(() => {
                        const d = new Date(log.fecha_registro);
                        const today = new Date();
                        const isToday = d.getDate() === today.getDate() && 
                                        d.getMonth() === today.getMonth() && 
                                        d.getFullYear() === today.getFullYear();
                        const timeStr = d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        const dateStr = d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' });
                        
                        return isToday ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                            <Chip label="HOY" size="small" sx={{ bgcolor: '#16a34a', color: '#fff', fontWeight: 800, height: 20, fontSize: 10 }} />
                            <Typography variant="body2" sx={{ color: '#4ade80', fontWeight: 'bold', fontFamily: 'monospace' }}>
                              {timeStr}
                            </Typography>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.8 }}>
                            <Chip label={dateStr} size="small" variant="outlined" sx={{ borderColor: '#475569', color: '#94a3b8', height: 20, fontSize: 10 }} />
                            <Typography variant="body2" sx={{ color: '#cbd5e1', fontFamily: 'monospace' }}>
                              {timeStr}
                            </Typography>
                          </Box>
                        );
                      })()}
                    </TableCell>
                    <TableCell sx={{ color: '#0288d1', fontWeight: 'bold' }}>
                      {displayEquipo}
                    </TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: (log.is_qc || log.is_repeticion) ? 'bold' : 'normal' }}>
                      {isAck ? '-' : (log.patient_id || '-')}
                    </TableCell>
                    <TableCell sx={{ color: '#fff' }}>
                      {isAck ? (
                        <Chip label="CONFIRMACIÓN ACK" size="small" sx={{ bgcolor: '#334155', color: '#cbd5e1', fontWeight: 600 }} />
                      ) : isQry ? (
                        <Chip label="CONSULTA WORKLIST" size="small" sx={{ bgcolor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #0284c7', fontWeight: 600 }} />
                      ) : (
                        <Chip label={testName} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      {isAck ? (
                        <Chip 
                          label="Handshake Red" 
                          size="small" 
                          sx={{ bgcolor: '#1e293b', color: '#94a3b8', fontSize: 11 }} 
                        />
                      ) : isQry ? (
                        <Chip 
                          label="Consulta Órdenes LIS" 
                          size="small" 
                          sx={{ bgcolor: 'rgba(14, 165, 233, 0.15)', color: '#38bdf8', fontSize: 11 }} 
                        />
                      ) : log.is_qc ? (
                        <Chip 
                          icon={<ErrorOutlineIcon />} 
                          label="MERMA / CONTROL" 
                          color="error" 
                          size="small" 
                          sx={{ fontWeight: 'bold' }}
                        />
                      ) : log.is_calibracion ? (
                        <Chip 
                          icon={<CheckCircleOutlineIcon />} 
                          label="CALIBRADOR" 
                          color="warning" 
                          size="small" 
                          sx={{ fontWeight: 'bold', color: '#fff' }}
                        />
                      ) : log.is_repeticion ? (
                        <Chip 
                          icon={<WarningAmberIcon />} 
                          label="REPETICION" 
                          color="info" 
                          size="small" 
                          sx={{ fontWeight: 'bold' }}
                        />
                      ) : (
                        <Chip 
                          icon={<CheckCircleOutlineIcon />} 
                          label="Prueba Normal" 
                          color="success" 
                          size="small" 
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {hasDiscount ? (
                        <Typography sx={{ color: '#4ade80', fontWeight: 'bold', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                          -{Number(log.ml_descontados).toFixed(2)} ml
                        </Typography>
                      ) : isAck || isQry ? (
                        <Typography sx={{ color: '#64748b', fontSize: '0.8rem' }}>-</Typography>
                      ) : (
                        <Box display="flex" flexDirection="column">
                          <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                            0.00 ml
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#fbbf24', fontSize: '0.68rem', lineHeight: 1.1 }}>
                            Sin caja activa montada
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: '#55ff55', fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.raw_frame ? log.raw_frame.replace(/\r\n|\r|\n/g, ' ↵ ') : ''}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
            
            {filteredLogs.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 5, color: '#aaa' }}>
                  No se ha recibido tráfico para este equipo.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default SnifferDashboard;
