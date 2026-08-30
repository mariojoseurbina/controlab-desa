import React, { useState, useEffect } from 'react';
import { Button, Form, Row, Col, Table, Badge } from 'react-bootstrap';

const FormularioKit = ({ kit, reactivos, onGuardar, onCancelar }) => {
  const [formData, setFormData] = useState({
    codigo_kit: '',
    nombre_kit: '',
    tipo_prueba: 'Hematología',
    descripcion: '',
    reactivos: []
  });

  const [nuevoReactivo, setNuevoReactivo] = useState({
    id_reactivo: '',
    cantidad_utilizada: '',
    unidad: 'ml',
    es_obligatorio: true
  });

  useEffect(() => {
    if (kit) {
      // Si estamos editando, cargar los datos del kit
      setFormData({
        codigo_kit: kit.codigo_kit,
        nombre_kit: kit.nombre_kit,
        tipo_prueba: kit.tipo_prueba,
        descripcion: kit.descripcion,
        reactivos: kit.reactivos || []
      });
    }
  }, [kit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReactivoChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNuevoReactivo(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const agregarReactivo = () => {
    if (!nuevoReactivo.id_reactivo || !nuevoReactivo.cantidad_utilizada) {
      alert('Debe seleccionar un reactivo y especificar la cantidad');
      return;
    }

    const reactivoSeleccionado = reactivos.find(r => r.id == nuevoReactivo.id_reactivo);
    if (!reactivoSeleccionado) return;

    const reactivo = {
      id_reactivo: nuevoReactivo.id_reactivo,
      cantidad_utilizada: parseFloat(nuevoReactivo.cantidad_utilizada),
      unidad: nuevoReactivo.unidad,
      es_obligatorio: nuevoReactivo.es_obligatorio,
      nombre_reactivo: reactivoSeleccionado.nombre,
      orden: formData.reactivos.length + 1
    };

    setFormData(prev => ({
      ...prev,
      reactivos: [...prev.reactivos, reactivo]
    }));

    // Resetear el formulario de reactivo
    setNuevoReactivo({
      id_reactivo: '',
      cantidad_utilizada: '',
      unidad: 'ml',
      es_obligatorio: true
    });
  };

  const eliminarReactivo = (index) => {
    setFormData(prev => ({
      ...prev,
      reactivos: prev.reactivos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.reactivos.length === 0) {
      alert('Debe agregar al menos un reactivo al kit');
      return;
    }
    onGuardar(formData);
  };

  return (
    <Form onSubmit={handleSubmit}>
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Código del Kit *</Form.Label>
            <Form.Control
              type="text"
              name="codigo_kit"
              value={formData.codigo_kit}
              onChange={handleInputChange}
              required
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Nombre del Kit *</Form.Label>
            <Form.Control
              type="text"
              name="nombre_kit"
              value={formData.nombre_kit}
              onChange={handleInputChange}
              required
            />
          </Form.Group>
        </Col>
      </Row>

      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>Tipo de Prueba</Form.Label>
            <Form.Select
              name="tipo_prueba"
              value={formData.tipo_prueba}
              onChange={handleInputChange}
            >
              <option value="Hematología">Hematología</option>
              <option value="Bioquímica">Bioquímica</option>
              <option value="Inmunología">Inmunología</option>
              <option value="Microbiología">Microbiología</option>
              <option value="PCR">PCR</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              type="text"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
            />
          </Form.Group>
        </Col>
      </Row>

      <h5>Reactivos del Kit</h5>

      <Row className="mb-3">
        <Col md={4}>
          <Form.Group>
            <Form.Label>Reactivo</Form.Label>
            <Form.Select
              name="id_reactivo"
              value={nuevoReactivo.id_reactivo}
              onChange={handleReactivoChange}
            >
              <option value="">Seleccionar...</option>
              {reactivos.map(reactivo => (
                <option key={reactivo.id} value={reactivo.id}>
                  {reactivo.nombre} (Stock: {reactivo.stock_actual} {reactivo.unidad})
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={2}>
          <Form.Group>
            <Form.Label>Cantidad</Form.Label>
            <Form.Control
              type="number"
              step="0.001"
              name="cantidad_utilizada"
              value={nuevoReactivo.cantidad_utilizada}
              onChange={handleReactivoChange}
            />
          </Form.Group>
        </Col>
        <Col md={2}>
          <Form.Group>
            <Form.Label>Unidad</Form.Label>
            <Form.Select
              name="unidad"
              value={nuevoReactivo.unidad}
              onChange={handleReactivoChange}
            >
              <option value="ml">ml</option>
              <option value="μl">μl</option>
              <option value="unidades">unidades</option>
              <option value="pruebas">pruebas</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={2}>
          <Form.Group>
            <Form.Label>Obligatorio</Form.Label>
            <Form.Check
              type="checkbox"
              name="es_obligatorio"
              checked={nuevoReactivo.es_obligatorio}
              onChange={handleReactivoChange}
              label="Sí"
            />
          </Form.Group>
        </Col>
        <Col md={2}>
          <Button variant="outline-primary" onClick={agregarReactivo} style={{ marginTop: '32px' }}>
            Agregar
          </Button>
        </Col>
      </Row>

      {formData.reactivos.length > 0 && (
        <Table striped bordered size="sm" className="mb-3">
          <thead>
            <tr>
              <th>Reactivo</th>
              <th>Cantidad</th>
              <th>Unidad</th>
              <th>Obligatorio</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {formData.reactivos.map((reactivo, index) => (
              <tr key={index}>
                <td>{reactivo.nombre_reactivo}</td>
                <td>{reactivo.cantidad_utilizada}</td>
                <td>{reactivo.unidad}</td>
                <td>
                  {reactivo.es_obligatorio ? (
                    <Badge bg="success">Sí</Badge>
                  ) : (
                    <Badge bg="secondary">No</Badge>
                  )}
                </td>
                <td>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => eliminarReactivo(index)}
                  >
                    Eliminar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="d-flex justify-content-end">
        <Button variant="secondary" onClick={onCancelar} className="me-2">
          Cancelar
        </Button>
        <Button variant="primary" type="submit">
          Guardar Kit
        </Button>
      </div>
    </Form>
  );
};

export default FormularioKit;