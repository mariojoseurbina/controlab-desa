import React, { useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Box,
  Grid,
  Typography,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  PlayArrow as ProcessIcon,
  Description as ExampleIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

const ImportacionMasivaPruebas = () => {
  const [archivo, setArchivo] = useState(null);
  const [vistaPrevia, setVistaPrevia] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  const manejarArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArchivo(file);
    setError('');
    setResultado(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const csvData = XLSX.utils.sheet_to_csv(worksheet, { header: 0 });
        const lineas = csvData.split('\n').filter(linea => linea.trim());
        
        const datos = lineas.map(linea => {
          const partes = linea.split('\t');
          return {
            nombre_prueba: partes[0] ? partes[0].trim() : '',
            cantidad: parseInt(partes[1]) || 0
          };
        }).filter(fila => fila.nombre_prueba && fila.cantidad > 0);

        setVistaPrevia(datos.slice(0, 10));
      } catch (error) {
        setError('Error al leer el archivo: ' + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const procesarImportacion = async () => {
    if (!archivo) {
      setError('Por favor seleccione un archivo');
      return;
    }

    setProcesando(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('archivo', archivo);

      const response = await fetch('/api/pruebas/importar-masivo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error en el servidor');
      }

      setResultado(result);

    } catch (error) {
      setError('Error al procesar importación: ' + error.message);
    } finally {
      setProcesando(false);
    }
  };

  const descargarEjemplo = () => {
    const ejemplo = `HEMATOLOGIA	22
ACIDO URICO	12
GLICEMIA	13
CREATININA	14
UREA	14
HEPATITIS B Ag SUPERFICIE (HBsAg)	1
HIV	3
PRUEBA DE EMBARAZO (HCG)	2`;

    const blob = new Blob([ejemplo], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ejemplo_formato_pruebas.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetearProceso = () => {
    setArchivo(null);
    setVistaPrevia([]);
    setResultado(null);
    setError('');
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Card>
        <CardHeader 
          title="📥 Importación Masiva de Pruebas Realizadas"
          subheader="Formato esperado: Columna 1 = Nombre de prueba, Columna 2 = Cantidad (separado por tabulador)"
        />
        
        <CardContent>
          {error && (
            <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Sección de subida de archivo */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Seleccionar archivo del software externo
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<UploadIcon />}
                  fullWidth
                  disabled={procesando}
                >
                  {archivo ? archivo.name : 'Seleccionar archivo Excel/CSV'}
                  <input
                    type="file"
                    hidden
                    accept=".xlsx, .xls, .csv"
                    onChange={manejarArchivo}
                  />
                </Button>
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  Formatos aceptados: Excel (.xlsx, .xls) o CSV
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Button 
                variant="outlined" 
                startIcon={<ExampleIcon />}
                onClick={descargarEjemplo}
                fullWidth
                sx={{ height: '56px' }}
              >
                Ver Ejemplo de Formato
              </Button>
            </Grid>
          </Grid>

          {/* Vista previa */}
          {vistaPrevia.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Vista Previa (primeras 10 filas)
              </Typography>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'background.default' }}>
                        Prueba
                      </TableCell>
                      <TableCell 
                        align="center" 
                        sx={{ fontWeight: 'bold', backgroundColor: 'background.default', width: 120 }}
                      >
                        Cantidad
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {vistaPrevia.map((fila, index) => (
                      <TableRow key={index} hover>
                        <TableCell>{fila.nombre_prueba}</TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={fila.cantidad} 
                            color="primary" 
                            size="small" 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                Mostrando {vistaPrevia.length} tipos de prueba de vista previa
              </Typography>
            </Box>
          )}

          {/* Resultados de procesamiento */}
          {resultado && (
            <Box sx={{ mb: 3 }}>
              <Alert 
                severity={resultado.success ? 'success' : 'error'} 
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" gutterBottom>
                  {resultado.success ? '✅ Importación Exitosa' : '❌ Error en Importación'}
                </Typography>
                
                {resultado.success ? (
                  <>
                    <Typography>
                      <strong>Tipos de prueba procesados:</strong> {resultado.data.exitosas}
                    </Typography>
                    <Typography>
                      <strong>Total de pruebas registradas:</strong> {resultado.data.totalPruebas}
                    </Typography>
                    
                    {resultado.data.errores.length > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Typography fontWeight="bold">
                          ⚠ Errores encontrados:
                        </Typography>
                        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
                          {resultado.data.errores.map((error, idx) => (
                            <Typography component="li" key={idx} variant="body2">
                              <strong>{error.prueba}</strong> (cantidad: {error.cantidad}) - {error.error}
                            </Typography>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography>{resultado.error}</Typography>
                )}
              </Alert>
            </Box>
          )}

          {/* Botones de acción */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Button 
                variant="contained" 
                startIcon={procesando ? <CircularProgress size={20} /> : <ProcessIcon />}
                onClick={procesarImportacion}
                disabled={!archivo || procesando}
                fullWidth
                size="large"
              >
                {procesando ? 'Procesando...' : 'Procesar Importación'}
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Button 
                variant="outlined" 
                startIcon={<RefreshIcon />}
                onClick={resetearProceso}
                disabled={procesando}
                fullWidth
                size="large"
              >
                Nuevo Proceso
              </Button>
            </Grid>
          </Grid>

          {/* Información adicional */}
          {archivo && !procesando && !resultado && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography fontWeight="bold">
                Archivo listo para procesar: {archivo.name}
              </Typography>
              <Typography variant="body2">
                Al procesar, el sistema descuentará automáticamente los reactivos correspondientes a cada prueba.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Indicador de progreso */}
      {procesando && (
        <Card sx={{ mt: 2 }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <CircularProgress sx={{ mb: 1 }} />
            <Typography variant="body1" fontWeight="bold">
              Procesando importación...
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Esto puede tomar unos segundos dependiendo del tamaño del archivo
            </Typography>
            <LinearProgress sx={{ mt: 2 }} />
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default ImportacionMasivaPruebas;