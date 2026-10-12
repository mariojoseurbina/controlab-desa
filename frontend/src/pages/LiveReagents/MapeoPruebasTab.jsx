import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, CircularProgress, Alert
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, UploadFile as UploadIcon, Download as DownloadIcon, Add as AddIcon } from '@mui/icons-material';
import api from '../../services/api';
import * as XLSX from 'xlsx';

const MapeoPruebasTab = () => {
  const [mapeos, setMapeos] = useState([]);
  const [reactivos, setReactivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentMapeo, setCurrentMapeo] = useState({ id: null, nombre_prueba: '', patron_busqueda: '', reactivo_id: '', consumo_por_prueba: 0.25 });
  const [message, setMessage] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resMap, resReac] = await Promise.all([
        api.get('/mapeo'),
        api.get('/mapeo/reactivos')
      ]);
      if(resMap.data.success) setMapeos(resMap.data.data);
      if(resReac.data.success) setReactivos(resReac.data.data);
    } catch (e) {
      console.error(e);
      setMessage({ type: 'error', text: 'Error al cargar datos' });
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async () => {
    try {
      await api.post('/mapeo', currentMapeo);
      setOpenDialog(false);
      loadData();
      setMessage({ type: 'success', text: 'Guardado correctamente' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Error al guardar' });
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm('¿Seguro que deseas borrar este mapeo?')) return;
    try {
      await api.delete('/mapeo/' + id);
      loadData();
    } catch (e) {
      setMessage({ type: 'error', text: 'Error al borrar' });
    }
  };

  const handleDownloadExcel = () => {
    const ws_data = mapeos.map(m => ({
      ID_Mapeo: m.id,
      Nombre_Prueba: m.nombre_prueba,
      Patron_Busqueda: m.patron_busqueda,
      ID_Reactivo: m.reactivo_id,
      Nombre_Reactivo: m.reactivo_nombre,
      Consumo_mL: m.consumo_por_prueba
    }));
    
    // Si est vaco, ponemos una fila de ejemplo
    if(ws_data.length === 0) {
       ws_data.push({
           ID_Mapeo: '',
           Nombre_Prueba: 'Ejemplo Urea',
           Patron_Busqueda: 'UREA|BUN',
           ID_Reactivo: reactivos[0] ? reactivos[0].id : '123',
           Nombre_Reactivo: 'No Modificar Esta Columna (Solo Lectura)',
           Consumo_mL: 0.25
       });
    }

    const ws = XLSX.utils.json_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mapeos");

    const ws_reactivos = XLSX.utils.json_to_sheet(reactivos.map(r => ({
       ID_Reactivo: r.id,
       Codigo: r.codigo,
       Nombre_Reactivo: r.nombre
    })));
    XLSX.utils.book_append_sheet(wb, ws_reactivos, "Catalogo_Reactivos");

    XLSX.writeFile(wb, "Mapeo_Pruebas_Plantilla.xlsx");
  };

  const handleUploadExcel = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      setLoading(true);
      try {
        const res = await api.post('/mapeo/upload', { mapeos: data });
        setMessage({ type: 'success', text: res.data.message });
        loadData();
      } catch (err) {
        setMessage({ type: 'error', text: 'Error al procesar el Excel' });
      }
      setLoading(false);
      e.target.value = ''; // reset input
    };
    reader.readAsBinaryString(file);
  };

  return (
    <Box sx={{ p: 2 }}>
      {message && <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>{message.text}</Alert>}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Mapeo de Pruebas Analizador (Sniffer)</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownloadExcel}>
            Descargar Plantilla / Excel
          </Button>
          <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
            Subir Excel
            <input type="file" hidden accept=".xlsx, .xls" onChange={handleUploadExcel} />
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setCurrentMapeo({ id: null, nombre_prueba: '', patron_busqueda: '', reactivo_id: '', consumo_por_prueba: 0.25 }); setOpenDialog(true); }}>
            Nuevo Mapeo
          </Button>
        </Box>
      </Box>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><b>Nombre Prueba</b></TableCell>
                <TableCell><b>Patrn Analizador (Sniffer)</b></TableCell>
                <TableCell><b>ID Reactivo</b></TableCell>
                <TableCell><b>Reactivo Asociado</b></TableCell>
                <TableCell><b>Consumo (mL)</b></TableCell>
                <TableCell><b>Acciones</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {mapeos.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.nombre_prueba}</TableCell>
                  <TableCell><Box sx={{ bgcolor: '#eee', p: 0.5, borderRadius: 1, fontFamily: 'monospace' }}>{row.patron_busqueda}</Box></TableCell>
                  <TableCell>{row.reactivo_id}</TableCell>
                  <TableCell>{row.reactivo_nombre}</TableCell>
                  <TableCell>{row.consumo_por_prueba}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="primary" onClick={() => { setCurrentMapeo(row); setOpenDialog(true); }}><EditIcon /></IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(row.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {mapeos.length === 0 && <TableRow><TableCell colSpan={6} align="center">No hay mapeos registrados.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{currentMapeo.id ? 'Editar Mapeo' : 'Nuevo Mapeo'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Nombre Prueba (Ej. Glucosa)" value={currentMapeo.nombre_prueba} onChange={e => setCurrentMapeo({...currentMapeo, nombre_prueba: e.target.value})} fullWidth />
          <TextField label="Patrn en Analizador (Ej. GLU|GLUC)" value={currentMapeo.patron_busqueda} onChange={e => setCurrentMapeo({...currentMapeo, patron_busqueda: e.target.value})} fullWidth helperText="Usa | para mltiples nombres" />
          
          <FormControl fullWidth>
            <InputLabel>Reactivo Asociado (Ficha de Producto)</InputLabel>
            <Select value={currentMapeo.reactivo_id} label="Reactivo Asociado (Ficha de Producto)" onChange={e => setCurrentMapeo({...currentMapeo, reactivo_id: e.target.value})}>
              {reactivos.map(r => <MenuItem key={r.id} value={r.id}>[{r.codigo || r.id}] {r.nombre}</MenuItem>)}
            </Select>
          </FormControl>

          <TextField label="Consumo por Prueba (mL)" type="number" inputProps={{ step: 0.01 }} value={currentMapeo.consumo_por_prueba} onChange={e => setCurrentMapeo({...currentMapeo, consumo_por_prueba: e.target.value})} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
export default MapeoPruebasTab;
