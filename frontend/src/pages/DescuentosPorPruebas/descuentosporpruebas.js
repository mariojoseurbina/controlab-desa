import React, { useState, useEffect } from 'react';
import {
  Container, Box, Typography, Paper, Grid, Button, Tabs, Tab,
  Card, CardContent, LinearProgress, Alert, TextField, Snackbar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Modal, Checkbox, FormControl, InputLabel, Select, MenuItem,
  FormHelperText, CircularProgress, Chip, Radio, Accordion,
  AccordionSummary, AccordionDetails, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  Sync as SyncIcon, Upload as UploadIcon, PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon, List as ListIcon, Science as ScienceIcon,
  Settings as SettingsIcon, History as HistoryIcon,
  CheckBox as CheckBoxIcon,
  Calculate as CalculateIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import MuiAlert from '@mui/material/Alert';

// ✅ CONFIGURACIÓN CON VARIABLE DE ENTORNO
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const AlertComponent = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// 🎯 COMPONENTE MODAL DE MAPEO MASIVO
const MapeoMasivoModal = ({ open, onClose, examenes, fecha, onGuardado }) => {
  const [examenesParaMapear, setExamenesParaMapear] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [todosSeleccionados, setTodosSeleccionados] = useState(false);

  useEffect(() => {
    if (open && examenes.length > 0) {
      cargarSugerencias();
    }
  }, [open, examenes]);

  const cargarSugerencias = async () => {
    setCargando(true);
    try {
      const examenesSinMapear = examenes.filter(e => !e.ya_mapeado);
      
      const response = await fetch(`${API_BASE_URL}/mapeo/sugerir-lote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ examenes: examenesSinMapear.map(e => e.examen_nombre) })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const examenesConSugerencias = examenesSinMapear.map(examen => {
          const sugerencias = data.sugerencias.find(s => s.examen === examen.examen_nombre);
          
          // ✅ CONSUMO REAL DESDE EL LOTE - SIN VALORES POR DEFECTO
          const primerSugerencia = sugerencias?.sugerencias[0];
          
          return {
            ...examen,
            seleccionado: false,
            reactivo_id: primerSugerencia?.id || null,
            reactivo_nombre: primerSugerencia?.nombre || '',
            // ✅ SOLO USA EL CONSUMO REAL DEL LOTE, NUNCA 0.20
            consumo_por_prueba: primerSugerencia?.consumo_por_prueba || 0,
            sugerencias: sugerencias?.sugerencias || []
          };
        });
        
        setExamenesParaMapear(examenesConSugerencias);
      }
    } catch (error) {
      console.error('Error cargando sugerencias:', error);
    } finally {
      setCargando(false);
    }
  };

  const toggleSeleccionarTodos = () => {
    const nuevoEstado = !todosSeleccionados;
    setTodosSeleccionados(nuevoEstado);
    
    setExamenesParaMapear(prev => 
      prev.map(examen => ({
        ...examen,
        seleccionado: nuevoEstado
      }))
    );
  };

  const actualizarExamen = (index, cambios) => {
    setExamenesParaMapear(prev => 
      prev.map((examen, i) => 
        i === index ? { ...examen, ...cambios } : examen
      )
    );
  };

  const handleGuardar = async () => {
    const examenesSeleccionados = examenesParaMapear.filter(e => e.seleccionado);
    
    if (examenesSeleccionados.length === 0) {
      alert('Selecciona al menos un examen para mapear');
      return;
    }

    const invalidos = examenesSeleccionados.filter(e => !e.reactivo_id);
    if (invalidos.length > 0) {
      alert(`Los siguientes exámenes no tienen reactivo asignado: ${invalidos.map(e => e.examen_nombre).join(', ')}`);
      return;
    }

    setGuardando(true);

    try {
      const mapeos = examenesSeleccionados.map(examen => ({
        examen: examen.examen_nombre,
        reactivo_id: examen.reactivo_id,
        // ✅ SE GUARDA EL CONSUMO REAL DEL LOTE
        consumo_por_prueba: examen.consumo_por_prueba
      }));

      const response = await fetch(`${API_BASE_URL}/mapeo/guardar-masivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapeos })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message}`);
        onGuardado();
        onClose();
      } else {
        alert(`❌ ${data.message}`);
      }
    } catch (error) {
      console.error('Error guardando mapeo masivo:', error);
      alert('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  const calcularTotalMl = (examen) => {
    return (examen.pruebas * examen.consumo_por_prueba).toFixed(2);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: 1200,
        maxHeight: '90vh',
        bgcolor: 'background.paper',
        boxShadow: 24,
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box>
            <Typography variant="h6">🗂️ Mapeo Masivo de Exámenes</Typography>
            <Typography variant="body2" color="text.secondary">
              Fecha: {fecha} | {examenesParaMapear.length} exámenes sin mapear
            </Typography>
          </Box>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {cargando ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>Cargando sugerencias...</Typography>
            </Box>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                Selecciona los exámenes que deseas mapear. El sistema sugiere reactivos automáticamente.
              </Alert>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Checkbox checked={todosSeleccionados} onChange={toggleSeleccionarTodos} />
                <Typography variant="body2">
                  Seleccionar todos ({examenesParaMapear.filter(e => e.seleccionado).length} seleccionados)
                </Typography>
              </Box>

              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell width="50px">Sel.</TableCell>
                      <TableCell>Examen</TableCell>
                      <TableCell align="right">Pruebas</TableCell>
                      <TableCell>Reactivo Sugerido</TableCell>
                      <TableCell width="120px">Consumo (ml)</TableCell>
                      <TableCell align="right">Total ml</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {examenesParaMapear.map((examen, index) => (
                      <TableRow key={examen.examen_nombre}>
                        <TableCell><Checkbox checked={examen.seleccionado} onChange={(e) => actualizarExamen(index, { seleccionado: e.target.checked })} /></TableCell>
                        <TableCell><Typography variant="body2" fontWeight="medium">{examen.examen_nombre}</Typography></TableCell>
                        <TableCell align="right">{examen.pruebas}</TableCell>
                        <TableCell>
                          <FormControl fullWidth size="small">
                            <Select value={examen.reactivo_id || ''} onChange={(e) => {
                              const reactivo = examen.sugerencias.find(r => r.id === e.target.value);
                              actualizarExamen(index, {
                                reactivo_id: e.target.value,
                                reactivo_nombre: reactivo?.nombre,
                                // ✅ SIEMPRE USA EL CONSUMO REAL DEL LOTE SELECCIONADO
                                consumo_por_prueba: reactivo?.consumo_por_prueba || 0
                              });
                            }} displayEmpty>
                              {examen.sugerencias.map(reactivo => (
                                <MenuItem key={reactivo.id} value={reactivo.id}>
                                  {reactivo.nombre} ({reactivo.codigo}) - {reactivo.consumo_por_prueba}ml
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField 
                            type="number" 
                            value={examen.consumo_por_prueba} 
                            onChange={(e) => actualizarExamen(index, { consumo_por_prueba: parseFloat(e.target.value) || 0 })} 
                            size="small" 
                            InputProps={{ 
                              inputProps: { 
                                step: 0.01, 
                                min: 0,
                                readOnly: true // ✅ SOLO LECTURA - EL CONSUMO VIENE DEL LOTE
                              } 
                            }}
                            disabled // ✅ DESHABILITADO - NO SE PUEDE EDITAR MANUALMENTE
                          />
                        </TableCell>
                        <TableCell align="right"><Chip label={`${calcularTotalMl(examen)} ml`} size="small" color="primary" variant="outlined" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>📊 Resumen del mapeo:</Typography>
                <Box sx={{ display: 'flex', gap: 3 }}>
                  <Typography variant="body2"><strong>Exámenes seleccionados:</strong> {examenesParaMapear.filter(e => e.seleccionado).length}</Typography>
                  <Typography variant="body2"><strong>Total ml estimados:</strong> {examenesParaMapear.filter(e => e.seleccionado).reduce((total, examen) => total + (examen.pruebas * examen.consumo_por_prueba), 0).toFixed(2)} ml</Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={cargarSugerencias} disabled={cargando}>Actualizar Sugerencias</Button>
            <Button variant="contained" onClick={handleGuardar} disabled={guardando || examenesParaMapear.filter(e => e.seleccionado).length === 0} startIcon={guardando ? <CircularProgress size={20} /> : <CheckIcon />}>
              {guardando ? 'Guardando...' : `Guardar Mapeo (${examenesParaMapear.filter(e => e.seleccionado).length})`}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

// 🎯 COMPONENTE MODAL DE REPORTE DIARIO
const ReporteDescuentoModal = ({ open, onClose, fecha }) => {
  const [cargando, setCargando] = useState(false);
  const [reporte, setReporte] = useState(null);

  useEffect(() => {
    if (open) {
      cargarReporte();
    }
  }, [open]);

  const cargarReporte = async () => {
    setCargando(true);
    try {
      const response = await fetch(`${API_BASE_URL}/descuentos/calcular-dia?fecha=${fecha}`);
      const data = await response.json();
      
      if (data.success) {
        setReporte(data.datos);
      } else {
        alert(data.message);
        onClose();
      }
    } catch (error) {
      console.error('Error cargando reporte:', error);
      alert('Error de conexión');
    } finally {
      setCargando(false);
    }
  };

  const getEstadoStock = (reactivo) => {
    if (reactivo.ml_sin_cubrir > 0) {
      return { color: 'error', texto: 'Stock insuficiente', icono: <ErrorIcon /> };
    } else if (reactivo.total_ml > 0) {
      return { color: 'success', texto: 'Stock suficiente', icono: <CheckCircleIcon /> };
    } else {
      return { color: 'warning', texto: 'Sin consumo', icono: <WarningIcon /> };
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: 1000,
        maxHeight: '90vh',
        bgcolor: 'background.paper',
        boxShadow: 24,
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5">📅 Reporte de Descuentos - {fecha}</Typography>
            <Typography variant="body2" color="text.secondary">Cálculo FIFO automático de consumo de reactivos</Typography>
          </Box>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {cargando ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>Calculando descuentos del día...</Typography>
            </Box>
          ) : reporte ? (
            <>
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>📊 Resumen General</Typography>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <Box><Typography variant="body2" color="text.secondary">Exámenes Mapeados</Typography><Typography variant="h4">{reporte.total_examenes}</Typography></Box>
                  <Box><Typography variant="body2" color="text.secondary">Pruebas Totales</Typography><Typography variant="h4">{reporte.total_pruebas}</Typography></Box>
                  <Box><Typography variant="body2" color="text.secondary">Reactivos Utilizados</Typography><Typography variant="h4">{reporte.total_reactivos}</Typography></Box>
                  <Box><Typography variant="body2" color="text.secondary">Total ml Necesarios</Typography><Typography variant="h4" color="primary.main">{reporte.total_ml} ml</Typography></Box>
                </Box>
              </Paper>

              <Typography variant="h6" gutterBottom>🧪 Detalle por Reactivo</Typography>

              {reporte.reactivos.map((reactivo, index) => {
                const estado = getEstadoStock(reactivo);
                return (
                  <Accordion key={reactivo.reactivo_id} sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1">{reactivo.nombre} ({reactivo.codigo})</Typography>
                          <Typography variant="body2" color="text.secondary">{reactivo.examenes.length} exámenes • {reactivo.total_ml} ml totales</Typography>
                        </Box>
                        <Chip icon={estado.icono} label={estado.texto} color={estado.color} size="small" sx={{ ml: 2 }} />
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails>
                      <Typography variant="subtitle2" gutterBottom>Exámenes asociados:</Typography>
                      <TableContainer sx={{ mb: 2 }}>
                        <Table size="small">
                          <TableHead><TableRow><TableCell>Examen</TableCell><TableCell align="right">Pruebas</TableCell><TableCell align="right">Consumo/prueba</TableCell><TableCell align="right">Total ml</TableCell></TableRow></TableHead>
                          <TableBody>
                            {reactivo.examenes.map((examen, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{examen.examen}</TableCell>
                                <TableCell align="right">{examen.pruebas}</TableCell>
                                <TableCell align="right">{examen.consumo_por_prueba} ml</TableCell>
                                <TableCell align="right"><Chip label={`${examen.ml.toFixed(2)} ml`} size="small" variant="outlined" /></TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Typography variant="subtitle2" gutterBottom>Lotes a utilizar (orden FIFO):</Typography>
                      {reactivo.lotes_utilizados.length > 0 ? (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Lote</TableCell><TableCell>Vencimiento</TableCell><TableCell align="right">Disponible</TableCell><TableCell align="right">A descontar</TableCell><TableCell align="right">Restante</TableCell><TableCell>Estado</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {reactivo.lotes_utilizados.map((lote, idx) => (
                                <TableRow key={idx}>
                                  <TableCell><strong>{lote.numero_lote}</strong></TableCell>
                                  <TableCell>
                                    {new Date(lote.fecha_vencimiento).toLocaleDateString()}
                                    <Typography variant="caption" display="block" color="text.secondary">
                                      {lote.dias_para_vencer > 0 ? `${lote.dias_para_vencer} días` : 'VENCIDO'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">{lote.ml_disponibles.toFixed(2)} ml</TableCell>
                                  <TableCell align="right"><Chip label={`-${lote.ml_a_descontar.toFixed(2)} ml`} size="small" color="primary" /></TableCell>
                                  <TableCell align="right">{lote.ml_restantes.toFixed(2)} ml</TableCell>
                                  <TableCell>
                                    {lote.ml_restantes <= 0 ? <Chip label="AGOTADO" size="small" color="error" /> :
                                     lote.ml_restantes < 10 ? <Chip label="BAJO" size="small" color="warning" /> :
                                     <Chip label="OK" size="small" color="success" />}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Alert severity="warning">No hay lotes disponibles para este reactivo</Alert>
                      )}

                      {reactivo.ml_sin_cubrir > 0 && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                          <strong>Stock insuficiente:</strong> Faltan {reactivo.ml_sin_cubrir.toFixed(2)} ml
                        </Alert>
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })}

              {reporte.reactivos.length === 0 && (
                <Alert severity="info">No hay exámenes mapeados para esta fecha. Configura el mapeo primero.</Alert>
              )}
            </>
          ) : (
            <Alert severity="error">No se pudo cargar el reporte</Alert>
          )}
        </Box>

        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button onClick={onClose}>Cerrar</Button>
          <Button variant="contained" onClick={cargarReporte} disabled={cargando}>
            {cargando ? 'Calculando...' : 'Recalcular'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

// 🎯 COMPONENTE PRINCIPAL
const DescuentosPorPruebas = () => {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tabValue, setTabValue] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [procesandoDescuento, setProcesandoDescuento] = useState(false);
  const [estadisticas, setEstadisticas] = useState({
    totalExamenes: 0,
    conMapeo: 0,
    sinMapeo: 0,
    totalPruebas: 0,
  });
  const [examenes, setExamenes] = useState([]);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [modalMapeoMasivo, setModalMapeoMasivo] = useState(false);
  const [modalReporteDia, setModalReporteDia] = useState(false);
  const [modalResultados, setModalResultados] = useState({ open: false, data: null });
  const [examenesParaMapeoMasivo, setExamenesParaMapeoMasivo] = useState([]);

  const showMessage = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleCloseResultados = () => {
    setModalResultados({ open: false, data: null });
  };

  // ✅ CARGAR DATOS REALES AL CAMBIAR FECHA
  useEffect(() => {
    cargarPruebasReales();
    cargarExamenesParaMapeoMasivo();
  }, [fecha]);

  // ✅ FUNCIÓN PARA CARGAR DATOS REALES
  const cargarPruebasReales = async () => {
    console.log('🔍 Solicitando datos REALES para fecha:', fecha);
    
    try {
      const response = await fetch(`${API_BASE_URL}/descuentos/pruebas-dia?fecha=${fecha}`);
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📥 Respuesta REAL del backend:', data);
      
      if (data.success && data.data) {
        setExamenes(data.data);
        
        const totalExamenes = data.data.length;
        const totalPruebas = data.data.reduce((sum, item) => sum + (item.cantidad || 0), 0);
        
        setEstadisticas({
          totalExamenes: totalExamenes,
          conMapeo: data.estadisticas?.conMapeo || 0,
          sinMapeo: data.estadisticas?.sinMapeo || 0,
          totalPruebas: totalPruebas
        });
        
        showMessage(`✅ Datos reales cargados: ${totalExamenes} exámenes`, 'success');
      } else {
        setExamenes([]);
        setEstadisticas({
          totalExamenes: 0,
          conMapeo: 0,
          sinMapeo: 0,
          totalPruebas: 0
        });
        
        showMessage(data.message || 'No hay datos para esta fecha', 'warning');
      }
    } catch (error) {
      console.error('❌ Error cargando datos REALES:', error);
      setExamenes([]);
      setEstadisticas({
        totalExamenes: 0,
        conMapeo: 0,
        sinMapeo: 0,
        totalPruebas: 0
      });
      showMessage('Error conectando al servidor', 'error');
    }
  };

  // ✅ FUNCIÓN PARA CARGAR EXAMENES PARA MAPEO MASIVO
  const cargarExamenesParaMapeoMasivo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/mapeo/masivo?fecha=${fecha}`);
      const data = await response.json();
      
      if (data.success) {
        setExamenesParaMapeoMasivo(data.examenes);
        
        // Actualizar estadísticas
        const conMapeo = data.examenes.filter(e => e.ya_mapeado).length;
        const sinMapeo = data.examenes.filter(e => !e.ya_mapeado).length;
        
        setEstadisticas(prev => ({
          ...prev,
          conMapeo: conMapeo,
          sinMapeo: sinMapeo
        }));
      }
    } catch (error) {
      console.error('Error cargando exámenes para mapeo masivo:', error);
    }
  };

  // ✅ FUNCIÓN PARA IMPORTAR PRUEBAS REALES
  const importarPruebas = async () => {
    console.log('🚀 Iniciando importación REAL para:', fecha);
    setCargando(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/descuentos/importar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha })
      });
      
      const data = await response.json();
      console.log('📊 Respuesta importación:', data);
      
      if (data.success) {
        showMessage(`✅ ${data.data.estado}: ${data.data.examenes_importados || 0} exámenes importados`, 'success');
        setTimeout(() => {
          cargarPruebasReales();
          cargarExamenesParaMapeoMasivo();
        }, 1000);
      } else {
        showMessage(data.message || 'Error en importación', 'error');
      }
    } catch (error) {
      console.error('❌ Error importando:', error);
      showMessage('Error de conexión', 'error');
    } finally {
      setCargando(false);
    }
  };

  // ✅ FUNCIÓN PARA APLICAR DESCUENTO CON MODAL PROFESIONAL
  const aplicarDescuento = async () => {
    if (estadisticas.conMapeo === 0) {
      alert('No hay pruebas mapeadas para procesar. Usa "Mapeo Masivo" primero.');
      return;
    }

    const confirmar = window.confirm(`⚠️ ¿APLICAR DESCUENTO REAL?\n\n` +
      `📅 FECHA: ${fecha}\n` +
      `📊 PRUEBAS CON MAPEO: ${estadisticas.conMapeo}`);
    
    if (!confirmar) return;

    setProcesandoDescuento(true);
    
    try {
      console.log('🚀 ENVIANDO DESCUENTO PARA FECHA:', fecha);
      
      const response = await fetch(`${API_BASE_URL}/descuento-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha })
      });
      
      const data = await response.json();
      console.log('📥 RESPUESTA COMPLETA DEL BACKEND:', data);
      
      if (data.success) {
        setModalResultados({ open: true, data: data.data });
        cargarPruebasReales();
        cargarExamenesParaMapeoMasivo();
      } else {
        alert(`❌ ERROR: ${data.message || 'Error en descuento'}`);
      }
      
    } catch (error) {
      console.error('❌ Error de red:', error);
      alert('Error de conexión: ' + error.message);
    } finally {
      setProcesandoDescuento(false);
    }
  };

  // ✅ RENDERIZAR CONTENIDO DE PESTAÑAS
  const renderTabContent = () => {
    switch (tabValue) {
      case 0:
        return (
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>📋 Pruebas del Día - {fecha}</Typography>
            
            {examenes.length === 0 ? (
              <Alert severity="info" sx={{ mt: 2 }}>No hay exámenes registrados para esta fecha. Haz clic en "Importar Pruebas del Día"</Alert>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" paragraph>Mostrando {examenes.length} exámenes reales</Typography>
                
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Examen</strong></TableCell>
                        <TableCell align="right"><strong>Cantidad</strong></TableCell>
                        <TableCell><strong>Estado Mapeo</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {examenes.slice(0, 10).map((examen, index) => {
                        const examenMapeo = examenesParaMapeoMasivo.find(e => e.examen_nombre === examen.examen_nombre);
                        const estaMapeado = examenMapeo?.ya_mapeado;
                        
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                {examen.examen_nombre}
                                {estaMapeado && <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main', ml: 1 }} />}
                              </Box>
                            </TableCell>
                            <TableCell align="right">{examen.cantidad || 0}</TableCell>
                            <TableCell>
                              {estaMapeado ? (
                                <Chip label="Mapeado" size="small" color="success" variant="outlined" />
                              ) : (
                                <Typography variant="caption" color="text.secondary">Sin mapeo</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {examenes.length > 10 && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Mostrando 10 de {examenes.length} exámenes
                  </Typography>
                )}
              </>
            )}
            
            <Button variant="outlined" onClick={cargarPruebasReales} startIcon={<RefreshIcon />} sx={{ mt: 2 }}>Actualizar Lista</Button>
          </Paper>
        );
      
      case 1:
        return (
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>🧪 Mapeos Configurados</Typography>
            <Alert severity="info">
              Usa los botones "Mapeo Masivo" y "Calcular Día" en la parte superior para configurar y calcular descuentos.
            </Alert>
          </Paper>
        );
      
      case 2:
        return (
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>⚙️ Procesar Descuento</Typography>
            
            {estadisticas.conMapeo === 0 ? (
              <Alert severity="warning">
                No hay pruebas mapeadas para procesar. Usa "Mapeo Masivo" primero.
              </Alert>
            ) : (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>Resumen:</strong> {estadisticas.conMapeo} pruebas mapeadas listas para procesar
                </Alert>
                
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={procesandoDescuento ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
                  onClick={aplicarDescuento}
                  disabled={procesandoDescuento}
                  sx={{ py: 1.5, px: 4 }}
                >
                  {procesandoDescuento ? 'PROCESANDO...' : 'APLICAR DESCUENTO AHORA'}
                </Button>
              </Box>
            )}
          </Paper>
        );
      
      case 3:
        return (
          <Paper sx={{ p: 3, mt: 2 }}>
            <Typography variant="h6" gutterBottom>📜 Historial</Typography>
            <Typography color="text.secondary">Historial de procesos ejecutados</Typography>
          </Paper>
        );
      
      default:
        return null;
    }
  };

  const horaActual = new Date().toLocaleTimeString('es-ES', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ENCABEZADO */}
      <Paper elevation={4} sx={{ p: 2, mb: 2, textAlign: 'center', background: 'linear-gradient(135deg, #f5f7fa 0%, #e4edf5 100%)' }}>
        <SyncIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.dark' }}>Descuento por Pruebas Realizadas</Typography>
        <Typography variant="body1" color="text.secondary">Sistema automático basado en pruebas REALES de la jornada</Typography>
      </Paper>

      {/* CONTROLES SUPERIORES */}
      <Paper elevation={10} sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField label="Fecha de la jornada" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{horaActual} - Selecciona fecha REAL para importar</Typography>
          </Grid>

          <Grid item xs={12} md={8} sx={{ textAlign: { xs: 'center', md: 'right' } }}>
            <Button variant="contained" startIcon={<UploadIcon />} onClick={importarPruebas} disabled={cargando} sx={{ mr: 2, mb: { xs: 2, md: 0 } }}>Importar Pruebas del Día</Button>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={cargarPruebasReales} disabled={cargando} sx={{ mr: 2, mb: { xs: 2, md: 0 } }}>Actualizar</Button>
            <Button variant="outlined" color="primary" startIcon={<CheckBoxIcon />} onClick={() => { cargarExamenesParaMapeoMasivo(); setModalMapeoMasivo(true); }} sx={{ mr: 2, mb: { xs: 2, md: 0 } }}>Mapeo Masivo</Button>
            <Button variant="contained" color="success" startIcon={<CalculateIcon />} onClick={() => setModalReporteDia(true)} sx={{ mr: 2, mb: { xs: 2, md: 0 } }}>Calcular Día</Button>
            <Button variant="contained" color="secondary" startIcon={<PlayArrowIcon />} onClick={() => setTabValue(2)}>Ir a Procesar</Button>
          </Grid>
        </Grid>

        {cargando && <LinearProgress sx={{ mt: 2 }} />}

        {/* ✅ ESTADÍSTICAS REALES */}
        <Grid container spacing={2} sx={{ mt: 3 }}>
          <Grid item xs={6} md={3}><Card><CardContent sx={{ textAlign: 'center' }}><Typography variant="h4" color={estadisticas.totalExamenes > 0 ? 'primary' : 'text.disabled'}>{estadisticas.totalExamenes}</Typography><Typography variant="body2" color="text.secondary">Pruebas Registradas</Typography><Typography variant="caption" color="text.secondary">{estadisticas.totalExamenes === 0 ? 'Sin datos' : 'Reales'}</Typography></CardContent></Card></Grid>
          <Grid item xs={6} md={3}><Card><CardContent sx={{ textAlign: 'center' }}><Typography variant="h4" sx={{ color: estadisticas.conMapeo > 0 ? 'success.main' : 'text.disabled' }}>{estadisticas.conMapeo}</Typography><Typography variant="body2" color="text.secondary">Con Mapeo</Typography></CardContent></Card></Grid>
          <Grid item xs={6} md={3}><Card><CardContent sx={{ textAlign: 'center' }}><Typography variant="h4" sx={{ color: estadisticas.sinMapeo > 0 ? 'error.main' : 'text.disabled' }}>{estadisticas.sinMapeo}</Typography><Typography variant="body2" color="text.secondary">Sin Mapeo</Typography></CardContent></Card></Grid>
          <Grid item xs={6} md={3}><Card><CardContent sx={{ textAlign: 'center' }}><Typography variant="h4" color={estadisticas.totalPruebas > 0 ? 'primary' : 'text.disabled'}>{estadisticas.totalPruebas}</Typography><Typography variant="body2" color="text.secondary">Total Pruebas</Typography></CardContent></Card></Grid>
        </Grid>
      </Paper>

      {/* PESTAÑAS */}
      <Paper elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} centered>
            <Tab icon={<ListIcon />} label="Pruebas del Día" />
            <Tab icon={<ScienceIcon />} label="Mapeos" />
            <Tab icon={<SettingsIcon />} label="Procesar" />
            <Tab icon={<HistoryIcon />} label="Historial" />
          </Tabs>
        </Box>
        {renderTabContent()}
      </Paper>

      {/* INSTRUCCIONES */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="body2">
          <strong>Flujo de trabajo:</strong><br/>
          1. Selecciona fecha y haz clic en "Importar Pruebas del Día"<br/>
          2. Usa "Mapeo Masivo" para asignar reactivos a los exámenes<br/>
          3. Usa "Calcular Día" para ver el descuento total con FIFO<br/>
          4. Ve a la pestaña "Procesar" para aplicar el descuento
        </Typography>
      </Alert>

      {/* MODALES */}
      {modalMapeoMasivo && (
        <MapeoMasivoModal
          open={modalMapeoMasivo}
          onClose={() => setModalMapeoMasivo(false)}
          examenes={examenesParaMapeoMasivo}
          fecha={fecha}
          onGuardado={() => {
            cargarPruebasReales();
            cargarExamenesParaMapeoMasivo();
          }}
        />
      )}

      {modalReporteDia && (
        <ReporteDescuentoModal
          open={modalReporteDia}
          onClose={() => setModalReporteDia(false)}
          fecha={fecha}
        />
      )}

      {/* MODAL DE RESULTADOS PROFESIONAL */}
      <Dialog 
        open={modalResultados.open} 
        onClose={handleCloseResultados}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          backgroundColor: '#2e7d32', 
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          <CheckCircleIcon />
          <Typography variant="h6">¡Descuento Aplicado Exitosamente!</Typography>
        </DialogTitle>
        
        <DialogContent dividers sx={{ p: 3 }}>
          {modalResultados.data && (
            <>
              {/* Resumen en tarjetas */}
              <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                  <Paper sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}>
                    <Typography variant="h3">{modalResultados.data.exitosos}</Typography>
                    <Typography variant="body2">Pruebas Exitosas</Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Paper sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white'
                  }}>
                    <Typography variant="h3">{modalResultados.data.fallidos}</Typography>
                    <Typography variant="body2">Pruebas Fallidas</Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Paper sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    color: 'white'
                  }}>
                    <Typography variant="h3">{Number(modalResultados.data.totalML).toFixed(2)}ml</Typography>
                    <Typography variant="body2">Total Consumido</Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={3}>
                  <Paper sx={{ 
                    p: 2, 
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                    color: 'white'
                  }}>
                    <Typography variant="h3">{modalResultados.data.totalExamenes}</Typography>
                    <Typography variant="body2">Total Exámenes</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Información de la fecha */}
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2">
                  Fecha procesada: <strong>{modalResultados.data.fecha}</strong>
                </Typography>
              </Alert>

              {/* Tabla de detalle */}
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScienceIcon color="primary" />
                Detalle del Consumo por Lote
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell><strong>Examen</strong></TableCell>
                      <TableCell align="center"><strong>Cantidad</strong></TableCell>
                      <TableCell><strong>Lote</strong></TableCell>
                      <TableCell align="right"><strong>ML Consumidos</strong></TableCell>
                      <TableCell align="center"><strong>Estado</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {modalResultados.data.detalle.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body1" fontWeight="medium">
                            {item.examen}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={item.cantidad} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {item.lote}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="bold" color="primary.main">
                            {Number(item.ml).toFixed(2)} ml
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            icon={item.success ? <CheckCircleIcon /> : <ErrorIcon />}
                            label={item.success ? 'Exitoso' : 'Fallido'}
                            color={item.success ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Resumen final */}
              <Box sx={{ mt: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Resumen:</strong> Se procesaron {modalResultados.data.exitosos} de {modalResultados.data.totalExamenes} exámenes exitosamente, 
                  con un consumo total de <strong>{Number(modalResultados.data.totalML).toFixed(2)}ml</strong> de reactivos.
                </Typography>
              </Box>
            </>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
          <Button 
            onClick={handleCloseResultados}
            variant="contained"
            color="primary"
          >
            Aceptar
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACKBAR */}
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <AlertComponent onClose={handleCloseSnackbar} severity={snackbar.severity}>{snackbar.message}</AlertComponent>
      </Snackbar>
    </Container>
  );
};

export default DescuentosPorPruebas;