import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, CircularProgress 
} from '@mui/material';

const ReporteLotes = () => {
    const [lotesData, setLotesData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLotesGlobal = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get((process.env.REACT_APP_API_URL || 'http://localhost:5000/api') + '/audit/lotes-global', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (response.data.success) {
                    setLotesData(response.data.data);
                }
            } catch (error) {
                console.error("Error cargando reporte de lotes:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLotesGlobal();
    }, []);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
                🏆 Auditoría Global de Lotes
            </Typography>
            <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                Consolidación de rendimiento y excedente de cajas unificadas por número de lote.
            </Typography>

            <TableContainer component={Paper} elevation={3} sx={{ mt: 3, borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ bgcolor: 'primary.main' }}>
                        <TableRow>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Número de Lote</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Reactivo</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cajas Totales</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Pruebas Teóricas</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Rendimiento (Real)</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Excedente Extra</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Estado</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {lotesData.map((lote, index) => (
                            <TableRow key={index} hover>
                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'primary.main' }}>
                                    {lote.NumeroLote}
                                </TableCell>
                                <TableCell>{lote.ReactivoNombre}</TableCell>
                                <TableCell>
                                    <Chip label={`${lote.CajasTotales} Cajas`} size="small" color="default" />
                                </TableCell>
                                <TableCell>{lote.PruebasTeoricasTotales}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                    {lote.RentabilidadPorcentaje}%
                                </TableCell>
                                <TableCell align="right">
                                    {lote.VolumenExcedente > 0 ? (
                                        <Typography fontWeight="bold" color="secondary">
                                            +{lote.VolumenExcedente} mL
                                        </Typography>
                                    ) : (
                                        <Typography color="textSecondary">0 mL</Typography>
                                    )}
                                </TableCell>
                                <TableCell align="center">
                                    {lote.EstadoRendimiento === 'Excedente' ? (
                                        <Chip label="RENDIMIENTO SUPERIOR" color="secondary" variant="outlined" size="small" />
                                    ) : (
                                        <Chip label="EN ESPERA" color="success" variant="outlined" size="small" />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ReporteLotes;

