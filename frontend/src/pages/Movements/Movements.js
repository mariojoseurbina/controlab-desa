import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  InputAdornment,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  CompareArrows as TransferIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const Movements = () => {
  const [movements, setMovements] = useState([]);
  const [items, setItems] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [selectedAlmacen, setSelectedAlmacen] = useState('all');

  // Diálogos
  const [openDialog, setOpenDialog] = useState(false);
  const [openTransferDialog, setOpenTransferDialog] = useState(false);

  // Estados de alertas
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Formulario de Movimiento Local (Entrada/Salida)
  const [formData, setFormData] = useState({
    item_id: '',
    tipo_movimiento: 'ENTRADA',
    cantidad: '',
    motivo: '',
    referencia: '',
    almacen_id: ''
  });

  // Formulario de Transferencia de Stock (De Central a Sucursal)
  const [transferFormData, setTransferFormData] = useState({
    item_id: '',
    cantidad: '',
    almacen_origen_id: '',
    almacen_destino_id: '',
    motivo: 'Suministro semanal',
    referencia: 'TRANS'
  });

  // Autocomplete para Movimiento Local
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Autocomplete para Transferencia
  const [transferSearchTerm, setTransferSearchTerm] = useState('');
  const [transferFilteredItems, setTransferFilteredItems] = useState([]);
  const [transferShowSuggestions, setTransferShowSuggestions] = useState(false);
  const [transferSelectedItem, setTransferSelectedItem] = useState(null);

  useEffect(() => {
    loadAlmacenes();
    loadItems();
  }, []);

  useEffect(() => {
    loadMovements();
  }, [selectedAlmacen]);

  // Autocomplete - Movimiento Local
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const filtered = items.filter(item =>
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredItems(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredItems([]);
      setShowSuggestions(false);
    }
  }, [searchTerm, items]);

  // Autocomplete - Transferencias
  useEffect(() => {
    if (transferSearchTerm.length >= 2) {
      const filtered = items.filter(item =>
        item.codigo.toLowerCase().includes(transferSearchTerm.toLowerCase()) ||
        item.nombre.toLowerCase().includes(transferSearchTerm.toLowerCase())
      );
      setTransferFilteredItems(filtered);
      setTransferShowSuggestions(true);
    } else {
      setTransferFilteredItems([]);
      setTransferShowSuggestions(false);
    }
  }, [transferSearchTerm, items]);

  const loadAlmacenes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/almacenes`);
      if (response.ok) {
        const data = await response.json();
        const list = data.data || [];
        setAlmacenes(list);

        if (list.length > 0) {
          const central = list.find(a => a.nombre.toLowerCase().includes('central')) || list[0];
          const sucursal = list.find(a => !a.nombre.toLowerCase().includes('central')) || list[1] || list[0];
          
          setFormData(prev => ({ ...prev, almacen_id: central.id }));
          setTransferFormData(prev => ({
            ...prev,
            almacen_origen_id: central.id,
            almacen_destino_id: sucursal.id
          }));
        }
      }
    } catch (error) {
      console.error('Error cargando almacenes:', error);
    }
  };

  const loadMovements = async () => {
    try {
      const url = selectedAlmacen === 'all'
        ? `${API_BASE_URL}/movements`
        : `${API_BASE_URL}/movements?almacenId=${selectedAlmacen}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setMovements(data.movements || []);
    } catch (error) {
      console.error('Error cargando movimientos:', error);
    }
  };

  const loadItems = async (almacenId = 'all') => {
    try {
      const url = almacenId === 'all'
        ? `${API_BASE_URL}/inventory`
        : `${API_BASE_URL}/inventory?almacenId=${almacenId}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Error cargando items:', error);
    }
  };

  // Recargar items específicos del almacén origen seleccionado para transferencias
  useEffect(() => {
    if (openTransferDialog && transferFormData.almacen_origen_id) {
      loadItems(transferFormData.almacen_origen_id);
    }
  }, [openTransferDialog, transferFormData.almacen_origen_id]);

  // Recargar items específicos de la ubicación seleccionada para movimientos locales
  useEffect(() => {
    if (openDialog && formData.almacen_id) {
      loadItems(formData.almacen_id);
    }
  }, [openDialog, formData.almacen_id]);

  // Cuando se cierra todo, volver a cargar la lista global de items
  useEffect(() => {
    if (!openDialog && !openTransferDialog) {
      loadItems('all');
    }
  }, [openDialog, openTransferDialog]);

  const handleOpenDialog = () => {
    setErrorMsg('');
    setSuccessMsg('');
    const central = almacenes.find(a => a.nombre.toLowerCase().includes('central')) || almacenes[0];
    setFormData({
      item_id: '',
      tipo_movimiento: 'ENTRADA',
      cantidad: '',
      motivo: '',
      referencia: '',
      almacen_id: central ? central.id : ''
    });
    setSearchTerm('');
    setSelectedItem(null);
    setShowSuggestions(false);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenTransferDialog = () => {
    setErrorMsg('');
    setSuccessMsg('');
    const central = almacenes.find(a => a.nombre.toLowerCase().includes('central')) || almacenes[0];
    const sucursal = almacenes.find(a => !a.nombre.toLowerCase().includes('central')) || almacenes[1] || almacenes[0];
    setTransferFormData({
      item_id: '',
      cantidad: '',
      almacen_origen_id: central ? central.id : '',
      almacen_destino_id: sucursal ? sucursal.id : '',
      motivo: 'Suministro semanal',
      referencia: 'TRANS-' + new Date().getDate() + new Date().getMonth()
    });
    setTransferSearchTerm('');
    setTransferSelectedItem(null);
    setTransferShowSuggestions(false);
    setOpenTransferDialog(true);
  };

  const handleCloseTransferDialog = () => {
    setOpenTransferDialog(false);
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setFormData(prev => ({ ...prev, item_id: item.id }));
    setSearchTerm(`${item.codigo} - ${item.nombre}`);
    setShowSuggestions(false);
  };

  const handleTransferItemSelect = (item) => {
    setTransferSelectedItem(item);
    setTransferFormData(prev => ({ ...prev, item_id: item.id }));
    setTransferSearchTerm(`${item.codigo} - ${item.nombre}`);
    setTransferShowSuggestions(false);
  };

  const handleSubmit = async () => {
    setErrorMsg('');
    if (!formData.item_id) {
      setErrorMsg('Por favor selecciona un producto');
      return;
    }
    const qty = parseFloat(formData.cantidad);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('La cantidad debe ser mayor a 0');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/movements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          cantidad: qty
        })
      });

      if (response.ok) {
        setSuccessMsg('Movimiento registrado exitosamente');
        setTimeout(() => {
          handleCloseDialog();
          loadMovements();
          loadItems();
        }, 1200);
      } else {
        const errorData = await response.json();
        setErrorMsg(errorData.error || 'Error registrando movimiento');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMsg('Error de conexión');
    }
  };

  const handleTransferSubmit = async () => {
    setErrorMsg('');
    if (!transferFormData.item_id) {
      setErrorMsg('Por favor selecciona un producto');
      return;
    }
    const qty = parseFloat(transferFormData.cantidad);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('La cantidad a transferir debe ser mayor a 0');
      return;
    }
    if (parseInt(transferFormData.almacen_origen_id) === parseInt(transferFormData.almacen_destino_id)) {
      setErrorMsg('El almacén de origen y el de destino no pueden ser iguales');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/movements/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...transferFormData,
          cantidad: qty
        })
      });

      if (response.ok) {
        setSuccessMsg('¡Transferencia de stock registrada exitosamente!');
        setTimeout(() => {
          handleCloseTransferDialog();
          loadMovements();
          loadItems();
        }, 1200);
      } else {
        const errorData = await response.json();
        setErrorMsg(errorData.error || 'Error procesando transferencia');
      }
    } catch (error) {
      console.error('Error:', error);
      setErrorMsg('Error de conexión');
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom sx={{ m: 0 }}>
          Movimientos de Inventario
        </Typography>
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            select
            size="small"
            label="Filtrar por Sucursal"
            value={selectedAlmacen}
            onChange={(e) => setSelectedAlmacen(e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="all">Todas las Sucursales</MenuItem>
            {almacenes.map((almacen) => (
              <MenuItem key={almacen.id} value={almacen.id}>
                {almacen.nombre}
              </MenuItem>
            ))}
          </TextField>

          <Button
            variant="outlined"
            color="primary"
            startIcon={<TransferIcon />}
            onClick={handleOpenTransferDialog}
          >
            Transferir Suministros
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenDialog}
          >
            Nuevo Movimiento
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Producto</strong></TableCell>
              <TableCell><strong>Tipo</strong></TableCell>
              <TableCell><strong>Cantidad</strong></TableCell>
              <TableCell><strong>Origen / Ubicación</strong></TableCell>
              <TableCell><strong>Destino (Transferencias)</strong></TableCell>
              <TableCell><strong>Referencia</strong></TableCell>
              <TableCell><strong>Motivo</strong></TableCell>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell><strong>Comprobante</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    No se encontraron movimientos para el filtro seleccionado.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={movement.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {movement.item_nombre}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {movement.item_codigo}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={movement.tipo_movimiento}
                      color={
                        movement.tipo_movimiento === 'ENTRADA'
                          ? 'success'
                          : movement.tipo_movimiento === 'SALIDA'
                          ? 'error'
                          : 'info'
                      }
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell>{movement.cantidad}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={movement.almacen_nombre !== 'N/A' ? 'bold' : 'normal'}>
                      {movement.almacen_nombre}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {movement.tipo_movimiento === 'TRANSFERENCIA' ? (
                      <Chip
                        label={movement.almacen_destino_nombre}
                        color="secondary"
                        size="small"
                        variant="outlined"
                        sx={{ fontWeight: 'medium' }}
                      />
                    ) : (
                      <Typography variant="body2" color="textSecondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>{movement.referencia || 'N/A'}</TableCell>
                  <TableCell>{movement.motivo || 'Sin especificar'}</TableCell>
                  <TableCell>
                    {movement.fecha_movimiento
                      ? new Date(movement.fecha_movimiento).toLocaleString('es-VE', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {movement.tipo_movimiento === 'TRANSFERENCIA' && movement.referencia ? (
                      <Button
                        size="small"
                        variant="outlined"
                        color="secondary"
                        component="a"
                        href={`${API_BASE_URL}/movements/transfer/pdf?referencia=${movement.referencia}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ fontSize: '0.75rem', py: 0.2 }}
                      >
                        PDF
                      </Button>
                    ) : (
                      <Typography variant="body2" color="textSecondary">—</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* DIÁLOGO: NUEVO MOVIMIENTO LOCAL */}
      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold' }}>✍️ Registrar Movimiento Local</DialogTitle>
        <DialogContent>
          {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
          {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* BUSCADOR DE PRODUCTOS */}
            <Grid item xs={12} sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                label="Producto"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Escribe código o nombre del item..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              {showSuggestions && filteredItems.length > 0 && (
                <Paper
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    maxHeight: 200,
                    overflow: 'auto',
                    mt: 0.5,
                    boxShadow: 3
                  }}
                >
                  <List dense sx={{ py: 0 }}>
                    {filteredItems.map((item) => (
                      <ListItem key={item.id} button onClick={() => handleItemSelect(item)}>
                        <ListItemText
                          primary={`${item.codigo} - ${item.nombre}`}
                          secondary={`Stock: ${item.stock_actual} ${item.unidad}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Grid>

            {/* ALMACÉN / UBICACIÓN */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                label="Ubicación / Sucursal"
                value={formData.almacen_id}
                onChange={(e) => setFormData({ ...formData, almacen_id: e.target.value })}
              >
                {almacenes.map((almacen) => (
                  <MenuItem key={almacen.id} value={almacen.id}>
                    {almacen.nombre}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* TIPO DE MOVIMIENTO */}
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Tipo de Movimiento"
                value={formData.tipo_movimiento}
                onChange={(e) => setFormData({ ...formData, tipo_movimiento: e.target.value })}
              >
                <MenuItem value="ENTRADA">ENTRADA (Ingreso)</MenuItem>
                <MenuItem value="SALIDA">SALIDA (Consumo/Descarte)</MenuItem>
              </TextField>
            </Grid>

            {/* CANTIDAD */}
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Cantidad"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
              />
            </Grid>

            {/* REFERENCIA */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Referencia"
                value={formData.referencia}
                onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
                placeholder="N° factura, orden de compra, consumo interno, etc."
              />
            </Grid>

            {/* MOTIVO */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Motivo / Observaciones"
                multiline
                rows={2}
                value={formData.motivo}
                onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                placeholder="Ej: Consumo diario del laboratorio, ajuste físico..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            Guardar Movimiento
          </Button>
        </DialogActions>
      </Dialog>

      {/* DIÁLOGO: TRANSFERENCIA DE STOCK (SUMINISTROS) */}
      <Dialog open={openTransferDialog} onClose={handleCloseTransferDialog} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 'bold' }}>🚛 Transferencia de Suministros (Semanal)</DialogTitle>
        <DialogContent>
          {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}
          {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* BUSCADOR DE PRODUCTOS */}
            <Grid item xs={12} sx={{ position: 'relative' }}>
              <TextField
                fullWidth
                label="Seleccionar Producto"
                value={transferSearchTerm}
                onChange={(e) => setTransferSearchTerm(e.target.value)}
                placeholder="Escribe código o nombre del item..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              {transferShowSuggestions && transferFilteredItems.length > 0 && (
                <Paper
                  sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    maxHeight: 200,
                    overflow: 'auto',
                    mt: 0.5,
                    boxShadow: 3
                  }}
                >
                  <List dense sx={{ py: 0 }}>
                    {transferFilteredItems.map((item) => (
                      <ListItem key={item.id} button onClick={() => handleTransferItemSelect(item)}>
                        <ListItemText
                          primary={`${item.codigo} - ${item.nombre}`}
                          secondary={`Stock en origen: ${item.stock_actual} ${item.unidad}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Paper>
              )}
            </Grid>

            {/* ALMACÉN ORIGEN */}
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Almacén Origen"
                value={transferFormData.almacen_origen_id}
                onChange={(e) => setTransferFormData({ ...transferFormData, almacen_origen_id: e.target.value })}
              >
                {almacenes.map((almacen) => (
                  <MenuItem key={almacen.id} value={almacen.id}>
                    {almacen.nombre}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* ALMACÉN DESTINO */}
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Sucursal Destino"
                value={transferFormData.almacen_destino_id}
                onChange={(e) => setTransferFormData({ ...transferFormData, almacen_destino_id: e.target.value })}
              >
                {almacenes.map((almacen) => (
                  <MenuItem key={almacen.id} value={almacen.id}>
                    {almacen.nombre}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* CANTIDAD */}
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Cantidad a Transferir"
                value={transferFormData.cantidad}
                onChange={(e) => setTransferFormData({ ...transferFormData, cantidad: e.target.value })}
              />
            </Grid>

            {/* REFERENCIA */}
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Referencia de Envío"
                value={transferFormData.referencia}
                onChange={(e) => setTransferFormData({ ...transferFormData, referencia: e.target.value })}
              />
            </Grid>

            {/* MOTIVO */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observaciones"
                multiline
                rows={2}
                value={transferFormData.motivo}
                onChange={(e) => setTransferFormData({ ...transferFormData, motivo: e.target.value })}
                placeholder="Ej: Abastecimiento semanal de reactivos..."
              />
            </Grid>

            {/* STOCK INFO DETALLE */}
            {transferSelectedItem && (
              <Grid item xs={12}>
                <Paper sx={{ p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
                  <Typography variant="body2" fontWeight="bold">
                    📦 Reactivo: {transferSelectedItem.nombre}
                  </Typography>
                  <Typography variant="caption">
                    Código: {transferSelectedItem.codigo} | Stock en origen: {transferSelectedItem.stock_actual} {transferSelectedItem.unidad}
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTransferDialog}>Cancelar</Button>
          <Button
            onClick={handleTransferSubmit}
            variant="contained"
            color="secondary"
            disabled={!transferFormData.item_id || transferFormData.cantidad <= 0}
          >
            Enviar Suministros
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Movements;