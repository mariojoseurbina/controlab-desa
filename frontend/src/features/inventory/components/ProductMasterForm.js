import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
  Box, Paper, Typography, Button, TextField, Grid, MenuItem, Divider,
  Stepper, Step, StepLabel, Card, CardContent, IconButton, InputAdornment
} from '@mui/material';
import {
  Biotech as BiotechIcon,
  ArrowForward as NextIcon,
  ArrowBack as BackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  QrCodeScanner as BarcodeIcon,
  Science as ScienceIcon,
  Speed as SpeedIcon,
  Warning as AlertIcon,
  CheckCircle as CheckIcon,
  Assignment as DocumentIcon
} from '@mui/icons-material';

const getInitialFormData = (data) => {
  const gv = (primary, fallback = '') => {
    if (primary !== undefined && primary !== null && String(primary).trim() !== '') return String(primary);
    if (fallback !== undefined && fallback !== null && String(fallback).trim() !== '') return String(fallback);
    return '';
  };

  if (!data) {
    return {
      id: null,
      codigo: '',
      codigo_barra: '',
      referencia: '',
      referencia_abreviada: '',
      presentacion: '',
      nombre: '',
      descripcion: '',
      marca: 'Wiener Lab',
      categoria: 'Reactivo',
      unidad_negocio: 'LABORATORIO CLINICO',
      equipo_asociado: 'WIENER CM 260I',
      grupo: '',
      calibradores_asociados: '',
      control_asociado: '',
      ubicacion: 'Almacen Central',
      nivel: '',
      unidad: 'Frasco',
      frascos_por_caja: '1',
      volumen_por_frasco: '',
      volumen_muerto_residual: '',
      pruebas_teoricas_frasco: '',
      pruebas_teoricas_caja: '',
      volumen_total_caja: '',
      consumo_indicado: '',
      fecha_vencimiento: '',
      stock_minimo: '0',
      stock_critico: '0',
      stock_maximo: '0',
      precio_costo: '0'
    };
  }

  const volFrasco = gv(data.volumen_por_frasco, data.volumen_por_frasco_ml);
  const volMuerto = gv(data.volumen_muerto_residual, data.volumen_muerto_frasco_ml);
  const consumoInd = gv(data.consumo_indicado);
  const frascosCaja = gv(data.frascos_por_caja, '1');

  const numVol = parseFloat(volFrasco.replace(',', '.'));
  const numConsumo = parseFloat(consumoInd.replace(',', '.'));
  const numFrascos = parseFloat(frascosCaja.replace(',', '.')) || 1;

  let pruebasFrasco = gv(data.pruebas_teoricas_frasco);
  let pruebasCaja = gv(data.pruebas_teoricas_caja);
  let volCaja = gv(data.volumen_total_caja);

  if ((!pruebasFrasco || pruebasFrasco === '0') && numVol > 0 && numConsumo > 0) {
    pruebasFrasco = String(Math.floor(numVol / numConsumo));
  }
  if ((!pruebasCaja || pruebasCaja === '0') && numVol > 0 && numConsumo > 0) {
    pruebasCaja = String(Math.floor((numVol / numConsumo) * numFrascos));
  }
  if ((!volCaja || volCaja === '0') && numVol > 0) {
    volCaja = String((numVol * numFrascos).toFixed(2));
  }

  return {
    id: data?.id || data?.item_id,
    codigo: gv(data.codigo),
    codigo_barra: gv(data.codigo_barra),
    referencia: gv(data.referencia),
    referencia_abreviada: gv(data.referencia_abreviada),
    presentacion: gv(data.presentacion, data.descripcion),
    nombre: gv(data.nombre),
    descripcion: gv(data.descripcion),
    marca: gv(data.marca, 'Wiener Lab'),
    categoria: gv(data.categoria, 'Reactivo'),
    unidad_negocio: gv(data.unidad_negocio, 'LABORATORIO CLINICO'),
    equipo_asociado: gv(data.equipo_asociado, 'WIENER CM 260I'),
    grupo: gv(data.grupo),
    calibradores_asociados: gv(data.calibradores_asociados),
    control_asociado: gv(data.control_asociado),
    ubicacion: gv(data.ubicacion, 'Almacen Central'),
    nivel: gv(data.nivel),
    unidad: gv(data.unidad, 'Frasco'),
    frascos_por_caja: frascosCaja,
    volumen_por_frasco: volFrasco,
    volumen_muerto_residual: volMuerto,
    pruebas_teoricas_frasco: pruebasFrasco,
    pruebas_teoricas_caja: pruebasCaja,
    volumen_total_caja: volCaja,
    consumo_indicado: consumoInd,
    fecha_vencimiento: data.fecha_vencimiento ? String(data.fecha_vencimiento).split('T')[0] : '',
    stock_minimo: gv(data.stock_minimo, '0'),
    stock_critico: gv(data.stock_critico, '0'),
    stock_maximo: gv(data.stock_maximo, '0'),
    precio_costo: gv(data.precio_costo, '0')
  };
};

const ProductMasterForm = ({ initialData, onSubmit, onCancel, isSubmitting }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState(() => getInitialFormData(initialData));
  const [existingItems, setExistingItems] = useState([]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const res = await api.get('/inventory');
        if (res.data && res.data.items) {
          setExistingItems(res.data.items);
        }
      } catch (err) {
        console.warn('No se pudo precargar el catálogo para verificación de SKU:', err.message);
      }
    };
    fetchCatalog();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData(getInitialFormData(initialData));
    }
  }, [initialData]);

  // Verificación en tiempo real del SKU para corroborar si el producto ya existe en catálogo
  const skuTrimmed = (formData.codigo || '').trim().toLowerCase();
  const matchedItem = existingItems.find(item => {
    const itemSku = (item.codigo || '').trim().toLowerCase();
    const itemId = item.id || item.item_id;
    const currentId = formData.id;
    return itemSku === skuTrimmed && skuTrimmed !== '' && (!currentId || String(itemId) !== String(currentId));
  });

  const skuExiste = Boolean(matchedItem);

  const getSkuHelperText = () => {
    if (skuExiste) {
      return `⚠️ Este Código SKU ya existe en el sistema (${matchedItem.nombre || 'Producto Registrado'})`;
    }
    if (skuTrimmed !== '') {
      return `✓ Código SKU único disponible`;
    }
    return `Identificador único del producto`;
  };

  const marcasPredefinidas = ['Mindray', 'Wiener Lab', 'Wiener Lab / Mindray', 'Cromatest', 'Roche', 'Sysmex', 'Otro / Genérico'];
  const marcaOptions = Array.from(new Set([...marcasPredefinidas, ...(formData.marca ? [formData.marca] : [])]));

  const unidadesNegocioPredefinidas = [
    'LABORATORIO ANATOMIA',
    'LABORATORIO CLINICO',
    'MOLECULAR',
    'TOMA DE MUESTRA',
    'EXTERNO'
  ];
  const unidadNegocioOptions = Array.from(new Set([...unidadesNegocioPredefinidas, ...(formData.unidad_negocio ? [formData.unidad_negocio] : [])]));

  const equiposPredefinidos = [
    'WIENER CM 260I',
    'MINDRAY BS - 230',
    'Mindray CL-900i',
    'MINDRAY CLIA 900I',
    'MINDRAY BC 5300',
    'MINDRAY BC 5380'
  ];
  const equipoOptions = Array.from(new Set([...equiposPredefinidos, ...(formData.equipo_asociado ? [formData.equipo_asociado] : [])]));

  // Recálculo automático de rendimiento (Inserto -> Pruebas/Frasco y Pruebas/Caja)
  useEffect(() => {
    const parseLocalFloat = (val) => {
      if (!val) return 0;
      const num = parseFloat(String(val).replace(',', '.'));
      return isNaN(num) ? 0 : num;
    };

    const volFrasco = parseLocalFloat(formData.volumen_por_frasco);
    const consumoPrueba = parseLocalFloat(formData.consumo_indicado);
    const frascosCaja = parseLocalFloat(formData.frascos_por_caja) || 1;

    let calcPruebasFrasco = formData.pruebas_teoricas_frasco;
    let calcPruebasCaja = formData.pruebas_teoricas_caja;
    let calcVolCaja = formData.volumen_total_caja;

    if (volFrasco > 0 && consumoPrueba > 0) {
      calcPruebasFrasco = String(Math.floor(volFrasco / consumoPrueba));
      calcPruebasCaja = String(Math.floor((volFrasco / consumoPrueba) * frascosCaja));
    }

    if (volFrasco > 0) {
      calcVolCaja = String((volFrasco * frascosCaja).toFixed(2));
    }

    if (volFrasco > 0 && consumoPrueba > 0) {
      setFormData(prev => {
        if (
          prev.pruebas_teoricas_frasco === calcPruebasFrasco &&
          prev.pruebas_teoricas_caja === calcPruebasCaja &&
          prev.volumen_total_caja === calcVolCaja
        ) {
          return prev;
        }
        return {
          ...prev,
          pruebas_teoricas_frasco: calcPruebasFrasco,
          pruebas_teoricas_caja: calcPruebasCaja,
          volumen_total_caja: calcVolCaja
        };
      });
    }
  }, [formData.volumen_por_frasco, formData.consumo_indicado, formData.frascos_por_caja]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNextStep = (e) => {
    if (e) e.preventDefault();
    if (activeStep === 0) {
      if (!formData.codigo.trim() || !formData.nombre.trim()) {
        alert("⚠️ Por favor completa los campos obligatorios del Paso 1: Código Interno y Nombre del Producto.");
        return;
      }
    }
    setActiveStep(prev => prev + 1);
  };

  const handleBackStep = (e) => {
    if (e) e.preventDefault();
    setActiveStep(prev => prev - 1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.codigo.trim() || !formData.nombre.trim()) {
      alert("⚠️ Por favor completa los campos obligatorios: Código Interno y Nombre del Producto.");
      return;
    }
    onSubmit(formData);
  };

  const steps = [
    'Paso 1: Identificación y Clasificación Técnica',
    'Paso 2: Rendimiento, Empaque y Parámetros de Stock'
  ];

  return (
    <Paper elevation={6} sx={{ borderRadius: 4, overflow: 'hidden', maxWidth: 1000, mx: 'auto', mb: 6 }}>
      
      {/* Banner Superior con Gradiente de Alta Gama */}
      <Box sx={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', color: 'white', p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(59, 130, 246, 0.25)', borderRadius: 3, border: '1px solid rgba(147, 197, 253, 0.3)' }}>
              <BiotechIcon sx={{ fontSize: 36, color: '#93c5fd' }} />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: '#93c5fd', fontWeight: 800 }}>
                CONTROLAB IA • MÓDULO MAESTRO
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'white' }}>
                {initialData ? 'Edición de Ficha Maestra de Producto' : 'Registro de Nueva Ficha de Producto'}
              </Typography>
            </Box>
          </Box>

          <Button
            variant="outlined"
            onClick={onCancel}
            sx={{ color: '#cbd5e1', borderColor: '#475569', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
            startIcon={<CancelIcon />}
          >
            Cancelar
          </Button>
        </Box>

        {/* Stepper de 2 Pasos */}
        <Box sx={{ mt: 3, bgcolor: 'rgba(255,255,255,0.08)', p: 2, borderRadius: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label} sx={{ '& .MuiStepLabel-label': { color: '#cbd5e1', fontStyle: 'normal', fontWeight: 600, '&.Mui-active': { color: 'white', fontWeight: 800 } } }}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      </Box>

      {/* Cuerpo del Formulario */}
      <Box component="form" onSubmit={handleSubmit} sx={{ p: 4 }}>
        
        {/* PASO 1: Identificación y Clasificación Técnica */}
        {activeStep === 0 && (
          <Box space={3}>
            
            {/* Bloque 1.1: Identificación Básica */}
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, borderColor: '#e2e8f0' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2} pb={1} borderBottom="2px solid #3b82f6">
                  <BarcodeIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight={700} color="#1e293b">
                    1. Datos Principales de Identificación
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Código Interno (SKU) *"
                      name="codigo"
                      value={formData.codigo}
                      onChange={handleChange}
                      required
                      fullWidth
                      size="small"
                      placeholder="Ej: REAC-HEMO-01"
                      error={skuExiste}
                      helperText={getSkuHelperText()}
                      FormHelperTextProps={{
                        sx: {
                          color: skuExiste ? '#d97706' : (skuTrimmed !== '' ? '#10b981' : 'text.secondary'),
                          fontWeight: skuExiste || skuTrimmed !== '' ? 700 : 400
                        }
                      }}
                      InputProps={{
                        endAdornment: skuExiste ? (
                          <InputAdornment position="end">
                            <AlertIcon sx={{ color: '#f59e0b', fontSize: 18 }} />
                          </InputAdornment>
                        ) : (skuTrimmed !== '' ? (
                          <InputAdornment position="end">
                            <CheckIcon sx={{ color: '#10b981', fontSize: 18 }} />
                          </InputAdornment>
                        ) : null)
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Código de Barras"
                      name="codigo_barra"
                      value={formData.codigo_barra}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 7501234567890"
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="REF / Part Number"
                      name="referencia"
                      value={formData.referencia}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: REF-99081"
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Referencia Abreviada"
                      name="referencia_abreviada"
                      value={formData.referencia_abreviada}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: HbA1c"
                    />
                  </Grid>

                  <Grid item xs={12} sm={8}>
                    <TextField
                      label="Nombre Completo del Producto *"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                      fullWidth
                      size="small"
                      placeholder="Ej: Reactivo Hemoglobina Glicada A1c"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      label="Descripción Comercial / Técnica"
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleChange}
                      fullWidth
                      multiline
                      rows={2}
                      size="small"
                      placeholder="Ej: Kit completo para determinación cuantitativa de HbA1c en sangre"
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      label="Marca / Fabricante"
                      name="marca"
                      value={formData.marca}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                    >
                      {marcaOptions.map((m) => (
                        <MenuItem key={m} value={m}>
                          {m}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      label="Categoría"
                      name="categoria"
                      value={formData.categoria}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="Reactivo">Reactivo</MenuItem>
                      <MenuItem value="Consumible">Consumible</MenuItem>
                      <MenuItem value="Calibrador">Calibrador</MenuItem>
                      <MenuItem value="Control">Control de Calidad</MenuItem>
                      <MenuItem value="Solucion">Solución / Diluyente</MenuItem>
                      <MenuItem value="Insumo General">Insumo General</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      label="Unidad de Negocio"
                      name="unidad_negocio"
                      value={formData.unidad_negocio}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                    >
                      {unidadNegocioOptions.map((u) => (
                        <MenuItem key={u} value={u}>
                          {u}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Bloque 1.2: Clasificación Técnica de Laboratorio */}
            <Card variant="outlined" sx={{ borderRadius: 3, borderColor: '#e2e8f0' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2} pb={1} borderBottom="2px solid #6366f1">
                  <ScienceIcon sx={{ color: '#6366f1' }} />
                  <Typography variant="subtitle1" fontWeight={700} color="#1e293b">
                    2. Clasificación Técnica de Laboratorio
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      label="Equipo Autoanalizador"
                      name="equipo_asociado"
                      value={formData.equipo_asociado}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                    >
                      {equipoOptions.map((eq) => (
                        <MenuItem key={eq} value={eq}>
                          {eq}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Grupo / Panel"
                      name="grupo"
                      value={formData.grupo}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: Perfil Hepático"
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Calibrador Asignado"
                      name="calibradores_asociados"
                      value={formData.calibradores_asociados}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: Calibrador Nivel 1"
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Control (Grupo)"
                      name="control_asociado"
                      value={formData.control_asociado}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: Control Normal"
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      select
                      label="Ubicación Física"
                      name="ubicacion"
                      value={formData.ubicacion || 'Almacen Central'}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value="Almacen Central">Almacen Central</MenuItem>
                      <MenuItem value="Almacen Laboratorio">Almacen Laboratorio</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      label="Nivel / Complejidad"
                      name="nivel"
                      value={formData.nivel}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: Nivel 2 - Especializado"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* PASO 2: Rendimiento, Empaque y Parámetros de Stock */}
        {activeStep === 1 && (
          <Box space={3}>
            
            {/* Bloque 2.1: Rendimiento por Dosis */}
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, borderColor: '#e2e8f0' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2} pb={1} borderBottom="2px solid #10b981">
                  <SpeedIcon sx={{ color: '#10b981' }} />
                  <Typography variant="subtitle1" fontWeight={700} color="#1e293b">
                    3. Rendimiento por Dosis e Inserto Técnico
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Volumen por Frasco (mL)"
                      name="volumen_por_frasco"
                      value={formData.volumen_por_frasco}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 50"
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Consumo por Prueba (mL) *"
                      name="consumo_indicado"
                      value={formData.consumo_indicado}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 0.25"
                      helperText="Consumo técnico según inserto"
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Pruebas Teóricas / Frasco"
                      name="pruebas_teoricas_frasco"
                      value={formData.pruebas_teoricas_frasco}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 200"
                      helperText="Autocalculado: Vol / Consumo"
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Volumen Muerto Residual (mL)"
                      name="volumen_muerto_residual"
                      value={formData.volumen_muerto_residual}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 2.0"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Bloque 2.2: Empaque y Presentación Comercial */}
            <Card variant="outlined" sx={{ borderRadius: 3, mb: 3, borderColor: '#e2e8f0' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2} pb={1} borderBottom="2px solid #f59e0b">
                  <DocumentIcon sx={{ color: '#f59e0b' }} />
                  <Typography variant="subtitle1" fontWeight={700} color="#1e293b">
                    4. Empaque y Presentación Comercial
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Unidad por Caja"
                      name="frascos_por_caja"
                      value={formData.frascos_por_caja}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 4"
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Pruebas Teóricas / Caja"
                      name="pruebas_teoricas_caja"
                      value={formData.pruebas_teoricas_caja}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 800"
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Volumen Total / Caja (mL)"
                      name="volumen_total_caja"
                      value={formData.volumen_total_caja}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 200"
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Presentación Comercial"
                      name="presentacion"
                      value={formData.presentacion}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 4 x 50 mL"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Bloque 2.3: Parámetros de Stock y Finanzas */}
            <Card variant="outlined" sx={{ borderRadius: 3, borderColor: '#e2e8f0' }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={2} pb={1} borderBottom="2px solid #8b5cf6">
                  <AlertIcon sx={{ color: '#8b5cf6' }} />
                  <Typography variant="subtitle1" fontWeight={700} color="#1e293b">
                    5. Parámetros de Stock y Valoración
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Stock Mínimo (Cajas/Unidades)"
                      name="stock_minimo"
                      value={formData.stock_minimo}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 2"
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Stock Crítico (Alerta)"
                      name="stock_critico"
                      value={formData.stock_critico}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 1"
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Stock Máximo (Sobrecompra)"
                      name="stock_maximo"
                      value={formData.stock_maximo}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 10"
                    />
                  </Grid>

                  <Grid item xs={12} sm={3}>
                    <TextField
                      label="Precio Costo ($ / €)"
                      name="precio_costo"
                      value={formData.precio_costo}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      placeholder="Ej: 120.50"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

          </Box>
        )}

        {/* Botones de Navegación del Formulario */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={4} pt={2} borderTop="1px solid #e2e8f0">
          {activeStep > 0 ? (
            <Button
              variant="outlined"
              onClick={handleBackStep}
              startIcon={<BackIcon />}
              sx={{ color: '#475569', borderColor: '#cbd5e1' }}
            >
              Volver al Paso 1
            </Button>
          ) : <div />}

          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNextStep}
              endIcon={<NextIcon />}
              sx={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', px: 4, py: 1, fontWeight: 700 }}
            >
              Siguiente: Rendimiento y Stock
            </Button>
          ) : (
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting || skuExiste}
              startIcon={<SaveIcon />}
              sx={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', px: 4, py: 1, fontWeight: 700 }}
            >
              {isSubmitting ? 'Guardando...' : (initialData ? 'Actualizar Ficha Maestra' : 'Guardar Ficha de Producto')}
            </Button>
          )}
        </Box>

      </Box>

    </Paper>
  );
};

export default ProductMasterForm;
