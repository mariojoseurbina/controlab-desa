// React Component: PanelControlConsumo.jsx
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

    // Cargar datos iniciales
    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    const cargarDatosIniciales = async () => {
        setVerificando(true);
        try {
            const [verifResponse, lotesResponse] = await Promise.all([
                fetch('/api/consumo/verificar-stock'),
                fetch('/api/consumo/estado-lotes')
            ]);
            
            const verifData = await verifResponse.json();
            const lotesData = await lotesResponse.json();
            
            if (verifData.success) setDatosVerificacion(verifData.data);
            if (lotesData.success) setLotes(lotesData.data.lotes);
            
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setVerificando(false);
        }
    };

    const procesarExamenesPendientes = async () => {
        Modal.confirm({
            title: '⚠️ Procesar Exámenes Pendientes',
            content: (
                <div>
                    <p>¿Está seguro de procesar TODOS los exámenes pendientes?</p>
                    <Alert 
                        message="Esta acción:"
                        description={
                            <ul>
                                <li>Descontará reactivos de los lotes (FIFO)</li>
                                <li>Marcará los exámenes como procesados</li>
                                <li>Actualizará el inventario automáticamente</li>
                            </ul>
                        }
                        type="info"
                        showIcon
                    />
                    {datosVerificacion?.insuficientes > 0 && (
                        <Alert 
                            message={`⚠️ ${datosVerificacion.insuficientes} reactivos con stock insuficiente`}
                            type="warning"
                            showIcon
                            style={{ marginTop: 10 }}
                        />
                    )}
                </div>
            ),
            onOk: async () => {
                setProcesando(true);
                try {
                    const response = await fetch('/api/consumo/procesar-examenes-pendientes', {
                        method: 'POST'
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        notification.success({
                            message: '✅ Procesamiento Completado',
                            description: data.message,
                            duration: 5
                        });
                        
                        // Mostrar resultados detallados
                        Modal.success({
                            title: '📊 Resultados del Procesamiento',
                            width: 900,
                            content: <ResultadosProcesamiento data={data.data} />,
                            onOk: () => cargarDatosIniciales()
                        });
                    } else {
                        notification.warning({
                            message: '⚠️ Stock Insuficiente',
                            description: 'Revise los reactivos con stock bajo',
                            duration: 5
                        });
                        
                        Modal.warning({
                            title: '📋 Reactivos con Stock Insuficiente',
                            content: <StockInsuficiente data={data.data} />
                        });
                    }
                } catch (error) {
                    notification.error({
                        message: '❌ Error',
                        description: error.message
                    });
                } finally {
                    setProcesando(false);
                }
            }
        });
    };

    const columnsVerificacion = [
        {
            title: 'Prueba',
            dataIndex: 'nombre_prueba',
            key: 'prueba'
        },
        {
            title: 'Pruebas Pendientes',
            dataIndex: 'pruebas_pendientes',
            key: 'pendientes',
            render: (valor) => <strong>{parseInt(valor)}</strong>
        },
        {
            title: 'Necesario (ml)',
            dataIndex: 'ml_necesarios',
            key: 'necesario',
            render: (valor) => `${parseFloat(valor).toFixed(2)} ml`
        },
        {
            title: 'Disponible (ml)',
            dataIndex: 'stock_disponible_ml',
            key: 'disponible',
            render: (valor) => `${parseFloat(valor).toFixed(2)} ml`
        },
        {
            title: 'Estado',
            dataIndex: 'estado_stock',
            key: 'estado',
            render: (estado, record) => {
                const necesario = parseFloat(record.ml_necesarios);
                const disponible = parseFloat(record.stock_disponible_ml);
                const porcentaje = (disponible / necesario * 100) || 0;
                
                return (
                    <div>
                        <Tag color={estado === 'SUFICIENTE' ? 'green' : 'red'}>
                            {estado}
                        </Tag>
                        <Progress 
                            percent={Math.min(porcentaje, 100)}
                            size="small"
                            status={porcentaje < 100 ? 'exception' : 'normal'}
                            style={{ marginTop: 5, width: '100px' }}
                        />
                    </div>
                );
            }
        }
    ];

    const columnsLotes = [
        {
            title: 'Lote',
            dataIndex: 'NumeroLote',
            key: 'lote'
        },
        {
            title: 'Reactivo ID',
            dataIndex: 'InventarioId',
            key: 'reactivo'
        },
        {
            title: 'Stock (ml)',
            dataIndex: 'CantidadActual',
            key: 'stock',
            render: (valor, record) => (
                <div>
                    <strong>{parseFloat(valor).toFixed(2)} ml</strong>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        {parseInt(record.pruebas_posibles || 0)} pruebas posibles
                    </div>
                </div>
            )
        },
        {
            title: 'Vencimiento',
            dataIndex: 'dias_vencimiento',
            key: 'vencimiento',
            render: (dias) => (
                <Tag color={
                    dias <= 0 ? 'red' : 
                    dias <= 30 ? 'orange' : 
                    'green'
                }>
                    {dias <= 0 ? 'VENCIDO' : `${dias} días`}
                </Tag>
            )
        },
        {
            title: 'Alerta',
            dataIndex: 'nivel_alerta',
            key: 'alerta',
            render: (alerta) => (
                <Tag color={
                    alerta === 'AGOTADO' ? 'red' : 
                    alerta === 'CRÍTICO' ? 'red' : 
                    alerta === 'BAJO' ? 'orange' : 
                    alerta === 'POR VENCER' ? 'yellow' : 
                    'green'
                }>
                    {alerta}
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
                        title="🚀 Panel de Control - Descuento Automático"
                        extra={
                            <Button
                                type="primary"
                                icon={<PlayCircleOutlined />}
                                onClick={procesarExamenesPendientes}
                                loading={procesando}
                                size="large"
                            >
                                Procesar Exámenes Pendientes
                            </Button>
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
                                        title="Reactivos Suficientes"
                                        value={datosVerificacion.resumen?.suficientes || 0}
                                        valueStyle={{ color: 'green' }}
                                        prefix={<CheckCircleOutlined />}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="Reactivos Insuficientes"
                                        value={datosVerificacion.resumen?.insuficientes || 0}
                                        valueStyle={{ color: 'red' }}
                                        prefix={<WarningOutlined />}
                                    />
                                </Col>
                                <Col span={6}>
                                    <Statistic
                                        title="Total Necesario"
                                        value={datosVerificacion.resumen?.totalMlNecesarios?.toFixed(2) || 0}
                                        suffix="ml"
                                        prefix={<DatabaseOutlined />}
                                    />
                                </Col>
                            </Row>
                        )}
                        
                        {datosVerificacion?.insuficientes > 0 && (
                            <Alert
                                message="⚠️ Alerta de Stock"
                                description={`${datosVerificacion.insuficientes} reactivos tienen stock insuficiente para procesar todos los exámenes.`}
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
                        title="📋 Verificación de Stock por Prueba" 
                        size="small"
                        style={{ height: '500px', overflow: 'auto' }}
                    >
                        {datosVerificacion?.verificacion ? (
                            <Table
                                columns={columnsVerificacion}
                                dataSource={datosVerificacion.verificacion}
                                rowKey="nombre_prueba"
                                pagination={false}
                                size="small"
                                scroll={{ y: 350 }}
                            />
                        ) : (
                            <Spin tip="Cargando verificación..." />
                        )}
                    </Card>
                </Col>
                
                <Col span={12}>
                    <Card 
                        title="📦 Estado de Lotes Activos" 
                        size="small"
                        style={{ height: '500px', overflow: 'auto' }}
                        extra={
                            <Tag color="blue">
                                Total: {lotes.length} lotes
                            </Tag>
                        }
                    >
                        <Table
                            columns={columnsLotes}
                            dataSource={lotes}
                            rowKey="Id"
                            pagination={false}
                            size="small"
                            scroll={{ y: 350 }}
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
                message="✅ Procesamiento Completado"
                description={`${data.procesadosExitosos} de ${data.totalExamenes} exámenes procesados exitosamente`}
                type="success"
                showIcon
                style={{ marginBottom: 20 }}
            />
            
            <Table
                columns={[
                    { title: 'Examen', dataIndex: ['examen'] },
                    { title: 'Pruebas', dataIndex: 'cantidadPruebas' },
                    { title: 'Consumido', dataIndex: 'consumidoTotal', render: v => `${v} ml` },
                    { title: 'Lotes Usados', dataIndex: 'lotesUtilizados' },
                    { title: 'Estado', dataIndex: 'success', render: v => v ? '✅' : '❌' }
                ]}
                dataSource={data.detalle}
                rowKey="examen"
                pagination={false}
                size="small"
            />
            
            <div style={{ marginTop: 20 }}>
                <h4>📊 Resumen:</h4>
                <ul>
                    <li>Total exámenes: {data.totalExamenes}</li>
                    <li>Procesados exitosamente: {data.procesadosExitosos}</li>
                    <li>Con errores: {data.conErrores}</li>
                    <li>Reactivos utilizados: {data.reporte?.reactivosUtilizados?.length || 0}</li>
                </ul>
            </div>
        </div>
    );
};

// Componente para stock insuficiente
const StockInsuficiente = ({ data }) => {
    return (
        <div>
            <Alert
                message="⚠️ Stock Insuficiente"
                description="No se puede procesar porque algunos reactivos no tienen stock suficiente"
                type="error"
                showIcon
                style={{ marginBottom: 20 }}
            />
            
            <Table
                columns={[
                    { title: 'Prueba', dataIndex: 'prueba' },
                    { title: 'Necesario', dataIndex: 'necesario', render: v => `${v} ml` },
                    { title: 'Disponible', dataIndex: 'disponible', render: v => `${v} ml` },
                    { 
                        title: 'Diferencia', 
                        dataIndex: 'diferencia', 
                        render: v => <Tag color="red">{v.toFixed(2)} ml faltantes</Tag>
                    }
                ]}
                dataSource={data.insuficientes}
                rowKey="prueba"
                pagination={false}
                size="small"
            />
            
            <Alert
                message="Solución:"
                description="Agregue más reactivos al inventario o reduzca la cantidad de exámenes pendientes."
                type="info"
                showIcon
                style={{ marginTop: 20 }}
            />
        </div>
    );
};

export default PanelControlConsumo;