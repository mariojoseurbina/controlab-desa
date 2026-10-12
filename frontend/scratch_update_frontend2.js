const fs = require('fs');
const filePath = 'c:\\controlab-desa\\frontend\\src\\pages\\CajasFrascos\\GestionCajasFrascos.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const modalCode = `
      {/* MODAL DE CONFIRMACION PREVIA */}
      <Dialog open={candidatosModalOpen} onClose={() => setCandidatosModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ backgroundColor: '#0f172a', color: '#fff' }}>
          Confirmacion Previa: Multiples Coincidencias
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Hemos encontrado <b>{candidatosScan.length}</b> similitud(es). 
            Por favor, seleccione exactamente que caja desea abrir y procesar:
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
                  <TableCell align="center"><b>Accion</b></TableCell>
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
                        ? <Chip size="small" label="En Transito" color="warning" />
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
            Cancelar Busqueda
          </Button>
        </DialogActions>
      </Dialog>
`;

if (!content.includes('MODAL DE CONFIRMACION PREVIA')) {
  content = content.replace('      <Dialog\n        open={modalOpen}', modalCode + '\n      <Dialog\n        open={modalOpen}');
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Modal injected!');
} else {
  console.log('Modal already exists.');
}
