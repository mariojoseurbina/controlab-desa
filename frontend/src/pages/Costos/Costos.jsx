import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Divider,
  Fade
} from '@mui/material';
import {
  Add as AgregarIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  MonetizationOn as CostosIcon,
  Science as ScienceIcon,
  ReceiptLong as FiscalIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Layers as LayersIcon,
  Business as BusinessIcon,
  FolderOpen as FolderIcon,
  AccountBalanceWallet as WalletIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Build as BuildIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  HelpOutline as HelpIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import api from '../../services/api';

const Costos = () => {
  // Estado general
  const [tabActual, setTabActual] = useState(0);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Datos del backend
  const [pruebas, setPruebas] = useState([]);
  const [analisis, setAnalisis] = useState([]);
  const [impactoFiscal, setImpactoFiscal] = useState([]);
  const [catalogoItems, setCatalogoItems] = useState([]);

  // Formulario: Crear Prueba Genérica
  const [nuevaPruebaNombre, setNuevaPruebaNombre] = useState('');

  // Formulario: Crear Vínculo
  const [vinculoPruebaId, setVinculoPruebaId] = useState('');
  const [vinculoItemId, setVinculoItemId] = useState('');

  // Filtros de búsqueda
  const [busquedaPrueba, setBusquedaPrueba] = useState('');
  const [busquedaVinculo, setBusquedaVinculo] = useState('');

  // Diálogos de Confirmación
  const [confirmarDesvincular, setConfirmarDesvincular] = useState(null); // almacena el objeto de vínculo a desvincular

  // Nuevos estados para Costos Avanzados (Tab 3)
  const [subTabCostos, setSubTabCostos] = useState(0);
  const [gastosGlobales, setGastosGlobales] = useState([]);
  const [equipos, setEquipos] = useState([]);
  
  // Formulario Gastos Globales
  const [globalMes, setGlobalMes] = useState(new Date().getMonth() + 1);
  const [globalAnio, setGlobalAnio] = useState(new Date().getFullYear());
  const [globalAdmin, setGlobalAdmin] = useState('');
  const [globalPersonal, setGlobalPersonal] = useState('');
  const [globalTotalPruebas, setGlobalTotalPruebas] = useState('');

  // Volumen de pruebas por área operativa
  const [volumenesArea, setVolumenesArea] = useState({});

  // Desglose Gastos Administrativos (20 campos)
  const [desgloseAdmin, setDesgloseAdmin] = useState({
    papeleria: '',
    internet: '',
    electricidad: '',
    agua: '',
    aseo: '',
    alquiler: '',
    asesorias: '',
    honorarios: '',
    software: '',
    condominio: '',
    legales: '',
    impuestosNacionales: '',
    impuestosMunicipales: '',
    suscripciones: '',
    colegioBioanalistas: '',
    remodelaciones: '',
    mobiliario: '',
    tecnologia: '',
    infraestructura: '',
    telefonia: ''
  });

  // Efecto 1: Calcular la suma del desglose y actualizar globalAdmin
  useEffect(() => {
    const values = Object.values(desgloseAdmin);
    const hasValues = values.some(v => v !== '' && v !== null);
    if (!hasValues) {
      return;
    }
    const sum = values.reduce((acc, curr) => {
      const val = parseFloat(curr);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
    setGlobalAdmin(sum > 0 ? sum.toFixed(2) : '');
  }, [desgloseAdmin]);

  // Efecto 2: Auto-cargar los gastos del mes seleccionado
  useEffect(() => {
    const record = gastosGlobales.find(
      g => g.mes === parseInt(globalMes) && g.anio === parseInt(globalAnio)
    );
    if (record) {
      setGlobalPersonal(record.gastos_personal || '');
      setGlobalTotalPruebas(record.total_pruebas_mes || '');
      setVolumenesArea(record.volumenes_area || {});
      if (record.desglose_admin) {
        try {
          const parsed = JSON.parse(record.desglose_admin);
          setDesgloseAdmin({
            papeleria: parsed.papeleria !== undefined ? parsed.papeleria : '',
            internet: parsed.internet !== undefined ? parsed.internet : '',
            electricidad: parsed.electricidad !== undefined ? parsed.electricidad : '',
            agua: parsed.agua !== undefined ? parsed.agua : '',
            aseo: parsed.aseo !== undefined ? parsed.aseo : '',
            alquiler: parsed.alquiler !== undefined ? parsed.alquiler : '',
            asesorias: parsed.asesorias !== undefined ? parsed.asesorias : '',
            honorarios: parsed.honorarios !== undefined ? parsed.honorarios : '',
            software: parsed.software !== undefined ? parsed.software : '',
            condominio: parsed.condominio !== undefined ? parsed.condominio : '',
            legales: parsed.legales !== undefined ? parsed.legales : '',
            impuestosNacionales: parsed.impuestosNacionales !== undefined ? parsed.impuestosNacionales : '',
            impuestosMunicipales: parsed.impuestosMunicipales !== undefined ? parsed.impuestosMunicipales : '',
            suscripciones: parsed.suscripciones !== undefined ? parsed.suscripciones : '',
            colegioBioanalistas: parsed.colegioBioanalistas !== undefined ? parsed.colegioBioanalistas : '',
            remodelaciones: parsed.remodelaciones !== undefined ? parsed.remodelaciones : '',
            mobiliario: parsed.mobiliario !== undefined ? parsed.mobiliario : '',
            tecnologia: parsed.tecnologia !== undefined ? parsed.tecnologia : '',
            infraestructura: parsed.infraestructura !== undefined ? parsed.infraestructura : '',
            telefonia: parsed.telefonia !== undefined ? parsed.telefonia : ''
          });
        } catch (e) {
          console.error("Error parsing desglose_admin:", e);
          setDesgloseAdmin({
            papeleria: '', internet: '', electricidad: '', agua: '', aseo: '',
            alquiler: '', asesorias: '', honorarios: '', software: '', condominio: '',
            legales: '', impuestosNacionales: '', impuestosMunicipales: '',
            suscripciones: '', colegioBioanalistas: '', remodelaciones: '',
            mobiliario: '', tecnologia: '', infraestructura: '', telefonia: ''
          });
          setGlobalAdmin(record.gastos_administrativos || '');
        }
      } else {
        setDesgloseAdmin({
          papeleria: '', internet: '', electricidad: '', agua: '', aseo: '',
          alquiler: '', asesorias: '', honorarios: '', software: '', condominio: '',
          legales: '', impuestosNacionales: '', impuestosMunicipales: '',
          suscripciones: '', colegioBioanalistas: '', remodelaciones: '',
          mobiliario: '', tecnologia: '', infraestructura: '', telefonia: ''
        });
        setGlobalAdmin(record.gastos_administrativos || '');
      }
    } else {
      setGlobalPersonal('');
      setGlobalTotalPruebas('');
      setGlobalAdmin('');
      setVolumenesArea({});
      setDesgloseAdmin({
        papeleria: '', internet: '', electricidad: '', agua: '', aseo: '',
        alquiler: '', asesorias: '', honorarios: '', software: '', condominio: '',
        legales: '', impuestosNacionales: '', impuestosMunicipales: '',
        suscripciones: '', colegioBioanalistas: '', remodelaciones: '',
        mobiliario: '', tecnologia: '', infraestructura: '', telefonia: ''
      });
    }
  }, [globalMes, globalAnio, gastosGlobales]);
  
  // Formulario Equipos
  const [eqId, setEqId] = useState('');
  const [eqNombre, setEqNombre] = useState('');
  const [eqSoluciones, setEqSoluciones] = useState('');
  const [eqCalibradores, setEqCalibradores] = useState('');
  const [eqControles, setEqControles] = useState('');
  const [eqTotalPruebas, setEqTotalPruebas] = useState('');

  // Formulario Configuración de Prueba
  const [selPruebaId, setSelPruebaId] = useState('');
  const [confPrecioVenta, setConfPrecioVenta] = useState('');
  const [confDesperdicioPct, setConfDesperdicioPct] = useState(5.00);
  const [confPruebasPorKit, setConfPruebasPorKit] = useState('');
  const [confReactivoId, setConfReactivoId] = useState('');
  const [confEquipoId, setConfEquipoId] = useState('');
  const [confConsumibles, setConfConsumibles] = useState([]); // array de { item_id, cantidad, fase }

  // Estado del cálculo actual
  const [calculoResultado, setCalculoResultado] = useState(null);
  const [calculoMes, setCalculoMes] = useState(new Date().getMonth() + 1);
  const [calculoAnio, setCalculoAnio] = useState(new Date().getFullYear());

  useEffect(() => {
    cargarTodosLosDatos();
  }, []);

  const cargarTodosLosDatos = async () => {
    setCargando(true);
    setError('');
    try {
      // 1. Obtener pruebas y sus vínculos
      const resPruebas = await api.get('/costos/pruebas');
      if (resPruebas.data && resPruebas.data.pruebas) {
        setPruebas(resPruebas.data.pruebas);
      }

      // 2. Obtener análisis consolidado de costos
      const resAnalisis = await api.get('/costos/analisis');
      if (resAnalisis.data && resAnalisis.data.analisis) {
        setAnalisis(resAnalisis.data.analisis);
      }

      // 3. Obtener impacto fiscal por área
      const resImpacto = await api.get('/costos/impacto');
      if (resImpacto.data && resImpacto.data.impacto) {
        setImpactoFiscal(resImpacto.data.impacto);
      }

      // 4. Obtener catálogo de reactivos/items para el selector de vínculos y consumibles
      const resInventory = await api.get('/inventory');
      if (resInventory.data && resInventory.data.items) {
        setCatalogoItems(resInventory.data.items);
      }

      // 5. Obtener gastos globales mensuales
      const resGastos = await api.get('/costos/gastos-globales');
      if (resGastos.data && resGastos.data.gastos) {
        setGastosGlobales(resGastos.data.gastos);
      }

      // 6. Obtener costos por equipo
      const resEquipos = await api.get('/costos/equipos');
      if (resEquipos.data && resEquipos.data.equipos) {
        setEquipos(resEquipos.data.equipos);
      }
    } catch (err) {
      console.error('Error al cargar datos de costos:', err);
      setError('No se pudo establecer conexión con el módulo de costos del backend.');
    } finally {
      setCargando(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabActual(newValue);
    setError('');
    setExito('');
  };

  // --- Handlers de Costos Avanzados ---
  const handleSaveGastosGlobales = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setGuardando(true);
    setError('');
    setExito('');
    try {
      const response = await api.post('/costos/gastos-globales', {
        mes: parseInt(globalMes),
        anio: parseInt(globalAnio),
        gastos_administrativos: parseFloat(globalAdmin) || 0,
        gastos_personal: parseFloat(globalPersonal) || 0,
        total_pruebas_mes: parseInt(globalTotalPruebas) || 0,
        desglose_admin: JSON.stringify(desgloseAdmin),
        volumenes_area: volumenesArea
      });
      if (response.data && response.data.success) {
        setExito('Gastos globales mensuales registrados correctamente.');
        await cargarTodosLosDatos();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Error al guardar los gastos globales.');
    } finally {
      setGuardando(false);
    }
  };

  const handleSaveEquipo = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    setExito('');
    try {
      const response = await api.post('/costos/equipos', {
        id: eqId ? parseInt(eqId) : undefined,
        nombre_equipo: eqNombre,
        gasto_soluciones: parseFloat(eqSoluciones),
        gasto_calibradores: parseFloat(eqCalibradores),
        gasto_controles: parseFloat(eqControles),
        total_pruebas_equipo: parseInt(eqTotalPruebas)
      });
      if (response.data && response.data.success) {
        setExito('Equipo registrado correctamente.');
        setEqId('');
        setEqNombre('');
        setEqSoluciones('');
        setEqCalibradores('');
        setEqControles('');
        setEqTotalPruebas('');
        await cargarTodosLosDatos();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Error al guardar el equipo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleDeleteEquipo = async (id) => {
    setGuardando(true);
    setError('');
    setExito('');
    try {
      const response = await api.delete(`/costos/equipos/${id}`);
      if (response.data && response.data.success) {
        setExito('Equipo eliminado correctamente.');
        await cargarTodosLosDatos();
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Error al eliminar el equipo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleLoadPruebaConfig = async (pruebaId) => {
    setSelPruebaId(pruebaId);
    if (!pruebaId) {
      setConfPrecioVenta('');
      setConfDesperdicioPct(5.00);
      setConfPruebasPorKit('');
      setConfReactivoId('');
      setConfEquipoId('');
      setConfConsumibles([]);
      setCalculoResultado(null);
      return;
    }
    setCargando(true);
    setError('');
    try {
      const response = await api.get(`/costos/config/${pruebaId}`);
      if (response.data && response.data.config) {
        const c = response.data.config;
        setConfPrecioVenta(c.precio_venta || '');
        setConfDesperdicioPct(c.desperdicio_pct || 5.00);
        setConfPruebasPorKit(c.pruebas_por_kit || '');
        setConfReactivoId(c.reactivo_id || '');
        setConfEquipoId(c.equipo_id || '');
        
        // Mapear consumibles
        setConfConsumibles(c.consumibles.map(cons => ({
          item_id: cons.item_id,
          cantidad: cons.cantidad,
          fase: cons.fase
        })));
      } else {
        // Reset a defaults
        setConfPrecioVenta('');
        setConfDesperdicioPct(5.00);
        setConfPruebasPorKit('');
        setConfReactivoId('');
        setConfEquipoId('');
        setConfConsumibles([]);
      }
      
      // Auto-trigger calculation if configured
      await handleCalcularPrueba(pruebaId);
    } catch (err) {
      console.error(err);
      setError('Error al cargar la configuración de la prueba.');
    } finally {
      setCargando(false);
    }
  };

  const handleCalcularPrueba = async (pruebaId) => {
    const pid = pruebaId || selPruebaId;
    if (!pid) return;
    try {
      const response = await api.get(`/costos/calcular/${pid}?mes=${calculoMes}&anio=${calculoAnio}`);
      if (response.data && response.data.calculo) {
        setCalculoResultado(response.data.calculo);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSavePruebaConfig = async (e) => {
    e.preventDefault();
    if (!selPruebaId || !confReactivoId || !confPruebasPorKit) {
      setError('Por favor complete los campos obligatorios: Prueba, Reactivo Principal y Pruebas por Kit.');
      return;
    }
    setGuardando(true);
    setError('');
    setExito('');
    try {
      const response = await api.post('/costos/config', {
        prueba_id: parseInt(selPruebaId),
        precio_venta: parseFloat(confPrecioVenta || 0),
        desperdicio_pct: parseFloat(confDesperdicioPct),
        pruebas_por_kit: parseInt(confPruebasPorKit),
        reactivo_id: parseInt(confReactivoId),
        equipo_id: confEquipoId ? parseInt(confEquipoId) : null,
        consumibles: confConsumibles
      });
      if (response.data && response.data.success) {
        setExito('Configuración de costos guardada exitosamente.');
        await handleCalcularPrueba(selPruebaId);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Error al guardar la configuración de costos.');
    } finally {
      setGuardando(false);
    }
  };

  const handleAddConsumible = (fase) => {
    setConfConsumibles([...confConsumibles, { item_id: '', cantidad: 1.0, fase }]);
  };

  const handleRemoveConsumible = (index) => {
    const newConsumibles = [...confConsumibles];
    newConsumibles.splice(index, 1);
    setConfConsumibles(newConsumibles);
  };

  const handleChangeConsumible = (index, field, value) => {
    const newConsumibles = [...confConsumibles];
    newConsumibles[index][field] = value;
    setConfConsumibles(newConsumibles);
  };

  // Crear Prueba Genérica
  const handleCrearPrueba = async (e) => {
    e.preventDefault();
    if (!nuevaPruebaNombre.trim()) return;

    setGuardando(true);
    setError('');
    setExito('');
    try {
      const response = await api.post('/costos/pruebas', {
        nombre_prueba: nuevaPruebaNombre.trim()
      });
      if (response.data && response.data.success) {
        setExito(`Prueba genérica "${nuevaPruebaNombre}" creada con éxito.`);
        setNuevaPruebaNombre('');
        // Recargar datos para ver la lista actualizada
        await cargarTodosLosDatos();
      }
    } catch (err) {
      console.error('Error creando prueba:', err);
      setError(err.response?.data?.error || 'Error al guardar la prueba genérica.');
    } finally {
      setGuardando(false);
    }
  };

  // Vincular marca/item a Prueba
  const handleCrearVinculo = async (e) => {
    e.preventDefault();
    if (!vinculoPruebaId || !vinculoItemId) {
      setError('Debe seleccionar una prueba genérica y un reactivo comercial.');
      return;
    }

    setGuardando(true);
    setError('');
    setExito('');
    try {
      const response = await api.post('/costos/vinculos', {
        prueba_id: parseInt(vinculoPruebaId),
        item_id: parseInt(vinculoItemId)
      });
      if (response.data && response.data.success) {
        setExito('Vínculo comercial registrado correctamente.');
        setVinculoItemId(''); // limpiar selección del item
        await cargarTodosLosDatos();
      }
    } catch (err) {
      console.error('Error al vincular item:', err);
      setError(err.response?.data?.error || 'Error al registrar la asociación.');
    } finally {
      setGuardando(false);
    }
  };

  // Eliminar vínculo
  const handleEliminarVinculo = async () => {
    if (!confirmarDesvincular) return;
    setGuardando(true);
    setError('');
    try {
      const response = await api.delete(`/costos/vinculos/${confirmarDesvincular.id}`);
      if (response.data && response.data.success) {
        setExito('Se ha eliminado la asociación comercial exitosamente.');
        setConfirmarDesvincular(null);
        await cargarTodosLosDatos();
      }
    } catch (err) {
      console.error('Error al desvincular:', err);
      setError(err.response?.data?.error || 'Error al eliminar el vínculo comercial.');
    } finally {
      setGuardando(false);
    }
  };

  // Filtrar Análisis
  const analisisFiltrado = analisis.filter(item =>
    item.nombre_prueba.toLowerCase().includes(busquedaPrueba.toLowerCase())
  );

  // Filtrar Pruebas en Pestaña Configuración
  const pruebasFiltradas = pruebas.filter(item =>
    item.nombre_prueba.toLowerCase().includes(busquedaVinculo.toLowerCase())
  );

  // Totales generales de impuestos e inversión
  const totalInvertidoUsd = analisis.reduce((sum, item) => sum + item.total_linea_usd, 0);
  const totalInvertidoVes = analisis.reduce((sum, item) => sum + item.total_linea_ves, 0);
  const totalIvaUsd = analisis.reduce((sum, item) => sum + item.impuesto_usd, 0);
  const totalIvaVes = analisis.reduce((sum, item) => sum + item.impuesto_ves, 0);

  // Obtener la lista única de áreas operativas definidas (incluyendo las 8 predeterminadas del laboratorio)
  const areasPredeterminadas = [
    'Química',
    'Hematología',
    'Serología',
    'Uroanálisis',
    'Coproanálisis',
    'Especiales',
    'Bacteriología',
    'Pruebas Referidas'
  ];
  const areasDisponibles = Array.from(new Set([
    ...areasPredeterminadas,
    ...catalogoItems.map(item => item.area_operativa),
    ...impactoFiscal.map(imp => imp.area_operativa)
  ].filter(area => area && area.trim() !== ''))).sort();

  // Agrupar pruebas por área operativa para guía visual del usuario
  const pruebasPorArea = {};
  pruebas.forEach(p => {
    let area = 'Sin Área Definida';
    if (p.vinculos && p.vinculos.length > 0) {
      const vinculoConArea = p.vinculos.find(v => v.item && v.item.area_operativa);
      if (vinculoConArea) {
        area = vinculoConArea.item.area_operativa;
      }
    }
    if (!pruebasPorArea[area]) {
      pruebasPorArea[area] = [];
    }
    if (!pruebasPorArea[area].includes(p.nombre_prueba)) {
      pruebasPorArea[area].push(p.nombre_prueba);
    }
  });

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header Premium con Gradiente */}
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          background: 'linear-gradient(135deg, #0d47a1 0%, #1976d2 50%, #42a5f5 100%)',
          color: '#fff',
          borderRadius: 3,
          boxShadow: '0px 6px 20px rgba(25, 118, 210, 0.25)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 2 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h3" fontWeight="bold" gutterBottom sx={{ fontSize: { xs: '2rem', md: '2.8rem' } }}>
                Estructura de Costos
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.9, fontWeight: 300, maxWidth: '700px' }}>
                Gestión financiera multimoneda, análisis consolidado por pruebas genéricas e impacto fiscal para laboratorios clínicos y clínicas.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Button
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={cargarTodosLosDatos}
                disabled={cargando}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(5px)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.4)',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                    border: '1px solid rgba(255,255,255,0.6)'
                  },
                  px: 3,
                  py: 1.2,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 'bold'
                }}
              >
                {cargando ? 'Sincronizando...' : 'Actualizar Datos'}
              </Button>
            </Grid>
          </Grid>
        </Box>
        {/* Efecto de esfera decorativa en el gradiente */}
        <Box
          sx={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '400px',
            height: '400px',
            background: 'rgba(255,255,255,0.08)',
            borderRadius: '50%',
            zIndex: 1,
            pointerEvents: 'none'
          }}
        />
      </Paper>

      {/* Alertas Globales */}
      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {exito && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setExito('')}>
          {exito}
        </Alert>
      )}

      {/* Selector de Pestañas con estilo moderno */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs
          value={tabActual}
          onChange={handleTabChange}
          aria-label="pestañas de estructura de costos"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
              backgroundColor: '#1976d2'
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              pb: 2,
              '&.Mui-selected': {
                color: '#1976d2',
                fontWeight: 'bold'
              }
            }
          }}
        >
          <Tab icon={<CostosIcon sx={{ mr: 1, fontSize: '1.2rem' }} />} iconPosition="start" label="Análisis de Costos por Prueba" />
          <Tab icon={<ScienceIcon sx={{ mr: 1, fontSize: '1.2rem' }} />} iconPosition="start" label="Configuración de Vínculos" />
          <Tab icon={<WalletIcon sx={{ mr: 1, fontSize: '1.2rem' }} />} iconPosition="start" label="Calculadora y Rentabilidad de Pruebas" />
        </Tabs>
      </Box>

      {/* CONTENIDO DE PESTAÑAS */}

      {/* TAB 1: Análisis de Costos por Prueba */}
      {tabActual === 0 && (
        <Fade in={tabActual === 0} timeout={400}>
          <Box>
            {/* Tarjetas de Métricas Generales */}
            <Grid container spacing={3} mb={4}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 10px rgba(0,0,0,0.05)', borderLeft: '5px solid #2e7d32' }}>
                  <CardContent sx={{ py: 3 }}>
                    <Typography color="textSecondary" variant="subtitle2" fontWeight="bold" uppercase gutterBottom>
                      INVERSIÓN TOTAL (USD)
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="success.main">
                      ${totalInvertidoUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Subtotal + IVA acumulado de compras
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 10px rgba(0,0,0,0.05)', borderLeft: '5px solid #1976d2' }}>
                  <CardContent sx={{ py: 3 }}>
                    <Typography color="textSecondary" variant="subtitle2" fontWeight="bold" gutterBottom>
                      INVERSIÓN TOTAL (VES)
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                      Bs. {totalInvertidoVes.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Al tipo de cambio oficial del día de compra
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 10px rgba(0,0,0,0.05)', borderLeft: '5px solid #ed6c02' }}>
                  <CardContent sx={{ py: 3 }}>
                    <Typography color="textSecondary" variant="subtitle2" fontWeight="bold" gutterBottom>
                      IMPUESTOS PAGADOS (USD)
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="warning.main">
                      ${totalIvaUsd.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Desglose de IVA en compras
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 10px rgba(0,0,0,0.05)', borderLeft: '5px solid #9c27b0' }}>
                  <CardContent sx={{ py: 3 }}>
                    <Typography color="textSecondary" variant="subtitle2" fontWeight="bold" gutterBottom>
                      PRUEBAS MONITOREADAS
                    </Typography>
                    <Typography variant="h4" fontWeight="bold" color="secondary.main">
                      {analisis.length}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Tipos de pruebas genéricas configuradas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Barra de Filtro */}
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' }}>
              <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" alignItems="center">
                  <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  <TextField
                    placeholder="Filtrar por nombre de prueba genérica (ej. Glucosa)..."
                    variant="standard"
                    fullWidth
                    value={busquedaPrueba}
                    onChange={(e) => setBusquedaPrueba(e.target.value)}
                    InputProps={{ disableUnderline: true }}
                    sx={{ fontSize: '1.1rem' }}
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Listado Consolidado */}
            {cargando ? (
              <Box display="flex" justifyContent="center" py={8}>
                <CircularProgress />
              </Box>
            ) : analisisFiltrado.length === 0 ? (
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                <Typography color="textSecondary" variant="h6">
                  {busquedaPrueba ? 'No se encontraron pruebas genéricas con ese nombre.' : 'No hay pruebas genéricas registradas o no tienen compras asociadas.'}
                </Typography>
                {!busquedaPrueba && (
                  <Button
                    variant="outlined"
                    sx={{ mt: 2 }}
                    onClick={() => setTabActual(1)}
                  >
                    Configurar Pruebas y Vínculos
                  </Button>
                )}
              </Paper>
            ) : (
              <Grid container spacing={3}>
                {analisisFiltrado.map((prueba) => (
                  <Grid item xs={12} md={6} key={prueba.id}>
                    <Card sx={{ borderRadius: 3, transition: '0.3s', '&:hover': { boxShadow: '0px 8px 20px rgba(0,0,0,0.08)' } }}>
                      <CardContent>
                        {/* Cabecera de la prueba */}
                        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                          <Box>
                            <Typography variant="h5" fontWeight="bold" color="text.primary">
                              {prueba.nombre_prueba}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {prueba.items_vinculados.length} reactivos/marcas asociadas • {prueba.total_compras} transacciones de compra
                            </Typography>
                          </Box>
                          <Chip
                            label={`${prueba.total_cantidad} Unidades`}
                            color="primary"
                            variant="outlined"
                            size="small"
                          />
                        </Box>

                        <Divider sx={{ my: 1.5 }} />

                        {/* Desglose de Costos de Adquisición */}
                        <Typography variant="subtitle2" color="textSecondary" fontWeight="bold" gutterBottom>
                          Consolidado de Adquisición
                        </Typography>

                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          {/* USD Columns */}
                          <Grid item xs={6}>
                            <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: '#fcfcfc', borderRadius: 2 }}>
                              <Typography variant="caption" color="textSecondary" display="block">
                                Gasto Neto (USD)
                              </Typography>
                              <Typography variant="h6" fontWeight="bold">
                                ${prueba.gastado_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                                IVA: ${prueba.impuesto_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </Typography>
                              <Box sx={{ borderTop: '1px solid #eee', mt: 0.5, pt: 0.5 }}>
                                <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                                  Total: ${prueba.total_linea_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>

                          {/* VES Columns */}
                          <Grid item xs={6}>
                            <Paper variant="outlined" sx={{ p: 1.5, backgroundColor: '#fcfcfc', borderRadius: 2 }}>
                              <Typography variant="caption" color="textSecondary" display="block">
                                Gasto Neto (VES)
                              </Typography>
                              <Typography variant="h6" fontWeight="bold">
                                Bs. {prueba.gastado_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </Typography>
                              <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5 }}>
                                IVA: Bs. {prueba.impuesto_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                              </Typography>
                              <Box sx={{ borderTop: '1px solid #eee', mt: 0.5, pt: 0.5 }}>
                                <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                                  Total: Bs. {prueba.total_linea_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </Typography>
                              </Box>
                            </Paper>
                          </Grid>
                        </Grid>

                        {/* Listado de Marcas Vinculadas */}
                        <Typography variant="subtitle2" color="textSecondary" fontWeight="bold" gutterBottom>
                          Reactivos/Marcas Vinculadas
                        </Typography>
                        {prueba.items_vinculados.length === 0 ? (
                          <Typography variant="body2" color="textSecondary" fontStyle="italic">
                            No hay productos asociados a esta prueba genérica.
                          </Typography>
                        ) : (
                          <Box display="flex" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
                            {prueba.items_vinculados.map((item) => (
                              <Tooltip
                                key={item.item_id}
                                title={
                                  <Box sx={{ p: 0.5 }}>
                                    <Typography variant="caption" display="block"><strong>Código:</strong> {item.codigo || 'N/A'}</Typography>
                                    <Typography variant="caption" display="block"><strong>Área:</strong> {item.area_operativa}</Typography>
                                    <Typography variant="caption" display="block"><strong>Tipo:</strong> {item.naturaleza}</Typography>
                                    <Typography variant="caption" display="block"><strong>Stock Actual:</strong> {item.stock_actual} uds</Typography>
                                  </Box>
                                }
                                arrow
                              >
                                <Chip
                                  label={`${item.nombre} (${item.stock_actual} u)`}
                                  size="small"
                                  color="info"
                                  variant="outlined"
                                  icon={<ScienceIcon style={{ fontSize: '1rem' }} />}
                                  sx={{ cursor: 'help', mb: 0.5 }}
                                />
                              </Tooltip>
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Fade>
      )}

      {/* TAB 2: Configuración de Vínculos */}
      {tabActual === 1 && (
        <Fade in={tabActual === 1} timeout={400}>
          <Box>
            <Grid container spacing={4}>
              {/* Formulario 1: Nueva Prueba Genérica */}
              <Grid item xs={12} md={5}>
                <Card sx={{ borderRadius: 3, mb: 4, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom color="primary" display="flex" alignItems="center">
                      <FolderIcon sx={{ mr: 1 }} />
                      Crear Prueba Genérica
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                      Define los nombres genéricos de las pruebas que ofrece tu laboratorio clínico (ej. Glucosa, HIV, Hemoglobina, PCR). Esto agrupará las diferentes marcas comerciales.
                    </Typography>

                    <form onSubmit={handleCrearPrueba}>
                      <TextField
                        fullWidth
                        label="Nombre de Prueba Genérica"
                        placeholder="Ej. Glucosa, Perfil Lipídico, etc."
                        value={nuevaPruebaNombre}
                        onChange={(e) => setNuevaPruebaNombre(e.target.value)}
                        required
                        variant="outlined"
                        disabled={guardando}
                        sx={{ mb: 2 }}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={guardando || !nuevaPruebaNombre.trim()}
                        startIcon={guardando ? <CircularProgress size={20} /> : <AgregarIcon />}
                        sx={{ py: 1.2, textTransform: 'none', fontWeight: 'bold' }}
                      >
                        Crear Prueba Genérica
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Formulario 2: Vincular Reactivo Comercial a Genérico */}
                <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom color="primary" display="flex" alignItems="center">
                      <LinkIcon sx={{ mr: 1 }} />
                      Vincular Reactivo Comercial
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                      Asocia una marca específica de reactivo (desde tu inventario) a una de las pruebas genéricas creadas arriba.
                    </Typography>

                    <form onSubmit={handleCrearVinculo}>
                      {/* Selector de Prueba Genérica */}
                      <FormControl fullWidth sx={{ mb: 2 }} required>
                        <InputLabel id="select-prueba-label">Prueba Genérica</InputLabel>
                        <Select
                          labelId="select-prueba-label"
                          id="select-prueba"
                          value={vinculoPruebaId}
                          onChange={(e) => setVinculoPruebaId(e.target.value)}
                          label="Prueba Genérica"
                          disabled={guardando || pruebas.length === 0}
                        >
                          {pruebas.length === 0 ? (
                            <MenuItem value="" disabled>No hay pruebas creadas</MenuItem>
                          ) : (
                            pruebas.map((p) => (
                              <MenuItem key={p.id} value={p.id}>
                                {p.nombre_prueba}
                              </MenuItem>
                            ))
                          )}
                        </Select>
                      </FormControl>

                      {/* Selector de Item del Catálogo con Autocomplete Inteligente */}
                      <Autocomplete
                        id="vinculo-item-autocomplete"
                        options={catalogoItems}
                        getOptionLabel={(option) => {
                          const marca = option.marca ? ` [${option.marca}]` : '';
                          const cod = option.codigo ? ` (${option.codigo})` : '';
                          return `${option.nombre}${marca}${cod}`;
                        }}
                        value={catalogoItems.find(item => item.id === vinculoItemId) || null}
                        onChange={(event, newValue) => {
                          setVinculoItemId(newValue ? newValue.id : '');
                        }}
                        disabled={guardando || catalogoItems.length === 0}
                        isOptionEqualToValue={(option, value) => option.id === value.id}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Buscar Reactivo del Catálogo (Inventario)"
                            placeholder="Escribe el nombre o código del reactivo..."
                            required
                            fullWidth
                            sx={{ mb: 2 }}
                          />
                        )}
                      />

                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        color="secondary"
                        disabled={guardando || !vinculoPruebaId || !vinculoItemId}
                        startIcon={guardando ? <CircularProgress size={20} /> : <LinkIcon />}
                        sx={{ py: 1.2, textTransform: 'none', fontWeight: 'bold' }}
                      >
                        Crear Vínculo
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </Grid>

              {/* Listado y gestión de vínculos */}
              <Grid item xs={12} md={7}>
                <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                      <Typography variant="h6" fontWeight="bold" color="text.primary">
                        Catálogo de Pruebas y Marcas
                      </Typography>
                      <TextField
                        size="small"
                        placeholder="Buscar por prueba..."
                        value={busquedaVinculo}
                        onChange={(e) => setBusquedaVinculo(e.target.value)}
                        InputProps={{
                          startAdornment: <SearchIcon size="small" sx={{ color: 'text.secondary', mr: 0.5 }} />
                        }}
                      />
                    </Box>

                    {pruebasFiltradas.length === 0 ? (
                      <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: '#fafafa' }}>
                        <Typography color="textSecondary">
                          {busquedaVinculo ? 'No se encontraron resultados para la búsqueda.' : 'No hay pruebas genéricas creadas aún.'}
                        </Typography>
                      </Paper>
                    ) : (
                      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table sx={{ minWidth: 400 }} aria-label="tabla de vinculos">
                          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>Prueba Genérica</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }}>Marcas/Reactivos Vinculados</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {pruebasFiltradas.map((prueba) => (
                              <TableRow key={prueba.id} hover>
                                <TableCell component="th" scope="row" sx={{ verticalAlign: 'top', pt: 2, fontWeight: 500 }}>
                                  {prueba.nombre_prueba}
                                </TableCell>
                                <TableCell>
                                  {prueba.vinculos && prueba.vinculos.length > 0 ? (
                                    <Box display="flex" flexDirection="column" gap={1}>
                                      {prueba.vinculos.map((v) => (
                                        <Paper
                                          key={v.id}
                                          variant="outlined"
                                          sx={{
                                            p: 1,
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderColor: '#e0e0e0',
                                            backgroundColor: '#fbfbfb',
                                            borderRadius: 2
                                          }}
                                        >
                                          <Box>
                                            <Typography variant="body2" fontWeight="bold">
                                              {v.item.nombre}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary" display="block">
                                              Código: {v.item.codigo || 'S/C'} • {v.item.area_operativa || 'Sin Área'} • {v.item.naturaleza || 'Sin Naturaleza'}
                                            </Typography>
                                          </Box>
                                          <Tooltip title="Desvincular Reactivo">
                                            <IconButton
                                              size="small"
                                              color="error"
                                              onClick={() => setConfirmarDesvincular({
                                                id: v.id,
                                                itemNombre: v.item.nombre,
                                                pruebaNombre: prueba.nombre_prueba
                                              })}
                                              disabled={guardando}
                                            >
                                              <LinkOffIcon fontSize="small" />
                                            </IconButton>
                                          </Tooltip>
                                        </Paper>
                                      ))}
                                    </Box>
                                  ) : (
                                    <Typography variant="body2" color="textSecondary" fontStyle="italic">
                                      Sin reactivos vinculados. Use el panel izquierdo para vincular.
                                    </Typography>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </Fade>
      )}

      {/* TAB 3: Impacto Fiscal (OCULTO) */}
      {false && tabActual === 99 && (
        <Fade in={false} timeout={400}>
          <Box>
            {/* Panel Principal */}
            <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)', mb: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight="bold" gutterBottom color="primary" display="flex" alignItems="center">
                  <FiscalIcon sx={{ mr: 1 }} />
                  Análisis de Impacto Fiscal por Área Operativa
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                  Audita el IVA y los impuestos acumulados en las transacciones de compra de insumos, clasificados automáticamente según el área operativa del laboratorio. Esto permite evaluar la carga tributaria real e identificar áreas de mayor gasto comercial.
                </Typography>

                {cargando ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                  </Box>
                ) : impactoFiscal.length === 0 ? (
                  <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                    <Typography color="textSecondary">
                      No se disponen de registros de facturación con desglose de impuestos en compras.
                    </Typography>
                  </Paper>
                ) : (
                  <Grid container spacing={4}>
                    {/* Tabla de Impacto */}
                    <Grid item xs={12} lg={8}>
                      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table aria-label="tabla fiscal">
                          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>Área Operativa</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }} align="center">Facturas</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }} align="right">Base Imponible (USD)</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }} align="right">IVA Pagado (USD)</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Inversión (USD)</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Inversión (VES)</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {impactoFiscal.map((area) => (
                              <TableRow key={area.area_operativa} hover>
                                <TableCell component="th" scope="row" sx={{ fontWeight: 500 }}>
                                  {area.area_operativa}
                                </TableCell>
                                <TableCell align="center">{area.total_compras}</TableCell>
                                <TableCell align="right">${area.subtotal_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</TableCell>
                                <TableCell align="right" sx={{ color: 'warning.main', fontWeight: 500 }}>
                                  ${area.impuesto_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                                  ${area.total_usd.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell align="right">
                                  Bs. {area.total_ves.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Grid>

                    {/* Distribución Gráfica (Barra de progreso visual de participación de IVA) */}
                    <Grid item xs={12} lg={4}>
                      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom color="text.primary">
                          Distribución de Impuestos por Área
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                          Proporción del IVA pagado en USD por cada sector operativo.
                        </Typography>

                        <Box display="flex" flexDirection="column" gap={3}>
                          {impactoFiscal.map((area) => {
                            const porcentaje = totalIvaUsd > 0 ? (area.impuesto_usd / totalIvaUsd) * 100 : 0;
                            return (
                              <Box key={area.area_operativa}>
                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                  <Typography variant="body2" fontWeight="bold">
                                    {area.area_operativa}
                                  </Typography>
                                  <Typography variant="body2" color="textSecondary">
                                    {porcentaje.toFixed(1)}% (${area.impuesto_usd.toFixed(2)})
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={porcentaje}
                                  sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: '#eeeeee',
                                    '& .MuiLinearProgress-bar': {
                                      borderRadius: 4,
                                      backgroundColor: porcentaje > 50 ? '#dc004e' : '#1976d2'
                                    }
                                  }}
                                />
                              </Box>
                            );
                          })}
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Box>
        </Fade>
      )}

      {/* TAB 4: Calculadora y Rentabilidad de Pruebas */}
      {tabActual === 2 && (
        <Fade in={tabActual === 2} timeout={400}>
          <Box>
            {/* Sub-pestañas internas */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
              <Paper variant="outlined" sx={{ p: 0.5, borderRadius: 3, display: 'inline-flex', backgroundColor: '#f5f5f5' }}>
                <Button
                  variant={subTabCostos === 0 ? 'contained' : 'text'}
                  onClick={() => setSubTabCostos(0)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 'bold',
                    px: 3,
                    boxShadow: subTabCostos === 0 ? '0px 2px 6px rgba(0,0,0,0.1)' : 'none',
                    backgroundColor: subTabCostos === 0 ? '#1976d2' : 'transparent',
                    color: subTabCostos === 0 ? '#fff' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: subTabCostos === 0 ? '#1565c0' : 'rgba(0,0,0,0.04)'
                    }
                  }}
                >
                  Gastos Fijos Mensuales
                </Button>
                <Button
                  variant={subTabCostos === 1 ? 'contained' : 'text'}
                  onClick={() => setSubTabCostos(1)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 'bold',
                    px: 3,
                    boxShadow: subTabCostos === 1 ? '0px 2px 6px rgba(0,0,0,0.1)' : 'none',
                    backgroundColor: subTabCostos === 1 ? '#1976d2' : 'transparent',
                    color: subTabCostos === 1 ? '#fff' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: subTabCostos === 1 ? '#1565c0' : 'rgba(0,0,0,0.04)'
                    }
                  }}
                >
                  Calculadora por Prueba & Simulación
                </Button>
                <Button
                  variant={subTabCostos === 2 ? 'contained' : 'text'}
                  onClick={() => setSubTabCostos(2)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 'bold',
                    px: 3,
                    boxShadow: subTabCostos === 2 ? '0px 2px 6px rgba(0,0,0,0.1)' : 'none',
                    backgroundColor: subTabCostos === 2 ? '#1976d2' : 'transparent',
                    color: subTabCostos === 2 ? '#fff' : 'text.secondary',
                    '&:hover': {
                      backgroundColor: subTabCostos === 2 ? '#1565c0' : 'rgba(0,0,0,0.04)'
                    }
                  }}
                >
                  Desglose Gastos Administrativos
                </Button>
              </Paper>
            </Box>

            {/* CONTENIDO SUB-PESTAÑA 0: Gastos Fijos Mensuales */}
            {subTabCostos === 0 && (
              <Grid container spacing={4}>
                {/* Gastos Globales */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)', mb: 4 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom color="primary" display="flex" alignItems="center">
                        <BusinessIcon sx={{ mr: 1 }} />
                        Gastos Mensuales Globales
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                        Configure los gastos fijos de administración (alquiler, luz, agua, papelería) y mano de obra (nóminas, honorarios) del mes. Se dividirán entre el total de pruebas procesadas para calcular el costo unitario indirecto.
                      </Typography>

                      <form onSubmit={handleSaveGastosGlobales}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Mes</InputLabel>
                              <Select
                                value={globalMes}
                                label="Mes"
                                onChange={(e) => setGlobalMes(e.target.value)}
                              >
                                {[...Array(12).keys()].map(m => (
                                  <MenuItem key={m + 1} value={m + 1}>
                                    {new Date(2000, m, 1).toLocaleString('es-ES', { month: 'long' })}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Año"
                              type="number"
                              value={globalAnio}
                              onChange={(e) => setGlobalAnio(e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Gastos Administrativos del Mes ($)"
                              type="number"
                              value={globalAdmin}
                              onChange={(e) => setGlobalAdmin(e.target.value)}
                              required
                              inputProps={{ step: '0.01' }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Gastos de Personal/Nómina ($)"
                              type="number"
                              value={globalPersonal}
                              onChange={(e) => setGlobalPersonal(e.target.value)}
                              required
                              inputProps={{ step: '0.01' }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Total de Pruebas Procesadas en el Mes"
                              type="number"
                              value={globalTotalPruebas}
                              onChange={(e) => setGlobalTotalPruebas(e.target.value)}
                              required
                            />
                          </Grid>
                          {areasDisponibles.length > 0 && (
                            <Grid item xs={12}>
                              <Divider sx={{ my: 2 }} />
                              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                                Volumen de Pruebas por Área Operativa
                              </Typography>
                              <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 1.5 }}>
                                Indique el número de pruebas procesadas en cada departamento para prorratear soluciones y controles por área.
                              </Typography>
                              <Grid container spacing={2}>
                                {areasDisponibles.map(area => (
                                  <Grid item xs={6} key={area}>
                                    <TextField
                                      fullWidth
                                      size="small"
                                      label={`Volumen en ${area}`}
                                      type="number"
                                      value={volumenesArea[area] || ''}
                                      onChange={(e) => setVolumenesArea({
                                        ...volumenesArea,
                                        [area]: e.target.value
                                      })}
                                      helperText={
                                        pruebasPorArea[area] && pruebasPorArea[area].length > 0
                                          ? `Pruebas: ${pruebasPorArea[area].join(', ')}`
                                          : 'Sin pruebas genéricas vinculadas'
                                      }
                                      FormHelperTextProps={{
                                        sx: { fontSize: '0.72rem', fontStyle: 'italic', color: 'text.secondary' }
                                      }}
                                    />
                                  </Grid>
                                ))}
                              </Grid>
                            </Grid>
                          )}
                        </Grid>
                        <Button
                          type="submit"
                          variant="contained"
                          color="primary"
                          fullWidth
                          disabled={guardando}
                          startIcon={guardando ? <CircularProgress size={20} /> : <SaveIcon />}
                          sx={{ mt: 3, py: 1.2, textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
                        >
                          Guardar Gastos del Mes
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Listado Historial Gastos Globales */}
                  <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Historial de Gastos Fijos
                      </Typography>
                      {gastosGlobales.length === 0 ? (
                        <Typography variant="body2" color="textSecondary" fontStyle="italic">
                          No hay gastos mensuales registrados aún.
                        </Typography>
                      ) : (
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Período</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Admin</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Personal</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Pruebas</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Costo Indirecto u.</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {gastosGlobales.map((g) => {
                                const adminU = g.total_pruebas_mes > 0 ? Number(g.gastos_administrativos) / g.total_pruebas_mes : 0;
                                const persU = g.total_pruebas_mes > 0 ? Number(g.gastos_personal) / g.total_pruebas_mes : 0;
                                return (
                                  <TableRow key={g.id}>
                                    <TableCell sx={{ fontWeight: 500 }}>
                                      {new Date(2000, g.mes - 1, 1).toLocaleString('es-ES', { month: 'short' })} {g.anio}
                                    </TableCell>
                                    <TableCell align="right">${g.gastos_administrativos.toFixed(2)}</TableCell>
                                    <TableCell align="right">${g.gastos_personal.toFixed(2)}</TableCell>
                                    <TableCell align="right">{g.total_pruebas_mes}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                      ${(adminU + persU).toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                {/* Equipos */}
                <Grid item xs={12} md={6}>
                  <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)', mb: 4 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom color="primary" display="flex" alignItems="center">
                        <BuildIcon sx={{ mr: 1 }} />
                        Registrar Costo de Equipos
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                        Configure los gastos de soluciones de limpieza, calibradores y controles por equipo analítico para prorratear su costo de forma mensual entre el volumen de pruebas procesadas.
                      </Typography>

                      <form onSubmit={handleSaveEquipo}>
                        <Grid container spacing={2}>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Nombre del Equipo"
                              placeholder="Ej. Equipo Química Cobas C311"
                              value={eqNombre}
                              onChange={(e) => setEqNombre(e.target.value)}
                              required
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Gasto Soluciones ($)"
                              type="number"
                              value={eqSoluciones}
                              onChange={(e) => setEqSoluciones(e.target.value)}
                              required
                              inputProps={{ step: '0.01' }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Gasto Calibradores ($)"
                              type="number"
                              value={eqCalibradores}
                              onChange={(e) => setEqCalibradores(e.target.value)}
                              required
                              inputProps={{ step: '0.01' }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Gasto Controles ($)"
                              type="number"
                              value={eqControles}
                              onChange={(e) => setEqControles(e.target.value)}
                              required
                              inputProps={{ step: '0.01' }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Total Pruebas Equipo/Mes"
                              type="number"
                              value={eqTotalPruebas}
                              onChange={(e) => setEqTotalPruebas(e.target.value)}
                              required
                            />
                          </Grid>
                        </Grid>
                        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                          {eqId && (
                            <Button
                              variant="outlined"
                              color="secondary"
                              onClick={() => {
                                setEqId('');
                                setEqNombre('');
                                setEqSoluciones('');
                                setEqCalibradores('');
                                setEqControles('');
                                setEqTotalPruebas('');
                              }}
                              sx={{ flex: 1, textTransform: 'none', borderRadius: 2 }}
                            >
                              Cancelar
                            </Button>
                          )}
                          <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            sx={{ flex: 2, py: 1.2, textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
                            startIcon={guardando ? <CircularProgress size={20} /> : <SaveIcon />}
                            disabled={guardando}
                          >
                            {eqId ? 'Actualizar Equipo' : 'Registrar Equipo'}
                          </Button>
                        </Box>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Listado de Equipos */}
                  <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Equipos Configurados
                      </Typography>
                      {equipos.length === 0 ? (
                        <Typography variant="body2" color="textSecondary" fontStyle="italic">
                          No hay equipos registrados aún.
                        </Typography>
                      ) : (
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                          <Table size="small">
                            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                              <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Equipo</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Egresos ($)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Volumen</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">Unitario</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="center">Acciones</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {equipos.map((eq) => {
                                const totalGasto = Number(eq.gasto_soluciones) + Number(eq.gasto_calibradores) + Number(eq.gasto_controles);
                                const unitario = eq.total_pruebas_equipo > 0 ? totalGasto / eq.total_pruebas_equipo : 0;
                                return (
                                  <TableRow key={eq.id}>
                                    <TableCell sx={{ fontWeight: 500 }}>{eq.nombre_equipo}</TableCell>
                                    <TableCell align="right">${totalGasto.toFixed(2)}</TableCell>
                                    <TableCell align="right">{eq.total_pruebas_equipo}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                      ${unitario.toFixed(2)}
                                    </TableCell>
                                    <TableCell align="center">
                                      <Box display="flex" justifyContent="center" gap={1}>
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          onClick={() => {
                                            setEqId(eq.id);
                                            setEqNombre(eq.nombre_equipo);
                                            setEqSoluciones(eq.gasto_soluciones);
                                            setEqCalibradores(eq.gasto_calibradores);
                                            setEqControles(eq.gasto_controles);
                                            setEqTotalPruebas(eq.total_pruebas_equipo);
                                          }}
                                        >
                                          <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() => handleDeleteEquipo(eq.id)}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Box>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {/* CONTENIDO SUB-PESTAÑA 1: Calculadora y Simulación */}
            {subTabCostos === 1 && (
              <Grid container spacing={4}>
                {/* Formulario de Configuración */}
                <Grid item xs={12} lg={5}>
                  <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" fontWeight="bold" gutterBottom color="primary" display="flex" alignItems="center">
                        <BuildIcon sx={{ mr: 1 }} />
                        Configurar Parámetros de la Prueba
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                        Configure los costos directos de la prueba genérica, indicando su reactivo comercial principal y consumibles adicionales utilizados.
                      </Typography>

                      <form onSubmit={handleSavePruebaConfig}>
                        <Grid container spacing={2}>
                          {/* Seleccionar Prueba */}
                          <Grid item xs={12}>
                            <FormControl fullWidth size="small" required>
                              <InputLabel>Prueba Genérica</InputLabel>
                              <Select
                                value={selPruebaId}
                                label="Prueba Genérica"
                                onChange={(e) => handleLoadPruebaConfig(e.target.value)}
                              >
                                {pruebas.map(p => (
                                  <MenuItem key={p.id} value={p.id}>
                                    {p.nombre_prueba}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          {/* Parámetros Básicos */}
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Precio Venta Paciente ($)"
                              type="number"
                              value={confPrecioVenta}
                              onChange={(e) => setConfPrecioVenta(e.target.value)}
                              inputProps={{ step: '0.01' }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Porcentaje Desperdicio (%)"
                              type="number"
                              value={confDesperdicioPct}
                              onChange={(e) => setConfDesperdicioPct(e.target.value)}
                              inputProps={{ step: '0.1' }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Pruebas Estimadas por Kit Reactivo"
                              type="number"
                              value={confPruebasPorKit}
                              onChange={(e) => setConfPruebasPorKit(e.target.value)}
                              required
                            />
                          </Grid>

                          {/* Reactivo Principal */}
                          <Grid item xs={12}>
                            <FormControl fullWidth size="small" required>
                              <InputLabel>Reactivo Principal (Inventario)</InputLabel>
                              <Select
                                value={confReactivoId}
                                label="Reactivo Principal (Inventario)"
                                onChange={(e) => setConfReactivoId(e.target.value)}
                              >
                                {catalogoItems
                                  .filter(item => item.categoria === 'Reactivo' || item.categoria === 'Reactivos' || true)
                                  .sort((a,b) => a.nombre.localeCompare(b.nombre))
                                  .map(item => (
                                    <MenuItem key={item.id} value={item.id}>
                                      {item.nombre} (Costo: ${item.precio_costo || '0.00'})
                                    </MenuItem>
                                  ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          {/* Equipo Asociado */}
                          <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Equipo de Procesamiento</InputLabel>
                              <Select
                                value={confEquipoId}
                                label="Equipo de Procesamiento"
                                onChange={(e) => setConfEquipoId(e.target.value)}
                              >
                                <MenuItem value=""><em>Ninguno / Manual</em></MenuItem>
                                {equipos.map(eq => (
                                  <MenuItem key={eq.id} value={eq.id}>
                                    {eq.nombre_equipo} (Costo u. prorrateado: ${((Number(eq.gasto_soluciones) + Number(eq.gasto_calibradores) + Number(eq.gasto_controles)) / (eq.total_pruebas_equipo || 1)).toFixed(2)})
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>

                          {/* Consumibles Pre-analíticos (TOMA_MUESTRA) */}
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                Consumibles Toma de Muestra (Pre-analítica)
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<AgregarIcon />}
                                onClick={() => handleAddConsumible('TOMA_MUESTRA')}
                              >
                                Agregar
                              </Button>
                            </Box>
                            {confConsumibles.filter(c => c.fase === 'TOMA_MUESTRA').map((c, originalIdx) => {
                              const idx = confConsumibles.indexOf(c);
                              return (
                                <Box key={`toma-${idx}`} display="flex" gap={1} mb={1} alignItems="center">
                                  <FormControl fullWidth size="small">
                                    <Select
                                      value={c.item_id}
                                      onChange={(e) => handleChangeConsumible(idx, 'item_id', e.target.value)}
                                      displayEmpty
                                    >
                                      <MenuItem value="" disabled>Seleccionar Insumo</MenuItem>
                                      {catalogoItems
                                        .sort((a,b) => a.nombre.localeCompare(b.nombre))
                                        .map(item => (
                                          <MenuItem key={item.id} value={item.id}>
                                            {item.nombre} (${item.precio_costo || '0.00'})
                                          </MenuItem>
                                        ))}
                                    </Select>
                                  </FormControl>
                                  <TextField
                                    size="small"
                                    type="number"
                                    label="Cant."
                                    sx={{ width: '90px' }}
                                    value={c.cantidad}
                                    onChange={(e) => handleChangeConsumible(idx, 'cantidad', e.target.value)}
                                    inputProps={{ step: '0.01' }}
                                  />
                                  <IconButton size="small" color="error" onClick={() => handleRemoveConsumible(idx)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              );
                            })}
                          </Grid>

                          {/* Consumibles de Procesamiento (PROCESAMIENTO) */}
                          <Grid item xs={12}>
                            <Divider sx={{ my: 1 }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                              <Typography variant="subtitle2" fontWeight="bold">
                                Consumibles Procesamiento (Fase Analítica)
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<AgregarIcon />}
                                onClick={() => handleAddConsumible('PROCESAMIENTO')}
                              >
                                Agregar
                              </Button>
                            </Box>
                            {confConsumibles.filter(c => c.fase === 'PROCESAMIENTO').map((c, originalIdx) => {
                              const idx = confConsumibles.indexOf(c);
                              return (
                                <Box key={`proc-${idx}`} display="flex" gap={1} mb={1} alignItems="center">
                                  <FormControl fullWidth size="small">
                                    <Select
                                      value={c.item_id}
                                      onChange={(e) => handleChangeConsumible(idx, 'item_id', e.target.value)}
                                      displayEmpty
                                    >
                                      <MenuItem value="" disabled>Seleccionar Insumo</MenuItem>
                                      {catalogoItems
                                        .sort((a,b) => a.nombre.localeCompare(b.nombre))
                                        .map(item => (
                                          <MenuItem key={item.id} value={item.id}>
                                            {item.nombre} (${item.precio_costo || '0.00'})
                                          </MenuItem>
                                        ))}
                                    </Select>
                                  </FormControl>
                                  <TextField
                                    size="small"
                                    type="number"
                                    label="Cant."
                                    sx={{ width: '90px' }}
                                    value={c.cantidad}
                                    onChange={(e) => handleChangeConsumible(idx, 'cantidad', e.target.value)}
                                    inputProps={{ step: '0.01' }}
                                  />
                                  <IconButton size="small" color="error" onClick={() => handleRemoveConsumible(idx)}>
                                    <DeleteIcon />
                                  </IconButton>
                                </Box>
                              );
                            })}
                          </Grid>
                        </Grid>

                        <Button
                          type="submit"
                          variant="contained"
                          color="secondary"
                          fullWidth
                          disabled={guardando || !selPruebaId}
                          startIcon={guardando ? <CircularProgress size={20} /> : <SaveIcon />}
                          sx={{ mt: 3, py: 1.2, textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
                        >
                          Guardar y Simular Costos
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Dashboard de Resultados de Simulación */}
                <Grid item xs={12} lg={7}>
                  {/* Filtros de mes/año para el cálculo */}
                  <Card sx={{ mb: 4, borderRadius: 3, boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' }}>
                    <CardContent sx={{ py: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight="bold">
                        Periodo de Prorrateo:
                      </Typography>
                      <FormControl size="small" sx={{ width: '130px' }}>
                        <Select
                          value={calculoMes}
                          onChange={(e) => {
                            setCalculoMes(e.target.value);
                            handleCalcularPrueba(selPruebaId);
                          }}
                        >
                          {[...Array(12).keys()].map(m => (
                            <MenuItem key={m + 1} value={m + 1}>
                              {new Date(2000, m, 1).toLocaleString('es-ES', { month: 'long' })}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        type="number"
                        label="Año"
                        sx={{ width: '100px' }}
                        value={calculoAnio}
                        onChange={(e) => {
                          setCalculoAnio(e.target.value);
                          handleCalcularPrueba(selPruebaId);
                        }}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<RefreshIcon />}
                        onClick={() => handleCalcularPrueba(selPruebaId)}
                      >
                        Recalcular
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Ficha de Resultados */}
                  {calculoResultado ? (
                    calculoResultado.configurado ? (
                      <Box>
                        {/* Margen de Ganancia Premium Card */}
                        <Card
                          sx={{
                            borderRadius: 3,
                            color: '#fff',
                            background: calculoResultado.indicador_semaforo === 'VERDE'
                              ? 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #4caf50 100%)'
                              : calculoResultado.indicador_semaforo === 'AMARILLO'
                                ? 'linear-gradient(135deg, #e65100 0%, #f57c00 50%, #ff9800 100%)'
                                : 'linear-gradient(135deg, #b71c1c 0%, #d32f2f 50%, #f44336 100%)',
                            boxShadow: '0px 6px 20px rgba(0, 0, 0, 0.15)',
                            mb: 4,
                            p: 3
                          }}
                        >
                          <Grid container spacing={3} alignItems="center">
                            <Grid item xs={12} md={7}>
                              <Typography variant="subtitle2" sx={{ opacity: 0.9, fontWeight: 'bold' }}>
                                MARGEN DE GANANCIA NETO
                              </Typography>
                              <Typography variant="h2" fontWeight="bold" sx={{ my: 1, fontSize: { xs: '3rem', md: '4rem' } }}>
                                {calculoResultado.margen_ganancia_pct.toFixed(2)}%
                              </Typography>
                              <Typography variant="body2" sx={{ opacity: 0.95, display: 'flex', alignItems: 'center' }}>
                                {calculoResultado.indicador_semaforo === 'VERDE' ? (
                                  <>
                                    <CheckCircleIcon sx={{ mr: 1, fontSize: '1.2rem' }} /> Margen Excelente y Altamente Saludable
                                  </>
                                ) : calculoResultado.indicador_semaforo === 'AMARILLO' ? (
                                  <>
                                    <WarningIcon sx={{ mr: 1, fontSize: '1.2rem' }} /> Rentabilidad Moderada. Evaluar precio o reducir costos fijos.
                                  </>
                                ) : (
                                  <>
                                    <WarningIcon sx={{ mr: 1, fontSize: '1.2rem' }} /> Rentabilidad Crítica. Riesgo de pérdida operativa.
                                  </>
                                )}
                              </Typography>
                            </Grid>
                            <Grid item xs={12} md={5}>
                              <Paper sx={{ p: 2, backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(5px)', color: '#fff', borderRadius: 2, border: '1px solid rgba(255,255,255,0.2)' }}>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Precio Venta:</Typography>
                                  <Typography variant="body2" fontWeight="bold">${calculoResultado.precio_venta.toFixed(2)}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" mb={1}>
                                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Costo Unitario:</Typography>
                                  <Typography variant="body2" fontWeight="bold">${calculoResultado.costo_total_unitario.toFixed(2)}</Typography>
                                </Box>
                                <Divider sx={{ my: 1, backgroundColor: 'rgba(255,255,255,0.3)' }} />
                                <Box display="flex" justifyContent="space-between">
                                  <Typography variant="body2" sx={{ opacity: 0.8 }}>Ganancia Neta:</Typography>
                                  <Typography variant="subtitle1" fontWeight="bold">${(calculoResultado.precio_venta - calculoResultado.costo_total_unitario).toFixed(2)}</Typography>
                                </Box>
                              </Paper>
                            </Grid>
                          </Grid>
                        </Card>

                        {/* Desglose Porcentual Visual */}
                        <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)', mb: 4 }}>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                              Estructura de Participación de Costos
                            </Typography>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                              Representa cómo se distribuye cada dólar invertido en el procesamiento de esta prueba.
                            </Typography>
                            
                            <Box display="flex" flexDirection="column" gap={2}>
                              <Box>
                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                  <Typography variant="body2" fontWeight="bold">1. Reactivo Principal</Typography>
                                  <Typography variant="body2" color="textSecondary">
                                    ${calculoResultado.desglose.reactivo.costo_unitario.toFixed(2)} ({(calculoResultado.desglose.reactivo.costo_unitario / calculoResultado.costo_total_unitario * 100).toFixed(1)}%)
                                  </Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={calculoResultado.desglose.reactivo.costo_unitario / calculoResultado.costo_total_unitario * 100} color="primary" sx={{ height: 6, borderRadius: 3 }} />
                              </Box>

                              <Box>
                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                  <Typography variant="body2" fontWeight="bold">2. Pre-analítica (Toma de Muestra)</Typography>
                                  <Typography variant="body2" color="textSecondary">
                                    ${calculoResultado.desglose.toma_muestra.total.toFixed(2)} ({(calculoResultado.desglose.toma_muestra.total / calculoResultado.costo_total_unitario * 100).toFixed(1)}%)
                                  </Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={calculoResultado.desglose.toma_muestra.total / calculoResultado.costo_total_unitario * 100} color="secondary" sx={{ height: 6, borderRadius: 3 }} />
                              </Box>

                              <Box>
                                <Box display="flex" justifyContent="space-between" mb={0.5}>
                                  <Typography variant="body2" fontWeight="bold">3. Consumibles Analíticos (Procesamiento)</Typography>
                                  <Typography variant="body2" color="textSecondary">
                                    ${calculoResultado.desglose.procesamiento_insumos.total.toFixed(2)} ({(calculoResultado.desglose.procesamiento_insumos.total / calculoResultado.costo_total_unitario * 100).toFixed(1)}%)
                                  </Typography>
                                </Box>
                                <LinearProgress variant="determinate" value={calculoResultado.desglose.procesamiento_insumos.total / calculoResultado.costo_total_unitario * 100} color="warning" sx={{ height: 6, borderRadius: 3 }} />
                              </Box>

                              {calculoResultado.desglose.equipo && (
                                <Box>
                                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                                    <Typography variant="body2" fontWeight="bold">4. Equipo Prorrateado (Soluciones/Controles/Calibración)</Typography>
                                    <Typography variant="body2" color="textSecondary">
                                      ${calculoResultado.desglose.equipo.costo_unitario.toFixed(2)} ({(calculoResultado.desglose.equipo.costo_unitario / calculoResultado.costo_total_unitario * 100).toFixed(1)}%)
                                    </Typography>
                                  </Box>
                                  <LinearProgress variant="determinate" value={calculoResultado.desglose.equipo.costo_unitario / calculoResultado.costo_total_unitario * 100} color="info" sx={{ height: 6, borderRadius: 3 }} />
                                </Box>
                              )}

                              {calculoResultado.desglose.gastos_globales && (
                                <>
                                  <Box>
                                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                                      <Typography variant="body2" fontWeight="bold">5. Gasto Administrativo General Prorrateado</Typography>
                                      <Typography variant="body2" color="textSecondary">
                                        ${calculoResultado.desglose.gastos_globales.costo_admin_unitario.toFixed(2)} ({(calculoResultado.desglose.gastos_globales.costo_admin_unitario / calculoResultado.costo_total_unitario * 100).toFixed(1)}%)
                                      </Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={calculoResultado.desglose.gastos_globales.costo_admin_unitario / calculoResultado.costo_total_unitario * 100} color="success" sx={{ height: 6, borderRadius: 3 }} />
                                  </Box>

                                  <Box>
                                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                                      <Typography variant="body2" fontWeight="bold">6. Nómina e Indirecto de Personal</Typography>
                                      <Typography variant="body2" color="textSecondary">
                                        ${calculoResultado.desglose.gastos_globales.costo_personal_unitario.toFixed(2)} ({(calculoResultado.desglose.gastos_globales.costo_personal_unitario / calculoResultado.costo_total_unitario * 100).toFixed(1)}%)
                                      </Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={calculoResultado.desglose.gastos_globales.costo_personal_unitario / calculoResultado.costo_total_unitario * 100} color="error" sx={{ height: 6, borderRadius: 3 }} />
                                  </Box>
                                </>
                              )}
                            </Box>
                          </CardContent>
                        </Card>

                        {/* Desglose Detallado de Fórmulas */}
                        <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)' }}>
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                              Auditoría Detallada de Insumos y Prorrateos
                            </Typography>
                            <Box sx={{ mt: 2 }}>
                              <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                                Reactivo Principal
                              </Typography>
                              <Typography variant="body2" sx={{ ml: 2, mb: 2 }}>
                                • {calculoResultado.desglose.reactivo.nombre} ({calculoResultado.desglose.reactivo.codigo})
                                <br />
                                Costo del kit: <strong>${calculoResultado.desglose.reactivo.precio_costo.toFixed(2)}</strong> para <strong>{calculoResultado.desglose.reactivo.pruebas_por_kit}</strong> pruebas. Factor de desperdicio: {calculoResultado.desglose.reactivo.desperdicio_pct}%.
                                <br />
                                Costo Unitario = (Costo Kit / Pruebas) * (1 + Desperdicio/100) = <strong>${calculoResultado.desglose.reactivo.costo_unitario.toFixed(4)}</strong>
                              </Typography>

                              {calculoResultado.desglose.toma_muestra.consumibles.length > 0 && (
                                <>
                                  <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                                    Fase Pre-analítica (Consumibles de Extracción)
                                  </Typography>
                                  <Box sx={{ ml: 2, mb: 2 }}>
                                    {calculoResultado.desglose.toma_muestra.consumibles.map((c, i) => (
                                      <Typography variant="body2" key={i} sx={{ mb: 0.5 }}>
                                        • {c.nombre} (cant: {c.cantidad} x ${c.precio_costo.toFixed(2)}) = <strong>${c.subtotal.toFixed(4)}</strong>
                                      </Typography>
                                    ))}
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                                      Total Toma de Muestra = ${calculoResultado.desglose.toma_muestra.total.toFixed(4)}
                                    </Typography>
                                  </Box>
                                </>
                              )}

                              {calculoResultado.desglose.procesamiento_insumos.consumibles.length > 0 && (
                                <>
                                  <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                                    Fase Analítica (Consumibles de Procesamiento)
                                  </Typography>
                                  <Box sx={{ ml: 2, mb: 2 }}>
                                    {calculoResultado.desglose.procesamiento_insumos.consumibles.map((c, i) => (
                                      <Typography variant="body2" key={i} sx={{ mb: 0.5 }}>
                                        • {c.nombre} (cant: {c.cantidad} x ${c.precio_costo.toFixed(2)}) = <strong>${c.subtotal.toFixed(4)}</strong>
                                      </Typography>
                                    ))}
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
                                      Total Consumibles Procesamiento = ${calculoResultado.desglose.procesamiento_insumos.total.toFixed(4)}
                                    </Typography>
                                  </Box>
                                </>
                              )}

                              {calculoResultado.desglose.equipo && (
                                <>
                                  <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                                    Fase Analítica (Prorrateo de Equipo)
                                  </Typography>
                                  <Typography variant="body2" sx={{ ml: 2, mb: 2 }}>
                                    • {calculoResultado.desglose.equipo.nombre_equipo}
                                    <br />
                                    Acumulado mensual del equipo (Soluciones: ${calculoResultado.desglose.equipo.gasto_soluciones.toFixed(2)} + Calibradores: ${calculoResultado.desglose.equipo.gasto_calibradores.toFixed(2)} + Controles: ${calculoResultado.desglose.equipo.gasto_controles.toFixed(2)}) / {calculoResultado.desglose.equipo.volumen_area_usado ? `${calculoResultado.desglose.equipo.volumen_area_usado} pruebas (Volumen del Área: ${calculoResultado.desglose.equipo.area_operativa})` : `${calculoResultado.desglose.equipo.total_pruebas_equipo} pruebas (Volumen de Equipo)`} al mes.
                                    <br />
                                    Costo Unitario Prorrateado = <strong>${calculoResultado.desglose.equipo.costo_unitario.toFixed(4)}</strong>
                                  </Typography>
                                </>
                              )}

                              {calculoResultado.desglose.gastos_globales && (
                                <>
                                  <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                                    Estructura de Gastos Fijos Generales Prorrateados
                                  </Typography>
                                  <Typography variant="body2" sx={{ ml: 2, mb: 2 }}>
                                    • Administrativo del mes: ${calculoResultado.desglose.gastos_globales.gastos_administrativos.toFixed(2)} / {calculoResultado.desglose.gastos_globales.total_pruebas_mes} pruebas = <strong>${calculoResultado.desglose.gastos_globales.costo_admin_unitario.toFixed(4)}</strong>
                                    <br />
                                    • Nómina del mes: ${calculoResultado.desglose.gastos_globales.gastos_personal.toFixed(2)} / {calculoResultado.desglose.gastos_globales.total_pruebas_mes} pruebas = <strong>${calculoResultado.desglose.gastos_globales.costo_personal_unitario.toFixed(4)}</strong>
                                  </Typography>
                                </>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    ) : (
                      <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3 }}>
                        <WarningIcon sx={{ fontSize: '3rem', color: 'warning.main', mb: 2 }} />
                        <Typography color="textSecondary" variant="h6">
                          La prueba seleccionada no tiene costos configurados aún.
                        </Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                          Use el panel de configuración de la izquierda para registrar el precio de venta, reactivo y consumibles para calcular los márgenes.
                        </Typography>
                      </Paper>
                    )
                  ) : (
                    <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 3, border: '1px dashed #ccc' }}>
                      <HelpIcon sx={{ fontSize: '3rem', color: 'text.secondary', mb: 2 }} />
                      <Typography color="textSecondary" variant="h6">
                        Simulación en Espera
                      </Typography>
                      <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        Seleccione una prueba a la izquierda y configure sus variables para ver la simulación de ganancia.
                      </Typography>
                    </Paper>
                  )}
                </Grid>
              </Grid>
            )}

            {/* CONTENIDO SUB-PESTAÑA 2: Desglose Gastos Administrativos */}
            {subTabCostos === 2 && (
              <Box>
                {/* Formulario de Desglose de Gastos Administrativos */}
                <Card sx={{ borderRadius: 3, boxShadow: '0px 4px 12px rgba(0,0,0,0.05)', mb: 4 }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h5" fontWeight="bold" gutterBottom color="primary" display="flex" alignItems="center">
                      <BusinessIcon sx={{ mr: 1 }} />
                      Desglose de Gastos Administrativos
                    </Typography>
                    <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
                      Introduzca los costos de cada rubro para el mes seleccionado. La suma de estos campos se calculará de forma automática en tiempo real para alimentar el campo principal de <strong>Gastos Administrativos del Mes ($)</strong>.
                    </Typography>

                    {/* Selector de Mes/Año de referencia dentro del desglose */}
                    <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 2, display: 'flex', gap: 2, alignItems: 'center', backgroundColor: '#fcfcfc' }}>
                      <Typography variant="body2" fontWeight="bold">
                        Periodo de Costos:
                      </Typography>
                      <FormControl size="small" sx={{ width: '150px' }}>
                        <InputLabel>Mes</InputLabel>
                        <Select
                          value={globalMes}
                          label="Mes"
                          onChange={(e) => setGlobalMes(e.target.value)}
                        >
                          {[...Array(12).keys()].map(m => (
                            <MenuItem key={m + 1} value={m + 1}>
                              {new Date(2000, m, 1).toLocaleString('es-ES', { month: 'long' })}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        size="small"
                        label="Año"
                        type="number"
                        sx={{ width: '120px' }}
                        value={globalAnio}
                        onChange={(e) => setGlobalAnio(e.target.value)}
                      />
                      <Box sx={{ flexGrow: 1 }} />
                      <Paper sx={{ px: 2, py: 1, borderRadius: 2, backgroundColor: '#e3f2fd', border: '1px solid #90caf9' }}>
                        <Typography variant="caption" color="textSecondary" display="block">
                          Total Calculado (Admin)
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" color="primary.main">
                          ${globalAdmin ? Number(globalAdmin).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '0.00'}
                        </Typography>
                      </Paper>
                    </Paper>

                    <form onSubmit={handleSaveGastosGlobales}>
                      <Grid container spacing={4}>
                        {/* Grupo 1: Servicios Básicos & Local */}
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                            <CardContent>
                              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                                Servicios Básicos & Local
                              </Typography>
                              <Divider sx={{ mb: 2 }} />
                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Alquiler ($)"
                                    type="number"
                                    value={desgloseAdmin.alquiler}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, alquiler: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Condominio ($)"
                                    type="number"
                                    value={desgloseAdmin.condominio}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, condominio: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Electricidad ($)"
                                    type="number"
                                    value={desgloseAdmin.electricidad}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, electricidad: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Agua ($)"
                                    type="number"
                                    value={desgloseAdmin.agua}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, agua: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Aseo ($)"
                                    type="number"
                                    value={desgloseAdmin.aseo}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, aseo: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Telefonía ($)"
                                    type="number"
                                    value={desgloseAdmin.telefonia}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, telefonia: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Internet ($)"
                                    type="number"
                                    value={desgloseAdmin.internet}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, internet: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        </Grid>

                        {/* Grupo 2: Honorarios & Asesorías */}
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                            <CardContent>
                              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                                Honorarios, Legales & Gremiales
                              </Typography>
                              <Divider sx={{ mb: 2 }} />
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Asesorías ($)"
                                    type="number"
                                    value={desgloseAdmin.asesorias}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, asesorias: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Honorarios ($)"
                                    type="number"
                                    value={desgloseAdmin.honorarios}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, honorarios: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Legales ($)"
                                    type="number"
                                    value={desgloseAdmin.legales}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, legales: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Colegio de Bioanalistas ($)"
                                    type="number"
                                    value={desgloseAdmin.colegioBioanalistas}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, colegioBioanalistas: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        </Grid>

                        {/* Grupo 3: Tecnología & Infraestructura */}
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                            <CardContent>
                              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                                Tecnología, Mobiliario & Infraestructura
                              </Typography>
                              <Divider sx={{ mb: 2 }} />
                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Software ($)"
                                    type="number"
                                    value={desgloseAdmin.software}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, software: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Tecnología ($)"
                                    type="number"
                                    value={desgloseAdmin.tecnologia}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, tecnologia: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Infraestructura ($)"
                                    type="number"
                                    value={desgloseAdmin.infraestructura}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, infraestructura: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Remodelaciones ($)"
                                    type="number"
                                    value={desgloseAdmin.remodelaciones}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, remodelaciones: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Mobiliario ($)"
                                    type="number"
                                    value={desgloseAdmin.mobiliario}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, mobiliario: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        </Grid>

                        {/* Grupo 4: Impuestos, Papelería & Suscripciones */}
                        <Grid item xs={12} md={6}>
                          <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                            <CardContent>
                              <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                                Impuestos, Papelería & Suscripciones
                              </Typography>
                              <Divider sx={{ mb: 2 }} />
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Impuestos Nacionales ($)"
                                    type="number"
                                    value={desgloseAdmin.impuestosNacionales}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, impuestosNacionales: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Impuestos Municipales ($)"
                                    type="number"
                                    value={desgloseAdmin.impuestosMunicipales}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, impuestosMunicipales: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Papelería ($)"
                                    type="number"
                                    value={desgloseAdmin.papeleria}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, papeleria: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Suscripciones ($)"
                                    type="number"
                                    value={desgloseAdmin.suscripciones}
                                    onChange={(e) => setDesgloseAdmin({ ...desgloseAdmin, suscripciones: e.target.value })}
                                    inputProps={{ step: '0.01' }}
                                  />
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>

                      {/* Nota aclaratoria sobre Personal y Volumen */}
                      <Paper sx={{ mt: 3, p: 2, backgroundColor: '#fffde7', border: '1px solid #fff59d', borderRadius: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          ⚠️ <strong>Nota:</strong> Para guardar estos gastos administrativos, es necesario que también configure los <strong>Gastos de Personal/Nómina ($)</strong> y el <strong>Total de Pruebas Procesadas en el Mes</strong> para calcular correctamente el costo indirecto prorrateado por prueba. Puede rellenar estos dos campos directamente a continuación:
                        </Typography>
                        <Grid container spacing={2} sx={{ mt: 1.5 }}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Gastos de Personal/Nómina ($) *"
                              type="number"
                              value={globalPersonal}
                              onChange={(e) => setGlobalPersonal(e.target.value)}
                              required
                              inputProps={{ step: '0.01' }}
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              size="small"
                              label="Total de Pruebas Procesadas en el Mes *"
                              type="number"
                              value={globalTotalPruebas}
                              onChange={(e) => setGlobalTotalPruebas(e.target.value)}
                              required
                            />
                          </Grid>
                        </Grid>
                        {areasDisponibles.length > 0 && (
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px dashed #ccc' }}>
                            <Typography variant="body2" color="text.secondary" fontWeight="bold" gutterBottom>
                              Volumen de Pruebas por Área Operativa:
                            </Typography>
                            <Grid container spacing={2}>
                              {areasDisponibles.map(area => (
                                <Grid item xs={12} sm={4} key={area}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label={`Volumen en ${area}`}
                                    type="number"
                                    value={volumenesArea[area] || ''}
                                    onChange={(e) => setVolumenesArea({
                                      ...volumenesArea,
                                      [area]: e.target.value
                                    })}
                                    helperText={
                                      pruebasPorArea[area] && pruebasPorArea[area].length > 0
                                        ? `Pruebas: ${pruebasPorArea[area].join(', ')}`
                                        : 'Sin pruebas genéricas vinculadas'
                                    }
                                    FormHelperTextProps={{
                                      sx: { fontSize: '0.7rem', fontStyle: 'italic', color: 'text.secondary' }
                                    }}
                                  />
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        )}
                      </Paper>

                      <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={guardando}
                        startIcon={guardando ? <CircularProgress size={20} /> : <SaveIcon />}
                        sx={{ mt: 4, py: 1.5, textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
                      >
                        {guardando ? 'Guardando Desglose...' : 'Guardar y Registrar Gastos Administrativos'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </Fade>
      )}

      {/* DIÁLOGO CONFIRMACIÓN DESVINCULAR */}
      <Dialog
        open={Boolean(confirmarDesvincular)}
        onClose={() => setConfirmarDesvincular(null)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          ¿Desvincular reactivo comercial?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            ¿Está seguro que desea eliminar la asociación del reactivo <strong>{confirmarDesvincular?.itemNombre}</strong> de la prueba genérica <strong>{confirmarDesvincular?.pruebaNombre}</strong>?
            <br />
            Esto no eliminará el producto del inventario ni sus facturas asociadas, pero ya no se contabilizará en los análisis de costos de esta prueba genérica.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setConfirmarDesvincular(null)} disabled={guardando}>Cancelar</Button>
          <Button
            onClick={handleEliminarVinculo}
            color="error"
            variant="contained"
            disabled={guardando}
            autoFocus
          >
            {guardando ? <CircularProgress size={20} /> : 'Desvincular'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Costos;
