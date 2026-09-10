import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Autocomplete,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Alert, Snackbar, CircularProgress, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, Divider
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckIcon,
  Upload as UploadIcon,
  TableChart as GridIcon,
  ArrowBack as BackIcon,
  Warning as WarningIcon,
  FileUpload as FileUploadIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const emptyRow = () => ({
  _id: Date.now() + Math.random(),
  item_id: '',
  item_nombre: '',
  numero_lote: '',
  fecha_vencimiento: '',
  cantidad: '',
  _valid: false,
  _error: ''
});

const validateRow = (row) => {
  if (!row.item_id) return { valid: false, error: 'Reactivo requerido' };
  if (!row.numero_lote || !row.numero_lote.trim()) return { valid: false, error: 'Nro. Lote requerido' };
  if (!row.fecha_vencimiento) return { valid: false, error: 'Fecha requerida' };
  if (!row.cantidad || parseInt(row.cantidad, 10) <= 0) return { valid: false, error: 'Cantidad invalida' };
  return { valid: true, error: '' };
};

export default function InitialCount() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([emptyRow()]);
  const [almacen_id, setAlmacenId] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/inventory`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.items || data.data || []);
        setProducts(list);
      })
      .catch(console.error);
  }, []);

  const showSnackbar = (message, severity = 'success') =>
    setSnackbar({ open: true, message, severity });

  const updateRow = useCallback((id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r._id !== id) return r;
      const updated = { ...r, [field]: value };
      const { valid, error } = validateRow(updated);
      return { ...updated, _valid: valid, _error: error };
    }));
  }, []);

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (id) => {
    setRows(prev => {
      const filtered = prev.filter(r => r._id !== id);
      return filtered.length === 0 ? [emptyRow()] : filtered;
    });
  };

  const handleFileImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        const header = lines[0].toLowerCase();
        if (!header.includes('lote')) {
          showSnackbar('El archivo no tiene el formato correcto. Usa la plantilla descargada.', 'error');
          return;
        }
        const importedRows = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
          if (cols.length < 4) continue;
          const [nombreReactivo, numero_lote, fecha_vencimiento, cantidad] = cols;
          const found = products.find(p =>
            p.nombre?.toLowerCase().includes(nombreReactivo.toLowerCase()) ||
            p.codigo?.toLowerCase() === nombreReactivo.toLowerCase()
          );
          const newRow = {
            _id: Date.now() + Math.random(),
            item_id: found?.id || '',
            item_nombre: found?.nombre || nombreReactivo,
            numero_lote: numero_lote || '',
            fecha_vencimiento: fecha_vencimiento || '',
            cantidad: cantidad || '',
            _valid: false,
            _error: ''
          };
          const { valid, error } = validateRow(newRow);
          newRow._valid = valid;
          newRow._error = !found ? `Reactivo "${nombreReactivo}" no encontrado en catalogo` : error;
          importedRows.push(newRow);
        }
        if (importedRows.length > 0) {
          setRows(importedRows);
          showSnackbar(`Se importaron ${importedRows.length} registros. Revisa en la pestana de grid.`);
          setTab(0);
        } else {
          showSnackbar('No se pudo leer ningún dato del archivo.', 'warning');
        }
      } catch {
        showSnackbar('Error al leer el archivo. Revisa el formato.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const downloadTemplate = () => {
    const header = '"Nombre Reactivo (o Codigo)","Numero de Lote","Fecha Vencimiento (YYYY-MM-DD)","Cantidad (Cajas)"';
    const example = '"CA-COLOR ARTENAZO III AA","LOT-2026-001","2027-12-31","5"';
    const blob = new Blob([header + '\n' + example], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Plantilla_Conteo_Inicial.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = rows.filter(r => r._valid);
  const invalidRows = rows.filter(r => !r._valid && (r.item_id || r.numero_lote || r.cantidad));
  const totalCajas = validRows.reduce((s, r) => s + (parseInt(r.cantidad, 10) || 0), 0);

  const handleSubmit = async () => {
    if (validRows.length === 0) { showSnackbar('No hay filas validas para procesar.', 'error'); return; }
    setConfirmOpen(false);
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        lotes: validRows.map(r => ({
          item_id: r.item_id,
          numero_lote: r.numero_lote.trim(),
          fecha_vencimiento: r.fecha_vencimiento,
          cantidad: parseInt(r.cantidad, 10)
        })),
        almacen_id,
        motivo: 'Conteo Inicial de Inventario'
      };
      const res = await fetch(`${API_BASE_URL}/movements/carga-inicial-masiva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      if (res.ok && result.success) {
        showSnackbar(result.message, 'success');
        setRows([emptyRow()]);
        setTimeout(() => navigate(-1), 2500);
      } else {
        showSnackbar(result.error || 'Error al procesar la carga.', 'error');
      }
    } catch {
      showSnackbar('Error de conexion con el servidor.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addRow(); }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1300, mx: 'auto', minHeight: '100vh', bgcolor: '#f8fafc' }}>

      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={5000} onClose={() => setSnackbar(s => ({ ...s, open: false }))}>
        <Alert severity={snackbar.severity} sx={{ width: '100%', fontWeight: 700, borderRadius: 2 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* CABECERA */}
      <Paper elevation={6} sx={{
        p: { xs: 3, md: 4 }, mb: 4, borderRadius: 4,
        background: 'linear-gradient(135deg, #0f172a 0%, #4c1d95 100%)', color: 'white'
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(139,92,246,0.25)', borderRadius: 3, border: '1px solid rgba(196,181,253,0.3)' }}>
              <InventoryIcon sx={{ fontSize: 42, color: '#c4b5fd' }} />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: '#c4b5fd', fontWeight: 800 }}>
                CONTROLAB IA • ALMACEN Y DEPOSITOS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>
                Conteo Inicial de Inventario
              </Typography>
              <Typography variant="body2" sx={{ color: '#ddd6fe', mt: 0.5 }}>
                Carga masiva de reactivos antes de iniciar operaciones. Simple, rapido y sin errores.
              </Typography>
            </Box>
          </Box>
          <Button startIcon={<BackIcon />} onClick={() => navigate(-1)}
            sx={{ color: '#c4b5fd', borderColor: '#c4b5fd', border: '1px solid', borderRadius: 3, px: 2.5 }}>
            Volver al Almacen
          </Button>
        </Box>
      </Paper>

      {/* KPIs RAPIDOS */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <Paper elevation={2} sx={{ p: 2, borderRadius: 3, minWidth: 200, borderLeft: '5px solid #8b5cf6' }}>
          <Typography variant="caption" fontWeight={700} color="#64748b" textTransform="uppercase">
            Almacen Destino
          </Typography>
          <TextField select SelectProps={{ native: true }} size="small" fullWidth value={almacen_id}
            onChange={e => setAlmacenId(Number(e.target.value))} sx={{ mt: 1 }}>
            <option value={1}>Almacen Central</option>
            <option value={2}>Almacen Laboratorio</option>
          </TextField>
        </Paper>
        <Paper elevation={2} sx={{ p: 2, borderRadius: 3, minWidth: 150, borderLeft: '5px solid #10b981' }}>
          <Typography variant="caption" fontWeight={700} color="#64748b" textTransform="uppercase">Filas Validas</Typography>
          <Typography variant="h3" fontWeight={900} color="#10b981">{validRows.length}</Typography>
        </Paper>
        {invalidRows.length > 0 && (
          <Paper elevation={2} sx={{ p: 2, borderRadius: 3, minWidth: 150, borderLeft: '5px solid #ef4444' }}>
            <Typography variant="caption" fontWeight={700} color="#64748b" textTransform="uppercase">Con Errores</Typography>
            <Typography variant="h3" fontWeight={900} color="#ef4444">{invalidRows.length}</Typography>
          </Paper>
        )}
        <Paper elevation={2} sx={{ p: 2, borderRadius: 3, minWidth: 150, borderLeft: '5px solid #0284c7' }}>
          <Typography variant="caption" fontWeight={700} color="#64748b" textTransform="uppercase">Total Cajas</Typography>
          <Typography variant="h3" fontWeight={900} color="#0f172a">{totalCajas}</Typography>
        </Paper>
      </Box>

      {/* INSTRUCCION */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 3, fontWeight: 600 }}>
        <strong>Como usar:</strong> Selecciona el Reactivo &rarr; escribe el Lote &rarr; Fecha de Vencimiento &rarr; Cantidad y presiona <strong>Enter</strong> para pasar a la siguiente fila. O importa un CSV con la plantilla de la segunda pestana.
      </Alert>

      {/* PESTANAS */}
      <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          bgcolor: '#0f172a', px: 2,
          '& .MuiTab-root': { color: '#94a3b8', fontWeight: 700, py: 2 },
          '& .Mui-selected': { color: '#c4b5fd !important' },
          '& .MuiTabs-indicator': { bgcolor: '#8b5cf6', height: 3 }
        }}>
          <Tab icon={<GridIcon sx={{ mr: 0.5 }} />} iconPosition="start" label="Ingreso Rapido en Pantalla" />
          <Tab icon={<UploadIcon sx={{ mr: 0.5 }} />} iconPosition="start" label="Importar Excel / CSV" />
        </Tabs>

        {/* TAB GRID */}
        {tab === 0 && (
          <Box sx={{ p: 2 }}>
            <TableContainer>
              <Table size="small" sx={{ minWidth: 850 }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', width: 40 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', minWidth: 280 }}>REACTIVO *</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', minWidth: 160 }}>NRO. LOTE *</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', minWidth: 155 }}>VENCIMIENTO *</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', minWidth: 110 }}>CAJAS *</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#334155', width: 70, textAlign: 'center' }}>OK</TableCell>
                    <TableCell sx={{ width: 40 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={row._id}
                      sx={{
                        bgcolor: row._valid ? '#f0fdf4' : (row._error ? '#fff1f2' : 'white'),
                        '&:hover': { bgcolor: row._valid ? '#dcfce7' : '#fef2f2' },
                        transition: 'background 0.15s'
                      }}>
                      <TableCell sx={{ color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>{idx + 1}</TableCell>

                      {/* REACTIVO */}
                      <TableCell>
                        <Autocomplete size="small"
                          options={products}
                          getOptionLabel={o => `[${o.codigo}] ${o.nombre}`}
                          value={products.find(p => p.id === row.item_id) || null}
                          onChange={(_, val) => {
                            updateRow(row._id, 'item_id', val?.id || '');
                            updateRow(row._id, 'item_nombre', val?.nombre || '');
                          }}
                          filterOptions={(opts, { inputValue }) =>
                            opts.filter(o =>
                              o.nombre?.toLowerCase().includes(inputValue.toLowerCase()) ||
                              o.codigo?.toLowerCase().includes(inputValue.toLowerCase())
                            ).slice(0, 40)
                          }
                          renderInput={params => (
                            <TextField {...params} placeholder="Buscar reactivo..." variant="outlined" size="small" />
                          )}
                        />
                      </TableCell>

                      {/* LOTE */}
                      <TableCell>
                        <TextField size="small" fullWidth placeholder="Ej. LDK-2026-001"
                          value={row.numero_lote}
                          onChange={e => updateRow(row._id, 'numero_lote', e.target.value)}
                          inputProps={{ style: { fontWeight: 600 } }} />
                      </TableCell>

                      {/* FECHA */}
                      <TableCell>
                        <TextField size="small" fullWidth type="date"
                          value={row.fecha_vencimiento}
                          onChange={e => updateRow(row._id, 'fecha_vencimiento', e.target.value)}
                          InputLabelProps={{ shrink: true }} />
                      </TableCell>

                      {/* CANTIDAD */}
                      <TableCell>
                        <TextField size="small" fullWidth type="number" placeholder="1"
                          value={row.cantidad}
                          onChange={e => updateRow(row._id, 'cantidad', e.target.value)}
                          onKeyDown={handleKeyDown}
                          inputProps={{ min: 1, step: 1, style: { fontWeight: 800, textAlign: 'center' } }} />
                      </TableCell>

                      {/* ESTADO */}
                      <TableCell align="center">
                        {row._valid ? (
                          <Tooltip title="Fila correcta">
                            <CheckIcon sx={{ color: '#10b981', fontSize: 22 }} />
                          </Tooltip>
                        ) : row._error ? (
                          <Tooltip title={row._error}>
                            <WarningIcon sx={{ color: '#ef4444', fontSize: 22 }} />
                          </Tooltip>
                        ) : null}
                      </TableCell>

                      {/* ELIMINAR */}
                      <TableCell>
                        <IconButton size="small" onClick={() => removeRow(row._id)}
                          sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box mt={2} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Button startIcon={<AddIcon />} onClick={addRow} variant="outlined"
                sx={{ borderRadius: 3, fontWeight: 800, borderColor: '#8b5cf6', color: '#8b5cf6' }}>
                Agregar Fila
              </Button>
              <Typography variant="caption" color="text.secondary" fontStyle="italic">
                Tip: En la columna "Cajas" presiona Enter para crear la fila siguiente automaticamente.
              </Typography>
            </Box>
          </Box>
        )}

        {/* TAB IMPORTAR CSV */}
        {tab === 1 && (
          <Box sx={{ p: 4 }}>
            <Box sx={{
              border: '2px dashed #c4b5fd', borderRadius: 4, p: 5, textAlign: 'center',
              bgcolor: '#faf5ff', cursor: 'pointer',
              '&:hover': { bgcolor: '#f3e8ff', borderColor: '#8b5cf6' }, transition: 'all 0.2s'
            }} onClick={() => fileInputRef.current?.click()}>
              <FileUploadIcon sx={{ fontSize: 56, color: '#8b5cf6', mb: 2 }} />
              <Typography variant="h6" fontWeight={800} color="#4c1d95">
                Haz clic o arrastra tu archivo aqui
              </Typography>
              <Typography variant="body2" color="#6b7280" mt={1}>
                Formato soportado: <strong>.CSV</strong> separado por comas
              </Typography>
              <input type="file" accept=".csv,.txt" ref={fileInputRef} hidden onChange={handleFileImport} />
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
              <Button startIcon={<GridIcon />} variant="outlined" onClick={downloadTemplate}
                sx={{ borderRadius: 3, fontWeight: 800, borderColor: '#0284c7', color: '#0284c7' }}>
                Descargar Plantilla CSV
              </Button>
              <Typography variant="body2" color="text.secondary">
                Descarga la plantilla, completala con los datos fisicos del conteo y subela aqui. Los datos se mostraran en el grid para revision antes de guardar.
              </Typography>
            </Box>

            <Alert severity="warning" sx={{ mt: 3, borderRadius: 2, fontWeight: 600 }}>
              <strong>Columnas requeridas:</strong> Nombre Reactivo (o Codigo) | Numero de Lote | Fecha Vencimiento (YYYY-MM-DD) | Cantidad (Cajas)
            </Alert>
          </Box>
        )}
      </Paper>

      {/* BANDEJA DE CONFIRMACION */}
      <Paper elevation={4} sx={{ mt: 4, p: 3, borderRadius: 4, border: '2px solid #8b5cf6', bgcolor: '#faf5ff' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h6" fontWeight={900} color="#4c1d95">
              Bandeja de Confirmacion
            </Typography>
            <Typography variant="body2" color="#6b7280">
              Se procesaran <strong>{validRows.length} lotes validos</strong> con <strong>{totalCajas} cajas</strong> en total.
              {invalidRows.length > 0 && <span style={{ color: '#ef4444' }}> {invalidRows.length} fila(s) con errores seran ignoradas.</span>}
            </Typography>
          </Box>
          <Button variant="contained" size="large"
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckIcon />}
            disabled={validRows.length === 0 || submitting}
            onClick={() => setConfirmOpen(true)}
            sx={{
              bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' },
              borderRadius: 3, px: 4, py: 1.5, fontWeight: 900, fontSize: 16,
              boxShadow: '0 10px 25px -5px rgba(124,58,237,0.4)',
              '&.Mui-disabled': { bgcolor: '#e2d9f3' }
            }}>
            {submitting ? 'Procesando...' : 'Ejecutar Carga de Inventario Base'}
          </Button>
        </Box>
      </Paper>

      {/* DIALOGO DE CONFIRMACION */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ bgcolor: '#0f172a', color: 'white', py: 2.5 }}>
          <Typography variant="h6" fontWeight={900}>Confirmar Carga Masiva de Inventario</Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3, mt: 1 }}>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            Esta accion creara <strong>{validRows.length} lotes</strong> y registrara{' '}
            <strong>{totalCajas} cajas</strong> en el Kardex como "Conteo Inicial de Inventario".
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Almacen destino: <strong>{almacen_id === 1 ? 'Almacen Central' : 'Almacen Laboratorio'}</strong>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setConfirmOpen(false)} sx={{ color: '#64748b', fontWeight: 700 }}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}
            sx={{ bgcolor: '#7c3aed', '&:hover': { bgcolor: '#6d28d9' }, fontWeight: 900, borderRadius: 2, px: 4 }}>
            Confirmar y Ejecutar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
