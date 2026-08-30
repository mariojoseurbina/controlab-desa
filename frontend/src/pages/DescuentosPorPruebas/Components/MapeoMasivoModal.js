// import React, { useState, useEffect } from 'react';
// import {
//   Modal, Box, Typography, Button, Table, TableBody, TableCell,
//   TableContainer, TableHead, TableRow, Paper, Select, MenuItem,
//   FormControl, InputLabel, TextField, Chip, CircularProgress,
//   Alert, IconButton, Checkbox
// } from '@mui/material';
// import {
//   Close as CloseIcon,
//   Check as CheckIcon,
//   Science as ScienceIcon
// } from '@mui/icons-material';

// const MapeoMasivoModal = ({ open, onClose, examenes, fecha, onGuardado }) => {
//   const [examenesParaMapear, setExamenesParaMapear] = useState([]);
//   const [cargando, setCargando] = useState(false);
//   const [guardando, setGuardando] = useState(false);
//   const [todosSeleccionados, setTodosSeleccionados] = useState(false);

//   useEffect(() => {
//     if (open && examenes.length > 0) {
//       cargarSugerencias();
//     }
//   }, [open, examenes]);

//   const cargarSugerencias = async () => {
//     setCargando(true);
//     try {
//       // Filtrar solo exámenes sin mapear
//       const examenesSinMapear = examenes.filter(e => !e.ya_mapeado);
      
//       const response = await fetch(`${API_BASE_URL}/mapeo/sugerir-lote`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ examenes: examenesSinMapear.map(e => e.examen_nombre) })
//       });
      
//       const data = await response.json();
      
//       if (data.success) {
//         const examenesConSugerencias = examenesSinMapear.map(examen => {
//           const sugerencias = data.sugerencias.find(s => s.examen === examen.examen_nombre);
//           return {
//             ...examen,
//             seleccionado: false,
//             reactivo_id: sugerencias?.sugerencias[0]?.id || null,
//             reactivo_nombre: sugerencias?.sugerencias[0]?.nombre || '',
//             consumo_por_prueba: sugerencias?.sugerencias[0]?.consumo_sugerido || 0.20,
//             sugerencias: sugerencias?.sugerencias || []
//           };
//         });
        
//         setExamenesParaMapear(examenesConSugerencias);
//       }
//     } catch (error) {
//       console.error('Error cargando sugerencias:', error);
//     } finally {
//       setCargando(false);
//     }
//   };

//   const toggleSeleccionarTodos = () => {
//     const nuevoEstado = !todosSeleccionados;
//     setTodosSeleccionados(nuevoEstado);
    
//     setExamenesParaMapear(prev => 
//       prev.map(examen => ({
//         ...examen,
//         seleccionado: nuevoEstado
//       }))
//     );
//   };

//   const actualizarExamen = (index, cambios) => {
//     setExamenesParaMapear(prev => 
//       prev.map((examen, i) => 
//         i === index ? { ...examen, ...cambios } : examen
//       )
//     );
//   };

//   const handleGuardar = async () => {
//     const examenesSeleccionados = examenesParaMapear.filter(e => e.seleccionado);
    
//     if (examenesSeleccionados.length === 0) {
//       alert('Selecciona al menos un examen para mapear');
//       return;
//     }

//     // Validar que todos tengan reactivo asignado
//     const invalidos = examenesSeleccionados.filter(e => !e.reactivo_id);
//     if (invalidos.length > 0) {
//       alert(`Los siguientes exámenes no tienen reactivo asignado: ${invalidos.map(e => e.examen_nombre).join(', ')}`);
//       return;
//     }

//     setGuardando(true);

//     try {
//       const mapeos = examenesSeleccionados.map(examen => ({
//         examen: examen.examen_nombre,
//         reactivo_id: examen.reactivo_id,
//         consumo_por_prueba: examen.consumo_por_prueba
//       }));

//       const response = await fetch(`${API_BASE_URL}/mapeo/guardar-masivo`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ mapeos })
//       });

//       const data = await response.json();

//       if (data.success) {
//         alert(`✅ ${data.message}`);
//         onGuardado();
//         onClose();
//       } else {
//         alert(`❌ ${data.message}`);
//       }
//     } catch (error) {
//       console.error('Error guardando mapeo masivo:', error);
//       alert('Error de conexión');
//     } finally {
//       setGuardando(false);
//     }
//   };

//   const calcularTotalMl = (examen) => {
//     return (examen.pruebas * examen.consumo_por_prueba).toFixed(2);
//   };

//   return (
//     <Modal open={open} onClose={onClose}>
//       <Box sx={{
//         position: 'absolute',
//         top: '50%',
//         left: '50%',
//         transform: 'translate(-50%, -50%)',
//         width: '90%',
//         maxWidth: 1200,
//         maxHeight: '90vh',
//         bgcolor: 'background.paper',
//         boxShadow: 24,
//         borderRadius: 2,
//         overflow: 'hidden',
//         display: 'flex',
//         flexDirection: 'column'
//       }}>
//         {/* Header */}
//         <Box sx={{
//           p: 3,
//           borderBottom: 1,
//           borderColor: 'divider',
//           display: 'flex',
//           justifyContent: 'space-between',
//           alignItems: 'center'
//         }}>
//           <Box>
//             <Typography variant="h6">
//               🗂️ Mapeo Masivo de Exámenes
//             </Typography>
//             <Typography variant="body2" color="text.secondary">
//               Fecha: {fecha} | {examenesParaMapear.length} exámenes sin mapear
//             </Typography>
//           </Box>
//           <IconButton onClick={onClose}>
//             <CloseIcon />
//           </IconButton>
//         </Box>

//         {/* Contenido */}
//         <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
//           {cargando ? (
//             <Box sx={{ textAlign: 'center', py: 5 }}>
//               <CircularProgress />
//               <Typography variant="body2" sx={{ mt: 2 }}>
//                 Cargando sugerencias automáticas...
//               </Typography>
//             </Box>
//           ) : (
//             <>
//               <Alert severity="info" sx={{ mb: 2 }}>
//                 Selecciona los exámenes que deseas mapear. El sistema sugiere reactivos automáticamente.
//               </Alert>

//               <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
//                 <Checkbox
//                   checked={todosSeleccionados}
//                   onChange={toggleSeleccionarTodos}
//                 />
//                 <Typography variant="body2">
//                   Seleccionar todos ({examenesParaMapear.filter(e => e.seleccionado).length} seleccionados)
//                 </Typography>
//               </Box>

//               <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
//                 <Table stickyHeader size="small">
//                   <TableHead>
//                     <TableRow>
//                       <TableCell width="50px">Sel.</TableCell>
//                       <TableCell>Examen</TableCell>
//                       <TableCell align="right">Pruebas</TableCell>
//                       <TableCell>Reactivo Sugerido</TableCell>
//                       <TableCell width="120px">Consumo (ml)</TableCell>
//                       <TableCell align="right">Total ml</TableCell>
//                     </TableRow>
//                   </TableHead>
//                   <TableBody>
//                     {examenesParaMapear.map((examen, index) => (
//                       <TableRow key={examen.examen_nombre}>
//                         <TableCell>
//                           <Checkbox
//                             checked={examen.seleccionado}
//                             onChange={(e) => 
//                               actualizarExamen(index, { seleccionado: e.target.checked })
//                             }
//                           />
//                         </TableCell>
//                         <TableCell>
//                           <Typography variant="body2" fontWeight="medium">
//                             {examen.examen_nombre}
//                           </Typography>
//                         </TableCell>
//                         <TableCell align="right">
//                           {examen.pruebas}
//                         </TableCell>
//                         <TableCell>
//                           <FormControl fullWidth size="small">
//                             <Select
//                               value={examen.reactivo_id || ''}
//                               onChange={(e) => {
//                                 const reactivo = examen.sugerencias.find(r => r.id === e.target.value);
//                                 actualizarExamen(index, {
//                                   reactivo_id: e.target.value,
//                                   reactivo_nombre: reactivo?.nombre,
//                                   consumo_por_prueba: reactivo?.consumo_sugerido || 0.20
//                                 });
//                               }}
//                               displayEmpty
//                             >
//                               {examen.sugerencias.map(reactivo => (
//                                 <MenuItem key={reactivo.id} value={reactivo.id}>
//                                   {reactivo.nombre} ({reactivo.codigo})
//                                 </MenuItem>
//                               ))}
//                             </Select>
//                           </FormControl>
//                         </TableCell>
//                         <TableCell>
//                           <TextField
//                             type="number"
//                             value={examen.consumo_por_prueba}
//                             onChange={(e) => 
//                               actualizarExamen(index, { 
//                                 consumo_por_prueba: parseFloat(e.target.value) || 0 
//                               })
//                             }
//                             size="small"
//                             InputProps={{ inputProps: { step: 0.01, min: 0 } }}
//                           />
//                         </TableCell>
//                         <TableCell align="right">
//                           <Chip 
//                             label={`${calcularTotalMl(examen)} ml`}
//                             size="small"
//                             color="primary"
//                             variant="outlined"
//                           />
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                   </TableBody>
//                 </Table>
//               </TableContainer>

//               {/* Resumen */}
//               <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
//                 <Typography variant="subtitle2" gutterBottom>
//                   📊 Resumen del mapeo:
//                 </Typography>
//                 <Box sx={{ display: 'flex', gap: 3 }}>
//                   <Typography variant="body2">
//                     <strong>Exámenes seleccionados:</strong> {examenesParaMapear.filter(e => e.seleccionado).length}
//                   </Typography>
//                   <Typography variant="body2">
//                     <strong>Total ml estimados:</strong> {
//                       examenesParaMapear
//                         .filter(e => e.seleccionado)
//                         .reduce((total, examen) => total + (examen.pruebas * examen.consumo_por_prueba), 0)
//                         .toFixed(2)
//                     } ml
//                   </Typography>
//                 </Box>
//               </Box>
//             </>
//           )}
//         </Box>

//         {/* Footer con botones */}
//         <Box sx={{ 
//           p: 2, 
//           borderTop: 1, 
//           borderColor: 'divider',
//           display: 'flex',
//           justifyContent: 'space-between',
//           alignItems: 'center'
//         }}>
//           <Button onClick={onClose}>
//             Cancelar
//           </Button>
//           <Box sx={{ display: 'flex', gap: 1 }}>
//             <Button
//               variant="outlined"
//               onClick={cargarSugerencias}
//               disabled={cargando}
//             >
//               Actualizar Sugerencias
//             </Button>
//             <Button
//               variant="contained"
//               onClick={handleGuardar}
//               disabled={guardando || examenesParaMapear.filter(e => e.seleccionado).length === 0}
//               startIcon={guardando ? <CircularProgress size={20} /> : <CheckIcon />}
//             >
//               {guardando ? 'Guardando...' : `Guardar Mapeo (${examenesParaMapear.filter(e => e.seleccionado).length})`}
//             </Button>
//           </Box>
//         </Box>
//       </Box>
//     </Modal>
//   );
// };

// export default MapeoMasivoModal;

// ingreso este codigo 02/02/2026 


import React, { useState, useEffect } from 'react';
import {
  Modal, Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Select, MenuItem,
  FormControl, Checkbox, Alert, IconButton, CircularProgress,
  TextField, Chip, Autocomplete
} from '@mui/material';
import {
  Close as CloseIcon,
  Check as CheckIcon,
  Science as ScienceIcon,
  AutoAwesome as AutoAwesomeIcon
} from '@mui/icons-material';

const API_BASE_URL = 'http://localhost:5000';

const MapeoMasivoModal = ({ open, onClose, examenes, fecha, onGuardado }) => {
  const [examenesParaMapear, setExamenesParaMapear] = useState([]);
  const [reactivos, setReactivos] = useState([]);
  const [mapeosExistentes, setMapeosExistentes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [todosSeleccionados, setTodosSeleccionados] = useState(false);
  const [filtroNombre, setFiltroNombre] = useState('');

  // Cargar reactivos y mapeos existentes
  useEffect(() => {
    if (open) {
      cargarDatosIniciales();
    }
  }, [open]);

  const cargarDatosIniciales = async () => {
    setCargando(true);
    try {
      // 1. Cargar reactivos disponibles
      const responseReactivos = await fetch(`${API_BASE_URL}/api/mapeo/reactivos-disponibles`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const dataReactivos = await responseReactivos.json();
      setReactivos(dataReactivos.reactivos || []);

      // 2. Cargar mapeos existentes para sugerencias
      const responseMapeos = await fetch(`${API_BASE_URL}/api/mapeo/existentes`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const dataMapeos = await responseMapeos.json();
      setMapeosExistentes(dataMapeos.mapeos || []);

      // 3. Inicializar exámenes con sugerencias inteligentes
      const examenesConSugerencias = examenes.map(examen => {
        // Buscar mapeo existente para esta prueba
        const mapeoExistente = dataMapeos.mapeos?.find(m => 
          m.examen_nombre?.toUpperCase() === examen.examen_nombre?.toUpperCase()
        );

        // Buscar reactivo por coincidencia de nombre
        let reactivoSugerido = null;
        if (!mapeoExistente) {
          reactivoSugerido = buscarReactivoPorCoincidencia(examen.examen_nombre, dataReactivos.reactivos || []);
        }

        return {
          ...examen,
          seleccionado: false,
          reactivo_id: mapeoExistente?.reactivo_id || reactivoSugerido?.id || null,
          reactivo_nombre: mapeoExistente?.reactivo_nombre || reactivoSugerido?.nombre || '',
          consumo_ml: mapeoExistente?.consumo_ml || 0.25,
          sugerencia_automatica: !mapeoExistente && !!reactivoSugerido,
          mapeo_existente: !!mapeoExistente,
          lotes_disponibles: reactivoSugerido?.lotes_activos || 0
        };
      });

      setExamenesParaMapear(examenesConSugerencias);
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      // Si falla, inicializar sin sugerencias
      setExamenesParaMapear(examenes.map(e => ({
        ...e,
        seleccionado: false,
        reactivo_id: null,
        reactivo_nombre: '',
        consumo_ml: 0.25,
        sugerencia_automatica: false,
        mapeo_existente: false,
        lotes_disponibles: 0
      })));
    } finally {
      setCargando(false);
    }
  };

  // Función inteligente para buscar reactivos por coincidencia de nombre
  const buscarReactivoPorCoincidencia = (nombreExamen, listaReactivos) => {
    if (!nombreExamen || !listaReactivos.length) return null;
    
    const nombreUpper = nombreExamen.toUpperCase();
    
    // Palabras clave comunes en pruebas
    const palabrasClave = [
      'HEMATOLOGIA', 'HEMA', 'GLICEMIA', 'GLUCOSA', 'CREATININA', 'CREAT',
      'UREA', 'ORINA', 'TRANSAMINASA', 'TRANS', 'TRIGLICERIDOS', 'TRIGLIC',
      'COLESTEROL', 'COLEST', 'BILIRRUBINA', 'BILIR', 'PROTEINAS', 'ALBUMINA',
      'CALCIO', 'SODIO', 'POTASIO', 'CLORO', 'FOSFORO', 'MAGNESIO'
    ];
    
    // Encontrar palabra clave en el nombre del examen
    const palabraClaveEncontrada = palabrasClave.find(palabra => 
      nombreUpper.includes(palabra)
    );
    
    if (palabraClaveEncontrada) {
      // Buscar reactivo que contenga la palabra clave
      const reactivoEncontrado = listaReactivos.find(reactivo => {
        const nombreReactivoUpper = reactivo.nombre?.toUpperCase() || '';
        const codigoReactivoUpper = reactivo.codigo?.toUpperCase() || '';
        
        return nombreReactivoUpper.includes(palabraClaveEncontrada) || 
               codigoReactivoUpper.includes(palabraClaveEncontrada);
      });
      
      if (reactivoEncontrado) return reactivoEncontrado;
    }
    
    // Si no hay coincidencia con palabras clave, buscar por coincidencias parciales
    const palabrasExamen = nombreUpper.split(/[\s\/\-]+/).filter(p => p.length > 3);
    
    for (const palabra of palabrasExamen) {
      const reactivoEncontrado = listaReactivos.find(reactivo => {
        const nombreReactivoUpper = reactivo.nombre?.toUpperCase() || '';
        return nombreReactivoUpper.includes(palabra) || 
               palabra.includes(nombreReactivoUpper.substring(0, 5));
      });
      
      if (reactivoEncontrado) return reactivoEncontrado;
    }
    
    return null;
  };

  const actualizarExamen = (index, cambios) => {
    setExamenesParaMapear(prev => 
      prev.map((examen, i) => 
        i === index ? { ...examen, ...cambios } : examen
      )
    );
  };

  const toggleSeleccionarTodos = () => {
    const nuevoEstado = !todosSeleccionados;
    setTodosSeleccionados(nuevoEstado);
    
    setExamenesParaMapear(prev => 
      prev.map(examen => ({
        ...examen,
        seleccionado: nuevoEstado && (!filtroNombre || examen.examen_nombre.toLowerCase().includes(filtroNombre.toLowerCase()))
      }))
    );
  };

  const handleGuardar = async () => {
    const examenesSeleccionados = examenesParaMapear.filter(e => e.seleccionado);
    
    if (examenesSeleccionados.length === 0) {
      alert('Selecciona al menos un examen para mapear');
      return;
    }

    // Validar que todos tengan reactivo asignado
    const invalidos = examenesSeleccionados.filter(e => !e.reactivo_id);
    if (invalidos.length > 0) {
      alert(`Los siguientes exámenes no tienen reactivo asignado: ${invalidos.map(e => e.examen_nombre).join(', ')}`);
      return;
    }

    setGuardando(true);

    try {
      const asignaciones = examenesSeleccionados.map(examen => ({
        examen_nombre: examen.examen_nombre,
        reactivo_id: examen.reactivo_id,
        // El consumo ahora se define en el lote, no en el mapeo
        // consumo_por_prueba: 0.00
      }));

      const response = await fetch(`${API_BASE_URL}/api/mapeo/masivo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          asignaciones, 
          fecha,
          tipo: 'masivo' 
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${data.message || 'Mapeos guardados correctamente'}`);
        onGuardado();
        onClose();
      } else {
        alert(`❌ ${data.message || 'Error guardando mapeos'}`);
      }
    } catch (error) {
      console.error('Error guardando mapeo masivo:', error);
      alert('Error de conexión con el servidor');
    } finally {
      setGuardando(false);
    }
  };

  const aplicarSugerenciasAutomaticas = () => {
    setExamenesParaMapear(prev => 
      prev.map(examen => {
        if (examen.reactivo_id || examen.mapeo_existente) {
          return examen; // No cambiar si ya tiene mapeo
        }
        
        const reactivoSugerido = buscarReactivoPorCoincidencia(examen.examen_nombre, reactivos);
        
        return {
          ...examen,
          reactivo_id: reactivoSugerido?.id || null,
          reactivo_nombre: reactivoSugerido?.nombre || '',
          consumo_ml: reactivoSugerido?.consumo_ml || 0.25,
          sugerencia_automatica: !!reactivoSugerido
        };
      })
    );
    
    alert('Sugerencias automáticas aplicadas. Revisa y ajusta si es necesario.');
  };

  // Filtrar exámenes por nombre
  const examenesFiltrados = filtroNombre
    ? examenesParaMapear.filter(e => 
        e.examen_nombre.toLowerCase().includes(filtroNombre.toLowerCase())
      )
    : examenesParaMapear;

  const totalSeleccionados = examenesFiltrados.filter(e => e.seleccionado).length;
  const totalMl = examenesFiltrados
    .filter(e => e.seleccionado)
    .reduce((sum, e) => sum + (e.cantidad * e.consumo_ml), 0);

  const examenesConSugerencias = examenesFiltrados.filter(e => e.sugerencia_automatica).length;
  const examenesConMapeoExistente = examenesFiltrados.filter(e => e.mapeo_existente).length;

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '95%',
        maxWidth: 1400,
        maxHeight: '90vh',
        bgcolor: 'background.paper',
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <Box sx={{ p: 3, bgcolor: '#1976d2', color: 'white' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                🗂️ Mapeo Masivo de Exámenes
              </Typography>
              <Typography variant="body1">
                Fecha: {fecha} | {examenesParaMapear.length} exámenes sin mapear
              </Typography>
            </Box>
            <IconButton onClick={onClose} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Contenido */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
          {cargando ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Cargando datos y generando sugerencias automáticas...
              </Typography>
            </Box>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>Sistema de sugerencias inteligente:</strong> 
                <Box component="span" sx={{ ml: 1 }}>
                  <Chip label={`${examenesConMapeoExistente} con mapeo previo`} size="small" color="success" sx={{ mr: 1 }} />
                  <Chip label={`${examenesConSugerencias} sugerencias automáticas`} size="small" color="warning" />
                </Box>
              </Alert>

              {/* Filtro y controles */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <TextField
                  label="Filtrar por nombre de examen"
                  size="small"
                  value={filtroNombre}
                  onChange={(e) => setFiltroNombre(e.target.value)}
                  sx={{ width: 300 }}
                />
                
                <Button
                  variant="outlined"
                  startIcon={<AutoAwesomeIcon />}
                  onClick={aplicarSugerenciasAutomaticas}
                >
                  Aplicar sugerencias automáticas
                </Button>
              </Box>

              {/* Seleccionar todos */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Checkbox
                  checked={todosSeleccionados}
                  onChange={toggleSeleccionarTodos}
                />
                <Typography variant="body1">
                  Seleccionar todos ({totalSeleccionados} seleccionados)
                </Typography>
              </Box>

              {/* Tabla */}
              <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell width="60px">Sel.</TableCell>
                      <TableCell>Examen</TableCell>
                      <TableCell align="right">Pruebas</TableCell>
                      <TableCell>Reactivo Sugerido</TableCell>
                      <TableCell width="150px">Consumo (ml)</TableCell>
                      <TableCell width="150px">Total ml</TableCell>
                      <TableCell width="100px">Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {examenesFiltrados.map((examen, index) => {
                      const estado = examen.mapeo_existente ? 'success' : 
                                    examen.sugerencia_automatica ? 'warning' : 'error';
                      const textoEstado = examen.mapeo_existente ? 'Mapeo existente' : 
                                         examen.sugerencia_automatica ? 'Sugerencia automática' : 'Sin sugerencia';
                      
                      return (
                        <TableRow key={examen.id} hover>
                          <TableCell>
                            <Checkbox
                              checked={examen.seleccionado}
                              onChange={(e) => actualizarExamen(index, { seleccionado: e.target.checked })}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight="medium">
                              {examen.examen_nombre}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="h6" color="primary">
                              {examen.cantidad}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <FormControl fullWidth size="small">
                              <Select
                                value={examen.reactivo_id || ''}
                                onChange={(e) => {
                                  const reactivo = reactivos.find(r => r.id === e.target.value);
                                  actualizarExamen(index, {
                                    reactivo_id: e.target.value,
                                    reactivo_nombre: reactivo?.nombre || '',
                                    consumo_ml: reactivo?.consumo_ml || 0.25
                                  });
                                }}
                                displayEmpty
                              >
                                <MenuItem value="">
                                  <em>Seleccionar reactivo</em>
                                </MenuItem>
                                {reactivos.map(reactivo => (
                                  <MenuItem key={reactivo.id} value={reactivo.id}>
                                    <Box>
                                      <Typography variant="body2">
                                        {reactivo.nombre}
                                      </Typography>
                                      <Typography variant="caption" color="textSecondary">
                                        {reactivo.codigo} • {reactivo.lotes_activos || 0} lotes
                                      </Typography>
                                    </Box>
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              value={examen.consumo_ml || 0.25}
                              onChange={(e) => actualizarExamen(index, { consumo_ml: parseFloat(e.target.value) || 0 })}
                              inputProps={{ step: 0.01, min: 0 }}
                              fullWidth
                            />
                          </TableCell>
                          <TableCell>
                            <Typography align="right" fontWeight="bold">
                              {(examen.cantidad * (examen.consumo_ml || 0.25)).toFixed(2)} ml
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={textoEstado}
                              size="small"
                              color={estado}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Resumen */}
              <Box sx={{ mt: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom>
                  📊 Resumen del mapeo
                </Typography>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <Typography>
                    <strong>Exámenes seleccionados:</strong> {totalSeleccionados}
                  </Typography>
                  <Typography>
                    <strong>Total ml estimados:</strong> {totalMl.toFixed(2)} ml
                  </Typography>
                  <Typography>
                    <strong>Reactivos diferentes:</strong> {
                      new Set(examenesFiltrados
                        .filter(e => e.seleccionado && e.reactivo_id)
                        .map(e => e.reactivo_id)
                      ).size
                    }
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onClose} variant="outlined">
            CANCELAR
          </Button>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={cargarDatosIniciales}
              disabled={cargando}
            >
              ACTUALIZAR SUGERENCIAS
            </Button>
            <Button
              variant="contained"
              onClick={handleGuardar}
              disabled={guardando || totalSeleccionados === 0}
              startIcon={guardando ? <CircularProgress size={20} /> : <CheckIcon />}
            >
              {guardando ? 'GUARDANDO...' : `GUARDAR MAPEO (${totalSeleccionados})`}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default MapeoMasivoModal;