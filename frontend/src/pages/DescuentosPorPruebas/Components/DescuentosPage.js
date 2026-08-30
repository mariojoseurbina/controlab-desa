// ============================================================================
// 🚀 FUNCIÓN DE EMERGENCIA - IGNORA VALIDACIONES
// ============================================================================
const ejecutarDescuento = async () => {
  // SOLO PREGUNTAR UNA VEZ
  const confirmar = window.confirm(`⚠️ ¿APLICAR DESCUENTO?\n\n` +
    `📅 FECHA: ${fecha}\n` +
    `📊 ESTADÍSTICAS ACTUALES:\n` +
    `• Total exámenes: ${estadisticas.totalExamenes}\n` +
    `• Con mapeo: ${estadisticas.conMapeo}\n` +
    `• Sin mapeo: ${estadisticas.sinMapeo}`);
  
  if (!confirmar) return;

  setProcesandoDescuento(true);
  
  try {
    console.log('🚀 ENVIANDO DESCUENTO PARA FECHA:', fecha);
    
    // ✅ ENDPOINT CORRECTO
    const response = await axios.post(`${API_BASE_URL}/api/descuento-simple`, {
      fecha: fecha
    });
    
    console.log('📥 RESPUESTA COMPLETA:', response.data);
    
    if (response.data.success) {
      const data = response.data.data;
      
      alert(`✅ DESCUENTO APLICADO\n\n` +
        `• Procesados: ${data.exitosos}/${data.totalExamenes}\n` +
        `• ML consumidos: ${data.totalML}ml\n` +
        `• Fallos: ${data.fallidos}`);
      
      mostrarSnackbar(`✅ ${data.exitosos} pruebas procesadas`, 'success');
      cargarPruebasDia();
      
    } else {
      mostrarSnackbar(`❌ ${response.data.message}`, 'error');
    }
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    
    let mensajeError = 'Error de conexión';
    if (error.response) {
      mensajeError = error.response.data.error || error.response.data.message || `Error ${error.response.status}`;
    }
    
    mostrarSnackbar(`❌ ${mensajeError}`, 'error');
    
  } finally {
    setProcesandoDescuento(false);
  }
};