import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  CardHeader,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Chip,
  CircularProgress,
  Box,
  Grid,
  Typography,
  IconButton,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon
} from '@mui/icons-material';

const GestionKitsPrueba = () => {
  const [kits, setKits] = useState([]);
  const [reactivos, setReactivos] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [currentKit, setCurrentKit] = useState(null);

  const [formData, setFormData] = useState({
    codigo_kit: '',
    nombre_kit: '',
    tipo_prueba: 'Hematología',
    descripcion: ''
  });

  const [kitReactivos, setKitReactivos] = useState([]);
  const [nuevoReactivo, setNuevoReactivo] = useState({
    id_reactivo: '',
    cantidad_utilizada: '',
    unidad: 'ml',
    es_obligatorio: true
  });

  useEffect(() => {
    cargarKits();
    cargarReactivos();
  }, []);

  const cargarKits = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/kits-prueba', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar kits');
      
      const result = await response.json();
      if (result.success) {
        setKits(result.data);
      }
    } catch (error) {
      setError('Error al cargar kits: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarReactivos = async () => {
    try {
      const response = await fetch('/api/kits-prueba/reactivos/disponibles', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar reactivos');
      
      const result = await response.json();
      if (result.success) {
        setReactivos(result.data);
      }
    } catch (error) {
      setError('Error al cargar reactivos: ' + error.message);
    }
  };

  const abrirModalCrear = () => {
    setEditMode(false);
    setCurrentKit(null);
    setFormData({
      codigo_kit: '',
      nombre_kit: '',
      tipo_prueba: 'Hematología',
      descripcion: ''
    });
    setKitReactivos([]);
    setOpenModal(true);
  };

  const abrirModalEditar = async (kit) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/kits-prueba/${kit.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Error al cargar kit');
      
      const result = await response.json();
      if (result.success) {
        setEditMode(true);
        setCurrentKit(result.data);
        setFormData({
          codigo_kit: result.data.codigo_kit,
          nombre_kit: result.data.nombre_kit,
          tipo_prueba: result.data.tipo_prueba,
          descripcion: result.data.descripcion || ''
        });
        setKitReactivos(result.data.reactivos || []);
        setOpenModal(true);
      }
    } catch (error) {
      setError('Error al cargar kit: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const kitData = {
        ...formData,
        reactivos: kitReactivos
      };

      const url = editMode ? `/api/kits-prueba/${currentKit.id}` : '/api/kits-prueba';
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(kitData)
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess(editMode ? 'Kit actualizado exitosamente' : 'Kit creado exitosamente');
        setOpenModal(false);
        cargarKits();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setError('Error al guardar kit: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const agregarReactivo = () => {
    if (!nuevoReactivo.id_reactivo || !nuevoReactivo.cantidad_utilizada) {
      setError('Seleccione un reactivo y especifique la cantidad');
      return;
    }

    const reactivoSeleccionado = reactivos.find(r => r.id == nuevoReactivo.id_reactivo);
    if (!reactivoSeleccionado) return;

    const reactivo = {
      id_reactivo: parseInt(nuevoReactivo.id_reactivo),
      cantidad_utilizada: parseFloat(nuevoReactivo.cantidad_utilizada),
      unidad: nuevoReactivo.unidad,
      es_obligatorio: nuevoReactivo.es_obligatorio,
      nombre_reactivo: reactivoSeleccionado.nombre,
      orden: kitReactivos.length + 1
    };

    setKitReactivos([...kitReactivos, reactivo]);
    
    setNuevoReactivo({
      id_reactivo: '',
      cantidad_utilizada: '',
      unidad: 'ml',
      es_obligatorio: true
    });
  };

  const eliminarReactivo = (index) => {
    const nuevosReactivos = kitReactivos.filter((_, i) => i !== index);
    setKitReactivos(nuevosReactivos);
  };

  const desactivarKit = async (id) => {
    if (!window.confirm('¿Está seguro de desactivar este kit?')) return;

    try {
      const response = await fetch(`/api/kits-prueba/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setSuccess('Kit desactivado exitosamente');
        cargarKits();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setError('Error al desactivar kit: ' + error.message);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          🧪 Gestión de Kits de Prueba
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={abrirModalCrear}>
          Nuevo Kit
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Card>
        <CardHeader title="Lista de Kits de Prueba" />
        <CardContent>
          {loading ? (
            <Box display="flex" justifyContent="center">
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Reactivos</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {kits.map(kit => (
                    <TableRow key={kit.id}>
                      <TableCell>
                        <Chip label={kit.codigo_kit} color="primary" size="small" />
                      </TableCell>
                      <TableCell>{kit.nombre_kit}</TableCell>
                      <TableCell>
                        <Chip label={kit.tipo_prueba} variant="outlined" size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${kit.reactivos_count} reactivos`} 
                          color="info" 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={kit.activo ? 'Activo' : 'Inactivo'} 
                          color={kit.activo ? 'success' : 'default'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          color="primary"
                          onClick={() => abrirModalEditar(kit)}
                          disabled={!kit.activo}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => desactivarKit(kit.id)}
                          disabled={!kit.activo}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {kits.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="textSecondary">
                          No hay kits de prueba configurados
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Modal para crear/editar kit */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editMode ? 'Editar Kit de Prueba' : 'Crear Kit de Prueba'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Código del Kit *"
                  value={formData.codigo_kit}
                  onChange={(e) => setFormData({...formData, codigo_kit: e.target.value})}
                  required
                  placeholder="Ej: HEMO-001"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre del Kit *"
                  value={formData.nombre_kit}
                  onChange={(e) => setFormData({...formData, nombre_kit: e.target.value})}
                  required
                  placeholder="Ej: Hemograma Completo"
                />
              </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Prueba</InputLabel>
                  <Select
                    value={formData.tipo_prueba}
                    label="Tipo de Prueba"
                    onChange={(e) => setFormData({...formData, tipo_prueba: e.target.value})}
                  >
                    <MenuItem value="Hematología">Hematología</MenuItem>
                    <MenuItem value="Bioquímica">Bioquímica</MenuItem>
                    <MenuItem value="Inmunología">Inmunología</MenuItem>
                    <MenuItem value="Microbiología">Microbiología</MenuItem>
                    <MenuItem value="PCR">PCR</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Descripción"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                  placeholder="Descripción opcional del kit"
                />
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
              Reactivos del Kit
            </Typography>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Reactivo</InputLabel>
                  <Select
                    value={nuevoReactivo.id_reactivo}
                    label="Reactivo"
                    onChange={(e) => setNuevoReactivo({...nuevoReactivo, id_reactivo: e.target.value})}
                  >
                    <MenuItem value="">
                      <em>Seleccionar reactivo...</em>
                    </MenuItem>
                    {reactivos.map(reactivo => (
                      <MenuItem key={reactivo.id} value={reactivo.id}>
                        {reactivo.nombre} (Stock: {reactivo.stock_actual} {reactivo.unidad})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Cantidad"
                  type="number"
                  inputProps={{ step: "0.001" }}
                  value={nuevoReactivo.cantidad_utilizada}
                  onChange={(e) => setNuevoReactivo({...nuevoReactivo, cantidad_utilizada: e.target.value})}
                  placeholder="0.000"
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <FormControl fullWidth>
                  <InputLabel>Unidad</InputLabel>
                  <Select
                    value={nuevoReactivo.unidad}
                    label="Unidad"
                    onChange={(e) => setNuevoReactivo({...nuevoReactivo, unidad: e.target.value})}
                  >
                    <MenuItem value="ml">ml</MenuItem>
                    <MenuItem value="μl">μl</MenuItem>
                    <MenuItem value="unidades">unidades</MenuItem>
                    <MenuItem value="pruebas">pruebas</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={nuevoReactivo.es_obligatorio}
                      onChange={(e) => setNuevoReactivo({...nuevoReactivo, es_obligatorio: e.target.checked})}
                    />
                  }
                  label="Obligatorio"
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button
                  variant="outlined"
                  onClick={agregarReactivo}
                  sx={{ mt: 1 }}
                  fullWidth
                >
                  Agregar
                </Button>
              </Grid>
            </Grid>

            {kitReactivos.length > 0 && (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Reactivo</TableCell>
                      <TableCell>Cantidad</TableCell>
                      <TableCell>Unidad</TableCell>
                      <TableCell>Obligatorio</TableCell>
                      <TableCell>Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {kitReactivos.map((reactivo, index) => (
                      <TableRow key={index}>
                        <TableCell>{reactivo.nombre_reactivo}</TableCell>
                        <TableCell>{reactivo.cantidad_utilizada}</TableCell>
                        <TableCell>{reactivo.unidad}</TableCell>
                        <TableCell>
                          <Chip 
                            label={reactivo.es_obligatorio ? 'Sí' : 'No'} 
                            color={reactivo.es_obligatorio ? 'success' : 'default'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => eliminarReactivo(index)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
            <Button 
              type="submit"
              variant="contained"
              disabled={kitReactivos.length === 0 || loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Guardar Kit'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
};

export default GestionKitsPrueba;