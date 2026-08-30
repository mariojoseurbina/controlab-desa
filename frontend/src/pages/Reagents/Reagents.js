import React, { useState, useEffect, useCallback } from 'react';
import { lotService } from '../../services/lotService';
import { usersService } from '../../services/usersService';
import './Reagents.css';

// ✅ URL base de la API (desde variable de entorno)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ✅ Formateador de fecha local para evitar desfase de zona horaria (resta de un día)
const formatLocalDate = (dateStr) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.split('T')[0];
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Meses de 0 a 11 en JS
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day); // Crea el objeto en hora local
    return date.toLocaleDateString('es-ES');
  }
  return new Date(dateStr).toLocaleDateString('es-ES');
};

const Reagents = () => {
  const [reactivos, setReactivos] = useState([]);
  const [selectedReagent, setSelectedReagent] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLotForm, setShowLotForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingLot, setEditingLot] = useState(null);
  const [simulacion, setSimulacion] = useState({
    numeroLote: '',
    pruebasRequeridas: ''
  });
  const [resultadoSimulacion, setResultadoSimulacion] = useState(null);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchCategory, setSearchCategory] = useState('todo');
  
  const [calculadora, setCalculadora] = useState({
    volumenTotal: '',
    consumoPorPrueba: '',
    pruebasRealizadas: ''
  });
  const [resultadoCalculadora, setResultadoCalculadora] = useState(null);
  const [usuarios, setUsuarios] = useState([]);

  useEffect(() => {
    loadReagents();
    loadUsuarios();
  }, []);

  useEffect(() => {
    if (selectedReagent) {
      loadLotes();
    }
  }, [selectedReagent]);

  const loadReagents = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reagents`);
      const data = await response.json();
      if (data.success) {
        setReactivos(data.reactivos);
      } else {
        setReactivos([]);
      }
    } catch (error) {
      console.error('Error cargando reactivos:', error);
      setReactivos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsuarios = async () => {
    try {
      const response = await usersService.getAllUsers();
      if (response.success) {
        setUsuarios(response.usuarios || []);
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
  };

  const loadLotes = async () => {
    if (!selectedReagent) return;
    
    setLoading(true);
    try {
      const response = await lotService.getLotesByReactivo(selectedReagent.id);
      if (response.success) {
        setLotes(response.lotes);
      } else {
        setLotes([]);
        setMessage('No se pudieron cargar los lotes');
      }
    } catch (error) {
      console.error('Error cargando lotes:', error);
      setLotes([]);
      setMessage('Error al cargar lotes');
    } finally {
      setLoading(false);
    }
  };

  const filteredReagents = reactivos.filter(reactivo => {
    if (!searchTerm.trim()) return true;
    
    const term = searchTerm.toLowerCase().trim();
    
    const safeToString = (value) => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'number') return value.toString();
      if (typeof value === 'string') return value;
      return String(value);
    };
    
    switch (searchCategory) {
      case 'codigo':
        return safeToString(reactivo.codigo).toLowerCase().includes(term);
      case 'nombre':
        return safeToString(reactivo.nombre).toLowerCase().includes(term);
      case 'cas':
        return safeToString(reactivo.cas_number).toLowerCase().includes(term);
      case 'formula':
        return safeToString(reactivo.formula).toLowerCase().includes(term);
      case 'pureza':
        return safeToString(reactivo.pureza).toLowerCase().includes(term);
      case 'riesgo':
        return safeToString(reactivo.categoria_riesgo).toLowerCase().includes(term);
      case 'almacenamiento':
        return safeToString(reactivo.condiciones_almacenamiento).toLowerCase().includes(term);
      case 'todo':
      default:
        return (
          safeToString(reactivo.codigo).toLowerCase().includes(term) ||
          safeToString(reactivo.nombre).toLowerCase().includes(term) ||
          safeToString(reactivo.cas_number).toLowerCase().includes(term) ||
          safeToString(reactivo.formula).toLowerCase().includes(term) ||
          safeToString(reactivo.pureza).toLowerCase().includes(term) ||
          safeToString(reactivo.categoria_riesgo).toLowerCase().includes(term) ||
          safeToString(reactivo.condiciones_almacenamiento).toLowerCase().includes(term) ||
          safeToString(reactivo.descripcion).toLowerCase().includes(term) ||
          safeToString(reactivo.ubicacion).toLowerCase().includes(term)
        );
    }
  });

  const calcularRendimiento = () => {
    const { volumenTotal, consumoPorPrueba, pruebasRealizadas } = calculadora;
    
    if (!volumenTotal || !consumoPorPrueba || !pruebasRealizadas) {
      setMessage('❌ Por favor completa todos los campos');
      return;
    }

    const volTotal = parseFloat(volumenTotal);
    const consumo = parseFloat(consumoPorPrueba);
    const pruebas = parseFloat(pruebasRealizadas);

    if (volTotal <= 0 || consumo <= 0 || pruebas <= 0) {
      setMessage('❌ Todos los valores deben ser mayores a cero');
      return;
    }

    const pruebasTeoricas = volTotal / consumo;
    const rendimiento = (pruebas / pruebasTeoricas) * 100;

    setResultadoCalculadora({
      volumenTotal: volTotal,
      consumoPorPrueba: consumo,
      pruebasRealizadas: pruebas,
      pruebasTeoricas: pruebasTeoricas,
      rendimiento: rendimiento,
      eficiencia: rendimiento >= 95 ? 'Excelente' : 
                 rendimiento >= 90 ? 'Buena' : 
                 rendimiento >= 85 ? 'Aceptable' : 'Deficiente'
    });

    setMessage('✅ Cálculo de rendimiento completado');
  };

  const limpiarCalculadora = () => {
    setCalculadora({
      volumenTotal: '',
      consumoPorPrueba: '',
      pruebasRealizadas: ''
    });
    setResultadoCalculadora(null);
    setMessage('');
  };

  const cargarDesdeLote = (lote) => {
    setCalculadora({
      volumenTotal: lote.CantidadInicial,
      consumoPorPrueba: lote.ConsumoPorPrueba,
      pruebasRealizadas: ''
    });
    setMessage(`✅ Datos cargados desde lote ${lote.NumeroLote}`);
  };

  const handleReagentClick = (reactivo) => {
    setSelectedReagent(reactivo);
    setActiveTab('info');
    setResultadoSimulacion(null);
    setResultadoCalculadora(null);
    setMessage('');
  };

  const handleBackToList = () => {
    setSelectedReagent(null);
    setLotes([]);
    setResultadoSimulacion(null);
    setResultadoCalculadora(null);
    setMessage('');
    setSearchTerm('');
  };

  const handleCreateLot = async (lotData) => {
    setLoading(true);
    try {
      const response = await lotService.createLot({
        ...lotData,
        InventarioId: selectedReagent.id
      });
      
      if (response.success) {
        setMessage('✅ Lote creado exitosamente');
        setShowLotForm(false);
        loadLotes();
      } else {
        setMessage('❌ Error al crear lote: ' + (response.error || 'Error desconocido'));
      }
    } catch (error) {
      setMessage('❌ Error al crear lote');
      console.error('Error creando lote:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditLot = async (lotData) => {
    setLoading(true);
    try {
      const response = await lotService.updateLot(editingLot.Id, {
        ...lotData,
        InventarioId: selectedReagent.id
      });
      
      if (response.success) {
        setMessage('✅ Lote actualizado exitosamente');
        setShowEditForm(false);
        setEditingLot(null);
        loadLotes();
      } else {
        setMessage('❌ Error al actualizar lote: ' + (response.error || 'Error desconocido'));
      }
    } catch (error) {
      setMessage('❌ Error al actualizar lote');
      console.error('Error actualizando lote:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSimularPruebas = async () => {
    if (!simulacion.numeroLote || !simulacion.pruebasRequeridas) {
      setMessage('❌ Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const response = await lotService.simularPruebas(simulacion);
      setResultadoSimulacion(response);
      if (!response.success) {
        setMessage('❌ Error en simulación: ' + (response.error || 'Error desconocido'));
      }
    } catch (error) {
      setMessage('❌ Error en simulación');
      console.error('Error en simulación:', error);
    } finally {
      setLoading(false);
    }
  };

  // =============================================
  // COMPONENTE CALCULADORA DE RENDIMIENTO
  // =============================================
  const CalculadoraRendimiento = React.memo(() => {
    const [localCalculadora, setLocalCalculadora] = useState({
      volumenTotal: '',
      consumoPorPrueba: '',
      pruebasRealizadas: ''
    });
    const [localResultado, setLocalResultado] = useState(null);

    const handleInputChange = useCallback((field, value) => {
      setLocalCalculadora(prev => ({
        ...prev,
        [field]: value
      }));
    }, []);

    const calcularRendimiento = useCallback(() => {
      const { volumenTotal, consumoPorPrueba, pruebasRealizadas } = localCalculadora;
      
      if (!volumenTotal || !consumoPorPrueba || !pruebasRealizadas) {
        setMessage('❌ Por favor completa todos los campos');
        return;
      }

      const volTotal = parseFloat(volumenTotal);
      const consumo = parseFloat(consumoPorPrueba);
      const pruebas = parseFloat(pruebasRealizadas);

      if (volTotal <= 0 || consumo <= 0 || pruebas <= 0) {
        setMessage('❌ Todos los valores deben ser mayores a cero');
        return;
      }

      const pruebasTeoricas = volTotal / consumo;
      const rendimiento = (pruebas / pruebasTeoricas) * 100;

      setLocalResultado({
        volumenTotal: volTotal,
        consumoPorPrueba: consumo,
        pruebasRealizadas: pruebas,
        pruebasTeoricas: pruebasTeoricas,
        rendimiento: rendimiento,
        eficiencia: rendimiento >= 95 ? 'Excelente' : 
                   rendimiento >= 90 ? 'Buena' : 
                   rendimiento >= 85 ? 'Aceptable' : 'Deficiente'
      });

      setMessage('✅ Cálculo de rendimiento completado');
    }, [localCalculadora]);

    const limpiarCalculadora = useCallback(() => {
      setLocalCalculadora({
        volumenTotal: '',
        consumoPorPrueba: '',
        pruebasRealizadas: ''
      });
      setLocalResultado(null);
      setMessage('');
    }, []);

    const cargarDesdeLote = useCallback((lote) => {
      setLocalCalculadora({
        volumenTotal: lote.CantidadInicial,
        consumoPorPrueba: lote.ConsumoPorPrueba,
        pruebasRealizadas: ''
      });
      setMessage(`✅ Datos cargados desde lote ${lote.NumeroLote}`);
    }, []);

    return (
      <div className="calculadora-card">
        <div className="calculadora-header">
          <h5 className="calculadora-title">📈 Calculadora de Rendimiento</h5>
          <p className="calculadora-subtitle">
            Calcula el rendimiento de tu reactivo basado en el consumo real
          </p>
        </div>

        <div className="calculadora-body">
          <div className="calculadora-formula">
            <h6>🧮 Fórmula aplicada:</h6>
            <div className="formula-box">
              <code>
                Rendimiento = (Pruebas realizadas / (Volumen total / Consumo por prueba)) × 100
              </code>
            </div>
          </div>

          <div className="calculadora-form">
            <div className="form-group">
              <label className="form-label">
                <strong>Volumen total del reactivo (mL) *</strong>
              </label>
              <input
                type="number"
                step="0.01"
                className="form-control calculadora-input"
                value={localCalculadora.volumenTotal}
                onChange={(e) => handleInputChange('volumenTotal', e.target.value)}
                placeholder="Ej: 500"
              />
              <small className="form-text">Volumen total del frasco o lote (mL)</small>
            </div>

            <div className="form-group">
              <label className="form-label">
                <strong>Consumo por prueba (mL) *</strong>
              </label>
              <input
                type="number"
                step="0.001"
                className="form-control calculadora-input"
                value={localCalculadora.consumoPorPrueba}
                onChange={(e) => handleInputChange('consumoPorPrueba', e.target.value)}
                placeholder="Ej: 0.2"
              />
              <small className="form-text">
                Consumo promedio por prueba. Ejemplos: Glucosa (0.2mL), Colesterol (0.15mL)
              </small>
            </div>

            <div className="form-group">
              <label className="form-label">
                <strong>Pruebas realmente realizadas *</strong>
              </label>
              <input
                type="number"
                className="form-control calculadora-input"
                value={localCalculadora.pruebasRealizadas}
                onChange={(e) => handleInputChange('pruebasRealizadas', e.target.value)}
                placeholder="Ej: 2350"
              />
              <small className="form-text">Número total de pruebas realizadas con este volumen</small>
            </div>
          </div>

          <div className="calculadora-actions">
            <button 
              className="btn btn-secondary"
              onClick={limpiarCalculadora}
            >
              🗑️ Limpiar
            </button>
            <button 
              className="btn btn-primary"
              onClick={calcularRendimiento}
              disabled={!localCalculadora.volumenTotal || !localCalculadora.consumoPorPrueba || !localCalculadora.pruebasRealizadas}
            >
              📊 Calcular Rendimiento
            </button>
          </div>

          {localResultado && (
            <div className="calculadora-result">
              <h6>📋 Resultado del Cálculo</h6>
              <div className="result-grid">
                <div className="result-item">
                  <strong>Volumen total:</strong> {localResultado.volumenTotal} mL
                </div>
                <div className="result-item">
                  <strong>Consumo por prueba:</strong> {localResultado.consumoPorPrueba} mL
                </div>
                <div className="result-item">
                  <strong>Pruebas realizadas:</strong> {localResultado.pruebasRealizadas}
                </div>
                <div className="result-item">
                  <strong>Pruebas teóricas:</strong> {localResultado.pruebasTeoricas.toFixed(0)} pruebas
                </div>
                <div className="result-item highlight">
                  <strong>Rendimiento:</strong> 
                  <span className={`rendimiento-badge ${
                    localResultado.rendimiento >= 95 ? 'excellent' :
                    localResultado.rendimiento >= 90 ? 'good' :
                    localResultado.rendimiento >= 85 ? 'acceptable' : 'poor'
                  }`}>
                    {localResultado.rendimiento.toFixed(2)}%
                  </span>
                </div>
                <div className="result-item">
                  <strong>Eficiencia:</strong> 
                  <span className={`eficiencia-badge ${
                    localResultado.rendimiento >= 95 ? 'excellent' :
                    localResultado.rendimiento >= 90 ? 'good' :
                    localResultado.rendimiento >= 85 ? 'acceptable' : 'poor'
                  }`}>
                    {localResultado.eficiencia}
                  </span>
                </div>
              </div>

              <div className="result-interpretation">
                <h6>📊 Interpretación:</h6>
                <ul>
                  <li>✅ <strong>95-100%:</strong> Excelente - Uso optimizado del reactivo</li>
                  <li>⚠️ <strong>90-94%:</strong> Bueno - Uso eficiente</li>
                  <li>🔍 <strong>85-89%:</strong> Aceptable - Revisar técnica</li>
                  <li>❌ <strong>{'<85%'}:</strong> Deficiente - Investigar pérdidas</li>
                </ul>
              </div>
            </div>
          )}

          {lotes.length > 0 && (
            <div className="lotes-reference">
              <h6>📦 Cargar datos desde lotes existentes</h6>
              <div className="reference-table">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Lote</th>
                      <th>Volumen Total</th>
                      <th>Consumo/Prueba</th>
                      <th>Pruebas Restantes</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lotes.map(lote => (
                      <tr key={lote.Id}>
                        <td>
                          <code>{lote.NumeroLote}</code>
                        </td>
                        <td>{lote.CantidadInicial} mL</td>
                        <td>{lote.ConsumoPorPrueba} mL</td>
                        <td>{Math.floor(lote.PruebasRestantes)}</td>
                        <td>
                          <button 
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => cargarDesdeLote(lote)}
                            title="Cargar datos en la calculadora"
                          >
                            📥 Cargar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  });

  // =============================================
  // COMPONENTE FORMULARIO DE LOTE (CREAR)
  // =============================================
  const LotForm = ({ onSave, onClose }) => {
    const [formData, setFormData] = useState({
      NumeroLote: '',
      FechaFabricacion: '',
      FechaVencimiento: '',
      CantidadInicial: '100',
      CantidadActual: '100',
      ConsumoPorPrueba: '0.2',
      VolumenTrabajoPractico: '',
      TemperaturaAlmacenamiento: '',
      CondicionesEspeciales: '',
      Estado: 'Activo',
      PorcentajeMerma: '',
      EsBiReactivo: false,
      CantidadInicialR2: '',
      CantidadActualR2: '',
      ConsumoPorPruebaR2: '',
      FechaApertura: '',
      UsuarioApertura: ''
    });

    const [errors, setErrors] = useState({});

    const validateForm = () => {
      const newErrors = {};
      
      if (!formData.NumeroLote.trim()) newErrors.NumeroLote = 'Número de lote requerido';
      if (!formData.FechaVencimiento) newErrors.FechaVencimiento = 'Fecha de vencimiento requerida';
      if (!formData.CantidadInicial || formData.CantidadInicial <= 0) newErrors.CantidadInicial = 'Cantidad inicial debe ser mayor a 0';
      if (!formData.CantidadActual || formData.CantidadActual < 0) newErrors.CantidadActual = 'Cantidad actual no válida';
      if (!formData.ConsumoPorPrueba || formData.ConsumoPorPrueba <= 0) newErrors.ConsumoPorPrueba = 'Consumo por prueba debe ser mayor a 0';
      
      if (formData.EsBiReactivo) {
        if (!formData.CantidadInicialR2 || formData.CantidadInicialR2 <= 0) newErrors.CantidadInicialR2 = 'Cantidad inicial R2 debe ser mayor a 0';
        if (!formData.CantidadActualR2 || formData.CantidadActualR2 < 0) newErrors.CantidadActualR2 = 'Cantidad actual R2 no válida';
        if (!formData.ConsumoPorPruebaR2 || formData.ConsumoPorPruebaR2 <= 0) newErrors.ConsumoPorPruebaR2 = 'Consumo por prueba R2 debe ser mayor a 0';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (validateForm()) {
        onSave(formData);
      }
    };

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    };

    const handleCheckboxChange = (e) => {
      const { name, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    };

    const calcularPruebasTeoricas = () => {
      if (formData.CantidadInicial && formData.ConsumoPorPrueba && formData.ConsumoPorPrueba > 0) {
        const merma = parseFloat(formData.PorcentajeMerma) || 0;
        let teoricasR1 = Math.floor(formData.CantidadInicial / formData.ConsumoPorPrueba);
        let teoricas = teoricasR1;
        let limitante = 'R1';
        if (formData.EsBiReactivo && formData.CantidadInicialR2 && formData.ConsumoPorPruebaR2 && formData.ConsumoPorPruebaR2 > 0) {
          let teoricasR2 = Math.floor(formData.CantidadInicialR2 / formData.ConsumoPorPruebaR2);
          if (teoricasR2 < teoricasR1) {
            teoricas = teoricasR2;
            limitante = 'R2';
          }
        }
        const reales = Math.floor(teoricas / (1 + (merma/100)));
        return { teoricas, reales, merma, limitante };
      }
      return { teoricas: 0, reales: 0, merma: 0 };
    };

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              🧪 Crear Nuevo Lote - {selectedReagent?.nombre}
            </h5>
            <button type="button" className="close-button" onClick={onClose}>×</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {message && (
                <div className="alert alert-info">{message}</div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Número de Lote *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.NumeroLote ? 'error' : ''}`}
                    name="NumeroLote"
                    value={formData.NumeroLote}
                    onChange={handleChange}
                    placeholder="Ej: LOTE-GLUC-001"
                  />
                  {errors.NumeroLote && <div className="error-message">{errors.NumeroLote}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select
                    className="form-select"
                    name="Estado"
                    value={formData.Estado}
                    onChange={handleChange}
                  >
                    <option value="Activo">🟢 Activo</option>
                    <option value="Inactivo">⚪ Inactivo</option>
                    <option value="Vencido">🔴 Vencido</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha Fabricación</label>
                  <input
                    type="date"
                    className="form-control"
                    name="FechaFabricacion"
                    value={formData.FechaFabricacion}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha Apertura</label>
                  <input
                    type="date"
                    className="form-control"
                    name="FechaApertura"
                    value={formData.FechaApertura}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha Vencimiento *</label>
                  <input
                    type="date"
                    className={`form-control ${errors.FechaVencimiento ? 'error' : ''}`}
                    name="FechaVencimiento"
                    value={formData.FechaVencimiento}
                    onChange={handleChange}
                  />
                  {errors.FechaVencimiento && <div className="error-message">{errors.FechaVencimiento}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Bioanalista que Abre</label>
                  <select
                    className="form-select"
                    name="UsuarioApertura"
                    value={formData.UsuarioApertura}
                    onChange={handleChange}
                  >
                    <option value="">Seleccione un bioanalista...</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.nombre_completo || u.usuario}>
                        {u.nombre_completo || u.usuario} ({u.rol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    id="esBiReactivo"
                    name="EsBiReactivo"
                    checked={formData.EsBiReactivo}
                    onChange={handleCheckboxChange}
                    style={{ marginRight: '10px', width: '20px', height: '20px' }}
                  />
                  <label htmlFor="esBiReactivo" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                    Es Kit Bi-Reactivo (R1 + R2)
                  </label>
                </div>
              </div>

              {/* 🧮 Asistente de Conversión Automática Cajas -> Frascos -> mL */}
              <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)', border: '1px solid #bae6fd', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ fontWeight: '700', color: '#0369a1', fontSize: '13px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🧮 Asistente de Conversión Automática (Cajas ➔ Frascos ➔ mL ➔ Pruebas)</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', fontSize: '12px' }}>
                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>📦 Empaque Ficha</span>
                    <strong style={{ color: '#1e293b' }}>50 Cajas * 50</strong>
                    <div style={{ fontSize: '10px', color: '#0284c7' }}>2,500 Frascos Totales</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>🧪 Contenido / Frasco</span>
                    <strong style={{ color: '#166534' }}>{formData.CantidadInicial || '100'} mL / Frasco</strong>
                    <div style={{ fontSize: '10px', color: '#15803d' }}>1 Frasco = {formData.CantidadInicial || '100'} mL</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>🎯 Pruebas / Frasco</span>
                    <strong style={{ color: '#7c3aed' }}>
                      {formData.CantidadInicial && formData.ConsumoPorPrueba && parseFloat(formData.ConsumoPorPrueba) > 0
                        ? Math.floor(parseFloat(formData.CantidadInicial) / parseFloat(formData.ConsumoPorPrueba))
                        : 285} Pruebas
                    </strong>
                    <div style={{ fontSize: '10px', color: '#6d28d9' }}>Con {formData.ConsumoPorPrueba || '0.35'} mL/test</div>
                  </div>
                  <div style={{ background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#64748b', fontSize: '11px', display: 'block' }}>📊 Capacidad Total</span>
                    <strong style={{ color: '#b91c1c' }}>
                      {formData.CantidadInicial && formData.ConsumoPorPrueba && parseFloat(formData.ConsumoPorPrueba) > 0
                        ? (2500 * Math.floor(parseFloat(formData.CantidadInicial) / parseFloat(formData.ConsumoPorPrueba))).toLocaleString()
                        : '1,250,000'} Pruebas
                    </strong>
                    <div style={{ fontSize: '10px', color: '#dc2626' }}>2,500 Frascos en Almacén</div>
                  </div>
                </div>
              </div>

              {formData.EsBiReactivo && <h6 style={{ marginTop: '10px', color: '#0d6efd' }}>📦 Datos de Reactivo 1 (R1)</h6>}
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cantidad Inicial {formData.EsBiReactivo ? 'R1' : ''} *</label>
                  <input
                    type="number"
                    step="0.01"
                    className={`form-control ${errors.CantidadInicial ? 'error' : ''}`}
                    name="CantidadInicial"
                    value={formData.CantidadInicial}
                    onChange={handleChange}
                    placeholder="Ej: 100"
                  />
                  {errors.CantidadInicial && <div className="error-message">{errors.CantidadInicial}</div>}
                  <small className="form-text">Volumen total del lote (mL)</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Cantidad Actual {formData.EsBiReactivo ? 'R1' : ''} *</label>
                  <input
                    type="number"
                    step="0.01"
                    className={`form-control ${errors.CantidadActual ? 'error' : ''}`}
                    name="CantidadActual"
                    value={formData.CantidadActual}
                    onChange={handleChange}
                    placeholder="Ej: 95.5"
                  />
                  {errors.CantidadActual && <div className="error-message">{errors.CantidadActual}</div>}
                  <small className="form-text">Volumen disponible actual (mL)</small>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Consumo por Prueba {formData.EsBiReactivo ? 'R1' : ''} (mL) *</label>
                <input
                  type="number"
                  step="0.001"
                  className={`form-control ${errors.ConsumoPorPrueba ? 'error' : ''}`}
                  name="ConsumoPorPrueba"
                  value={formData.ConsumoPorPrueba}
                  onChange={handleChange}
                  placeholder="Ej: 0.2"
                />
                {errors.ConsumoPorPrueba && <div className="error-message">{errors.ConsumoPorPrueba}</div>}
              </div>

              {formData.EsBiReactivo && (
                <>
                  <h6 style={{ marginTop: '20px', color: '#e83e8c' }}>📦 Datos de Reactivo 2 (R2)</h6>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Cantidad Inicial R2 *</label>
                      <input
                        type="number"
                        step="0.01"
                        className={`form-control ${errors.CantidadInicialR2 ? 'error' : ''}`}
                        name="CantidadInicialR2"
                        value={formData.CantidadInicialR2}
                        onChange={handleChange}
                        placeholder="Ej: 50"
                      />
                      {errors.CantidadInicialR2 && <div className="error-message">{errors.CantidadInicialR2}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cantidad Actual R2 *</label>
                      <input
                        type="number"
                        step="0.01"
                        className={`form-control ${errors.CantidadActualR2 ? 'error' : ''}`}
                        name="CantidadActualR2"
                        value={formData.CantidadActualR2}
                        onChange={handleChange}
                        placeholder="Ej: 50"
                      />
                      {errors.CantidadActualR2 && <div className="error-message">{errors.CantidadActualR2}</div>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consumo por Prueba R2 (mL) *</label>
                    <input
                      type="number"
                      step="0.001"
                      className={`form-control ${errors.ConsumoPorPruebaR2 ? 'error' : ''}`}
                      name="ConsumoPorPruebaR2"
                      value={formData.ConsumoPorPruebaR2}
                      onChange={handleChange}
                      placeholder="Ej: 0.05"
                    />
                    {errors.ConsumoPorPruebaR2 && <div className="error-message">{errors.ConsumoPorPruebaR2}</div>}
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">% Merma Estadística (Paramétrica)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  name="PorcentajeMerma"
                  value={formData.PorcentajeMerma}
                  onChange={handleChange}
                  placeholder="Ej: 3"
                />
                <small className="form-text">
                  Porcentaje de merma que Controlab IA aplicará automáticamente sobre el consumo enviado por el analizador (LIS).
                </small>
              </div>

              {formData.CantidadInicial && formData.ConsumoPorPrueba && (
                <div className="calculation-info" style={{ backgroundColor: '#eef5f9', borderLeft: '4px solid #2196f3', padding: '10px' }}>
                  <strong>📊 Cálculo automático (Controlab IA):</strong><br />
                  • Pruebas teóricas lineales {formData.EsBiReactivo ? `(Limitante: ${calcularPruebasTeoricas().limitante})` : ''}: <strong>{calcularPruebasTeoricas().teoricas} pruebas</strong><br />
                  • Merma estadística aplicada: <strong>{calcularPruebasTeoricas().merma}%</strong><br />
                  • <strong>Pruebas reales estimadas: {calcularPruebasTeoricas().reales} pruebas</strong><br />
                  <hr style={{margin: '5px 0'}}/>
                  • Consumo lineal teórico: {formData.CantidadInicial}mL / {formData.ConsumoPorPrueba}mL por prueba<br />
                  • Pruebas teóricas restantes actualmente: <strong>{Math.floor(formData.CantidadActual / formData.ConsumoPorPrueba)} pruebas</strong>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Volumen Trabajo Práctico (mL)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  name="VolumenTrabajoPractico"
                  value={formData.VolumenTrabajoPractico}
                  onChange={handleChange}
                  placeholder="Opcional - para cálculo de rendimiento"
                />
                <small className="form-text">Volumen real utilizado en prácticas (para cálculo de eficiencia)</small>
              </div>

              <div className="form-group">
                <label className="form-label">Temperatura Almacenamiento</label>
                <input
                  type="text"
                  className="form-control"
                  name="TemperaturaAlmacenamiento"
                  value={formData.TemperaturaAlmacenamiento}
                  onChange={handleChange}
                  placeholder="Ej: 2-8°C, Ambiente, -20°C"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Condiciones Especiales</label>
                <textarea
                  className="form-control"
                  name="CondicionesEspeciales"
                  value={formData.CondicionesEspeciales}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Condiciones especiales de almacenamiento, manipulación, etc."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                ❌ Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? '⏳ Guardando...' : '💾 Crear Lote'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // =============================================
  // COMPONENTE FORMULARIO DE LOTE (EDITAR)
  // =============================================
  const EditLotForm = ({ lot, onSave, onClose }) => {
    const [formData, setFormData] = useState({
      NumeroLote: lot.NumeroLote,
      FechaFabricacion: lot.FechaFabricacion ? lot.FechaFabricacion.split('T')[0] : '',
      FechaVencimiento: lot.FechaVencimiento ? lot.FechaVencimiento.split('T')[0] : '',
      CantidadInicial: lot.CantidadInicial,
      CantidadActual: lot.CantidadActual,
      ConsumoPorPrueba: lot.ConsumoPorPrueba,
      VolumenTrabajoPractico: lot.VolumenTrabajoPractico || '',
      TemperaturaAlmacenamiento: lot.TemperaturaAlmacenamiento || '',
      CondicionesEspeciales: lot.CondicionesEspeciales || '',
      Estado: lot.Estado,
      PorcentajeMerma: lot.PorcentajeMerma || '',
      EsBiReactivo: lot.EsBiReactivo || false,
      CantidadInicialR2: lot.CantidadInicialR2 || '',
      CantidadActualR2: lot.CantidadActualR2 || '',
      ConsumoPorPruebaR2: lot.ConsumoPorPruebaR2 || '',
      FechaApertura: lot.FechaApertura ? lot.FechaApertura.split('T')[0] : '',
      UsuarioApertura: lot.UsuarioApertura || ''
    });

    const [errors, setErrors] = useState({});

    const validateForm = () => {
      const newErrors = {};
      
      if (!formData.NumeroLote.trim()) newErrors.NumeroLote = 'Número de lote requerido';
      if (!formData.FechaVencimiento) newErrors.FechaVencimiento = 'Fecha de vencimiento requerida';
      if (!formData.CantidadInicial || formData.CantidadInicial <= 0) newErrors.CantidadInicial = 'Cantidad inicial debe ser mayor a 0';
      if (!formData.CantidadActual || formData.CantidadActual < 0) newErrors.CantidadActual = 'Cantidad actual no válida';
      if (!formData.ConsumoPorPrueba || formData.ConsumoPorPrueba <= 0) newErrors.ConsumoPorPrueba = 'Consumo por prueba debe ser mayor a 0';
      if (formData.EsBiReactivo) {
        if (!formData.CantidadInicialR2 || formData.CantidadInicialR2 <= 0) newErrors.CantidadInicialR2 = 'Cantidad inicial R2 debe ser mayor a 0';
        if (!formData.CantidadActualR2 || formData.CantidadActualR2 < 0) newErrors.CantidadActualR2 = 'Cantidad actual R2 no válida';
        if (!formData.ConsumoPorPruebaR2 || formData.ConsumoPorPruebaR2 <= 0) newErrors.ConsumoPorPruebaR2 = 'Consumo por prueba R2 debe ser mayor a 0';
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (validateForm()) {
        onSave(formData);
      }
    };

    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      if (errors[name]) {
        setErrors(prev => ({
          ...prev,
          [name]: ''
        }));
      }
    };

    const handleCheckboxChange = (e) => {
      const { name, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    };

    const calcularPruebasTeoricas = () => {
      if (formData.CantidadInicial && formData.ConsumoPorPrueba && formData.ConsumoPorPrueba > 0) {
        const merma = parseFloat(formData.PorcentajeMerma) || 0;
        
        let teoricasR1 = Math.floor(formData.CantidadInicial / formData.ConsumoPorPrueba);
        let teoricas = teoricasR1;
        
        let limitante = "R1";
        if (formData.EsBiReactivo && formData.CantidadInicialR2 && formData.ConsumoPorPruebaR2 && formData.ConsumoPorPruebaR2 > 0) {
          let teoricasR2 = Math.floor(formData.CantidadInicialR2 / formData.ConsumoPorPruebaR2);
          if (teoricasR2 < teoricasR1) {
            teoricas = teoricasR2;
            limitante = "R2";
          }
        }
        
        const reales = Math.floor(teoricas / (1 + (merma/100)));
        return { teoricas, reales, merma, limitante };
      }
      return { teoricas: 0, reales: 0, merma: 0, limitante: "N/A" };
    };

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              ✏️ Editar Lote - {lot.NumeroLote}
            </h5>
            <button type="button" className="close-button" onClick={onClose}>×</button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="alert alert-info">
                <strong>💡 Editando lote existente:</strong> Los cambios se aplicarán inmediatamente.
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Número de Lote *</label>
                  <input
                    type="text"
                    className={`form-control ${errors.NumeroLote ? 'error' : ''}`}
                    name="NumeroLote"
                    value={formData.NumeroLote}
                    onChange={handleChange}
                    placeholder="Ej: LOTE-GLUC-001"
                  />
                  {errors.NumeroLote && <div className="error-message">{errors.NumeroLote}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select
                    className="form-select"
                    name="Estado"
                    value={formData.Estado}
                    onChange={handleChange}
                  >
                    <option value="Activo">🟢 Activo</option>
                    <option value="Inactivo">⚪ Inactivo</option>
                    <option value="Vencido">🔴 Vencido</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha Fabricación</label>
                  <input
                    type="date"
                    className="form-control"
                    name="FechaFabricacion"
                    value={formData.FechaFabricacion}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha Apertura</label>
                  <input
                    type="date"
                    className="form-control"
                    name="FechaApertura"
                    value={formData.FechaApertura}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha Vencimiento *</label>
                  <input
                    type="date"
                    className={`form-control ${errors.FechaVencimiento ? 'error' : ''}`}
                    name="FechaVencimiento"
                    value={formData.FechaVencimiento}
                    onChange={handleChange}
                  />
                  {errors.FechaVencimiento && <div className="error-message">{errors.FechaVencimiento}</div>}
                </div>
                <div className="form-group">
                  <label className="form-label">Bioanalista que Abre</label>
                  <select
                    className="form-select"
                    name="UsuarioApertura"
                    value={formData.UsuarioApertura}
                    onChange={handleChange}
                  >
                    <option value="">Seleccione un bioanalista...</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.nombre_completo || u.usuario}>
                        {u.nombre_completo || u.usuario} ({u.rol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    id="esBiReactivoEdit"
                    name="EsBiReactivo"
                    checked={formData.EsBiReactivo}
                    onChange={handleCheckboxChange}
                    style={{ marginRight: '10px', width: '20px', height: '20px' }}
                  />
                  <label htmlFor="esBiReactivoEdit" className="form-label" style={{ marginBottom: 0, cursor: 'pointer' }}>
                    Es Kit Bi-Reactivo (R1 + R2)
                  </label>
                </div>
              </div>

              {formData.EsBiReactivo && <h6 style={{ marginTop: '10px', color: '#0d6efd' }}>📦 Datos de Reactivo 1 (R1)</h6>}
              
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Cantidad Inicial {formData.EsBiReactivo ? 'R1' : ''} *</label>
                  <input
                    type="number"
                    step="0.01"
                    className={`form-control ${errors.CantidadInicial ? 'error' : ''}`}
                    name="CantidadInicial"
                    value={formData.CantidadInicial}
                    onChange={handleChange}
                    placeholder="Ej: 100"
                  />
                  {errors.CantidadInicial && <div className="error-message">{errors.CantidadInicial}</div>}
                  <small className="form-text">Volumen total del lote (mL)</small>
                </div>
                <div className="form-group">
                  <label className="form-label">Cantidad Actual {formData.EsBiReactivo ? 'R1' : ''} *</label>
                  <input
                    type="number"
                    step="0.01"
                    className={`form-control ${errors.CantidadActual ? 'error' : ''}`}
                    name="CantidadActual"
                    value={formData.CantidadActual}
                    onChange={handleChange}
                    placeholder="Ej: 95.5"
                  />
                  {errors.CantidadActual && <div className="error-message">{errors.CantidadActual}</div>}
                  <small className="form-text">Volumen disponible actual (mL)</small>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Consumo por Prueba {formData.EsBiReactivo ? 'R1' : ''} (mL) *</label>
                <input
                  type="number"
                  step="0.001"
                  className={`form-control ${errors.ConsumoPorPrueba ? 'error' : ''}`}
                  name="ConsumoPorPrueba"
                  value={formData.ConsumoPorPrueba}
                  onChange={handleChange}
                  placeholder="Ej: 0.2"
                />
                {errors.ConsumoPorPrueba && <div className="error-message">{errors.ConsumoPorPrueba}</div>}
              {formData.EsBiReactivo && (
                <>
                  <h6 style={{ marginTop: '20px', color: '#e83e8c' }}>📦 Datos de Reactivo 2 (R2)</h6>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Cantidad Inicial R2 *</label>
                      <input
                        type="number"
                        step="0.01"
                        className={`form-control ${errors.CantidadInicialR2 ? 'error' : ''}`}
                        name="CantidadInicialR2"
                        value={formData.CantidadInicialR2}
                        onChange={handleChange}
                        placeholder="Ej: 50"
                      />
                      {errors.CantidadInicialR2 && <div className="error-message">{errors.CantidadInicialR2}</div>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cantidad Actual R2 *</label>
                      <input
                        type="number"
                        step="0.01"
                        className={`form-control ${errors.CantidadActualR2 ? 'error' : ''}`}
                        name="CantidadActualR2"
                        value={formData.CantidadActualR2}
                        onChange={handleChange}
                        placeholder="Ej: 50"
                      />
                      {errors.CantidadActualR2 && <div className="error-message">{errors.CantidadActualR2}</div>}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Consumo por Prueba R2 (mL) *</label>
                    <input
                      type="number"
                      step="0.001"
                      className={`form-control ${errors.ConsumoPorPruebaR2 ? 'error' : ''}`}
                      name="ConsumoPorPruebaR2"
                      value={formData.ConsumoPorPruebaR2}
                      onChange={handleChange}
                      placeholder="Ej: 0.05"
                    />
                    {errors.ConsumoPorPruebaR2 && <div className="error-message">{errors.ConsumoPorPruebaR2}</div>}
                  </div>
                </>
              )}
                <small className="form-text">
                  Consumo promedio por prueba. Ejemplos: Glucosa (0.2mL), Colesterol (0.15mL), Urea (0.25mL)
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">% Merma Estadística (Paramétrica)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  name="PorcentajeMerma"
                  value={formData.PorcentajeMerma}
                  onChange={handleChange}
                  placeholder="Ej: 3"
                />
                <small className="form-text">
                  Porcentaje de merma que Controlab IA aplicará automáticamente sobre el consumo enviado por el analizador (LIS).
                </small>
              </div>

              {formData.CantidadInicial && formData.ConsumoPorPrueba && (
                <div className="calculation-info" style={{ backgroundColor: '#eef5f9', borderLeft: '4px solid #2196f3', padding: '10px' }}>
                  <strong>📊 Cálculo automático (Controlab IA):</strong><br />
                  • Pruebas teóricas lineales: <strong>{calcularPruebasTeoricas().teoricas} pruebas</strong><br />
                  • Merma estadística aplicada: <strong>{calcularPruebasTeoricas().merma}%</strong><br />
                  • <strong>Pruebas reales estimadas: {calcularPruebasTeoricas().reales} pruebas</strong><br />
                  <hr style={{margin: '5px 0'}}/>
                  • Consumo lineal teórico: {formData.CantidadInicial}mL / {formData.ConsumoPorPrueba}mL por prueba<br />
                  • Pruebas teóricas restantes actualmente: <strong>{Math.floor(formData.CantidadActual / formData.ConsumoPorPrueba)} pruebas</strong>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Volumen Trabajo Práctico (mL)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  name="VolumenTrabajoPractico"
                  value={formData.VolumenTrabajoPractico}
                  onChange={handleChange}
                  placeholder="Opcional - para cálculo de rendimiento"
                />
                <small className="form-text">Volumen real utilizado en prácticas (para cálculo de eficiencia)</small>
              </div>

              <div className="form-group">
                <label className="form-label">Temperatura Almacenamiento</label>
                <input
                  type="text"
                  className="form-control"
                  name="TemperaturaAlmacenamiento"
                  value={formData.TemperaturaAlmacenamiento}
                  onChange={handleChange}
                  placeholder="Ej: 2-8°C, Ambiente, -20°C"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Condiciones Especiales</label>
                <textarea
                  className="form-control"
                  name="CondicionesEspeciales"
                  value={formData.CondicionesEspeciales}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Condiciones especiales de almacenamiento, manipulación, etc."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                ❌ Cancelar
              </button>
              <button type="submit" className="btn btn-warning" disabled={loading}>
                {loading ? '⏳ Actualizando...' : '💾 Actualizar Lote'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (selectedReagent) {
    return (
      <div className="reagents-container">
        <button className="back-button" onClick={handleBackToList}>
          ← Volver a la lista de reactivos
        </button>
        
        {message && (
          <div className="alert-message">
            {message}
            <button type="button" className="close-alert" onClick={() => setMessage('')}>×</button>
          </div>
        )}

        <div className="reagent-detail-card">
          <div className="card-header">
            <h4 className="card-title">
              🧪 {selectedReagent.nombre} - {selectedReagent.codigo}
            </h4>
          </div>
          <div className="card-body">
            <ul className="tab-navigation">
              <li className="tab-item">
                <button 
                  className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
                  onClick={() => setActiveTab('info')}
                >
                  📋 Información General
                </button>
              </li>
              <li className="tab-item">
                <button 
                  className={`tab-button ${activeTab === 'lotes' ? 'active' : ''}`}
                  onClick={() => setActiveTab('lotes')}
                >
                  🧪 Gestión de Lotes {lotes.length > 0 && `(${lotes.length})`}
                </button>
              </li>
              <li className="tab-item">
                <button 
                  className={`tab-button ${activeTab === 'simulador' ? 'active' : ''}`}
                  onClick={() => setActiveTab('simulador')}
                >
                  🔬 Simulador de Pruebas
                </button>
              </li>
              <li className="tab-item">
                <button 
                  className={`tab-button ${activeTab === 'calculadora' ? 'active' : ''}`}
                  onClick={() => setActiveTab('calculadora')}
                >
                  📈 Calculadora de Rendimiento
                </button>
              </li>
            </ul>

            <div className="tab-content">
              
              {activeTab === 'info' && (
                <div className="tab-panel active">
                  <div className="info-grid">
                    <div className="info-section">
                      <div className="section-header">
                        <h6>Información Básica</h6>
                      </div>
                      <div className="section-body">
                        <InfoRow label="🔢 Código" value={selectedReagent.codigo} />
                        <InfoRow label="📛 Nombre" value={selectedReagent.nombre} />
                        <InfoRow label="🔬 N° CAS" value={selectedReagent.cas_number || 'N/A'} />
                        <InfoRow label="🧪 Fórmula" value={selectedReagent.formula || 'N/A'} />
                        <InfoRow label="📝 Descripción" value={selectedReagent.descripcion || 'N/A'} />
                      </div>
                    </div>
                    <div className="info-section">
                      <div className="section-header">
                        <h6>Especificaciones</h6>
                      </div>
                      <div className="section-body">
                        <InfoRow label="📊 Pureza" value={selectedReagent.pureza || 'N/A'} />
                        <InfoRow 
                          label="⚠️ Riesgo" 
                          value={
                            <span className={`risk-badge ${selectedReagent.categoria_riesgo}`}>
                              {selectedReagent.categoria_riesgo || 'N/A'}
                            </span>
                          } 
                        />
                        <InfoRow label="🏪 Almacenamiento" value={selectedReagent.condiciones_almacenamiento || 'N/A'} />
                        <InfoRow 
                          label="📦 Stock" 
                          value={
                            <span className={`stock-badge ${
                              parseFloat(selectedReagent.stock_actual) <= parseFloat(selectedReagent.stock_critico) ? 'critical' :
                              parseFloat(selectedReagent.stock_actual) <= parseFloat(selectedReagent.stock_minimo) ? 'low' : 'normal'
                            }`}>
                              {selectedReagent.stock_actual} {selectedReagent.unidad}
                            </span>
                          } 
                        />
                        <InfoRow label="📍 Ubicación" value={selectedReagent.ubicacion || 'N/A'} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'lotes' && (
                <div className="tab-panel active">
                  <div className="batch-header">
                    <h5>📦 Gestión de Lotes del Reactivo</h5>
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowLotForm(true)}
                      disabled={loading}
                    >
                      {loading ? '⏳ Cargando...' : '+ 🧪 Nuevo Lote'}
                    </button>
                  </div>

                  {loading ? (
                    <div className="loading-state">
                      <div className="spinner"></div>
                      <p>Cargando lotes...</p>
                    </div>
                  ) : lotes.length === 0 ? (
                    <div className="empty-state">
                      <h6>📭 No hay lotes registrados</h6>
                      <p>Este reactivo no tiene lotes asociados. Crea el primer lote para comenzar.</p>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowLotForm(true)}
                      >
                        + Crear Primer Lote
                      </button>
                    </div>
                  ) : (
                    <div className="batch-table">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>N° Lote</th>
                            <th>Vencimiento</th>
                            <th>Apertura</th>
                            <th>Pruebas Restantes</th>
                            <th>Rendimiento</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lotes.map((lote) => {
                            return (
                              <tr key={lote.Id} className={lote.Estado === 'Vencido' ? 'expired' : ''}>
                                <td>
                                  <strong>{lote.NumeroLote}</strong>
                                </td>
                                <td>
                                  <div>
                                    {formatLocalDate(lote.FechaVencimiento)}
                                  </div>
                                  <span className={`days-badge ${
                                    lote.DiasParaVencer < 15 ? 'critical' : 
                                    lote.DiasParaVencer < 30 ? 'warning' : 'normal'
                                  }`}>
                                    {lote.DiasParaVencer} días
                                  </span>
                                </td>
                                <td>
                                  {lote.FechaApertura ? (
                                    <>
                                      <div>
                                        {formatLocalDate(lote.FechaApertura)}
                                      </div>
                                      <small style={{ color: '#666' }}>
                                        👤 {lote.UsuarioApertura || 'No especificado'}
                                      </small>
                                    </>
                                  ) : (
                                    <span style={{ color: '#999', fontStyle: 'italic' }}>No abierto</span>
                                  )}
                                </td>
                                <td>
                                  <span className="pruebas-badge">
                                    {Math.floor(lote.PruebasRestantes)} pruebas
                                  </span>
                                  <br />
                                  <small>
                                    {lote.CantidadActual}mL disponible
                                  </small>
                                </td>
                                <td>
                                  <span className={`rendimiento-badge ${
                                    lote.Rendimiento >= 95 ? 'excellent' :
                                    lote.Rendimiento >= 85 ? 'good' :
                                    lote.Rendimiento >= 75 ? 'acceptable' : 'poor'
                                  }`}>
                                    {lote.Rendimiento || 0}%
                                  </span>
                                  <br />
                                  <small>{lote.NivelRendimiento}</small>
                                </td>
                                <td>
                                  <span className={`estado-badge ${
                                    lote.Estado === 'Activo' ? 'active' : 
                                    lote.Estado === 'Inactivo' ? 'inactive' : 'expired'
                                  }`}>
                                    {lote.Estado}
                                  </span>
                                </td>
                                <td>
                                  <div className="action-buttons">
                                    <button
                                      className="btn-icon edit"
                                      onClick={() => {
                                        setEditingLot(lote);
                                        setShowEditForm(true);
                                      }}
                                      title="Editar lote"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      className="btn-icon delete"
                                      onClick={async () => {
                                        if (window.confirm(`¿Estás seguro de eliminar el lote ${lote.NumeroLote}?`)) {
                                          setLoading(true);
                                          const response = await lotService.deleteLot(lote.Id);
                                          if (response.success) {
                                            setMessage('✅ Lote eliminado correctamente');
                                            loadLotes();
                                          } else {
                                            setMessage('❌ Error al eliminar lote');
                                          }
                                          setLoading(false);
                                        }
                                      }}
                                      title="Eliminar lote"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'simulador' && (
                <div className="tab-panel active">
                  <div className="simulator-card">
                    <div className="simulator-header">
                      <h5 className="simulator-title">🔬 Simulador de Pruebas</h5>
                    </div>
                    <div className="simulator-body">
                      <p className="simulator-description">
                        Calcula cuántas pruebas puedes realizar con un lote específico de este reactivo.
                      </p>

                      <div className="simulator-form">
                        <div className="form-group">
                          <label className="form-label">
                            <strong>Número de Lote *</strong>
                          </label>
                          <input
                            type="text"
                            className="form-control"
                            value={simulacion.numeroLote}
                            onChange={(e) => setSimulacion({
                              ...simulacion,
                              numeroLote: e.target.value
                            })}
                            placeholder="Ej: LOTE-GLUC-001"
                          />
                          <small className="form-text">Ingresa el número exacto del lote</small>
                        </div>
                        <div className="form-group">
                          <label className="form-label">
                            <strong>Pruebas Requeridas *</strong>
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            value={simulacion.pruebasRequeridas}
                            onChange={(e) => setSimulacion({
                              ...simulacion,
                              pruebasRequeridas: e.target.value
                            })}
                            placeholder="Ej: 50"
                            min="1"
                          />
                          <small className="form-text">Número de pruebas que necesitas realizar</small>
                        </div>
                      </div>

                      <button 
                        className="btn btn-simulator"
                        onClick={handleSimularPruebas}
                        disabled={!simulacion.numeroLote || !simulacion.pruebasRequeridas || loading}
                      >
                        {loading ? '⏳ Calculando...' : '🔬 Simular Pruebas'}
                      </button>

                      {resultadoSimulacion && resultadoSimulacion.success && (
                        <div className={`simulator-result ${
                          resultadoSimulacion.simulacion.esFactible ? 'success' : 'error'
                        }`}>
                          <h6>{resultadoSimulacion.mensaje}</h6>
                          <div className="result-grid">
                            <div className="result-item">
                              <strong>🧪 Lote:</strong> {resultadoSimulacion.simulacion.lote}
                            </div>
                            <div className="result-item">
                              <strong>📛 Reactivo:</strong> {resultadoSimulacion.simulacion.item}
                            </div>
                            <div className="result-item">
                              <strong>✅ Pruebas Posibles:</strong> {resultadoSimulacion.simulacion.pruebasPosibles}
                            </div>
                            <div className="result-item">
                              <strong>📊 Estado:</strong> 
                              <span className={`factible-badge ${
                                  resultadoSimulacion.simulacion.esFactible ? 'yes' : 'no'
                              }`}>
                                {resultadoSimulacion.simulacion.esFactible ? 'FACTIBLE' : 'NO FACTIBLE'}
                              </span>
                            </div>
                            <div className="result-item">
                              <strong>⚗️ Consumo Necesario:</strong> {resultadoSimulacion.simulacion.cantidadNecesaria} mL
                            </div>
                            <div className="result-item">
                              <strong>💧 Disponible:</strong> {resultadoSimulacion.simulacion.cantidadDisponible} mL
                            </div>
                            <div className="result-item">
                              <strong>📈 Rendimiento:</strong> {resultadoSimulacion.simulacion.rendimientoEstimado}%
                            </div>
                          </div>
                        </div>
                      )}

                      {resultadoSimulacion && !resultadoSimulacion.success && (
                        <div className="simulator-error">
                          <h6>❌ Error en simulación</h6>
                          <p>{resultadoSimulacion.error || 'Error desconocido'}</p>
                        </div>
                      )}

                      {lotes.length > 0 && (
                        <div className="lotes-reference">
                          <h6>📋 Lotes disponibles para simulación</h6>
                          <div className="reference-table">
                            <table className="table">
                              <thead>
                                <tr>
                                  <th>Lote</th>
                                  <th>Pruebas Restantes</th>
                                  <th>Vencimiento</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lotes.map(lote => (
                                  <tr key={lote.Id}>
                                    <td>
                                      <code>{lote.NumeroLote}</code>
                                    </td>
                                    <td>{Math.floor(lote.PruebasRestantes)}</td>
                                    <td>{formatLocalDate(lote.FechaVencimiento)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'calculadora' && (
                <div className="tab-panel active">
                  <CalculadoraRendimiento />
                </div>
              )}
            </div>
          </div>
        </div>

        {showLotForm && (
          <LotForm 
            onSave={handleCreateLot}
            onClose={() => setShowLotForm(false)}
          />
        )}

        {showEditForm && editingLot && (
          <EditLotForm 
            lot={editingLot}
            onSave={handleEditLot}
            onClose={() => {
              setShowEditForm(false);
              setEditingLot(null);
            }}
          />
        )}
      </div>
    );
  }

  // =============================================
  // VISTA LISTA DE REACTIVOS CON BÚSQUEDA
  // =============================================
  return (
    <div className="reagents-container">
      <div className="page-header">
        <div className="header-content">
          <h2>🧪 Reactivos</h2>
          <span className="badge">{filteredReagents.length} de {reactivos.length} reactivos</span>
        </div>
        
        {/* 🔍 BARRA DE BÚSQUEDA INTELIGENTE */}
        <div className="search-container">
          <div className="search-box">
            <div className="search-input-group">
              <input
                type="text"
                className="search-input"
                placeholder="🔍 Buscar reactivos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                  title="Limpiar búsqueda"
                >
                  ×
                </button>
              )}
            </div>
            
            <select
              className="search-category"
              value={searchCategory}
              onChange={(e) => setSearchCategory(e.target.value)}
            >
              <option value="todo">🔎 Buscar en todo</option>
              <option value="codigo">🔢 Código</option>
              <option value="nombre">📛 Nombre</option>
              <option value="cas">🔬 N° CAS</option>
              <option value="formula">🧪 Fórmula</option>
              <option value="pureza">📊 Pureza</option>
              <option value="riesgo">⚠️ Riesgo</option>
              <option value="almacenamiento">🏪 Almacenamiento</option>
            </select>
          </div>
          
          {searchTerm && (
            <div className="search-info">
              <small>
                Mostrando {filteredReagents.length} de {reactivos.length} reactivos
                {searchCategory !== 'todo' && ` • Filtrado por: ${getCategoryLabel(searchCategory)}`}
              </small>
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando reactivos...</p>
        </div>
      )}

      {!loading && reactivos.length === 0 && (
        <div className="empty-state">
          <h4>📭 No hay reactivos registrados</h4>
          <p>No se encontraron reactivos en el sistema.</p>
        </div>
      )}

      {!loading && reactivos.length > 0 && filteredReagents.length === 0 && searchTerm && (
        <div className="empty-state">
          <h4>🔍 No se encontraron resultados</h4>
          <p>No hay reactivos que coincidan con "{searchTerm}" en {getCategoryLabel(searchCategory)}.</p>
          <button 
            className="btn btn-secondary"
            onClick={() => setSearchTerm('')}
          >
            Limpiar búsqueda
          </button>
        </div>
      )}

      {!loading && filteredReagents.length > 0 && (
        <div className="reagents-table">
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>N° CAS</th>
                <th>Fórmula</th>
                <th>Pureza</th>
                <th>Riesgo</th>
                <th>Almacenamiento</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {filteredReagents.map(reactivo => (
                <tr 
                  key={reactivo.id} 
                  className="reagent-row"
                  onClick={() => handleReagentClick(reactivo)}
                >
                  <td>
                    <strong>{reactivo.codigo}</strong>
                  </td>
                  <td>{reactivo.nombre}</td>
                  <td>{reactivo.cas_number || 'N/A'}</td>
                  <td>{reactivo.formula || 'N/A'}</td>
                  <td>{reactivo.pureza || 'N/A'}</td>
                  <td>
                    <span className={`risk-badge ${reactivo.categoria_riesgo}`}>
                      {reactivo.categoria_riesgo || 'N/A'}
                    </span>
                  </td>
                  <td>{reactivo.condiciones_almacenamiento || 'N/A'}</td>
                  <td>
                    <span className={`stock-badge ${
                      parseFloat(reactivo.stock_actual) <= parseFloat(reactivo.stock_critico) ? 'critical' :
                      parseFloat(reactivo.stock_actual) <= parseFloat(reactivo.stock_minimo) ? 'low' : 'normal'
                    }`}>
                      {reactivo.stock_actual} {reactivo.unidad}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// 🔍 FUNCIÓN AUXILIAR PARA ETIQUETAS DE BÚSQUEDA
const getCategoryLabel = (category) => {
  const labels = {
    todo: 'Todos los campos',
    codigo: 'Código',
    nombre: 'Nombre',
    cas: 'N° CAS',
    formula: 'Fórmula',
    pureza: 'Pureza',
    riesgo: 'Nivel de riesgo',
    almacenamiento: 'Almacenamiento'
  };
  return labels[category] || 'Todos los campos';
};

const InfoRow = ({ label, value }) => (
  <div className="info-row">
    <span className="info-label">{label}:</span>
    <span className="info-value">{value || 'N/A'}</span>
  </div>
);

export default Reagents;
