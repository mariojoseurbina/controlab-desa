import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Card,
  CardContent,
} from '@mui/material';
import { Upload, Download, Science } from '@mui/icons-material';

const DescuentoMasivoPruebasPage = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Por favor selecciona un archivo Excel');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('archivo', file);

    try {
      const response = await fetch('/api/descuento-automatico-pruebas', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
      } else {
        setError(data.message || 'Error al procesar el archivo');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      { Prueba: 'HEMATOLOGÍA', Cantidad: 2 },
      { Prueba: 'GLUCOSA', Cantidad: 3 },
      { Prueba: 'HEMOGRAMA', Cantidad: 1 },
    ];

    // Crear archivo Excel simple (en una implementación real usarías XLSX)
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Prueba,Cantidad\n" 
      + templateData.map(row => `${row.Prueba},${row.Cantidad}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_pruebas.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Science sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Descuento Masivo por Pruebas
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Descuento automático de reactivos mediante archivo Excel
            </Typography>
          </Box>
        </Box>

        {/* Información del formato */}
        <Card sx={{ mb: 3, backgroundColor: '#fff3cd' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              📋 Formato Requerido del Archivo Excel
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              El archivo debe tener EXACTAMENTE estas columnas en la primera hoja:
            </Typography>
            
            <TableContainer component={Paper} sx={{ maxWidth: 400 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Prueba</strong></TableCell>
                    <TableCell><strong>Cantidad</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>HEMATOLOGÍA</TableCell>
                    <TableCell>2</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>GLUCOSA</TableCell>
                    <TableCell>3</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>HEMOGRAMA</TableCell>
                    <TableCell>1</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            
            <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
              ⚠️ IMPORTANTE: Los nombres de las pruebas deben coincidir exactamente con los registrados en el sistema.
            </Typography>
          </CardContent>
        </Card>

        {/* Sección de subida */}
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', border: '2px dashed #ccc' }}>
          <Typography variant="h6" gutterBottom>
            Selecciona tu archivo Excel
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Formato soportado: .xlsx, .xls
          </Typography>
          
          <input
            type="file"
            id="file-upload"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              component="label"
              htmlFor="file-upload"
              startIcon={<Upload />}
            >
              Elegir Archivo Excel
            </Button>
            
            <Button
              variant="outlined"
              onClick={downloadTemplate}
              startIcon={<Download />}
            >
              Descargar Template
            </Button>
          </Box>

          {file && (
            <Alert severity="success" sx={{ mt: 2 }}>
              📄 Archivo seleccionado: {file.name}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={!file || loading}
            sx={{ mt: 3, minWidth: 200 }}
          >
            {loading ? <CircularProgress size={24} /> : '🚀 Procesar Descuentos'}
          </Button>
        </Paper>

        {/* Resultados */}
        {result && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="h6">
                ✅ {result.message}
              </Typography>
              <Typography>
                <strong>Total procesado:</strong> {result.totalProcesado} pruebas
                <br />
                <strong>Reactivos descontados:</strong> {result.totalDescontado} unidades
              </Typography>
            </Alert>

            {result.resultados && result.resultados.length > 0 && (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Prueba</strong></TableCell>
                      <TableCell><strong>Cantidad</strong></TableCell>
                      <TableCell><strong>Lote</strong></TableCell>
                      <TableCell><strong>Reactivo</strong></TableCell>
                      <TableCell><strong>Consumo</strong></TableCell>
                      <TableCell><strong>Estado</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.resultados.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.prueba}</TableCell>
                        <TableCell>{item.cantidad_pruebas}</TableCell>
                        <TableCell>{item.lote}</TableCell>
                        <TableCell>{item.reactivo}</TableCell>
                        <TableCell>{item.consumo_reactivo}</TableCell>
                        <TableCell style={{ color: '#4caf50' }}>{item.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Errores */}
        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}

        {result && result.errores && result.errores.length > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="h6">Errores encontrados:</Typography>
            <ul>
              {result.errores.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default DescuentoMasivoPruebasPage;

