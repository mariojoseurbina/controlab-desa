import React, { useState } from 'react';
import {
  Box, Paper, Typography, Button, Grid, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, CircularProgress, Card, CardActionArea,
  TextField, MenuItem
} from '@mui/material';
import {
  Inventory as StockIcon,
  WarningAmber as WarnIcon,
  LocalShipping as ShippingIcon,
  CompareArrows as MovementIcon,
  DeleteOutline as TrashIcon,
  TableChart as ExcelIcon,
  AttachMoney as MoneyIcon,
  TrendingUp as TrendingIcon,
  ShowChart as MarginIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import * as XLSX from 'xlsx';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const REPORTS_CONFIG = [
  { id: 'stock-critico', title: 'Stock Crítico', icon: <WarnIcon fontSize="large" />, color: '#ef4444', endpoint: '/reports/quick/stock-critico' },
  { id: 'vencimientos', title: 'Próximos a Vencer', icon: <StockIcon fontSize="large" />, color: '#f59e0b', endpoint: '/reports/quick/vencimientos' },
  { id: 'movimientos', title: 'Kárdex Mensual', icon: <MovementIcon fontSize="large" />, color: '#3b82f6', endpoint: '/reports/quick/movimientos' },
  { id: 'compras-pendientes', title: 'Compras Pendientes', icon: <ShippingIcon fontSize="large" />, color: '#10b981', endpoint: '/reports/quick/compras-pendientes' },
  { id: 'mermas', title: 'Historial de Mermas', icon: <TrashIcon fontSize="large" />, color: '#6366f1', endpoint: '/reports/quick/mermas' },
  { id: 'valor-financiero', title: 'Valor Financiero', icon: <MoneyIcon fontSize="large" />, color: '#8b5cf6', endpoint: '/reports/quick/valor-financiero' },
  { id: 'top-consumos', title: 'Top Consumos', icon: <TrendingIcon fontSize="large" />, color: '#ec4899', endpoint: '/reports/quick/top-consumos' },
  { id: 'rentabilidad', title: 'Márgenes de Pruebas', icon: <MarginIcon fontSize="large" />, color: '#14b8a6', endpoint: '/reports/quick/rentabilidad' },
  { id: 'descuentos-hoy', title: 'Consumo y Stock de Reactivos', icon: <StockIcon fontSize="large" />, color: '#8b5cf6', endpoint: '/reports/quick/descuentos-hoy' }
];

const Reports = () => {
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [almacenes, setAlmacenes] = useState([]);
  const [selectedAlmacen, setSelectedAlmacen] = useState('all');
  const { enqueueSnackbar } = useSnackbar();

  React.useEffect(() => {
    loadAlmacenes();
  }, []);

  React.useEffect(() => {
    if (activeReport) {
      fetchReport(activeReport);
    }
  }, [selectedAlmacen]);

  const loadAlmacenes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/almacenes`);
      if (response.ok) {
        const data = await response.json();
        setAlmacenes(data.data || []);
      }
    } catch (error) {
      console.error('Error cargando almacenes:', error);
    }
  };

  const fetchReport = async (report) => {
    setActiveReport(report);
    setLoading(true);
    setReportData([]);
    
    try {
      const queryParam = selectedAlmacen !== 'all' ? `?almacenId=${selectedAlmacen}` : '';
      const response = await fetch(`${API_BASE_URL}${report.endpoint}${queryParam}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const res = await response.json();
      
      if (res.success) {
        setReportData(res.data);
      } else {
        enqueueSnackbar(res.error || 'Error al cargar reporte', { variant: 'error' });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar('Error de conexión', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (reportData.length === 0) {
      enqueueSnackbar('No hay datos para exportar', { variant: 'warning' });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(reportData.map(({ id, ...rest }) => rest)); // Remover ID interno
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, `Reporte_${activeReport.title.replace(/ /g, '_')}.xlsx`);
  };

  const renderTableHeaders = () => {
    if (!reportData || reportData.length === 0) return null;
    const keys = Object.keys(reportData[0]).filter(k => k !== 'id');
    return keys.map((key) => (
      <TableCell key={key} sx={{ fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#334155', textTransform: 'capitalize' }}>
        {key.replace(/([A-Z])/g, ' $1').trim()}
      </TableCell>
    ));
  };

  const renderTableRows = () => {
    return reportData.map((row, idx) => (
      <TableRow key={idx} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
        {Object.entries(row).filter(([k]) => k !== 'id').map(([key, value], i) => (
          <TableCell key={i}>
            {value === null || value === undefined ? '-' 
              : typeof value === 'boolean' ? (value ? 'Sí' : 'No')
              : (key.toLowerCase().includes('fecha') || key.toLowerCase().includes('vencimiento')) && typeof value === 'string' && value.includes('T') ? new Date(value).toLocaleDateString()
              : value.toString()}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, backgroundColor: '#f8fafc', minHeight: 'calc(100vh - 64px)' }}>
      {/* ENCABEZADO */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: '300px' }}>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a' }}>
            Centro de Reportes Tácticos
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Selecciona un reporte de acción rápida para exportar y gestionar datos operativos. Para análisis profundos, utiliza el módulo Brain.
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            select
            size="small"
            label="Filtrar por Sucursal"
            value={selectedAlmacen}
            onChange={(e) => setSelectedAlmacen(e.target.value)}
            sx={{ minWidth: 200, backgroundColor: '#ffffff', borderRadius: 1 }}
          >
            <MenuItem value="all">Todas las Sucursales</MenuItem>
            {almacenes.map((almacen) => (
              <MenuItem key={almacen.id} value={almacen.id}>
                {almacen.nombre}
              </MenuItem>
            ))}
          </TextField>
          {activeReport && (
            <Button 
              variant="contained" 
              startIcon={<ExcelIcon />}
              onClick={handleExport}
              sx={{ background: '#10b981', '&:hover': { background: '#059669' }, px: 3, py: 1, borderRadius: 2 }}
            >
              Exportar a Excel
            </Button>
          )}
        </Box>
      </Box>

      {/* TARJETAS DE SELECCIÓN */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {REPORTS_CONFIG.map((rep) => (
          <Grid item xs={12} sm={6} md={4} lg={2.4} key={rep.id}>
            <Card 
              elevation={activeReport?.id === rep.id ? 8 : 1}
              sx={{ 
                borderRadius: 3, 
                border: activeReport?.id === rep.id ? `2px solid ${rep.color}` : '2px solid transparent',
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
              }}
            >
              <CardActionArea onClick={() => fetchReport(rep)} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <Box sx={{ color: rep.color, mb: 1 }}>{rep.icon}</Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
                  {rep.title}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* CONTENEDOR DE LA TABLA */}
      <Paper sx={{ p: 3, borderRadius: 3, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
        {!activeReport ? (
          <Box sx={{ p: 10, textAlign: 'center', color: '#94a3b8' }}>
            <TableIcon sx={{ fontSize: 60, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6">Selecciona un reporte arriba para cargar los datos</Typography>
          </Box>
        ) : loading ? (
          <Box sx={{ p: 10, textAlign: 'center' }}>
            <CircularProgress size={50} sx={{ color: activeReport.color }} />
            <Typography sx={{ mt: 2, color: '#64748b' }}>Generando Reporte Operativo...</Typography>
          </Box>
        ) : reportData.length === 0 ? (
          <Box sx={{ p: 10, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">✅ No se encontraron registros para este reporte.</Typography>
          </Box>
        ) : (
          <>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, color: activeReport.color, display: 'flex', alignItems: 'center', gap: 1 }}>
              {activeReport.icon} Reporte Generado: {activeReport.title}
              <Chip label={`${reportData.length} Registros`} size="small" sx={{ ml: 2, fontWeight: 'bold' }} />
            </Typography>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>{renderTableHeaders()}</TableRow>
                </TableHead>
                <TableBody>{renderTableRows()}</TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>
    </Box>
  );
};

// Icono por defecto para el estado vacío
const TableIcon = (props) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M4 3h16a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm0 2v3h4V5H4zm6 0v3h4V5h-4zm6 0v3h4V5h-4zM4 10v4h4v-4H4zm6 0v4h4v-4h-4zm6 0v4h4v-4h-4zM4 16v4h4v-4H4zm6 0v4h4v-4h-4zm6 0v4h4v-4h-4z" />
  </svg>
);

export default Reports;