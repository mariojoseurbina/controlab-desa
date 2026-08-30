import React from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
} from '@mui/material';
import { Inventory } from '@mui/icons-material';

const DescuentoMasivoPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Inventory sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Descuento Masivo por Lotes
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Funcionalidad de descuento masivo por lotes
            </Typography>
          </Box>
        </Box>

        <Alert severity="info">
          Esta funcionalidad está en desarrollo. Próximamente podrás realizar descuentos masivos por lotes.
        </Alert>
      </Paper>
    </Container>
  );
};

export default DescuentoMasivoPage;