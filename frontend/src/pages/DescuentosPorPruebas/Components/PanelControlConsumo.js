// React Component: PanelControlConsumo.jsx - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { 
    Card, Button, Alert, Table, Tag, Spin, 
    Row, Col, Statistic, Progress, Modal, notification 
} from 'antd';
import { 
    PlayCircleOutlined, 
    DatabaseOutlined,
    WarningOutlined,
    CheckCircleOutlined,
    FileTextOutlined 
} from '@ant-design/icons';

const PanelControlConsumo = () => {
    const [loading, setLoading] = useState(false);
    const [verificando, setVerificando] = useState(false);
    const [datosVerificacion, setDatosVerificacion] = useState(null);
    const [lotes, setLotes] = useState([]);
    const [procesando, setProcesando] = useState(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState('2026-02-10'); // Fecha fija para demo

    // Cargar datos iniciales
    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    const cargarDatosIniciales = async () => {
        setVerificando(true);
        try {
            // 🎯 CORRECCIÓN: Usar endpoints REALES que existen
            const [verifResponse, lotesResponse] = await Promise.all([
                fetch('/api/descuentos/verificar-jornada', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fecha: fechaSeleccionada })
                }),
                fetch('/api/lotes')  // Este endpoint SÍ existe
            ]);
            
            const verifData = await verifResponse.json();
            const lotesData = await lotesResponse.json();
            
            console.log('✅ Datos de verificación:', verifData);
            console.log('✅ Datos de lotes:', lotesData);
            
            if (verifData.success) {
                // Adaptar datos al formato que espera el componente
                setDatosVerificacion({
                    totalExamenesPendientes: verifData.datos?.pendientes || 0,
                    insuficientes: verifData.datos?.sin_mapeo || 0,
                    resumen: {
                        suficientes: verifData.datos?.con_mapeo || 0,
                        insuficientes: verifData.datos?.sin_mapeo || 0,
                        totalMlNecesarios: 0 // Calcular si tienes los datos
                    },
                    verificacion: [] // Array de verificaciones individuales
                });
            }
            
            if (lotesData.success) {
                setLotes(lotesData.lotes || []);
            }
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            notification.error({
                message: 'Error de conexión',
                description: 'No se pudo conectar con el servidor'
            });
        } finally {
            setVerificando(false);
        }
    };

    const procesarExamenesPendientes = async () => {
        Modal.confirm({
            title: '🎯 PROCESAR JORNADA COMPLETA',
            content: (
                <div>
                    <p>¿Está seguro de procesar TODOS los exámenes pendientes para la fecha?</p>
                    <Alert 
                        message="Esta acción realizará:"
                        description={
                            <ul>
                                <li><strong>Descuento automático</strong> de reactivos por pruebas</li>
                                <li><strong>Actualización en tiempo real</strong> de inventario</li>
                                <li><strong>Registro automático</strong> de movimientos</li>
                                <li><strong>Marcado como procesado</strong> en el sistema</li>
                            </ul>
                        }
                        type="info"
                        showIcon
                    />
                    <div style={{ marginTop: 15 }}>
                        <strong>Fecha seleccionada:</strong> {fechaSeleccionada}
                    </div>
                </div>
            ),
            onOk: async () => {
                setProcesando(true);
                try {
                    console.log('🚀 Llamando a procesar-jornada...');
                    
                    // 🎯 CORRECCIÓN: Usar el endpoint REAL
                    const response = await fetch('/api/descuentos/procesar-jornada', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fecha: fechaSeleccionada })
                    });
                    
                    const data = await response.json();
                    console.log('✅ Respuesta del servidor:', data);
                    
                    if (data.success) {
                        notification.success({
                            message: '✅ PROCESAMIENTO EXITOSO',
                            description: data.message || 'Jornada procesada correctamente',
                            duration: 5
                        });
                        
                        // Mostrar resultados detallados
                        Modal.success({
                            title: '📊 RESULTADOS DEL PROCESAMIENTO',
                            width: 900,
                            content: <ResultadosProcesamiento data={data} />,
                            onOk: () => cargarDatosIniciales() // Recargar datos
                        });
                    } else {
                        notification.warning({
                            message: '⚠️ PROCESAMIENTO PARCIAL',
                            description: data.message || 'Algunos exámenes no se pudieron procesar',
                            duration: 5
                        });
                        
                        if (data.resultados) {
                            Modal.info({
                                title: '📋 DETALLES DEL PROCESAMIENTO',
                                content: <DetallesProcesamiento data={data} />
                            });
                        }
                    }
                } catch (error) {
                    console.error('❌ Error:', error);
                    notification.error({
                        message: '❌ ERROR DE CONEXIÓN',
                        description: 'No se pudo conectar con el servidor. Verifica que esté corriendo.'
                    });
                } finally {
                    setProcesando(false);
                }
            }
        });
    };

    // Columnas para la tabla de verificación (simplificada)
    const columnsVerificacion = [
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            render: (estado) => (
                <Tag color={estado === 'LISTO' ? 'green' : 'orange'}>
                    {estado}
                </Tag>
            )
        },
        {
            title: 'Descripción',
            dataIndex: 'descripcion',
            key: 'descripcion'
        },
        {
            title: 'Valor',
            dataIndex: 'valor',
            key: 'valor'
        }
    ];

    // Datos de ejemplo para la tabla de verificación
    const datosVerificacionTabla = datosVerificacion ? [
        {
            key: '1',
            estado: datosVerificacion.totalExamenesPendientes > 0 ? 'PENDIENTE' : 'PROCESADO',
            descripcion: 'Exámenes pendientes',
            valor: datosVerificacion.totalExamenesPendientes
        },
        {
            key: '2',
            estado: datosVerificacion.resumen?.suficientes > 0 ? 'SUFICIENTE' : 'INSUFICIENTE',
            descripcion: 'Reactivos con mapeo',
            valor: datosVerificacion.resumen?.suficientes || 0
        },
        {
            key: '3',
            estado: datosVerificacion.insuficientes > 0 ? 'ALERTA' : 'OK',
            descripcion: 'Reactivos sin mapeo',
            valor: datosVerificacion.insuficientes || 0
        }
    ] : [];

    const columnsLotes = [
        {
            title: 'Lote',
            dataIndex: 'NumeroLote',
            key: 'lote'
        },
        {
            title: 'Reactivo',
            dataIndex: 'ItemNombre',
            key: 'reactivo'
        },
        {
            title: 'Stock Actual',
            dataIndex: 'CantidadActual',
            key: 'stock',
            render: (valor) => (
                <div>
                    <strong>{parseFloat(valor || 0).toFixed(2)} ml</strong>
                </div>
            )
        },
        {
            title: 'Estado',
            dataIndex: 'Estado',
            key: 'estado',
            render: (estado) => (
                <Tag color={estado === 'Activo' ? 'green' : 'red'}>
                    {estado}
                </Tag>
            )
        }
    ];

    if (verificando) {
        return (
            <div style={{ textAlign: 'center', padding: 100 }}>
                <Spin size="large" tip="Cargando datos del sistema..." />
            </div>
        );
    }

    return (
        <div style={{ padding: 20 }}>
            <Row gutter={16} style={{ marginBottom: 20 }}>
                <Col span={24}>
                    <Card
                        title="🎯 SISTEMA DE DESCUENTOS AUTOMÁTICOS"
                        extra={
                            <div style={{ display: 'flex', gap: 10 }}>
                                <input 
                                    type="date" 
                                    value={fechaSeleccionada}
                                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                                    style={{ padding: '5px 10px', border: '1px solid #d9d9d9', borderRadius: 4 }}
                                />
                                <Button
                                    type="primary"
                                    icon={<PlayCircleOutlined />}
                                    onClick={procesarExamenesPendientes}
                                    loading={procesando}
                                    size="large"
                                >
                                    🎯 IR A PROCESAR
                                </Button>
                            </div>
                        }
                    >
                        {datosVerificacion && (
                            <Row gutter={16} style={{ marginBottom: 20 }}>
                                <Col span={6}>
                                    <Statistic
                                        title="Exámenes Pendientes"
                                        value={datosVerificacion.totalExamenesPendientes}
                                        prefix={<FileTextOutlined />}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="Con mapeo"
                                        value={datosVerificacion.resumen?.suficientes || 0}
                                        valueStyle={{ color: 'green' }}
                                        prefix={<CheckCircleOutlined />}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="Sin mapeo"
                                        value={datosVerificacion.insuficientes || 0}
                                        valueStyle={{ color: 'orange' }}
                                        prefix={<WarningOutlined />}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="Estado"
                                        value={datosVerificacion.totalExamenesPendientes > 0 ? 'PENDIENTE' : 'PROCESADO'}
                                        valueStyle={{ 
                                            color: datosVerificacion.totalExamenesPendientes > 0 ? 'orange' : 'green'
                                        }}
                                        prefix={<DatabaseOutlined />}
                                    />
                                </Col>
                            </Row>
                        )}
                        
                        {datosVerificacion?.insuficientes > 0 && (
                            <Alert
                                message="⚠️ Atención"
                                description={`Hay ${datosVerificacion.insuficientes} exámenes sin mapeo de reactivos. Se procesarán solo los que tienen mapeo.`}
                                type="warning"
                                showIcon
                                style={{ marginBottom: 20 }}
                            />
                        )}
                    </Card>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <Card 
                        title="🔍 VERIFICACIÓN DE LA JORNADA" 
                        size="small"
                        style={{ height: '400px', overflow: 'auto' }}
                    >
                        <Table
                            columns={columnsVerificacion}
                            dataSource={datosVerificacionTabla}
                            rowKey="key"
                            pagination={false}
                            size="small"
                        />
                        
                        <div style={{ marginTop: 20 }}>
                            <Button 
                                type="default" 
                                onClick={cargarDatosIniciales}
                                loading={verificando}
                                icon={<DatabaseOutlined />}
                            >
                                Actualizar verificación
                            </Button>
                        </div>
                    </Card>
                </Col>
                
                <Col span={12}>
                    <Card 
                        title="📦 LOTES DISPONIBLES" 
                        size="small"
                        style={{ height: '400px', overflow: 'auto' }}
                        extra={
                            <Tag color="blue">
                                {lotes.length} lotes activos
                            </Tag>
                        }
                    >
                        <Table
                            columns={columnsLotes}
                            dataSource={lotes}
                            rowKey="Id"
                            pagination={false}
                            size="small"
                            scroll={{ y: 250 }}
                        />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

// Componente para mostrar resultados
const ResultadosProcesamiento = ({ data }) => {
    return (
        <div>
            <Alert
                message="✅ PROCESAMIENTO COMPLETADO"
                description={`${data.resumen?.exitosos || 0} exámenes procesados exitosamente`}
                type="success"
                showIcon
                style={{ marginBottom: 20 }}
            />
            
            {data.resultados && data.resultados.length > 0 && (
                <Table
                    columns={[
                        { title: 'Examen', dataIndex: 'examen' },
                        { title: 'Pruebas', dataIndex: 'pruebas' },
                        { title: 'Reactivo', dataIndex: 'reactivo' },
                        { title: 'Lote', dataIndex: 'lote' },
                        { title: 'Consumo', dataIndex: 'consumo', render: v => `${v} ml` },
                        { title: 'Estado', dataIndex: 'estado', render: v => (
                            <Tag color={v.includes('✅') ? 'green' : v.includes('❌') ? 'red' : 'orange'}>
                                {v}
                            </Tag>
                        )}
                    ]}
                    dataSource={data.resultados}
                    rowKey="examen"
                    pagination={false}
                    size="small"
                />
            )}
            
            {data.resumen && (
                <div style={{ marginTop: 20, padding: 15, background: '#f6ffed', borderRadius: 4 }}>
                    <h4>📊 RESUMEN FINAL:</h4>
                    <ul>
                        <li><strong>Fecha procesada:</strong> {data.fecha}</li>
                        <li><strong>Total exámenes:</strong> {data.resumen.total_examenes}</li>
                        <li><strong>Procesados exitosamente:</strong> {data.resumen.exitosos} ✅</li>
                        <li><strong>Con errores:</strong> {data.resumen.con_errores} ⚠️</li>
                        <li><strong>Consumo total:</strong> {data.resumen.consumo_total || 0} ml</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

// Componente para detalles
const DetallesProcesamiento = ({ data }) => {
    return (
        <div>
            <pre style={{ 
                background: '#f5f5f5', 
                padding: 15, 
                borderRadius: 4,
                maxHeight: 400,
                overflow: 'auto'
            }}>
                {JSON.stringify(data, null, 2)}
            </pre>
        </div>
    );
};

export default PanelControlConsumo;