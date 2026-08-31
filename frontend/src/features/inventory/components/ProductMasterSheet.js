import React from 'react';
import {
  Box, Paper, Typography, Button, Grid, Divider, Chip, Card, CardContent
} from '@mui/material';
import {
  Print as PrintIcon,
  Edit as EditIcon,
  ArrowBack as ArrowLeftIcon,
  CheckCircle as CheckIcon,
  QrCode2 as QrCodeIcon,
  Science as ScienceIcon,
  Biotech as BiotechIcon,
  Speed as SpeedIcon,
  Warning as AlertIcon,
  AttachMoney as MoneyIcon,
  Assignment as DocumentIcon
} from '@mui/icons-material';

const ProductMasterSheet = ({ product, onEdit, onClose }) => {
  if (!product) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', pb: 8 }}>
      
      {/* Barra de Navegación e Impresión (No Imprimible) */}
      <Paper
        elevation={4}
        sx={{
          p: 2,
          mb: 3,
          bgcolor: '#0f172a',
          color: 'white',
          borderRadius: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          '@media print': { display: 'none' }
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            variant="outlined"
            size="small"
            onClick={onClose}
            startIcon={<ArrowLeftIcon />}
            sx={{ color: '#94a3b8', borderColor: '#334155', '&:hover': { color: 'white', borderColor: 'white' } }}
          >
            Volver al Catálogo
          </Button>
          <Typography variant="caption" sx={{ color: '#64748b', fontFamily: 'monospace' }}>
            DOC-ID: FICHA-{product.id || 'NEW'}
          </Typography>
        </Box>

        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EditIcon />}
            onClick={onEdit}
            sx={{ borderRadius: 2, fontWeight: 700 }}
          >
            Editar Ficha
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ borderRadius: 2, fontWeight: 800, px: 3 }}
          >
            Imprimir Ficha / Guardar PDF
          </Button>
        </Box>
      </Paper>

      {/* DOCUMENTO OFICIAL / DATASHEET IMPRIMIBLE DE ALTA GAMA */}
      <Paper
        elevation={8}
        sx={{
          borderRadius: 4,
          overflow: 'hidden',
          bgcolor: 'white',
          border: '1px solid #cbd5e1',
          '@media print': { boxShadow: 'none', border: 'none' }
        }}
      >
        {/* Encabezado del Membrete Oficial */}
        <Box sx={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)', color: 'white', p: 4, borderBottom: '4px solid #1d4ed8' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Box display="flex" alignItems="center" gap={2}>
                <Box sx={{ p: 1.5, bgcolor: 'rgba(59,130,246,0.25)', borderRadius: 3, border: '1px solid rgba(147,197,253,0.3)' }}>
                  <BiotechIcon sx={{ fontSize: 44, color: '#93c5fd' }} />
                </Box>
                <Box>
                  <Box display="flex" gap={1} mb={0.5}>
                    <Chip label="CONTROLAB IA • SISTEMA MÉDICO" size="small" sx={{ bgcolor: 'rgba(59,130,246,0.2)', color: '#93c5fd', fontWeight: 800, fontSize: 10 }} />
                    <Chip label="FICHA TÉCNICA CERTIFICADA" size="small" color="success" sx={{ fontWeight: 800, fontSize: 10 }} />
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>
                    {product.nombre}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5 }}>
                    {product.descripcion || 'Sin descripción adicional en el catálogo.'}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 3, color: 'white', textAlign: 'right' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <QrCodeIcon sx={{ fontSize: 50, color: 'white', opacity: 0.9 }} />
                  <Box sx={{ fontFamily: 'monospace' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#93c5fd' }}>
                      SKU: {product.codigo}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: '#cbd5e1' }}>
                      REF: {product.referencia || 'N/A'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 10 }}>
                      VER: 2026.1 OFICIAL
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Cuerpo del Documento */}
        <Box sx={{ p: 4, bgcolor: '#f8fafc', space: 4 }}>
          
          {/* 1. Datos Principales */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2} pb={1} borderBottom="2px solid #0f172a">
                <DocumentIcon color="primary" fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', letterSpacing: 1 }}>
                  1. Especificaciones de Identificación General
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Código Interno (SKU)</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontFamily: 'monospace', color: '#1e3a8a' }}>{product.codigo || '-'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Código de Barras</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{product.codigo_barra || 'Sin asignar'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>REF / Part Number</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>{product.referencia || '-'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Ref. Abreviada</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{product.referencia_abreviada || '-'}</Typography>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Marca / Fabricante</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{product.marca || '-'}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Categoría del Ítem</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{product.categoria || 'Reactivo'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Unidad de Negocio</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{product.unidad_negocio || 'Laboratorio Clínico General'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 2. Parámetros Técnicos de Laboratorio */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2} pb={1} borderBottom="2px solid #0f172a">
                <ScienceIcon sx={{ color: '#4338ca' }} fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', letterSpacing: 1 }}>
                  2. Parámetros Técnicos y Análisis de Laboratorio
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#eef2ff', borderColor: '#c7d2fe', borderRadius: 2 }}>
                    <Typography variant="caption" color="indigo" sx={{ fontWeight: 800 }}>Autoanalizador Asociado</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#1e1b4b' }}>{product.equipo_asociado || 'Multiequipo / Abierto'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Grupo / Panel Diagnóstico</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{product.grupo || 'No especificado'}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Calibrador Asignado</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{product.calibradores_asociados || 'No requerido'}</Typography>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Control de Calidad</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{product.control_asociado || 'No requerido'}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Ubicación Física</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{product.ubicacion || 'Almacén Central'}</Typography>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Nivel Térmico</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{product.nivel || 'Refrigeración (2-8°C)'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 3. Rendimiento Métrico y Empaque */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2} pb={1} borderBottom="2px solid #0f172a">
                <SpeedIcon sx={{ color: '#047857' }} fontSize="small" />
                <Typography variant="subtitle2" sx={{ fontWeight: 900, textTransform: 'uppercase', color: '#0f172a', letterSpacing: 1 }}>
                  3. Rendimiento Métrico y Empaque Comercial
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#ecfdf5', borderColor: '#a7f3d0', borderRadius: 2 }}>
                    <Typography variant="caption" color="success" sx={{ fontWeight: 800 }}>Presentación Comercial (Desglose)</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#064e3b' }}>
                      {product.presentacion || 'No especificada'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#ecfdf5', borderColor: '#a7f3d0', borderRadius: 2 }}>
                    <Typography variant="caption" color="success" sx={{ fontWeight: 800 }}>Unidad de Compra</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#064e3b' }}>{product.unidad || 'Frasco'}</Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#ecfdf5', borderColor: '#a7f3d0', borderRadius: 2 }}>
                    <Typography variant="caption" color="success" sx={{ fontWeight: 800 }}>Frascos x Caja/Kit</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#064e3b' }}>{product.frascos_por_caja || '1'} Unid.</Typography>
                  </Paper>
                </Grid>

                {/* Rendimiento del Inserto y Cálculos de Caja */}
                <Grid item xs={6} sm={3}>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#eef2ff', borderColor: '#c7d2fe', borderRadius: 2 }}>
                    <Typography variant="caption" color="indigo" sx={{ fontWeight: 800 }}>Consumo Inserto (mL/Test)</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e1b4b' }}>
                      {product.consumo_indicado ? `${product.consumo_indicado} mL` : 'N/A'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#eef2ff', borderColor: '#c7d2fe', borderRadius: 2 }}>
                    <Typography variant="caption" color="indigo" sx={{ fontWeight: 800 }}>Volumen x Frasco</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e1b4b' }}>
                      {product.volumen_por_frasco ? `${product.volumen_por_frasco} mL` : 'N/A'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f0fdf4', borderColor: '#86efac', borderRadius: 2 }}>
                    <Typography variant="caption" color="success" sx={{ fontWeight: 800 }}>Pruebas / Frasco (Auto)</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#15803d' }}>
                      {product.pruebas_teoricas_frasco ? `${product.pruebas_teoricas_frasco} Test` : 'N/A'}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#eff6ff', borderColor: '#93c5fd', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e40af' }}>Pruebas Totales / Caja (Auto)</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 900, color: '#1e3a8a' }}>
                      {product.pruebas_teoricas_caja ? `${product.pruebas_teoricas_caja} Test` : (product.pruebas_teoricas_frasco ? `${product.pruebas_teoricas_frasco * (product.frascos_por_caja || 1)} Test` : 'N/A')}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Volumen Muerto Residual</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{product.volumen_muerto_residual ? `${product.volumen_muerto_residual} mL` : 'N/A'}</Typography>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 700 }}>Volumen Total Contenido por Caja</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#1e3a8a' }}>
                    {product.volumen_total_caja ? `${product.volumen_total_caja} mL` : (product.volumen_por_frasco ? `${product.volumen_por_frasco * (product.frascos_por_caja || 1)} mL` : 'N/A')}
                  </Typography>
                </Grid>

                <Grid item xs={6} sm={4}>
                  <Typography variant="caption" color="error" sx={{ fontWeight: 800 }}>Fecha de Vencimiento / Caducidad</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: '#b91c1c' }}>
                    {product.fecha_vencimiento ? new Date(product.fecha_vencimiento).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No registrada'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 4. Seguridad de Stock y Financiero */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fffbeb', borderColor: '#fde68a', borderRadius: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#b45309', uppercase: true }}>Stock Mínimo (Alerta)</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#78350f', mt: 0.5 }}>{product.stock_minimo || 0} <Typography component="span" variant="body2">Unid.</Typography></Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fef2f2', borderColor: '#fecaca', borderRadius: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#b91c1c', uppercase: true }}>Stock Crítico (Urgencia)</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#7f1d1d', mt: 0.5 }}>{product.stock_critico || 0} <Typography component="span" variant="body2">Unid.</Typography></Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#0f172a', color: 'white', borderRadius: 3 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#94a3b8', uppercase: true }}>Precio Unitario Base</Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#4ade80', mt: 0.5 }}>${parseFloat(product.precio_costo || 0).toFixed(2)} <Typography component="span" variant="body2" sx={{ color: '#cbd5e1' }}>USD</Typography></Typography>
              </Paper>
            </Grid>
          </Grid>

        </Box>

        {/* Footer Certificación */}
        <Box sx={{ p: 3, bgcolor: '#f1f5f9', borderTop: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <CheckIcon color="success" fontSize="small" />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>
              Ficha Técnica Oficial respaldada por el Sistema Controlab IA
            </Typography>
          </Box>
          <Typography variant="caption" color="textSecondary">
            Emitido: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </Typography>
        </Box>

      </Paper>
    </Box>
  );
};

export default ProductMasterSheet;
