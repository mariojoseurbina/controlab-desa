import React, { useState, useEffect, useMemo, useRef, memo } from 'react';
import {
  Box, Paper, Typography, Button, TextField, Grid, MenuItem, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, IconButton, Alert, Snackbar,
  CircularProgress, InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, Tooltip, createFilterOptions, Divider
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Delete as DeleteIcon,
  Receipt as ReceiptIcon,
  AddShoppingCart as AddCartIcon,
  CalendarToday as CalendarIcon,
  Add as PlusIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  LocalShipping as ShippingIcon,
  Inventory as InventoryIcon,
  AttachMoney as MoneyIcon,
  Warehouse as WarehouseIcon,
  Business as SupplierIcon,
  QrCode2 as QrCodeIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const customFilterOptions = createFilterOptions({
  limit: 50,
  stringify: (option) => `${option.codigo_barra || ''} ${option.codigo} ${option.nombre} ${option.referencia_abreviada || ''} ${option.equipo_asociado || ''}`
});

// Formateadores estrictos DD/MM/AAAA para la tabla y vistas
const formatDDMMYYYY = (dateVal) => {
  if (!dateVal) return 'Indefinido';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return 'Indefinido';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTimeDDMMYYYY = (dateVal) => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'p. m.' : 'a. m.';
  hours = hours % 12 || 12;
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
};

// Componente de entrada estricta DD/MM/AAAA con auto-formato y selector de calendario
const DateInputDDMMYYYY = ({ label, value, onChange, placeholder = "dd/mm/aaaa" }) => {
  const hiddenPickerRef = useRef(null);

  const handleTextChange = (e) => {
    let input = e.target.value;
    if (input.length < (value || '').length) {
      onChange(input);
      return;
    }
    const digits = input.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    } else if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    onChange(formatted);
  };

  const handleNativePicker = (e) => {
    const isoVal = e.target.value;
    if (!isoVal) return;
    const parts = isoVal.split('-');
    if (parts.length === 3) {
      onChange(`${parts[2]}/${parts[1]}/${parts[0]}`);
    }
  };

  const getIsoForPicker = (val) => {
    if (!val || typeof val !== 'string') return '';
    const parts = val.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return '';
  };

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={1}>
        {label}
      </Typography>
      <TextField
        fullWidth
        size="small"
        placeholder={placeholder}
        value={value || ''}
        onChange={handleTextChange}
        helperText="Formato: dd/mm/aaaa"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={() => {
                  if (hiddenPickerRef.current?.showPicker) {
                    hiddenPickerRef.current.showPicker();
                  } else if (hiddenPickerRef.current) {
                    hiddenPickerRef.current.focus();
                  }
                }}
                sx={{ color: '#0284c7' }}
                title="Seleccionar fecha en calendario"
              >
                <CalendarIcon fontSize="small" />
              </IconButton>
              <input
                ref={hiddenPickerRef}
                type="date"
                value={getIsoForPicker(value)}
                onChange={handleNativePicker}
                style={{
                  position: 'absolute',
                  opacity: 0,
                  width: 0,
                  height: 0,
                  pointerEvents: 'none'
                }}
                tabIndex={-1}
              />
            </InputAdornment>
          ),
          sx: {
            borderRadius: 2,
            backgroundColor: '#ffffff'
          }
        }}
      />
    </Box>
  );
};

// Función generadora de Comprobante PDF de Recepción Certificado
const generarPDFRecepcion = (recepcionData) => {
  const { referencia, proveedor_nombre, nro_factura, nota_entrega, referencia_documento, almacen_nombre, items, totals } = recepcionData;
  
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const fechaStr = new Date().toLocaleString('es-VE', { dateStyle: 'long', timeStyle: 'medium' });

  const rowsHtml = items.map((item, idx) => `
    <tr>
      <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
      <td>
        <strong>${item.nombre}</strong><br/>
        <small style="color: #475569;">Cód: ${item.codigo || '-'} | REF: ${item.referencia || '-'} | Presentación Comercial: ${item.presentacion_empaque || item.presentacion || 'Cajas'}</small>
      </td>
      <td style="text-align: center;">
        <span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 11px;">${item.lote}</span><br/>
        <small style="color: #991b1b; font-size: 10px;">Venc: ${item.fecha_vencimiento || 'Indefinido'}</small>
      </td>
      <td style="text-align: center; font-weight: bold; font-size: 13px; color: #0284c7;">${item.cantidad_cajas}</td>
      <td style="text-align: right;">$ ${parseFloat(item.precio_recepcion_usd || 0).toFixed(2)}</td>
      <td style="text-align: center;">
        ${item.aplica_iva 
          ? `<span style="background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">16% ($ ${parseFloat(item.iva || 0).toFixed(2)})</span>`
          : `<span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">EXENTO (0%)</span>`
        }
      </td>
      <td style="text-align: right; font-weight: bold; color: #0f172a;">$ ${parseFloat(item.total || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Comprobante_Recepcion_${referencia}</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #0f172a; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 20px; }
        .logo-title { display: flex; align-items: center; gap: 15px; }
        .title-main { font-size: 20px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; }
        .subtitle { font-size: 12px; color: #059669; font-weight: 700; margin-top: 3px; letter-spacing: 1px; }
        .badge-ref { background: #0f172a; color: #10b981; padding: 6px 12px; border-radius: 6px; font-family: monospace; font-size: 14px; font-weight: bold; }
        .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px; }
        .info-box label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 3px; }
        .info-box span { font-size: 13px; font-weight: 800; color: #1e293b; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
        th { background: #0f172a; color: white; padding: 10px 8px; font-size: 11px; text-transform: uppercase; border: 1px solid #1e293b; }
        td { padding: 10px 8px; font-size: 12px; border: 1px solid #cbd5e1; }
        tr:nth-child(even) { background-color: #f8fafc; }
        .totals-section { display: flex; justify-content: flex-end; margin-bottom: 35px; }
        .totals-card { width: 320px; background: #f1f5f9; padding: 15px; border-radius: 8px; border: 1px solid #cbd5e1; }
        .totals-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
        .totals-row.grand-total { font-size: 16px; font-weight: 900; color: #065f46; border-top: 2px dashed #10b981; padding-top: 8px; margin-top: 8px; }
        .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 50px; text-align: center; }
        .sig-box { border-top: 2px dashed #94a3b8; padding-top: 8px; font-size: 11px; font-weight: bold; color: #475569; }
        @media print {
          body { margin: 15px; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-title">
          <div>
            <div class="title-main">CONTROLAB IA — LIMS INVENTORY</div>
            <div class="subtitle">ACTA OFICIAL DE RECEPCIÓN DE MERCANCÍA E INGRESO A ALMACÉN</div>
          </div>
        </div>
        <div class="badge-ref">NRO: ${referencia}</div>
      </div>

      <div class="info-grid">
        <div class="info-box">
          <label>Proveedor</label>
          <span>${proveedor_nombre || 'Catálogo / Proveedor General'}</span>
        </div>
        <div class="info-box">
          <label>Nro. Factura</label>
          <span>${nro_factura || 'N/A'}</span>
        </div>
        <div class="info-box">
          <label>Nota de Entrega</label>
          <span>${nota_entrega || 'N/A'}</span>
        </div>
        <div class="info-box">
          <label>Almacén Destino</label>
          <span>${almacen_nombre || 'Almacén Central'}</span>
        </div>
        <div class="info-box" style="grid-column: span 2;">
          <label>Guía / Orden de Compra</label>
          <span>${referencia_documento || 'OC-DIRECTA'}</span>
        </div>
        <div class="info-box" style="grid-column: span 2;">
          <label>Fecha y Hora de Emisión</label>
          <span>${fechaStr}</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th style="text-align: left;">PRODUCTO / REACTIVO</th>
            <th>LOTE / VENC.</th>
            <th>CANTIDAD</th>
            <th style="text-align: right;">PRECIO UNIT. ($)</th>
            <th>TIPO IVA</th>
            <th style="text-align: right;">TOTAL ($ USD)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="totals-section">
        <div class="totals-card">
          <div class="totals-row">
            <span>Subtotal Exento (0%):</span>
            <strong>$ ${totals.subtotalExento.toFixed(2)}</strong>
          </div>
          <div class="totals-row">
            <span>Subtotal Gravable:</span>
            <strong>$ ${totals.subtotalGravable.toFixed(2)}</strong>
          </div>
          <div class="totals-row">
            <span>Monto IVA 16%:</span>
            <strong>$ ${totals.montoIva.toFixed(2)}</strong>
          </div>
          <div class="totals-row grand-total">
            <span>TOTAL RECEPCIÓN:</span>
            <strong>$ ${totals.totalGeneral.toFixed(2)} USD</strong>
          </div>
        </div>
      </div>

      <div class="signatures">
        <div class="sig-box">
          RECIBIDO Y CONFORME<br/>
          <small>Resguardo de Almacén</small>
        </div>
        <div class="sig-box">
          VERIFICADO<br/>
          <small>Control de Calidad / LIMS</small>
        </div>
        <div class="sig-box">
          APROBADO<br/>
          <small>Jefatura de Logística e Inventario</small>
        </div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 500);
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
};

// COMPONENTE MODAL AISLADO (MEMOIZADO): Recepción Multi-Producto con IVA (16% / Exento) y PDF Certificado
const ReceptionModalForm = memo(({ open, onClose, products, suppliers, onAddSupplierClick, onSubmitSuccess, showSnackbar }) => {
  const [headerData, setHeaderData] = useState({
    proveedor_id: '',
    nro_factura: '',
    nota_entrega: '',
    referencia_documento: '',
    almacen_id: 1
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [scannedMessage, setScannedMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [currentItem, setCurrentItem] = useState({
    cantidad_cajas: '',
    presentacion_empaque: 'Cajas',
    lote: '',
    fecha_fabricacion: '',
    fecha_vencimiento: '',
    codigo_barra: '',
    precio_recepcion_usd: '',
    aplica_iva: false
  });

  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    if (open) {
      setHeaderData({
        proveedor_id: '',
        nro_factura: '',
        nota_entrega: '',
        referencia_documento: '',
        almacen_id: 1
      });
      setSelectedProduct(null);
      setScannedMessage('');
      setCurrentItem({
        cantidad_cajas: '',
        presentacion_empaque: 'Cajas',
        lote: '',
        fecha_fabricacion: '',
        fecha_vencimiento: '',
        codigo_barra: '',
        precio_recepcion_usd: '',
        aplica_iva: false
      });
      setCartItems([]);
    }
  }, [open]);

  const handleProductSelect = (event, newValue) => {
    setSelectedProduct(newValue);
    if (newValue) {
      setCurrentItem(prev => ({
        ...prev,
        codigo_barra: newValue.codigo_barra || prev.codigo_barra,
        precio_recepcion_usd: newValue.precio_costo || prev.precio_recepcion_usd,
        presentacion_empaque: newValue.presentacion || newValue.presentacion_comercial || (newValue.frascos_por_caja ? `${newValue.frascos_por_caja} Unidad/Caja` : 'Cajas')
      }));
    }
  };

  const handleBarcodeScanChange = (e) => {
    const codeVal = e.target.value;
    setCurrentItem(prev => ({ ...prev, codigo_barra: codeVal }));
    setScannedMessage('');

    if (!codeVal || codeVal.trim().length < 3) return;

    const cleanCode = codeVal.trim().toLowerCase();
    const matched = products.find(p => (
      (p.codigo_barra && p.codigo_barra.toLowerCase() === cleanCode) ||
      (p.codigo && p.codigo.toLowerCase() === cleanCode) ||
      (p.referencia && p.referencia.toLowerCase() === cleanCode) ||
      (p.referencia_abreviada && p.referencia_abreviada.toLowerCase() === cleanCode)
    ));

    if (matched) {
      setSelectedProduct(matched);
      setScannedMessage(`✅ Producto identificado: [${matched.codigo}] ${matched.nombre}`);
      setCurrentItem(prev => ({
        ...prev,
        cantidad_cajas: prev.cantidad_cajas ? String(parseFloat(prev.cantidad_cajas) + 1) : '1',
        precio_recepcion_usd: matched.precio_costo || prev.precio_recepcion_usd,
        presentacion_empaque: matched.presentacion || matched.presentacion_comercial || (matched.frascos_por_caja ? `${matched.frascos_por_caja} Unidad/Caja` : 'Cajas')
      }));
    }
  };

  const agregarAlCarrito = () => {
    if (!selectedProduct) {
      showSnackbar('Por favor selecciona un producto del catálogo', 'error');
      return;
    }
    if (!currentItem.cantidad_cajas || !currentItem.lote) {
      showSnackbar('Ingresa la cantidad y el lote del producto', 'error');
      return;
    }

    const qty = parseFloat(currentItem.cantidad_cajas) || 1;
    const price = parseFloat(currentItem.precio_recepcion_usd) || 0;
    const aplicaIva = Boolean(currentItem.aplica_iva);
    const subtotal = qty * price;
    const iva = aplicaIva ? subtotal * 0.16 : 0;
    const total = subtotal + iva;

    const newItem = {
      id_temp: Date.now() + Math.random(),
      item_id: selectedProduct.id,
      nombre: selectedProduct.nombre,
      codigo: selectedProduct.codigo,
      referencia: selectedProduct.referencia_abreviada || selectedProduct.referencia,
      cantidad_cajas: qty,
      presentacion_empaque: currentItem.presentacion_empaque || 'Cajas',
      lote: currentItem.lote.trim(),
      fecha_fabricacion: currentItem.fecha_fabricacion || '',
      fecha_vencimiento: currentItem.fecha_vencimiento || '',
      codigo_barra: currentItem.codigo_barra || selectedProduct.codigo_barra || '',
      precio_recepcion_usd: price,
      aplica_iva: aplicaIva,
      subtotal,
      iva,
      total
    };

    setCartItems(prev => [...prev, newItem]);

    setSelectedProduct(null);
    setCurrentItem({
      cantidad_cajas: '',
      presentacion_empaque: 'Cajas',
      lote: '',
      fecha_fabricacion: '',
      fecha_vencimiento: '',
      codigo_barra: '',
      precio_recepcion_usd: '',
      aplica_iva: false
    });
    setScannedMessage('');
  };

  const eliminarDelCarrito = (id_temp) => {
    setCartItems(prev => prev.filter(i => i.id_temp !== id_temp));
  };

  const totals = useMemo(() => {
    let subtotalExento = 0;
    let subtotalGravable = 0;
    let montoIva = 0;

    cartItems.forEach(i => {
      if (i.aplica_iva) {
        subtotalGravable += i.subtotal;
        montoIva += i.iva;
      } else {
        subtotalExento += i.subtotal;
      }
    });

    return {
      subtotalExento,
      subtotalGravable,
      montoIva,
      totalGeneral: subtotalExento + subtotalGravable + montoIva
    };
  }, [cartItems]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (cartItems.length === 0) {
      showSnackbar('Agrega al menos un producto a la recepción antes de confirmar', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const payload = {
        proveedor_id: headerData.proveedor_id ? parseInt(headerData.proveedor_id, 10) : null,
        nro_factura: headerData.nro_factura.trim(),
        nota_entrega: headerData.nota_entrega.trim(),
        referencia_documento: headerData.referencia_documento.trim(),
        almacen_id: headerData.almacen_id,
        items: cartItems.map(c => ({
          item_id: c.item_id,
          cantidad_cajas: c.cantidad_cajas,
          presentacion_empaque: c.presentacion_empaque,
          lote: c.lote,
          fecha_fabricacion: c.fecha_fabricacion,
          fecha_vencimiento: c.fecha_vencimiento,
          codigo_barra: c.codigo_barra,
          precio_recepcion_usd: c.precio_recepcion_usd,
          aplica_iva: c.aplica_iva
        }))
      };

      const res = await fetch(`${API_BASE_URL}/reception/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (result.success) {
        showSnackbar(result.message || 'Recepción registrada exitosamente');

        const provObj = suppliers.find(s => String(s.id) === String(headerData.proveedor_id));
        const provNombre = provObj ? provObj.nombre : 'Catálogo / Proveedor General';
        const almNombre = Number(headerData.almacen_id) === 2 ? 'Almacén Laboratorio' : 'Almacén Central';

        generarPDFRecepcion({
          referencia: result.referencia || `REC-${Date.now()}`,
          proveedor_nombre: provNombre,
          nro_factura: headerData.nro_factura,
          nota_entrega: headerData.nota_entrega,
          referencia_documento: headerData.referencia_documento,
          almacen_nombre: almNombre,
          items: cartItems,
          totals
        });

        onClose();
        onSubmitSuccess();
      } else {
        showSnackbar(result.error || 'Error al registrar recepción', 'error');
      }
    } catch (err) {
      console.error('Error guardando recepción:', err);
      showSnackbar('Error de comunicación con el servidor', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
      <DialogTitle sx={{ bgcolor: '#0f172a', color: 'white', py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <ShippingIcon sx={{ color: '#10b981', fontSize: 28 }} />
          <Typography variant="h6" fontWeight={900}>
            Nuevo Ingreso de Mercancía (Recepción Multi-Producto)
          </Typography>
        </Box>
        <Chip label={`${cartItems.length} Producto(s) en Carrito`} color="success" sx={{ fontWeight: 800 }} />
      </DialogTitle>

      <DialogContent sx={{ p: 4, bgcolor: '#f8fafc' }}>
        <Box component="form" sx={{ mt: 1 }}>

          {/* 1. CABECERA PRINCIPAL DE RECEPCIÓN */}
          <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'white', borderLeft: '5px solid #0284c7' }}>
            <Typography variant="subtitle1" fontWeight={800} color="#0f172a" mb={2} display="flex" alignItems="center" gap={1}>
              <ReceiptIcon color="primary" /> 1. Datos Generales del Documento / Proveedor
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Box display="flex" alignItems="center" gap={1}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="PROVEEDOR *"
                    value={headerData.proveedor_id}
                    onChange={(e) => setHeaderData({ ...headerData, proveedor_id: e.target.value })}
                  >
                    <MenuItem value="">-- Seleccionar Proveedor --</MenuItem>
                    {suppliers.map(s => (
                      <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>
                    ))}
                  </TextField>
                  <Tooltip title="Agregar nuevo proveedor">
                    <IconButton size="small" onClick={onAddSupplierClick} sx={{ bgcolor: '#0284c7', color: 'white', '&:hover': { bgcolor: '#0369a1' } }}>
                      <PlusIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="NRO DE FACTURA"
                  placeholder="Ej. FACT-2026-8812"
                  value={headerData.nro_factura}
                  onChange={(e) => setHeaderData({ ...headerData, nro_factura: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="NRO NOTA DE ENTREGA"
                  placeholder="Ej. NE-2026-441"
                  value={headerData.nota_entrega}
                  onChange={(e) => setHeaderData({ ...headerData, nota_entrega: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="NRO DE GUÍA DE RECEPCIÓN / ORDEN DE COMPRA"
                  placeholder="Ej. OC-2026-00891"
                  value={headerData.referencia_documento}
                  onChange={(e) => setHeaderData({ ...headerData, referencia_documento: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="ALMACÉN DE DESTINO *"
                  value={headerData.almacen_id}
                  onChange={(e) => setHeaderData({ ...headerData, almacen_id: e.target.value })}
                >
                  <MenuItem value={1}>📦 Almacén Central</MenuItem>
                  <MenuItem value={2}>🏥 Almacén Laboratorio</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Paper>

          {/* 2. PANEL DE ENTRADA RÁPIDA DE ARTÍCULOS AL CARRITO */}
          <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 3, bgcolor: 'white', borderLeft: '5px solid #10b981' }}>
            <Typography variant="subtitle1" fontWeight={800} color="#0f172a" mb={2} display="flex" alignItems="center" gap={1}>
              <AddCartIcon sx={{ color: '#10b981' }} /> 2. Agregar Producto a la Recepción
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="CÓDIGO DE BARRAS (ESCÁNER)"
                  placeholder="Escanea aquí..."
                  value={currentItem.codigo_barra}
                  onChange={handleBarcodeScanChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <QrCodeIcon color="primary" fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={8}>
                <Autocomplete
                  options={products}
                  filterOptions={customFilterOptions}
                  disablePortal
                  isOptionEqualToValue={(option, val) => option?.id === val?.id}
                  getOptionLabel={(option) => `[${option.codigo}] ${option.nombre} ${option.referencia_abreviada ? '(REF: ' + option.referencia_abreviada + ')' : ''}`}
                  value={selectedProduct}
                  onChange={handleProductSelect}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      size="small"
                      label="PRODUCTO A INGRESAR *"
                      placeholder="Busca por Nombre, REF (P/N), Código..."
                    />
                  )}
                />
              </Grid>

              {scannedMessage && (
                <Grid item xs={12}>
                  <Alert severity="success" icon={<CheckIcon />} sx={{ py: 0.5, borderRadius: 2, fontWeight: 700 }}>
                    {scannedMessage}
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="PRESENTACIÓN COMERCIAL *"
                  placeholder="Ej. 2X55ML (A) 1X4ML (S)"
                  value={currentItem.presentacion_empaque}
                  onChange={(e) => setCurrentItem({ ...currentItem, presentacion_empaque: e.target.value })}
                  helperText={selectedProduct?.presentacion ? "⭐ Obtenido de Ficha Técnica" : "Presentación del Producto"}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="CANTIDAD *"
                  placeholder="Ej. 10"
                  value={currentItem.cantidad_cajas}
                  onChange={(e) => setCurrentItem({ ...currentItem, cantidad_cajas: e.target.value })}
                  inputProps={{ min: 1, step: 1 }}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="LOTE *"
                  placeholder="Ej. LOT-2026-9912"
                  value={currentItem.lote}
                  onChange={(e) => setCurrentItem({ ...currentItem, lote: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="PRECIO UNIT. ($ USD)"
                  placeholder="Ej. 112.50"
                  value={currentItem.precio_recepcion_usd}
                  onChange={(e) => setCurrentItem({ ...currentItem, precio_recepcion_usd: e.target.value })}
                  inputProps={{ step: 0.01 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <DateInputDDMMYYYY
                  label="FECHA FABRICACIÓN"
                  value={currentItem.fecha_fabricacion}
                  onChange={(val) => setCurrentItem({ ...currentItem, fecha_fabricacion: val })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <DateInputDDMMYYYY
                  label="FECHA VENCIMIENTO"
                  value={currentItem.fecha_vencimiento}
                  onChange={(val) => setCurrentItem({ ...currentItem, fecha_vencimiento: val })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <Typography variant="subtitle2" fontWeight={800} color="#1e293b" mb={0.5}>
                  IMPUESTO IVA (16% / EXENTO)
                </Typography>
                <TextField
                  select
                  fullWidth
                  size="small"
                  value={currentItem.aplica_iva ? '16' : '0'}
                  onChange={(e) => setCurrentItem({ ...currentItem, aplica_iva: e.target.value === '16' })}
                >
                  <MenuItem value="0">✅ Exento de IVA (0%)</MenuItem>
                  <MenuItem value="16">🔹 Aplica IVA (16%)</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} display="flex" justifyContent="flex-end" mt={1}>
                <Button
                  variant="contained"
                  onClick={agregarAlCarrito}
                  startIcon={<PlusIcon />}
                  sx={{ bgcolor: '#0284c7', '&:hover': { bgcolor: '#0369a1' }, fontWeight: 800, px: 3, borderRadius: 2 }}
                >
                  Agregar Producto al Carrito
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* 3. TABLA DEL CARRITO DE RECEPCIÓN */}
          <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3, mb: 3 }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#0f172a' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>#</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Producto</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>PRESENTACIÓN COMERCIAL</TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 800 }}>Cant.</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 800 }}>Lote / Venc.</TableCell>
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 800 }}>P. Unit ($)</TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 800 }}>IVA</TableCell>
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 800 }}>Total ($ USD)</TableCell>
                  <TableCell align="center" sx={{ color: 'white', fontWeight: 800 }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cartItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: '#64748b' }}>
                      <Typography variant="body2" fontWeight={700}>
                        No hay productos agregados a esta recepción. Utiliza el formulario superior para añadir artículos.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  cartItems.map((item, index) => (
                    <TableRow key={item.id_temp} hover>
                      <TableCell sx={{ fontWeight: 800, color: '#64748b' }}>{index + 1}</TableCell>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                          {item.nombre}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace' }}>
                          [{item.codigo}] {item.referencia ? `REF: ${item.referencia}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell>{item.presentacion_empaque}</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 900, color: '#0284c7' }}>{item.cantidad_cajas}</TableCell>
                      <TableCell>
                        <Chip label={item.lote} size="small" sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 800, height: 20, fontSize: 11 }} />
                        <Typography variant="caption" display="block" color="error" fontWeight={700}>
                          Venc: {item.fecha_vencimiento || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>$ {item.precio_recepcion_usd.toFixed(2)}</TableCell>
                      <TableCell align="center">
                        {item.aplica_iva ? (
                          <Chip label={`16% ($ ${item.iva.toFixed(2)})`} size="small" sx={{ bgcolor: '#dbeafe', color: '#1e40af', fontWeight: 800, height: 20, fontSize: 10 }} />
                        ) : (
                          <Chip label="EXENTO" size="small" sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 800, height: 20, fontSize: 10 }} />
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, color: '#0f172a' }}>$ {item.total.toFixed(2)}</TableCell>
                      <TableCell align="center">
                        <IconButton size="small" color="error" onClick={() => eliminarDelCarrito(item.id_temp)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* 4. TARJETA DE TOTALES FINANCIEROS */}
          <Box display="flex" justifyContent="flex-end">
            <Paper elevation={3} sx={{ p: 2.5, minWidth: 320, borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e2e8f0' }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="textSecondary" fontWeight={700}>Subtotal Exento (0%):</Typography>
                <Typography variant="body2" fontWeight={800}>$ {totals.subtotalExento.toFixed(2)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="textSecondary" fontWeight={700}>Subtotal Gravable:</Typography>
                <Typography variant="body2" fontWeight={800}>$ {totals.subtotalGravable.toFixed(2)}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={1.5}>
                <Typography variant="body2" color="textSecondary" fontWeight={700}>Monto IVA 16%:</Typography>
                <Typography variant="body2" fontWeight={800} color="#0284c7">$ {totals.montoIva.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle1" fontWeight={900} color="#065f46">TOTAL RECEPCIÓN:</Typography>
                <Typography variant="h5" fontWeight={900} color="#10b981">$ {totals.totalGeneral.toFixed(2)} USD</Typography>
              </Box>
            </Paper>
          </Box>

        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 4, pb: 3, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between' }}>
        <Button onClick={onClose} sx={{ fontWeight: 700, color: '#64748b' }}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || cartItems.length === 0}
          startIcon={<PdfIcon />}
          sx={{
            bgcolor: '#10b981',
            '&:hover': { bgcolor: '#059669' },
            borderRadius: 2.5,
            px: 4,
            py: 1.2,
            fontWeight: 900,
            boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)'
          }}
        >
          {submitting ? 'Procesando e Imprimiendo PDF...' : 'Confirmar Ingreso de Mercancía (Emitir PDF)'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

// COMPONENTE PRINCIPAL
const ProductReception = () => {
  const [receptions, setReceptions] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');

  // KPI Metrics
  const [kpis, setKpis] = useState({ totalRecepciones: 0, totalCajas: 0, totalIngresadoUSD: 0 });

  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [openAddSupplierModal, setOpenAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    loadData();
    loadCatalog();
    loadSuppliers();
  }, []);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/reception`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReceptions(data.data || []);
        setKpis({
          totalRecepciones: data.totalRecepciones || 0,
          totalCajas: data.totalCajas || 0,
          totalIngresadoUSD: data.totalIngresadoUSD || 0
        });
      }
    } catch (err) {
      console.error('Error cargando recepciones:', err);
      showSnackbar('Error al conectar con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/inventory`);
      if (res.ok) {
        const data = await res.json();
        const itemsList = Array.isArray(data) ? data : (data.items || data.data || []);
        setProducts(itemsList);
      }
    } catch (err) {
      console.error('Error cargando catálogo de productos:', err);
    }
  };

  const loadSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/reception/suppliers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSuppliers(data.data || []);
      }
    } catch (err) {
      console.error('Error cargando proveedores:', err);
    }
  };

  const handleCreateSupplierOnTheFly = async (e) => {
    if (e) e.preventDefault();
    if (!newSupplierName || !newSupplierName.trim()) {
      showSnackbar('Ingresa el nombre del proveedor', 'error');
      return;
    }

    try {
      setAddingSupplier(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/reception/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre: newSupplierName.trim() })
      });
      const result = await res.json();
      if (result.success && result.supplier) {
        showSnackbar(result.message || 'Proveedor agregado correctamente');
        await loadSuppliers();
        setOpenAddSupplierModal(false);
        setNewSupplierName('');
      } else {
        showSnackbar(result.error || 'Error creando proveedor', 'error');
      }
    } catch (err) {
      console.error('Error creando proveedor:', err);
      showSnackbar('Error de conexión con el servidor', 'error');
    } finally {
      setAddingSupplier(false);
    }
  };

  const filteredReceptions = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return receptions.filter(r => {
      const matchesSearch =
        (r.item_nombre && r.item_nombre.toLowerCase().includes(search)) ||
        (r.item_codigo && r.item_codigo.toLowerCase().includes(search)) ||
        (r.item_referencia && r.item_referencia.toLowerCase().includes(search)) ||
        (r.lote_numero && r.lote_numero.toLowerCase().includes(search)) ||
        (r.proveedor_nombre && r.proveedor_nombre.toLowerCase().includes(search)) ||
        (r.nro_factura && r.nro_factura.toLowerCase().includes(search)) ||
        (r.nota_entrega && r.nota_entrega.toLowerCase().includes(search)) ||
        (r.codigo_barra && r.codigo_barra.toLowerCase().includes(search)) ||
        (r.referencia && r.referencia.toLowerCase().includes(search)) ||
        (r.almacen_nombre && r.almacen_nombre.toLowerCase().includes(search));

      const matchesWarehouse = warehouseFilter === 'all' || String(r.almacen_id) === String(warehouseFilter);

      return matchesSearch && matchesWarehouse;
    });
  }, [receptions, searchTerm, warehouseFilter]);

  return (
    <Box sx={{ p: 4, maxWidth: 1400, mx: 'auto', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      
      {/* Snackbar Notificación */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', borderRadius: 2, fontWeight: 700 }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Header Ejecutivo */}
      <Paper
        elevation={6}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #0f172a 0%, #065f46 100%)',
          color: 'white',
          borderBottom: '4px solid #10b981'
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ p: 1.5, bgcolor: 'rgba(16, 185, 129, 0.25)', borderRadius: 3, border: '1px solid rgba(110, 231, 183, 0.3)' }}>
              <ShippingIcon sx={{ fontSize: 42, color: '#6ee7b7' }} />
            </Box>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: '#6ee7b7', fontWeight: 800 }}>
                CONTROLAB IA — MÓDULO DE INGRESO Y LOGÍSTICA
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>
                Ingreso de Productos - Recepción
              </Typography>
              <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5 }}>
                Recepción oficial de mercancía enviada por Compras, escaneo de código de barras, asignación de lotes y trazabilidad
              </Typography>
            </Box>
          </Box>

          <Box display="flex" gap={2}>
            <IconButton
              onClick={loadData}
              sx={{ color: '#cbd5e1', bgcolor: 'rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
              title="Actualizar recepciones"
            >
              <RefreshIcon />
            </IconButton>

            <Button
              variant="contained"
              onClick={() => setOpenModal(true)}
              startIcon={<PlusIcon />}
              sx={{
                bgcolor: '#10b981',
                '&:hover': { bgcolor: '#059669' },
                borderRadius: 3,
                px: 3,
                py: 1.2,
                fontWeight: 800,
                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)'
              }}
            >
              Nuevo Ingreso de Mercancía
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Tarjetas KPI de Resumen */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, borderLeft: '6px solid #10b981', bgcolor: 'white' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Recepciones
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                  {kpis.totalRecepciones}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: '#ecfdf5', borderRadius: 3, color: '#10b981' }}>
                <ShippingIcon fontSize="large" />
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, borderLeft: '6px solid #0284c7', bgcolor: 'white' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Cajas / Unidades
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                  {kpis.totalCajas}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: '#e0f2fe', borderRadius: 3, color: '#0284c7' }}>
                <InventoryIcon fontSize="large" />
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={4}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 3, borderLeft: '6px solid #8b5cf6', bgcolor: 'white' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Total Ingresado ($ USD)
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', mt: 0.5 }}>
                  $ {kpis.totalIngresadoUSD.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, bgcolor: '#f5f3ff', borderRadius: 3, color: '#8b5cf6' }}>
                <MoneyIcon fontSize="large" />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Buscador Inteligente y Filtros por Almacén */}
      <Paper elevation={2} sx={{ p: 2.5, mb: 4, borderRadius: 3, bgcolor: 'white' }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={7}>
            <TextField
              fullWidth
              size="small"
              placeholder="Búsqueda inteligente por Producto, Código de Barras, REF (P/N), Lote, Proveedor o Factura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={4} display="flex" justifyContent="flex-end">
            <TextField
              select
              size="small"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              sx={{ minWidth: 240 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <WarehouseIcon color="action" />
                  </InputAdornment>
                ),
              }}
            >
              <MenuItem value="all">Todos los Almacenes</MenuItem>
              <MenuItem value="1">Almacén Central</MenuItem>
              <MenuItem value="2">Almacén Laboratorio</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      {/* TABLA EJECUTIVA DE RECEPCIONES */}
      <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Table sx={{ minWidth: 1000 }}>
          <TableHead sx={{ bgcolor: '#0f172a' }}>
            <TableRow>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>Fecha Ingreso</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>Código / REF / Barras</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>Producto</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>Lote / Vencimiento</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>Proveedor</TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 800 }}>Factura / N.E.</TableCell>
              <TableCell align="center" sx={{ color: 'white', fontWeight: 800 }}>Almacén</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 800 }}>Cantidad</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 800 }}>Precio Unit.</TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 800 }}>Total ($ USD)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={36} sx={{ color: '#10b981', mb: 1.5 }} />
                  <Typography variant="body2" color="textSecondary" fontWeight={700}>
                    Cargando historial de recepciones...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : filteredReceptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6, color: '#64748b' }}>
                  <ShippingIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                  <Typography variant="subtitle1" fontWeight={800} color="#1e293b">
                    No se encontraron recepciones registradas
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Haz clic en "Nuevo Ingreso de Mercancía" para registrar el primer ingreso.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredReceptions.map((row) => (
                <TableRow key={row.id} hover sx={{ '&:hover': { bgcolor: '#f8fafc' } }}>
                  <TableCell sx={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
                    {formatDateTimeDDMMYYYY(row.fecha_ingreso)}
                  </TableCell>

                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#1e40af', display: 'block' }}>
                      {row.item_codigo}
                    </Typography>
                    {row.item_referencia && (
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                        REF: {row.item_referencia}
                      </Typography>
                    )}
                    {row.codigo_barra && (
                      <Chip
                        icon={<QrCodeIcon style={{ fontSize: 12 }} />}
                        label={row.codigo_barra}
                        size="small"
                        sx={{ fontSize: 10, height: 18, bgcolor: '#f1f5f9', fontWeight: 700, mt: 0.5 }}
                      />
                    )}
                  </TableCell>

                  <TableCell sx={{ fontWeight: 800, color: '#0f172a', fontSize: 14 }}>
                    {row.item_nombre}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={row.lote_numero}
                      size="small"
                      sx={{ fontWeight: 800, bgcolor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', mb: 0.5 }}
                    />
                    <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#991b1b' }}>
                      Venc: {formatDDMMYYYY(row.fecha_vencimiento)}
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                    {row.proveedor_nombre}
                  </TableCell>

                  <TableCell sx={{ fontSize: 12 }}>
                    {row.nro_factura && (
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#1e293b' }}>
                        Fact: {row.nro_factura}
                      </Typography>
                    )}
                    {row.nota_entrega && (
                      <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, color: '#2563eb' }}>
                        N.E.: {row.nota_entrega}
                      </Typography>
                    )}
                    {!row.nro_factura && !row.nota_entrega && (
                      <Typography variant="caption" color="textSecondary">-</Typography>
                    )}
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      label={row.almacen_nombre}
                      size="small"
                      sx={{
                        fontWeight: 800,
                        bgcolor: row.almacen_id === 2 ? '#f0fdf4' : '#eff6ff',
                        color: row.almacen_id === 2 ? '#166534' : '#1e40af',
                        border: `1px solid ${row.almacen_id === 2 ? '#bbf7d0' : '#bfdbfe'}`
                      }}
                    />
                  </TableCell>

                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 900, color: '#10b981' }}>
                      +{row.cantidad_cajas}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {row.presentacion_empaque || 'Cajas'}
                    </Typography>
                  </TableCell>

                  <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>
                    $ {row.precio_recepcion_usd ? row.precio_recepcion_usd.toFixed(2) : '0.00'}
                  </TableCell>

                  <TableCell align="right" sx={{ fontWeight: 900, color: '#0f172a', fontSize: 15 }}>
                    $ {row.valor_total_usd ? row.valor_total_usd.toFixed(2) : '0.00'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal Multi-Producto */}
      <ReceptionModalForm
        open={openModal}
        onClose={() => setOpenModal(false)}
        products={products}
        suppliers={suppliers}
        onAddSupplierClick={() => setOpenAddSupplierModal(true)}
        onSubmitSuccess={loadData}
        showSnackbar={showSnackbar}
      />

      {/* Mini Modal Agregar Proveedor */}
      <Dialog open={openAddSupplierModal} onClose={() => setOpenAddSupplierModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ bgcolor: '#2563eb', color: 'white', py: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SupplierIcon />
          <Typography variant="subtitle1" fontWeight={800}>
            Agregar Nuevo Proveedor
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ p: 3, pt: 3 }}>
          <Typography variant="body2" color="textSecondary" mb={2}>
            Ingresa el nombre del proveedor para agregarlo a la lista permanente:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder="Ej. LabCare Internacional C.A."
            value={newSupplierName}
            onChange={(e) => setNewSupplierName(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAddSupplierModal(false)} sx={{ color: '#64748b' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreateSupplierOnTheFly}
            variant="contained"
            disabled={addingSupplier}
            sx={{ bgcolor: '#2563eb', fontWeight: 800 }}
          >
            Guardar Proveedor
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductReception;
