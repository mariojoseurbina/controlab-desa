import React, { useState } from 'react';
import {
  Container, Paper, Typography, Button, Box, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Chip
} from '@mui/material';
import { Upload, Download, CheckCircle, Error } from '@mui/icons-material';

const DescuentoAutomatico = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleDescuentoAutomatico = async () => {
    const formData = new FormData();
    formData.append('archivo', file);
    
    setLoading(true);
    setResultado(null);
    
    try {
      const response = await fetch('http://localhost:5000/api/descuento-masivo-automatico', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      setResultado(data);
      
    } catch (error) {
      setResultado({
        success: false,
        error: 'Error de conexión: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom color="primary">
          🧪 Descuento Masivo Automático
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <strong>Sube el reporte diario</strong> y el sistema descontará automáticamente los reactivos de los lotes correspondientes.
        </Alert>

        {/* SUBIR ARCHIVO */}
        <Box sx={{ mb: 3 }}>
          <input 
            type="file" 
            accept=".xlsx, .xls"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </Box>

        {/* BOTÓN EJECUTAR */}
        <Button 
          variant="contained" 
          onClick={handleDescuentoAutomatico}
          disabled={!file || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <Upload />}
          sx={{ mb: 3 }}
        >
          {loading ? 'Procesando...' : 'Ejecutar Descuento Automático'}
        </Button>

        {/* RESULTADOS */}
        {resultado && (
          <Box>
            <Alert 
              severity={resultado.success ? "success" : "error"} 
              sx={{ mb: 2 }}
            >
              <strong>{resultado.message}</strong>
              {resultado.total_descontado && ` - Total descontado: ${resultado.total_descontado} unidades`}
            </Alert>

            {/* RESULTADOS EXITOSOS */}
            {resultado.resultados && resultado.resultados.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  ✅ Procesos Exitosos
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Prueba</strong></TableCell>
                        <TableCell><strong>Lote</strong></TableCell>
                        <TableCell><strong>Reactivo</strong></TableCell>
                        <TableCell><strong>Cantidad</strong></TableCell>
                        <TableCell><strong>Consumo</strong></TableCell>
                        <TableCell><strong>Estado</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resultado.resultados.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.prueba}</TableCell>
                          <TableCell>{item.lote}</TableCell>
                          <TableCell>{item.reactivo}</TableCell>
                          <TableCell>{item.cantidad_pruebas} pruebas</TableCell>
                          <TableCell>{item.consumo_reactivo} unidades</TableCell>
                          <TableCell>
                            <Chip 
                              icon={<CheckCircle />} 
                              label="EXITOSO" 
                              color="success" 
                              size="small" 
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* ERRORES */}
            {resultado.errores && resultado.errores.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom color="error">
                  ❌ Errores Encontrados
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Error</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resultado.errores.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Error color="error" sx={{ mr: 1 }} />
                              {error}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default DescuentoAutomatico;