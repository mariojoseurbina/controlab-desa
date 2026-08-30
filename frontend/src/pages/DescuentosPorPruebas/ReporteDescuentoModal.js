import React, { useState, useEffect } from 'react';
import {
  Modal, Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Chip, Alert,
  CircularProgress, IconButton, Accordion, AccordionSummary,
  AccordionDetails, LinearProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';

const ReporteDescuentoModal = ({ open, onClose, fecha, datosReporte }) => {
  const [cargando, setCargando] = useState(false);
  const [reporte, setReporte] = useState(datosReporte);

  useEffect(() => {
    if (open && !datosReporte) {
      cargarReporte();
    } else {
      setReporte(datosReporte);
    }
  }, [open, datosReporte]);

  const cargarReporte = async () => {
    setCargando(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/descuentos/calcular-dia?fecha=${fecha}`
      );
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
        {/* Header */}
        <Box sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Box>
            <Typography variant="h5">
              📅 Reporte de Descuentos - {fecha}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cálculo FIFO automático de consumo de reactivos
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Contenido */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {cargando ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Calculando descuentos del día...
              </Typography>
            </Box>
          ) : reporte ? (
            <>
              {/* Resumen General */}
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📊 Resumen General
                </Typography>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Exámenes Mapeados
                    </Typography>
                    <Typography variant="h4">
                      {reporte.total_examenes}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Pruebas Totales
                    </Typography>
                    <Typography variant="h4">
                      {reporte.total_pruebas}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Reactivos Utilizados
                    </Typography>
                    <Typography variant="h4">
                      {reporte.total_reactivos}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total ml Necesarios
                    </Typography>
                    <Typography variant="h4" color="primary.main">
                      {reporte.total_ml} ml
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* Detalle por Reactivo */}
              <Typography variant="h6" gutterBottom>
                🧪 Detalle por Reactivo
              </Typography>

              {reporte.reactivos.map((reactivo, index) => {
                const estado = getEstadoStock(reactivo);
                
                return (
                  <Accordion key={reactivo.reactivo_id} sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1">
                            {reactivo.nombre} ({reactivo.codigo})
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {reactivo.examenes.length} exámenes • {reactivo.total_ml} ml totales
                          </Typography>
                        </Box>
                        <Chip
                          icon={estado.icono}
                          label={estado.texto}
                          color={estado.color}
                          size="small"
                          sx={{ ml: 2 }}
                        />
                      </Box>
                    </AccordionSummary>
                    
                    <AccordionDetails>
                      {/* Exámenes que consumen este reactivo */}
                      <Typography variant="subtitle2" gutterBottom>
                        Exámenes asociados:
                      </Typography>
                      <TableContainer sx={{ mb: 2 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Examen</TableCell>
                              <TableCell align="right">Pruebas</TableCell>
                              <TableCell align="right">Consumo/prueba</TableCell>
                              <TableCell align="right">Total ml</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {reactivo.examenes.map((examen, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{examen.examen}</TableCell>
                                <TableCell align="right">{examen.pruebas}</TableCell>
                                <TableCell align="right">{examen.consumo_por_prueba} ml</TableCell>
                                <TableCell align="right">
                                  <Chip 
                                    label={`${examen.ml.toFixed(2)} ml`}
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      {/* Lotes FIFO */}
                      <Typography variant="subtitle2" gutterBottom>
                        Lotes a utilizar (orden FIFO):
                      </Typography>
                      {reactivo.lotes_utilizados.length > 0 ? (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Lote</TableCell>
                                <TableCell>Vencimiento</TableCell>
                                <TableCell align="right">Disponible</TableCell>
                                <TableCell align="right">A descontar</TableCell>
                                <TableCell align="right">Restante</TableCell>
                                <TableCell>Estado</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {reactivo.lotes_utilizados.map((lote, idx) => (
                                <TableRow key={idx}>
                                  <TableCell>
                                    <strong>{lote.numero_lote}</strong>
                                  </TableCell>
                                  <TableCell>
                                    {new Date(lote.fecha_vencimiento).toLocaleDateString()}
                                    <Typography variant="caption" display="block" color="text.secondary">
                                      {lote.dias_para_vencer > 0 
                                        ? `${lote.dias_para_vencer} días` 
                                        : 'VENCIDO'}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    {lote.ml_disponibles.toFixed(2)} ml
                                  </TableCell>
                                  <TableCell align="right">
                                    <Chip 
                                      label={`-${lote.ml_a_descontar.toFixed(2)} ml`}
                                      size="small"
                                      color="primary"
                                    />
                                  </TableCell>
                                  <TableCell align="right">
                                    {lote.ml_restantes.toFixed(2)} ml
                                  </TableCell>
                                  <TableCell>
                                    {lote.ml_restantes <= 0 ? (
                                      <Chip label="AGOTADO" size="small" color="error" />
                                    ) : lote.ml_restantes < 10 ? (
                                      <Chip label="BAJO" size="small" color="warning" />
                                    ) : (
                                      <Chip label="OK" size="small" color="success" />
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      ) : (
                        <Alert severity="warning">
                          No hay lotes disponibles para este reactivo
                        </Alert>
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
                <Alert severity="info">
                  No hay exámenes mapeados para esta fecha. Configura el mapeo primero.
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="error">
              No se pudo cargar el reporte
            </Alert>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ 
          p: 2, 
          borderTop: 1, 
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1
        }}>
          <Button onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="contained"
            onClick={cargarReporte}
            disabled={cargando}
          >
            {cargando ? 'Calculando...' : 'Recalcular'}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ReporteDescuentoModal;
