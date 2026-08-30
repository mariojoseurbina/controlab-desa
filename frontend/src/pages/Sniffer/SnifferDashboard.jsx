import React, { useState, useEffect } from 'react';
import axios from 'axios';
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
  Tab
} from '@mui/material';
import RadarIcon from '@mui/icons-material/Radar';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HandymanIcon from '@mui/icons-material/Handyman';
import { Grid, Card, CardContent, Divider } from '@mui/material';

const SnifferDashboard = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('ALL');

  const EQUIPOS_LIST = [
    { key: 'ALL', label: 'Todos los Equipos', ip: 'Red General' },
    { key: 'CLIA CL 900 (Inmunologia)', label: 'CLIA CL 900', ip: '192.168.1.50' },
    { key: 'BS 230 Mindray (Quimica)', label: 'BS 230 Mindray', ip: '192.168.1.51' },
    { key: 'BC 5000 Mindray (Hematologia)', label: 'BC 5000', ip: '192.168.1.52' },
    { key: 'BC 5380 Mindray (Hematologia)', label: 'BC 5380', ip: '192.168.1.53' },
    { key: 'CA 500 Sysmex (Coagulacion)', label: 'CA 500 Sysmex', ip: '192.168.1.54' }
  ];

  const fetchLogs = async () => {
    try {
      const response = await axios.get('/api/sniffer/logs');
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

  // Filtrar logs según la pestaña seleccionada
  const filteredLogs = selectedTab === 'ALL' 
    ? logs 
    : logs.filter(log => log.equipo_origen === selectedTab);

  // Calcular métricas offline para las tarjetas
  const totalPruebas = logs.length;
  const mermas = logs.filter(log => log.is_qc === true || log.is_repeticion === true);
  const mermasPorPrueba = {};
  mermas.forEach(m => {
      mermasPorPrueba[m.test_name] = (mermasPorPrueba[m.test_name] || 0) + 1;
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
                <Typography variant="h6" color="text.secondary">Total Interceptado</Typography>
              </Box>
              <Typography variant="h3" fontWeight="bold" color="#3D405B">{totalPruebas}</Typography>
              <Typography variant="body2" color="text.secondary">Tramas en la jornada actual</Typography>
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
              <Typography variant="h3" fontWeight="bold" color="error.main">{mermas.length}</Typography>
              <Typography variant="body2" color="text.secondary">QC ocultos y Repeticiones</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card elevation={2} sx={{ backgroundColor: '#fff', borderLeft: '5px solid #ed6c02' }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <HandymanIcon color="warning" sx={{ mr: 1 }} />
                <Typography variant="h6" color="text.secondary">Desglose de Fugas</Typography>
              </Box>
              <Box sx={{ maxHeight: '70px', overflowY: 'auto' }}>
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

      {/* FILTRO POR EQUIPO / ANALIZADOR */}
      <Paper elevation={3} sx={{ mb: 3, backgroundColor: '#2d2d2d', borderRadius: '12px', overflow: 'hidden' }}>
        <Tabs 
          value={selectedTab} 
          onChange={handleTabChange} 
          indicatorColor="error" 
          textColor="inherit" 
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            color: '#fff',
            '& .MuiTab-root': { py: 1.5, minWidth: '150px' },
            '& .Mui-selected': { color: '#f44336', backgroundColor: 'rgba(244, 67, 54, 0.05)' }
          }}
        >
          {EQUIPOS_LIST.map((eq) => (
            <Tab 
              key={eq.key} 
              value={eq.key} 
              label={
                <Box display="flex" flexDirection="column" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{eq.label}</Typography>
                  <Typography variant="caption" sx={{ color: '#888', fontWeight: 'normal', fontSize: '0.7rem', mt: 0.2 }}>{eq.ip}</Typography>
                </Box>
              } 
            />
          ))}
        </Tabs>
      </Paper>

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
              <TableCell sx={{ backgroundColor: '#2d2d2d', color: '#fff', fontWeight: 'bold' }}>Hora</TableCell>
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
                const hasDiscount = Number(log.ml_descontados) > 0;
                return (
                  <TableRow 
                    key={log.id} 
                    sx={{ 
                      backgroundColor: log.is_qc ? 'rgba(211, 47, 47, 0.12)' : (log.is_repeticion ? 'rgba(2, 136, 209, 0.12)' : 'inherit'),
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.05)' }
                    }}
                  >
                    <TableCell sx={{ color: '#aaa', fontFamily: 'monospace' }}>
                      {new Date(log.fecha_registro).toLocaleTimeString()}
                    </TableCell>
                    <TableCell sx={{ color: '#0288d1', fontWeight: 'bold' }}>
                      {log.equipo_origen || 'Desconocido'}
                    </TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: (log.is_qc || log.is_repeticion) ? 'bold' : 'normal' }}>
                      {log.patient_id}
                    </TableCell>
                    <TableCell sx={{ color: '#fff' }}>
                      <Chip label={log.test_name} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      {log.is_qc ? (
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
                    <TableCell sx={{ color: hasDiscount ? '#55ff55' : '#888', fontWeight: hasDiscount ? 'bold' : 'normal' }}>
                      {hasDiscount ? `-${Number(log.ml_descontados).toFixed(2)} ml` : '0.00 ml'}
                    </TableCell>
                    <TableCell sx={{ color: '#55ff55', fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.raw_frame ? log.raw_frame.replace(/\r\n/g, ' ↵ ') : ''}
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
