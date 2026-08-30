import React, { useState } from 'react';
import { Card, Row, Col, Button, Alert, Steps, Result, message, Modal } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../../../services/api';

const { Step } = Steps;

const ProcesarDescuento = ({ fecha, onProcesoCompletado }) => {
    const [pasoActual, setPasoActual] = useState(0);
    const [cargando, setCargando] = useState(false);
    const [resultadoSimulacion, setResultadoSimulacion] = useState(null);
    const [resultadoEjecucion, setResultadoEjecucion] = useState(null);

    const simularDescuento = async () => {
        setCargando(true);
        try {
            const response = await api.post('/descuentos/simular', { fecha });
            setResultadoSimulacion(response.data.data || {});
            setPasoActual(1);
            message.success('Simulación completada');
        } catch (error) {
            message.error('Error en simulación');
        } finally {
            setCargando(false);
        }
    };

    const ejecutarDescuentoReal = () => {
        Modal.confirm({
            title: '⚠️ Confirmar Ejecución Real',
            content: 'Esta acción descontará reactivos de los lotes. ¿Está seguro de continuar?',
            okText: 'Ejecutar',
            cancelText: 'Cancelar',
            okType: 'danger',
            onOk: async () => {
                await ejecutarProcesoReal();
            }
        });
    };

    const ejecutarProcesoReal = async () => {
        setCargando(true);
        try {
            const response = await api.post('/descuentos/ejecutar', { fecha });
            setResultadoEjecucion(response.data.data || {});
            setPasoActual(2);
            message.success('Descuento ejecutado correctamente');
            if (onProcesoCompletado) onProcesoCompletado();
        } catch (error) {
            message.error('Error ejecutando descuento');
        } finally {
            setCargando(false);
        }
    };

    const renderContenidoPorPaso = () => {
        switch (pasoActual) {
            case 0:
                return (
                    <Card>
                        <Alert
                            message="Paso 1: Simular Descuento"
                            description="Revise qué se descontaría sin afectar el inventario real."
                            type="info"
                            showIcon
                            className="mb-3"
                        />
                        <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            onClick={simularDescuento}
                            loading={cargando}
                            size="large"
                            block
                        >
                            Ejecutar Simulación
                        </Button>
                    </Card>
                );

            case 1:
                return (
                    <Card>
                        <Alert
                            message="Paso 2: Resultados de Simulación"
                            description="Revise el resumen antes de ejecutar el descuento real."
                            type="warning"
                            showIcon
                            className="mb-3"
                        />
                        
                        {resultadoSimulacion && (
                            <Row gutter={16} className="mb-3">
                                <Col span={6}>
                                    <Card size="small">
                                        <div className="text-center">
                                            <div className="text-lg">{resultadoSimulacion.ExamenesProcesados || 0}</div>
                                            <small>Exámenes</small>
                                        </div>
                                    </Card>
                                </Col>
                                <Col span={6}>
                                    <Card size="small">
                                        <div className="text-center">
                                            <div className="text-lg">{resultadoSimulacion.PruebasProcesadas || 0}</div>
                                            <small>Pruebas</small>
                                        </div>
                                    </Card>
                                </Col>
                                <Col span={6}>
                                    <Card size="small">
                                        <div className="text-center">
                                            <div className="text-lg">{resultadoSimulacion.ReactivosUtilizados || 0}</div>
                                            <small>Reactivos</small>
                                        </div>
                                    </Card>
                                </Col>
                                <Col span={6}>
                                    <Card size="small">
                                        <div className="text-center">
                                            <div className="text-lg">{resultadoSimulacion.TotalMlDescontados || 0}</div>
                                            <small>mL totales</small>
                                        </div>
                                    </Card>
                                </Col>
                            </Row>
                        )}

                        <Button
                            type="primary"
                            danger
                            icon={<CheckCircleOutlined />}
                            onClick={ejecutarDescuentoReal}
                            loading={cargando}
                            size="large"
                            block
                        >
                            Ejecutar Descuento Real
                        </Button>

                        <Button
                            type="default"
                            onClick={() => setPasoActual(0)}
                            className="mt-2"
                            block
                        >
                            Volver a Simular
                        </Button>
                    </Card>
                );

            case 2:
                return (
                    <Card>
                        <Result
                            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                            title="Proceso Completado"
                            subTitle="El descuento ha sido aplicado correctamente al inventario."
                            extra={[
                                <Button
                                    type="primary"
                                    key="console"
                                    onClick={() => window.location.reload()}
                                >
                                    Actualizar Dashboard
                                </Button>,
                                <Button key="buy" onClick={() => setPasoActual(0)}>
                                    Nuevo Proceso
                                </Button>
                            ]}
                        />
                    </Card>
                );

            default:
                return null;
        }
    };

    return (
        <div>
            <Steps current={pasoActual} className="mb-4">
                <Step title="Simular" description="Verificar descuento" />
                <Step title="Ejecutar" description="Aplicar al inventario" />
                <Step title="Completado" description="Proceso finalizado" />
            </Steps>

            {renderContenidoPorPaso()}

            <Card className="mt-3">
                <Alert
                    message="Recordatorio Importante"
                    description="El descuento se aplica sobre la jornada actual. El inventario actualizado se reflejará a partir del día siguiente."
                    type="info"
                    showIcon
                />
            </Card>
        </div>
    );
};

export default ProcesarDescuento;