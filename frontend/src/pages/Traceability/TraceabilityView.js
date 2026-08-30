import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './TraceabilityView.css';

const TraceabilityView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal State
  const [selectedLog, setSelectedLog] = useState(null);
  
  const [filters, setFilters] = useState({
    accion: '',
    entidad: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      // Construir query string con filtros activos
      const params = new URLSearchParams();
      if (filters.accion) params.append('accion', filters.accion);
      if (filters.entidad) params.append('entidad', filters.entidad);
      if (filters.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
      if (filters.fecha_fin) params.append('fecha_fin', filters.fecha_fin);

      const response = await api.get(`/audit?${params.toString()}`);
      if (response.data && response.data.success) {
        setLogs(response.data.logs);
      } else {
        throw new Error(response.data?.error || 'Error al obtener la trazabilidad');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const getActionColorClass = (accion) => {
    const act = accion?.toUpperCase() || '';
    if (act.includes('CREAR')) return 'action-badge-success';
    if (act.includes('ELIMINAR')) return 'action-badge-danger';
    if (act.includes('APERTURA') || act.includes('MODIFICAR_INSERTO')) return 'action-badge-warning';
    if (act.includes('MOVIMIENTO') || act.includes('TRANSFERIR')) return 'action-badge-info';
    return 'action-badge-default';
  };

  const extractSummary = (jsonStr) => {
    if (!jsonStr) return '-';
    try {
      const obj = JSON.parse(jsonStr);
      if (obj.mensaje) return obj.mensaje;
      if (obj.accion) return obj.accion;
      if (obj.motivo) return obj.motivo;
      return 'Actualización de registros';
    } catch (e) {
      return 'Detalles registrados';
    }
  };

  const renderJsonDetails = (jsonStr) => {
    if (!jsonStr) return <p>Sin detalles adicionales</p>;
    try {
      const obj = JSON.parse(jsonStr);
      return (
        <table className="details-json-table">
          <tbody>
            {Object.entries(obj).map(([key, value]) => (
              <tr key={key}>
                <td className="json-key">{key}</td>
                <td className="json-val">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    } catch (e) {
      return <div className="json-raw">{jsonStr}</div>;
    }
  };

  return (
    <div className="traceability-container fade-in">
      <header className="trace-header">
        <div className="trace-header-content">
          <h1>Auditoría Integral</h1>
          <p>Registro de Actividad, Movimientos y Seguridad</p>
        </div>
      </header>

      <section className="trace-filters-card glass-panel">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Acción / Evento</label>
            <input 
              type="text" 
              name="accion" 
              placeholder="Ej. APERTURA_LOTE, CREAR..." 
              value={filters.accion} 
              onChange={handleFilterChange} 
            />
          </div>
          <div className="filter-group">
            <label>Módulo</label>
            <select name="entidad" value={filters.entidad} onChange={handleFilterChange}>
              <option value="">Todos los módulos</option>
              <option value="LOTE">Reactivos / Lotes</option>
              <option value="MOVIMIENTO">Movimientos de Inventario</option>
              <option value="COMPRA">Compras y Finanzas</option>
              <option value="USUARIO">Gestión de Usuarios</option>
              <option value="ITEM_INVENTARIO">Maestro de Inventario</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Fecha Inicio</label>
            <input type="date" name="fecha_inicio" value={filters.fecha_inicio} onChange={handleFilterChange} />
          </div>
          <div className="filter-group">
            <label>Fecha Fin</label>
            <input type="date" name="fecha_fin" value={filters.fecha_fin} onChange={handleFilterChange} />
          </div>
          <div className="filter-actions">
            <button className="btn-refresh" onClick={fetchLogs}>
              🔄 Refrescar
            </button>
          </div>
        </div>
      </section>

      {error && <div className="trace-error-banner">{error}</div>}

      <section className="trace-grid-section">
        {loading ? (
          <div className="trace-loading-spinner">Cargando registros...</div>
        ) : logs.length === 0 ? (
          <div className="trace-empty-state">No se encontraron registros de auditoría.</div>
        ) : (
          <div className="data-grid-container">
            <table className="audit-data-grid">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Usuario Responsable</th>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th>Resumen del Evento</th>
                  <th className="text-center">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="grid-row">
                    <td className="cell-date">
                      {new Date(log.fecha_registro).toLocaleString('es-VE')}
                    </td>
                    <td className="cell-user">
                      <span className="user-icon">👤</span> 
                      {log.usuario?.nombre_completo || 'Desconocido'}
                    </td>
                    <td className="cell-module">
                      {log.entidad} 
                      {log.entidad_id && <span className="entity-id">#{log.entidad_id}</span>}
                    </td>
                    <td className="cell-action">
                      <span className={`action-badge ${getActionColorClass(log.accion)}`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="cell-summary">
                      {extractSummary(log.detalles_json)}
                    </td>
                    <td className="cell-actions text-center">
                      <button 
                        className="btn-view-details" 
                        onClick={() => setSelectedLog(log)}
                        title="Ver detalles profundos del cambio"
                      >
                        🔍 Inspeccionar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal para Detalles JSON */}
      {selectedLog && (
        <div className="audit-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="audit-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detalles de Auditoría</h2>
              <button className="btn-close-modal" onClick={() => setSelectedLog(null)}>✖</button>
            </div>
            <div className="modal-body">
              <div className="modal-meta-grid">
                <div><strong>Acción:</strong> <span className={`action-badge ${getActionColorClass(selectedLog.accion)}`}>{selectedLog.accion}</span></div>
                <div><strong>Módulo:</strong> {selectedLog.entidad} #{selectedLog.entidad_id}</div>
                <div><strong>Responsable:</strong> {selectedLog.usuario?.nombre_completo || 'N/A'} (@{selectedLog.usuario?.usuario || 'N/A'})</div>
                <div><strong>Fecha:</strong> {new Date(selectedLog.fecha_registro).toLocaleString('es-VE')}</div>
                <div><strong>IP:</strong> {selectedLog.direccion_ip || 'Interna'}</div>
              </div>
              
              <h3 className="details-title">Antes y Después (Carga Útil)</h3>
              <div className="json-inspector">
                {renderJsonDetails(selectedLog.detalles_json)}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TraceabilityView;
