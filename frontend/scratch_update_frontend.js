const fs = require('fs');
const filePath = 'c:\\controlab-desa\\frontend\\src\\pages\\CajasFrascos\\GestionCajasFrascos.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state
if (!content.includes('candidatosModalOpen')) {
  const stateRegex = /const \[scanMessage, setScanMessage\] = useState\(null\);/;
  const newStates = `const [scanMessage, setScanMessage] = useState(null);
  const [candidatosModalOpen, setCandidatosModalOpen] = useState(false);
  const [candidatosScan, setCandidatosScan] = useState([]);`;
  content = content.replace(stateRegex, newStates);
}

// 2. Replace handleScanSubmit
const oldHandleScanSubmit = `const handleScanSubmit = async (e) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    setScanning(true);
    setScanMessage(null);

    try {
      const response = await api.post('/cajas/escanear', {
        barcode: code,
        equipo: equipoFiltro === 'TODOS' ? undefined : equipoFiltro
      });

      if (response.data && response.data.success) {
        setScanMessage({
          type: 'success',
          text: response.data.message || 'Cdigo procesado exitosamente.'
        });
        setBarcodeInput('');
        await fetchCajas(true);
        if (response.data.accion === 'CAJA_ABIERTA') {
          setSelectedTab(1);
        }
      } else {
        setScanMessage({
          type: 'warning',
          text: response.data?.message || 'Cdigo no reconocido en el inventario.'
        });
      }
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error al procesar el cdigo de barras.'
      });
    } finally {
      setScanning(false);
      if (scanInputRef.current) scanInputRef.current.focus();
    }
  };`;

// Note: the original file has encoding issues with 'Cdigo'. We use a robust regex to replace it.
const scanMatchRegex = /const handleScanSubmit = async \(e\) => \{[\s\S]*?if \(scanInputRef.current\) scanInputRef.current.focus\(\);\s*\}\s*\};/g;

const newHandleScan = `const handleScanSubmit = async (e) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    setScanning(true);
    setScanMessage(null);

    try {
      const response = await api.post('/cajas/buscar-candidatos', {
        barcode: code,
        equipo: equipoFiltro === 'TODOS' ? undefined : equipoFiltro
      });

      if (response.data && response.data.success && response.data.candidatos && response.data.candidatos.length > 0) {
        setCandidatosScan(response.data.candidatos);
        setCandidatosModalOpen(true);
        setBarcodeInput('');
      } else {
        setScanMessage({
          type: 'warning',
          text: 'Sin coincidencias. Intente escaneando otro lote o nombre.'
        });
      }
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error de conexion.'
      });
    } finally {
      setScanning(false);
    }
  };

  const handleProcesarLote = async (loteId, equipoAsociado) => {
    setCandidatosModalOpen(false);
    setScanning(true);
    setScanMessage(null);
    try {
      const response = await api.post('/cajas/procesar-lote', {
        loteId,
        equipo: equipoFiltro === 'TODOS' ? equipoAsociado : equipoFiltro
      });
      if (response.data && response.data.success) {
        setScanMessage({
          type: 'success',
          text: response.data.message
        });
        await fetchCajas(true);
        if (response.data.accion === 'CAJA_ABIERTA') {
          setSelectedTab(1);
        }
      }
    } catch (err) {
      setScanMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error al procesar la caja.'
      });
    } finally {
      setScanning(false);
      if (scanInputRef.current) scanInputRef.current.focus();
    }
  };`;

content = content.replace(scanMatchRegex, newHandleScan);

// 3. Add Modal at the end of the file before </Container> or main Box end
const modalCode = `

      {/* MODAL DE CONFIRMACION PREVIA */}
      <Dialog open={candidatosModalOpen} onClose={() => setCandidatosModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#0f172a', color: '#fff' }}>
          Confirmación Previa: Múltiples Coincidencias
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Hemos encontrado <b>{candidatosScan.length}</b> similitud(es). 
            Por favor, seleccione exactamente qué caja desea abrir y procesar:
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                <TableRow>
                  <TableCell><b>Producto</b></TableCell>
                  <TableCell><b>Lote</b></TableCell>
                  <TableCell><b>Vencimiento (FEFO)</b></TableCell>
                  <TableCell><b>Estado actual</b></TableCell>
                  <TableCell><b>Equipo Destino</b></TableCell>
                  <TableCell align="center"><b>Acción</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {candidatosScan.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.producto}</TableCell>
                    <TableCell>{c.lote}</TableCell>
                    <TableCell sx={{ color: '#d97706', fontWeight: 600 }}>
                      {c.fechaVencimiento ? new Date(c.fechaVencimiento).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {c.estadoTransferencia === 'EN_TRANSITO' 
                        ? <Chip size="small" label="En Tránsito" color="warning" />
                        : <Chip size="small" label={c.estado || 'Cerrado'} color="primary" variant="outlined"/>
                      }
                    </TableCell>
                    <TableCell>{c.equipoAsociado}</TableCell>
                    <TableCell align="center">
                      <Button 
                        variant="contained" 
                        color="success" 
                        size="small"
                        onClick={() => handleProcesarLote(c.id, c.equipoAsociado)}
                      >
                        Confirmar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCandidatosModalOpen(false)} color="inherit">
            Cancelar Búsqueda
          </Button>
        </DialogActions>
      </Dialog>
`;

if (!content.includes('MODAL DE CONFIRMACION PREVIA')) {
  content = content.replace('      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>', modalCode + '\n      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('GestionCajasFrascos.jsx updated successfully!');
