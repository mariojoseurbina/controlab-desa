import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { Upload } from '@mui/icons-material';

const ImportarPruebasPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Upload sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Importar Pruebas Masivas
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Importación masiva de pruebas desde archivo Excel
            </Typography>
          </Box>
        </Box>

        <Alert severity="info">
          Esta funcionalidad está en desarrollo. Próximamente podrás importar pruebas masivas desde Excel.
        </Alert>
      </Paper>
    </Container>
  );
};

export default ImportarPruebasPage;