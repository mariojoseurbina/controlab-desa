// import React, { useState } from 'react';
// import {
//   Container,
//   Card,
//   CardContent,
//   Button,
//   Typography,
//   Box,
//   Alert,
//   Table,
//   TableBody,
//   TableCell,
//   TableContainer,
//   TableHead,
//   TableRow,
//   Paper,
//   CircularProgress,
//   Dialog,
//   DialogTitle,
//   DialogContent,
//   DialogActions,
//   Stepper,
//   Step,
//   StepLabel,
//   Grid,
//   Chip,
//   TextField,
//   FormControl,
//   InputLabel,
//   Select,
//   MenuItem,
// } from '@mui/material';
// import {
//   Upload as SubirIcon,
//   PlayArrow as ProcesarIcon,
//   Download as DescargarIcon,
//   Summarize as ReporteIcon,
//   Add as AgregarIcon,
//   Delete as EliminarIcon,
// } from '@mui/icons-material';
// import * as XLSX from 'xlsx';
// import { useNavigate } from 'react-router-dom';

// const ImportacionMasivaPruebas = () => {
//   const [archivo, setArchivo] = useState(null);
//   const [datosExcel, setDatosExcel] = useState([]);
//   const [datosManuales, setDatosManuales] = useState([]);
//   const [preview, setPreview] = useState([]);
//   const [cargando, setCargando] = useState(false);
//   const [error, setError] = useState('');
//   const [exito, setExito] = useState('');
//   const [pasoActivo, setPasoActivo] = useState(0);
//   const [dialogoConfirmacion, setDialogoConfirmacion] = useState(false);
//   const [resultadoProcesamiento, setResultadoProcesamiento] = useState(null);
//   const [modoEntrada, setModoEntrada] = useState('excel'); // 'excel' o 'manual'
//   const navigate = useNavigate();

//   // Estado para entrada manual
//   const [nuevaEntrada, setNuevaEntrada] = useState({
//     lote: '',
//     pruebas: '',
//     tipo_prueba: 'Hematología',
//     fecha: new Date().toISOString().split('T')[0]
//   });

//   const pasos = ['Seleccionar Entrada', 'Revisar Datos', 'Procesar Descuentos'];

//   // Manejar subida de archivo Excel
//   const manejarArchivo = (e) => {
//     const file = e.target.files[0];
//     if (!file) return;

//     setArchivo(file);
//     setError('');
//     setExito('');
//     setResultadoProcesamiento(null);

//     const reader = new FileReader();
//     reader.onload = (e) => {
//       try {
//         const data = new Uint8Array(e.target.result);
//         const workbook = XLSX.read(data, { type: 'array' });
//         const sheetName = workbook.SheetNames[0];
//         const worksheet = workbook.Sheets[sheetName];
//         const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
//         if (jsonData.length === 0) {
//           setError('El archivo Excel está vacío');
//           return;
//         }

//         // Validar y normalizar datos
//         const { datosValidados, errores } = validarDatosExcel(jsonData);
        
//         if (errores.length > 0) {
//           setError(`Se encontraron ${errores.length} errores en el archivo. Ejemplos: ${errores.slice(0, 3).join(', ')}`);
//           return;
//         }

//         if (datosValidados.length === 0) {
//           setError('No hay datos válidos para procesar');
//           return;
//         }

//         setDatosExcel(datosValidados);
//         generarPreview(datosValidados);
//         setPasoActivo(1);
//       } catch (error) {
//         setError('Error leyendo el archivo Excel: ' + error.message);
//       }
//     };
//     reader.readAsArrayBuffer(file);
//   };

//   // Validar datos del Excel
//   const validarDatosExcel = (datos) => {
//     const errores = [];
//     const datosValidados = [];

//     datos.forEach((fila, index) => {
//       const lote = (fila.lote || fila.Lote || fila.numero_lote || '').toString().trim();
//       const pruebas = parseInt(fila.pruebas || fila.Pruebas || fila.cantidad_pruebas || fila.cantidad);
//       const tipo_prueba = fila.tipo_prueba || fila.TipoPrueba || 'Hematología';
//       const fecha = fila.fecha || fila.Fecha || new Date().toISOString().split('T')[0];
      
//       if (!lote) {
//         errores.push(`Fila ${index + 1}: No tiene número de lote`);
//         return;
//       }

//       if (isNaN(pruebas) || pruebas <= 0) {
//         errores.push(`Fila ${index + 1}: Cantidad de pruebas inválida: "${fila.pruebas}"`);
//         return;
//       }

//       datosValidados.push({
//         lote,
//         pruebas,
//         tipo_prueba,
//         fecha
//       });
//     });

//     return { datosValidados, errores };
//   };

//   // Generar vista previa
//   const generarPreview = (datos) => {
//     const previewData = datos.slice(0, 10).map(fila => ({
//       lote: fila.lote,
//       pruebas: fila.pruebas,
//       tipo_prueba: fila.tipo_prueba,
//       fecha: fila.fecha,
//       estado: 'Pendiente'
//     }));
//     setPreview(previewData);
//   };

//   // Descargar plantilla de ejemplo
//   const descargarPlantilla = () => {
//     const datosEjemplo = [
//       { lote: 'LOTE-HEMA-001', pruebas: 30, tipo_prueba: 'Hematología', fecha: '2024-01-15' },
//       { lote: 'LOTE-BIOQ-002', pruebas: 25, tipo_prueba: 'Bioquímica', fecha: '2024-01-15' },
//       { lote: 'LOTE-PCR-003', pruebas: 15, tipo_prueba: 'PCR', fecha: '2024-01-15' },
//       { lote: 'LOTE-HEMA-004', pruebas: 40, tipo_prueba: 'Hematología', fecha: '2024-01-15' }
//     ];

//     const worksheet = XLSX.utils.json_to_sheet(datosEjemplo);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, 'Pruebas');
//     XLSX.writeFile(workbook, 'plantilla_pruebas_diarias.xlsx');
//   };

//   // Manejar entrada manual
//   const manejarCambioEntrada = (campo, valor) => {
//     setNuevaEntrada(prev => ({
//       ...prev,
//       [campo]: valor
//     }));
//   };

//   const agregarEntradaManual = () => {
//     if (!nuevaEntrada.lote.trim() || !nuevaEntrada.pruebas || nuevaEntrada.pruebas <= 0) {
//       setError('Debe completar lote y cantidad de pruebas válida');
//       return;
//     }

//     const nuevaEntradaValidada = {
//       lote: nuevaEntrada.lote.trim(),
//       pruebas: parseInt(nuevaEntrada.pruebas),
//       tipo_prueba: nuevaEntrada.tipo_prueba,
//       fecha: nuevaEntrada.fecha
//     };

//     setDatosManuales(prev => [...prev, nuevaEntradaValidada]);
//     setNuevaEntrada({
//       lote: '',
//       pruebas: '',
//       tipo_prueba: 'Hematología',
//       fecha: new Date().toISOString().split('T')[0]
//     });
//   };

//   const eliminarEntradaManual = (index) => {
//     setDatosManuales(prev => prev.filter((_, i) => i !== index));
//   };

//   const procesarEntradaManual = () => {
//     if (datosManuales.length === 0) {
//       setError('No hay datos manuales para procesar');
//       return;
//     }

//     setDatosExcel(datosManuales);
//     generarPreview(datosManuales);
//     setPasoActivo(1);
//   };

//   // 🛠️🛠️🛠️ FUNCIÓN CORREGIDA - PROCESAR IMPORTACIÓN 🛠️🛠️🛠️
//   const procesarImportacion = async () => {
//   setCargando(true);
//   setError('');
//   setExito('');
  
//   try {
//     const datosAProcesar = datosExcel;
//     const formData = new FormData();
    
//     // ✅ SOLO ENVIAR ARCHIVO O DATOS, NO AMBOS
//     if (modoEntrada === 'excel' && archivo) {
//       formData.append('archivo', archivo);
//     } else {
//       // Para modo manual, enviar solo los datos
//       formData.append('datos', JSON.stringify(datosAProcesar));
//     }
// //console.log(formData)
//     const token = localStorage.getItem('token');
//     if (!token) {
//       setError('No se encontró token de autenticación');
//       setCargando(false);
//       return;
//     }

//     // ✅ URL CORREGIDA
//     const response = await fetch('http://localhost:5000/api/reagents/importar-pruebas-masivas', {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${token}`
//       },
//       body: formData,
//     }
// );
//   //console.log(response)
  
//       // ✅ Verificación mejorada de la respuesta
//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`Error ${response.status}: ${errorText.substring(0, 100)}`);
//       }

//       const resultado = await response.json();

//       if (resultado.success) {
//         setExito(`✅ ${resultado.message}`);
//         setResultadoProcesamiento(resultado);
//         setPasoActivo(2);
//       } else {
//         setError(`❌ ${resultado.message}`);
//         if (resultado.errores) {
//           setError(`❌ Se encontraron ${resultado.errores.length} errores`);
//         }
//       }
//     } catch (error) {
//       console.error('Error completo:', error);
//       setError('❌ Error de conexión: ' + error.message);
//     } finally {
//       setCargando(false);
//       setDialogoConfirmacion(false);
//     }
//   };

//   const reiniciarProceso = () => {
//     setPasoActivo(0);
//     setArchivo(null);
//     setDatosExcel([]);
//     setDatosManuales([]);
//     setPreview([]);
//     setExito('');
//     setError('');
//     setResultadoProcesamiento(null);
//     setModoEntrada('excel');
//   };

//   const irAReporteDiario = () => {
//     navigate('/reactivos/reporte-diario');
//   };

//   const datosActuales = modoEntrada === 'excel' ? datosExcel : datosManuales;

//   return (
//     <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
//       <Typography variant="h4" gutterBottom>
//         🧪 Descuento Masivo de Pruebas Teóricas
//       </Typography>
//       <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 3 }}>
//         Actualice el inventario descuentando pruebas realizadas de los lotes de reactivos
//       </Typography>

//       <Card>
//         <CardContent>
//           {/* Stepper */}
//           <Stepper activeStep={pasoActivo} sx={{ mb: 4 }}>
//             {pasos.map((label) => (
//               <Step key={label}>
//                 <StepLabel>{label}</StepLabel>
//               </Step>
//             ))}
//           </Stepper>

//           {/* Paso 1: Seleccionar Entrada */}
//           {pasoActivo === 0 && (
//             <Box>
//               <Typography variant="h6" gutterBottom>
//                 1. Seleccionar Método de Entrada
//               </Typography>
              
//               <Grid container spacing={3}>
//                 {/* Selector de Modo */}
//                 <Grid item xs={12}>
//                   <FormControl fullWidth sx={{ mb: 3 }}>
//                     <InputLabel>Modo de Entrada</InputLabel>
//                     <Select
//                       value={modoEntrada}
//                       label="Modo de Entrada"
//                       onChange={(e) => setModoEntrada(e.target.value)}
//                     >
//                       <MenuItem value="excel">Importar desde Excel</MenuItem>
//                       <MenuItem value="manual">Entrada Manual</MenuItem>
//                     </Select>
//                   </FormControl>
//                 </Grid>

//                 {/* MODO EXCEL */}
//                 {modoEntrada === 'excel' && (
//                   <Grid item xs={12}>
//                     <Card variant="outlined" sx={{ p: 2 }}>
//                       <Typography variant="subtitle2" gutterBottom>
//                         📥 Importar desde Archivo Excel
//                       </Typography>
//                       <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
//                         El archivo debe contener columnas: <strong>lote, pruebas, tipo_prueba, fecha</strong>
//                       </Typography>
                      
//                       <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
//                         <input
//                           accept=".xlsx, .xls"
//                           style={{ display: 'none' }}
//                           id="archivo-excel"
//                           type="file"
//                           onChange={manejarArchivo}
//                         />
//                         <label htmlFor="archivo-excel">
//                           <Button variant="contained" component="span" startIcon={<SubirIcon />}>
//                             Seleccionar Excel
//                           </Button>
//                         </label>
                        
//                         <Button 
//                           variant="outlined" 
//                           startIcon={<DescargarIcon />}
//                           onClick={descargarPlantilla}
//                         >
//                           Descargar Plantilla
//                         </Button>

//                         {archivo && (
//                           <Typography variant="body2" color="primary">
//                             📎 {archivo.name}
//                           </Typography>
//                         )}
//                       </Box>
//                     </Card>
//                   </Grid>
//                 )}

//                 {/* MODO MANUAL */}
//                 {modoEntrada === 'manual' && (
//                   <Grid item xs={12}>
//                     <Card variant="outlined" sx={{ p: 2 }}>
//                       <Typography variant="subtitle2" gutterBottom>
//                         ✍️ Entrada Manual de Datos
//                       </Typography>
                      
//                       <Grid container spacing={2} sx={{ mb: 2 }}>
//                         <Grid item xs={12} sm={3}>
//                           <TextField
//                             fullWidth
//                             label="Número de Lote"
//                             value={nuevaEntrada.lote}
//                             onChange={(e) => manejarCambioEntrada('lote', e.target.value)}
//                             placeholder="Ej: LOTE-HEMA-001"
//                           />
//                         </Grid>
//                         <Grid item xs={12} sm={2}>
//                           <TextField
//                             fullWidth
//                             label="Pruebas"
//                             type="number"
//                             value={nuevaEntrada.pruebas}
//                             onChange={(e) => manejarCambioEntrada('pruebas', e.target.value)}
//                             inputProps={{ min: 1 }}
//                           />
//                         </Grid>
//                         <Grid item xs={12} sm={3}>
//                           <FormControl fullWidth>
//                             <InputLabel>Tipo de Prueba</InputLabel>
//                             <Select
//                               value={nuevaEntrada.tipo_prueba}
//                               label="Tipo de Prueba"
//                               onChange={(e) => manejarCambioEntrada('tipo_prueba', e.target.value)}
//                             >
//                               <MenuItem value="Hematología">Hematología</MenuItem>
//                               <MenuItem value="Bioquímica">Bioquímica</MenuItem>
//                               <MenuItem value="PCR">PCR</MenuItem>
//                               <MenuItem value="Inmunología">Inmunología</MenuItem>
//                               <MenuItem value="Microbiología">Microbiología</MenuItem>
//                             </Select>
//                           </FormControl>
//                         </Grid>
//                         <Grid item xs={12} sm={2}>
//                           <TextField
//                             fullWidth
//                             label="Fecha"
//                             type="date"
//                             value={nuevaEntrada.fecha}
//                             onChange={(e) => manejarCambioEntrada('fecha', e.target.value)}
//                             InputLabelProps={{ shrink: true }}
//                           />
//                         </Grid>
//                         <Grid item xs={12} sm={2}>
//                           <Button
//                             fullWidth
//                             variant="contained"
//                             startIcon={<AgregarIcon />}
//                             onClick={agregarEntradaManual}
//                             sx={{ height: '56px' }}
//                           >
//                             Agregar
//                           </Button>
//                         </Grid>
//                       </Grid>

//                       {/* Lista de entradas manuales */}
//                       {datosManuales.length > 0 && (
//                         <TableContainer component={Paper} variant="outlined">
//                           <Table size="small">
//                             <TableHead>
//                               <TableRow>
//                                 <TableCell><strong>Lote</strong></TableCell>
//                                 <TableCell><strong>Pruebas</strong></TableCell>
//                                 <TableCell><strong>Tipo</strong></TableCell>
//                                 <TableCell><strong>Fecha</strong></TableCell>
//                                 <TableCell><strong>Acciones</strong></TableCell>
//                               </TableRow>
//                             </TableHead>
//                             <TableBody>
//                               {datosManuales.map((entrada, index) => (
//                                 <TableRow key={index}>
//                                   <TableCell>{entrada.lote}</TableCell>
//                                   <TableCell>
//                                     <Chip label={`${entrada.pruebas} pruebas`} color="primary" size="small" />
//                                   </TableCell>
//                                   <TableCell>{entrada.tipo_prueba}</TableCell>
//                                   <TableCell>{entrada.fecha}</TableCell>
//                                   <TableCell>
//                                     <Button
//                                       size="small"
//                                       color="error"
//                                       startIcon={<EliminarIcon />}
//                                       onClick={() => eliminarEntradaManual(index)}
//                                     >
//                                       Eliminar
//                                     </Button>
//                                   </TableCell>
//                                 </TableRow>
//                               ))}
//                             </TableBody>
//                           </Table>
//                         </TableContainer>
//                       )}

//                       <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
//                         <Button 
//                           variant="contained" 
//                           onClick={procesarEntradaManual}
//                           disabled={datosManuales.length === 0}
//                         >
//                           Procesar {datosManuales.length} Registros
//                         </Button>
//                         <Button 
//                           variant="outlined" 
//                           onClick={() => setDatosManuales([])}
//                           disabled={datosManuales.length === 0}
//                         >
//                           Limpiar Todo
//                         </Button>
//                       </Box>
//                     </Card>
//                   </Grid>
//                 )}
//               </Grid>

//               {/* Botón de Reporte */}
//               <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
//                 <Button 
//                   variant="outlined" 
//                   startIcon={<ReporteIcon />}
//                   onClick={irAReporteDiario}
//                 >
//                   Ver Reporte Diario
//                 </Button>
//               </Box>
//             </Box>
//           )}

//           {/* Paso 2: Vista Previa */}
//           {pasoActivo === 1 && (
//             <Box>
//               <Typography variant="h6" gutterBottom>
//                 2. Revisión de Datos - {datosActuales.length} registros a procesar
//               </Typography>
              
//               <TableContainer component={Paper} sx={{ mt: 2, mb: 3 }}>
//                 <Table>
//                   <TableHead>
//                     <TableRow>
//                       <TableCell><strong>Lote</strong></TableCell>
//                       <TableCell><strong>Pruebas a Descontar</strong></TableCell>
//                       <TableCell><strong>Tipo de Prueba</strong></TableCell>
//                       <TableCell><strong>Fecha</strong></TableCell>
//                       <TableCell><strong>Estado</strong></TableCell>
//                     </TableRow>
//                   </TableHead>
//                   <TableBody>
//                     {preview.map((fila, index) => (
//                       <TableRow key={index}>
//                         <TableCell>
//                           <Chip label={fila.lote} color="primary" size="small" />
//                         </TableCell>
//                         <TableCell>
//                           <Typography fontWeight="bold" color="secondary">
//                             {fila.pruebas} pruebas
//                           </Typography>
//                         </TableCell>
//                         <TableCell>{fila.tipo_prueba}</TableCell>
//                         <TableCell>{fila.fecha}</TableCell>
//                         <TableCell>
//                           <Chip 
//                             label={fila.estado} 
//                             color="warning" 
//                             size="small" 
//                           />
//                         </TableCell>
//                       </TableRow>
//                     ))}
//                     {datosActuales.length > 10 && (
//                       <TableRow>
//                         <TableCell colSpan={5} align="center">
//                           <Typography variant="body2" color="textSecondary">
//                             ... y {datosActuales.length - 10} registros más
//                           </Typography>
//                         </TableCell>
//                       </TableRow>
//                     )}
//                   </TableBody>
//                 </Table>
//               </TableContainer>

//               <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
//                 <Button 
//                   variant="outlined" 
//                   onClick={reiniciarProceso}
//                 >
//                   Volver al Inicio
//                 </Button>
//                 <Button 
//                   variant="contained" 
//                   onClick={() => setDialogoConfirmacion(true)}
//                   startIcon={<ProcesarIcon />}
//                   disabled={datosActuales.length === 0}
//                 >
//                   Procesar Descuentos
//                 </Button>
//               </Box>
//             </Box>
//           )}

//           {/* Paso 3: Resultados */}
//           {pasoActivo === 2 && resultadoProcesamiento && (
//             <Box>
//               <Typography variant="h6" gutterBottom>
//                 3. Resultado del Procesamiento
//               </Typography>
              
//               <Grid container spacing={2} sx={{ mb: 3 }}>
//                 <Grid item xs={12} md={3}>
//                   <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
//                     <Typography variant="h4">{resultadoProcesamiento.resumen.registrosProcesados}</Typography>
//                     <Typography variant="body2">Registros Exitosos</Typography>
//                   </Card>
//                 </Grid>
//                 <Grid item xs={12} md={3}>
//                   <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
//                     <Typography variant="h4">{resultadoProcesamiento.resumen.totalPruebasProcesadas}</Typography>
//                     <Typography variant="body2">Pruebas Descontadas</Typography>
//                   </Card>
//                 </Grid>
//                 <Grid item xs={12} md={3}>
//                   <Card sx={{ p: 2, textAlign: 'center', bgcolor: resultadoProcesamiento.resumen.registrosConError > 0 ? 'warning.light' : 'success.light', color: 'white' }}>
//                     <Typography variant="h4">{resultadoProcesamiento.resumen.registrosConError}</Typography>
//                     <Typography variant="body2">Errores</Typography>
//                   </Card>
//                 </Grid>
//                 <Grid item xs={12} md={3}>
//                   <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
//                     <Typography variant="h6">ID #{resultadoProcesamiento.resumen.importacionId}</Typography>
//                     <Typography variant="body2">Importación</Typography>
//                   </Card>
//                 </Grid>
//               </Grid>

//               {/* Mostrar algunos resultados exitosos */}
//               {resultadoProcesamiento.resultados && resultadoProcesamiento.resultados.slice(0, 5).map((resultado, index) => (
//                 <Alert key={index} severity="success" sx={{ mb: 1 }}>
//                   <strong>{resultado.lote}:</strong> {resultado.pruebasRestantesAntes} → {resultado.pruebasRestantesDespues} pruebas ({resultado.pruebasRealizadas} descontadas)
//                 </Alert>
//               ))}

//               {resultadoProcesamiento.errores && resultadoProcesamiento.errores.length > 0 && (
//                 <Alert severity="warning" sx={{ mt: 2 }}>
//                   <Typography variant="subtitle2">Algunos errores encontrados:</Typography>
//                   {resultadoProcesamiento.errores.slice(0, 3).map((error, index) => (
//                     <Typography key={index} variant="body2">• {error}</Typography>
//                   ))}
//                   {resultadoProcesamiento.errores.length > 3 && (
//                     <Typography variant="body2">... y {resultadoProcesamiento.errores.length - 3} más</Typography>
//                   )}
//                 </Alert>
//               )}

//               <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
//                 <Button 
//                   variant="contained" 
//                   onClick={reiniciarProceso}
//                 >
//                   Nueva Importación
//                 </Button>
//                 <Button 
//                   variant="outlined" 
//                   onClick={irAReporteDiario}
//                   startIcon={<ReporteIcon />}
//                 >
//                   Ver Reporte Completo
//                 </Button>
//               </Box>
//             </Box>
//           )}

//           {/* Mensajes de Estado */}
//           {error && (
//             <Alert severity="error" sx={{ mt: 2 }}>
//               {error}
//             </Alert>
//           )}

//           {exito && (
//             <Alert severity="success" sx={{ mt: 2 }}>
//               {exito}
//             </Alert>
//           )}
//         </CardContent>
//       </Card>

//       {/* Diálogo de Confirmación */}
//       <Dialog open={dialogoConfirmacion} onClose={() => setDialogoConfirmacion(false)} maxWidth="sm" fullWidth>
//         <DialogTitle>Confirmar Descuento Masivo</DialogTitle>
//         <DialogContent>
//           <Typography>
//             ¿Está seguro de procesar <strong>{datosActuales.length} registros</strong>?
//           </Typography>
//           <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
//             Esta acción descontará pruebas teóricas de los lotes correspondientes y actualizará el inventario.
//           </Typography>
//           <Box sx={{ mt: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
//             <Typography variant="body2">
//               <strong>Resumen:</strong>
//             </Typography>
//             <Typography variant="body2">
//               • Total de registros: {datosActuales.length}
//             </Typography>
//             <Typography variant="body2">
//               • Total de pruebas a descontar: {datosActuales.reduce((sum, item) => sum + item.pruebas, 0)}
//             </Typography>
//             <Typography variant="body2">
//               • Lotes afectados: {new Set(datosActuales.map(item => item.lote)).size}
//             </Typography>
//           </Box>
//         </DialogContent>
//         <DialogActions>
//           <Button onClick={() => setDialogoConfirmacion(false)} disabled={cargando}>
//             Cancelar
//           </Button>
//           <Button 
//             onClick={procesarImportacion} 
//             variant="contained"
//             disabled={cargando}
//             startIcon={cargando ? <CircularProgress size={20} /> : null}
//           >
//             {cargando ? 'Procesando...' : 'Confirmar Descuento'}
//           </Button>
//         </DialogActions>
//       </Dialog>
//     </Container>
//   );
// };

// export default ImportacionMasivaPruebas;

// se esta insertando este codigo lunes 17/11 , el anterior funciona perfecto ////******* */

import React, { useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  Button,
  Typography,
  Box,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Upload as SubirIcon,
  PlayArrow as ProcesarIcon,
  Download as DescargarIcon,
  Summarize as ReporteIcon,
  Add as AgregarIcon,
  Delete as EliminarIcon,
  Close as CerrarIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';

const ImportacionMasivaPruebas = () => {
  const [archivo, setArchivo] = useState(null);
  const [datosExcel, setDatosExcel] = useState([]);
  const [datosManuales, setDatosManuales] = useState([]);
  const [preview, setPreview] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [pasoActivo, setPasoActivo] = useState(0);
  const [dialogoConfirmacion, setDialogoConfirmacion] = useState(false);
  const [resultadoProcesamiento, setResultadoProcesamiento] = useState(null);
  const [modoEntrada, setModoEntrada] = useState('excel'); // 'excel' o 'manual'
  
  // 🆕 NUEVO ESTADO PARA EL REPORTE COMPLETO
  const [mostrarReporteCompleto, setMostrarReporteCompleto] = useState(false);
  const [porcentajeMerma, setPorcentajeMerma] = useState(0); // Nuevo estado
  
  const navigate = useNavigate();

  // Estado para entrada manual
  const [nuevaEntrada, setNuevaEntrada] = useState({
    lote: '',
    pruebas: '',
    tipo_prueba: 'Hematología',
    fecha: new Date().toISOString().split('T')[0]
  });

  const pasos = ['Seleccionar Entrada', 'Revisar Datos', 'Procesar Descuentos'];

  // Manejar subida de archivo Excel
  const manejarArchivo = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setArchivo(file);
    setError('');
    setExito('');
    setResultadoProcesamiento(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        if (jsonData.length === 0) {
          setError('El archivo Excel está vacío');
          return;
        }

        // Validar y normalizar datos
        const { datosValidados, errores } = validarDatosExcel(jsonData);
        
        if (errores.length > 0) {
          setError(`Se encontraron ${errores.length} errores en el archivo. Ejemplos: ${errores.slice(0, 3).join(', ')}`);
          return;
        }

        if (datosValidados.length === 0) {
          setError('No hay datos válidos para procesar');
          return;
        }

        setDatosExcel(datosValidados);
        generarPreview(datosValidados);
        setPasoActivo(1);
      } catch (error) {
        setError('Error leyendo el archivo Excel: ' + error.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Validar datos del Excel
  const validarDatosExcel = (datos) => {
    const errores = [];
    const datosValidados = [];

    datos.forEach((fila, index) => {
      const lote = (fila.lote || fila.Lote || fila.numero_lote || '').toString().trim();
      const pruebas = parseInt(fila.pruebas || fila.Pruebas || fila.cantidad_pruebas || fila.cantidad);
      const tipo_prueba = fila.tipo_prueba || fila.TipoPrueba || 'Hematología';
      const fecha = fila.fecha || fila.Fecha || new Date().toISOString().split('T')[0];
      
      if (!lote) {
        errores.push(`Fila ${index + 1}: No tiene número de lote`);
        return;
      }

      if (isNaN(pruebas) || pruebas <= 0) {
        errores.push(`Fila ${index + 1}: Cantidad de pruebas inválida: "${fila.pruebas}"`);
        return;
      }

      datosValidados.push({
        lote,
        pruebas,
        tipo_prueba,
        fecha
      });
    });

    return { datosValidados, errores };
  };

  // Generar vista previa
  const generarPreview = (datos) => {
    const previewData = datos.slice(0, 10).map(fila => ({
      lote: fila.lote,
      pruebas: fila.pruebas,
      tipo_prueba: fila.tipo_prueba,
      fecha: fila.fecha,
      estado: 'Pendiente'
    }));
    setPreview(previewData);
  };

  // Descargar plantilla de ejemplo
  const descargarPlantilla = () => {
    const datosEjemplo = [
      { lote: 'LOTE-HEMA-001', pruebas: 30, tipo_prueba: 'Hematología', fecha: '2024-01-15' },
      { lote: 'LOTE-BIOQ-002', pruebas: 25, tipo_prueba: 'Bioquímica', fecha: '2024-01-15' },
      { lote: 'LOTE-PCR-003', pruebas: 15, tipo_prueba: 'PCR', fecha: '2024-01-15' },
      { lote: 'LOTE-HEMA-004', pruebas: 40, tipo_prueba: 'Hematología', fecha: '2024-01-15' }
    ];

    const worksheet = XLSX.utils.json_to_sheet(datosEjemplo);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pruebas');
    XLSX.writeFile(workbook, 'plantilla_pruebas_diarias.xlsx');
  };

  // Manejar entrada manual
  const manejarCambioEntrada = (campo, valor) => {
    setNuevaEntrada(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const agregarEntradaManual = () => {
    if (!nuevaEntrada.lote.trim() || !nuevaEntrada.pruebas || nuevaEntrada.pruebas <= 0) {
      setError('Debe completar lote y cantidad de pruebas válida');
      return;
    }

    const nuevaEntradaValidada = {
      lote: nuevaEntrada.lote.trim(),
      pruebas: parseInt(nuevaEntrada.pruebas),
      tipo_prueba: nuevaEntrada.tipo_prueba,
      fecha: nuevaEntrada.fecha
    };

    setDatosManuales(prev => [...prev, nuevaEntradaValidada]);
    setNuevaEntrada({
      lote: '',
      pruebas: '',
      tipo_prueba: 'Hematología',
      fecha: new Date().toISOString().split('T')[0]
    });
  };

  const eliminarEntradaManual = (index) => {
    setDatosManuales(prev => prev.filter((_, i) => i !== index));
  };

  const procesarEntradaManual = () => {
    if (datosManuales.length === 0) {
      setError('No hay datos manuales para procesar');
      return;
    }

    setDatosExcel(datosManuales);
    generarPreview(datosManuales);
    setPasoActivo(1);
  };

  // 🛠️ FUNCIÓN PROCESAR IMPORTACIÓN 
  const procesarImportacion = async () => {
    setCargando(true);
    setError('');
    setExito('');
        try {
        const datosAProcesar = datosExcel;
        const formData = new FormData();
        
        formData.append('porcentajeMerma', porcentajeMerma); // Adjuntar el porcentaje

        if (modoEntrada === 'excel' && archivo) {
          formData.append('archivo', archivo);
        } else {
          formData.append('datos', JSON.stringify(datosAProcesar));
        }

      const token = localStorage.getItem('token');
      if (!token) {
        setError('No se encontró token de autenticación');
        setCargando(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/reagents/importar-pruebas-masivas', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText.substring(0, 100)}`);
      }

      const resultado = await response.json();

      if (resultado.success) {
        setExito(`✅ ${resultado.message}`);
        setResultadoProcesamiento(resultado);
        setPasoActivo(2);
      } else {
        setError(`❌ ${resultado.message}`);
        if (resultado.errores) {
          setError(`❌ Se encontraron ${resultado.errores.length} errores`);
        }
      }
    } catch (error) {
      console.error('Error completo:', error);
      setError('❌ Error de conexión: ' + error.message);
    } finally {
      setCargando(false);
      setDialogoConfirmacion(false);
    }
  };

  const reiniciarProceso = () => {
    setPasoActivo(0);
    setArchivo(null);
    setDatosExcel([]);
    setDatosManuales([]);
    setPreview([]);
    setExito('');
    setError('');
    setResultadoProcesamiento(null);
    setModoEntrada('excel');
    setMostrarReporteCompleto(false); // 🆕 Limpiar también el reporte
  };

  const irAReporteDiario = () => {
    navigate('/reactivos/reporte-diario');
  };

  // 🆕 FUNCIÓN PARA ABRIR REPORTE COMPLETO
  const abrirReporteCompleto = () => {
    setMostrarReporteCompleto(true);
  };

  const datosActuales = modoEntrada === 'excel' ? datosExcel : datosManuales;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        🧪 Descuento Masivo de Pruebas Teóricas
      </Typography>
      <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 3 }}>
        Actualice el inventario descuentando pruebas realizadas de los lotes de reactivos
      </Typography>

      <Card>
        <CardContent>
          {/* Stepper */}
          <Stepper activeStep={pasoActivo} sx={{ mb: 4 }}>
            {pasos.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Paso 1: Seleccionar Entrada */}
          {pasoActivo === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                1. Seleccionar Método de Entrada
              </Typography>
              
              <Grid container spacing={3}>
                {/* Selector de Modo */}
                <Grid item xs={12}>
                  <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Modo de Entrada</InputLabel>
                    <Select
                      value={modoEntrada}
                      label="Modo de Entrada"
                      onChange={(e) => setModoEntrada(e.target.value)}
                    >
                      <MenuItem value="excel">Importar desde Excel</MenuItem>
                      <MenuItem value="manual">Entrada Manual</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                {/* Porcentaje de Merma / Repeticiones */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    type="number"
                    label="% de Merma o Repeticiones (Opcional)"
                    value={porcentajeMerma}
                    onChange={(e) => setPorcentajeMerma(e.target.value)}
                    helperText="Este porcentaje se sumará automáticamente al consumo teórico para cubrir pérdidas reales del analizador."
                    InputProps={{ inputProps: { min: 0, max: 100 } }}
                    sx={{ mb: 3 }}
                  />
                </Grid>

                {/* MODO EXCEL */}
                {modoEntrada === 'excel' && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        📥 Importar desde Archivo Excel
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        El archivo debe contener columnas: <strong>lote, pruebas, tipo_prueba, fecha</strong>
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <input
                          accept=".xlsx, .xls"
                          style={{ display: 'none' }}
                          id="archivo-excel"
                          type="file"
                          onChange={manejarArchivo}
                        />
                        <label htmlFor="archivo-excel">
                          <Button variant="contained" component="span" startIcon={<SubirIcon />}>
                            Seleccionar Excel
                          </Button>
                        </label>
                        
                        <Button 
                          variant="outlined" 
                          startIcon={<DescargarIcon />}
                          onClick={descargarPlantilla}
                        >
                          Descargar Plantilla
                        </Button>

                        {archivo && (
                          <Typography variant="body2" color="primary">
                            📎 {archivo.name}
                          </Typography>
                        )}
                      </Box>
                    </Card>
                  </Grid>
                )}

                {/* MODO MANUAL */}
                {modoEntrada === 'manual' && (
                  <Grid item xs={12}>
                    <Card variant="outlined" sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        ✍️ Entrada Manual de Datos
                      </Typography>
                      
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={3}>
                          <TextField
                            fullWidth
                            label="Número de Lote"
                            value={nuevaEntrada.lote}
                            onChange={(e) => manejarCambioEntrada('lote', e.target.value)}
                            placeholder="Ej: LOTE-HEMA-001"
                          />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <TextField
                            fullWidth
                            label="Pruebas"
                            type="number"
                            value={nuevaEntrada.pruebas}
                            onChange={(e) => manejarCambioEntrada('pruebas', e.target.value)}
                            inputProps={{ min: 1 }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth>
                            <InputLabel>Tipo de Prueba</InputLabel>
                            <Select
                              value={nuevaEntrada.tipo_prueba}
                              label="Tipo de Prueba"
                              onChange={(e) => manejarCambioEntrada('tipo_prueba', e.target.value)}
                            >
                              <MenuItem value="Hematología">Hematología</MenuItem>
                              <MenuItem value="Bioquímica">Bioquímica</MenuItem>
                              <MenuItem value="PCR">PCR</MenuItem>
                              <MenuItem value="Inmunología">Inmunología</MenuItem>
                              <MenuItem value="Microbiología">Microbiología</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <TextField
                            fullWidth
                            label="Fecha"
                            type="date"
                            value={nuevaEntrada.fecha}
                            onChange={(e) => manejarCambioEntrada('fecha', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={2}>
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<AgregarIcon />}
                            onClick={agregarEntradaManual}
                            sx={{ height: '56px' }}
                          >
                            Agregar
                          </Button>
                        </Grid>
                      </Grid>

                      {/* Lista de entradas manuales */}
                      {datosManuales.length > 0 && (
                        <TableContainer component={Paper} variant="outlined">
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>Lote</strong></TableCell>
                                <TableCell><strong>Pruebas</strong></TableCell>
                                <TableCell><strong>Tipo</strong></TableCell>
                                <TableCell><strong>Fecha</strong></TableCell>
                                <TableCell><strong>Acciones</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {datosManuales.map((entrada, index) => (
                                <TableRow key={index}>
                                  <TableCell>{entrada.lote}</TableCell>
                                  <TableCell>
                                    <Chip label={`${entrada.pruebas} pruebas`} color="primary" size="small" />
                                  </TableCell>
                                  <TableCell>{entrada.tipo_prueba}</TableCell>
                                  <TableCell>{entrada.fecha}</TableCell>
                                  <TableCell>
                                    <Button
                                      size="small"
                                      color="error"
                                      startIcon={<EliminarIcon />}
                                      onClick={() => eliminarEntradaManual(index)}
                                    >
                                      Eliminar
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}

                      <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                        <Button 
                          variant="contained" 
                          onClick={procesarEntradaManual}
                          disabled={datosManuales.length === 0}
                        >
                          Procesar {datosManuales.length} Registros
                        </Button>
                        <Button 
                          variant="outlined" 
                          onClick={() => setDatosManuales([])}
                          disabled={datosManuales.length === 0}
                        >
                          Limpiar Todo
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                )}
              </Grid>

              {/* Botón de Reporte */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button 
                  variant="outlined" 
                  startIcon={<ReporteIcon />}
                  onClick={irAReporteDiario}
                >
                  Ver Reporte Diario
                </Button>
              </Box>
            </Box>
          )}

          {/* Paso 2: Vista Previa */}
          {pasoActivo === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                2. Revisión de Datos - {datosActuales.length} registros a procesar
              </Typography>
              
              <TableContainer component={Paper} sx={{ mt: 2, mb: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Lote</strong></TableCell>
                      <TableCell><strong>Pruebas a Descontar</strong></TableCell>
                      <TableCell><strong>Tipo de Prueba</strong></TableCell>
                      <TableCell><strong>Fecha</strong></TableCell>
                      <TableCell><strong>Estado</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.map((fila, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Chip label={fila.lote} color="primary" size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="bold" color="secondary">
                            {fila.pruebas} pruebas
                          </Typography>
                        </TableCell>
                        <TableCell>{fila.tipo_prueba}</TableCell>
                        <TableCell>{fila.fecha}</TableCell>
                        <TableCell>
                          <Chip 
                            label={fila.estado} 
                            color="warning" 
                            size="small" 
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {datosActuales.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          <Typography variant="body2" color="textSecondary">
                            ... y {datosActuales.length - 10} registros más
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined" 
                  onClick={reiniciarProceso}
                >
                  Volver al Inicio
                </Button>
                <Button 
                  variant="contained" 
                  onClick={() => setDialogoConfirmacion(true)}
                  startIcon={<ProcesarIcon />}
                  disabled={datosActuales.length === 0}
                >
                  Procesar Descuentos
                </Button>
              </Box>
            </Box>
          )}

          {/* Paso 3: Resultados */}
          {pasoActivo === 2 && resultadoProcesamiento && (
            <Box>
              <Typography variant="h6" gutterBottom>
                3. Resultado del Procesamiento
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                    <Typography variant="h4">{resultadoProcesamiento.resumen.registrosProcesados}</Typography>
                    <Typography variant="body2">Registros Exitosos</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
                    <Typography variant="h4">{resultadoProcesamiento.resumen.totalPruebasProcesadas}</Typography>
                    <Typography variant="body2">Pruebas Descontadas</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: resultadoProcesamiento.resumen.registrosConError > 0 ? 'warning.light' : 'success.light', color: 'white' }}>
                    <Typography variant="h4">{resultadoProcesamiento.resumen.registrosConError}</Typography>
                    <Typography variant="body2">Errores</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
                    <Typography variant="h6">ID #{resultadoProcesamiento.resumen.importacionId}</Typography>
                    <Typography variant="body2">Importación</Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Mostrar algunos resultados exitosos */}
              {resultadoProcesamiento.resultados && resultadoProcesamiento.resultados.slice(0, 5).map((resultado, index) => (
                <Alert key={index} severity="success" sx={{ mb: 1 }}>
                  <strong>{resultado.lote}:</strong> {resultado.pruebasRestantesAntes} → {resultado.pruebasRestantesDespues} pruebas ({resultado.pruebasRealizadas} descontadas)
                </Alert>
              ))}

              {resultadoProcesamiento.errores && resultadoProcesamiento.errores.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Algunos errores encontrados:</Typography>
                  {resultadoProcesamiento.errores.slice(0, 3).map((error, index) => (
                    <Typography key={index} variant="body2">• {error}</Typography>
                  ))}
                  {resultadoProcesamiento.errores.length > 3 && (
                    <Typography variant="body2">... y {resultadoProcesamiento.errores.length - 3} más</Typography>
                  )}
                </Alert>
              )}

              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button 
                  variant="contained" 
                  onClick={reiniciarProceso}
                >
                  Nueva Importación
                </Button>
                {/* 🆕 BOTÓN PARA VER REPORTE COMPLETO */}
                <Button 
                  variant="outlined" 
                  onClick={abrirReporteCompleto}
                  startIcon={<ReporteIcon />}
                >
                  Ver Reporte Completo
                </Button>
              </Box>
            </Box>
          )}

          {/* Mensajes de Estado */}
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {exito && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {exito}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Confirmación */}
      <Dialog open={dialogoConfirmacion} onClose={() => setDialogoConfirmacion(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar Descuento Masivo</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro de procesar <strong>{datosActuales.length} registros</strong>?
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Esta acción descontará pruebas teóricas de los lotes correspondientes y actualizará el inventario.
          </Typography>
          <Box sx={{ mt: 2, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>Resumen:</strong>
            </Typography>
            <Typography variant="body2">
              • Total de registros: {datosActuales.length}
            </Typography>
            <Typography variant="body2">
              • Total de pruebas a descontar: {datosActuales.reduce((sum, item) => sum + item.pruebas, 0)}
            </Typography>
            <Typography variant="body2">
              • Lotes afectados: {new Set(datosActuales.map(item => item.lote)).size}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogoConfirmacion(false)} disabled={cargando}>
            Cancelar
          </Button>
          <Button 
            onClick={procesarImportacion} 
            variant="contained"
            disabled={cargando}
            startIcon={cargando ? <CircularProgress size={20} /> : null}
          >
            {cargando ? 'Procesando...' : 'Confirmar Descuento'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 MODAL DE REPORTE COMPLETO */}
      <Dialog 
        open={mostrarReporteCompleto} 
        onClose={() => setMostrarReporteCompleto(false)} 
        maxWidth="lg" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h5">
              📊 Reporte Completo de Descuentos
            </Typography>
            <Button 
              onClick={() => setMostrarReporteCompleto(false)}
              startIcon={<CerrarIcon />}
            >
              Cerrar
            </Button>
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {resultadoProcesamiento && (
            <>
              {/* Resumen General */}
              <Card sx={{ mb: 3, p: 2, bgcolor: 'primary.50' }}>
                <Typography variant="h6" gutterBottom>
                  Resumen General
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">Fecha de Procesamiento:</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {new Date().toLocaleDateString('es-ES')}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">Total Registros:</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {resultadoProcesamiento.resumen.registrosProcesados + resultadoProcesamiento.resumen.registrosConError}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">Éxitos:</Typography>
                    <Typography variant="body1" fontWeight="bold" color="success.main">
                      {resultadoProcesamiento.resumen.registrosProcesados}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Typography variant="body2" color="textSecondary">Errores:</Typography>
                    <Typography variant="body1" fontWeight="bold" color="error.main">
                      {resultadoProcesamiento.resumen.registrosConError}
                    </Typography>
                  </Grid>
                </Grid>
              </Card>

              {/* Registros Exitosos */}
              {resultadoProcesamiento.resultados && resultadoProcesamiento.resultados.length > 0 && (
                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" gutterBottom color="success.main">
                    ✅ Registros Exitosos ({resultadoProcesamiento.resultados.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'success.50' }}>
                          <TableCell><strong>Lote</strong></TableCell>
                          <TableCell><strong>Tipo Prueba</strong></TableCell>
                          <TableCell><strong>Stock Anterior</strong></TableCell>
                          <TableCell><strong>Stock Actual</strong></TableCell>
                          <TableCell><strong>Descontado</strong></TableCell>
                          <TableCell><strong>Estado</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {resultadoProcesamiento.resultados.map((resultado, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Chip label={resultado.lote} color="primary" size="small" />
                            </TableCell>
                            <TableCell>{resultado.tipoPrueba || 'N/A'}</TableCell>
                            <TableCell>{resultado.pruebasRestantesAntes}</TableCell>
                            <TableCell>{resultado.pruebasRestantesDespues}</TableCell>
                            <TableCell>
                              <Chip 
                                label={`-${resultado.pruebasRealizadas}`} 
                                color="secondary" 
                                size="small" 
                              />
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label="Completado" 
                                color="success" 
                                size="small" 
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {/* Errores */}
              {resultadoProcesamiento.errores && resultadoProcesamiento.errores.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom color="error.main">
                    ❌ Errores Encontrados ({resultadoProcesamiento.errores.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'error.50' }}>
                          <TableCell><strong>#</strong></TableCell>
                          <TableCell><strong>Descripción del Error</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {resultadoProcesamiento.errores.map((error, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">
                                {index + 1}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="error.main">
                                {error}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button 
            variant="outlined" 
            startIcon={<DescargarIcon />}
            onClick={() => {
              // Aquí puedes implementar la descarga del reporte en PDF o Excel
              alert('Funcionalidad de descarga será implementada');
            }}
          >
            Exportar a PDF
          </Button>
          <Button 
            variant="contained" 
            onClick={() => setMostrarReporteCompleto(false)}
          >
            Cerrar Reporte
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ImportacionMasivaPruebas;