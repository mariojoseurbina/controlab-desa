import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Chip, Box, Typography,
  Tooltip
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon
} from '@mui/icons-material';

const TablaPruebasDia = ({ pruebas, fecha, onActualizar }) => {
  if (!pruebas || pruebas.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="textSecondary">
          No hay pruebas para la fecha {fecha}
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          Importa las pruebas primero usando el botón "Importar Pruebas del Día"
        </Typography>
      </Paper>
    );
  }

  const getEstado = (prueba) => {
    if (prueba.ya_mapeado) {
      return {
        icon: <CheckCircleIcon />,
        label: 'Mapeado',
        color: 'success',
        tooltip: 'Ya tiene reactivo asignado'
      };
    }
    
    if (prueba.sugerencia_automatica) {
      return {
        icon: <InfoIcon />,
        label: 'Sugerencia',
        color: 'info',
        tooltip: 'Tiene sugerencia automática'
      };
    }
    
    return {
      icon: <ErrorIcon />,
      label: 'Sin mapeo',
      color: 'error',
      tooltip: 'Requiere asignación manual'
    };
  };

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: 'primary.main' }}>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Examen</TableCell>
            <TableCell align="right" sx={{ color: 'white', fontWeight: 'bold' }}>Cantidad</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado Mapeo</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {pruebas.slice(0, 20).map((prueba, index) => {
            const estado = getEstado(prueba);
            
            return (
              <TableRow 
                key={prueba.id || index}
                hover
                sx={{ 
                  '&:nth-of-type(odd)': { bgcolor: 'action.hover' }
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">
                      {prueba.examen_nombre}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="h6" color="primary">
                    {prueba.cantidad}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title={estado.tooltip}>
                    <Chip
                      icon={estado.icon}
                      label={estado.label}
                      color={estado.color}
                      size="small"
                    />
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
          
          {pruebas.length > 20 && (
            <TableRow>
              <TableCell colSpan={3} align="center">
                <Typography variant="body2" color="textSecondary">
                  ... y {pruebas.length - 20} exámenes más
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TablaPruebasDia;