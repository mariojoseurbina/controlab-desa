import React, { useState } from 'react';
import { Container, Paper, Typography, Button, Box, Alert } from '@mui/material';
import { Upload, Download } from '@mui/icons-material';

const TransformarReporteDiario = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTransformar = async () => {
    const formData = new FormData();
    formData.append('archivo', file);
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5000/api/transformar-reporte-diario', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Error en la transformación');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'descuento_automatico.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
    } catch (err) {
      setError('Error al transformar el archivo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Transformar Reporte Diario
        </Typography>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          Sube el reporte diario de pruebas y obtén el archivo para descuento masivo
        </Alert>

        <Box sx={{ mb: 2 }}>
          <input 
            type="file" 
            accept=".xlsx, .xls"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            onClick={handleTransformar}
            disabled={!file || loading}
            startIcon={<Upload />}
          >
            {loading ? 'Transformando...' : 'Transformar Reporte'}
          </Button>

          <Button 
            variant="outlined"
            href="http://localhost:5000/api/descargar-template-reporte"
            startIcon={<Download />}
          >
            Descargar Template
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>
    </Container>
  );
};

export default TransformarReporteDiario;