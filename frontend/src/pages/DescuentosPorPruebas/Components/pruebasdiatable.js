import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Modal, Form, Select, InputNumber, message } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import api from '../../../services/api';

const PruebasDiaTable = ({ fecha, onMapeoGuardado }) => {
    const [pruebas, setPruebas] = useState([]);
    const [reactivos, setReactivos] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [pruebaSeleccionada, setPruebaSeleccionada] = useState(null);
    const [form] = Form.useForm();

    useEffect(() => {
        cargarPruebas();
        cargarReactivos();
    }, [fecha]);

    const cargarPruebas = async () => {
        try {
            const response = await api.get(`/descuentos/pruebas-dia?fecha=${fecha}`);
            setPruebas(response.data.data || []);
        } catch (error) {
            message.error('Error cargando pruebas');
        }
    };

    const cargarReactivos = async () => {
        try {
            const response = await api.get('/reactivos/activos');
            setReactivos(response.data.data || []);
        } catch (error) {
            message.error('Error cargando reactivos');
        }
    };

    const abrirModalMapeo = (prueba) => {
        setPruebaSeleccionada(prueba);
        form.setFieldsValue({
            nombre_prueba: prueba.examen_nombre,
            reactivo_id: undefined,
            consumo_por_prueba: 0.1
        });
        setModalVisible(true);
    };

    const guardarMapeo = async (values) => {
        try {
            await api.post('/descuentos/mapeos', values);
            message.success('Mapeo guardado correctamente');
            setModalVisible(false);
            form.resetFields();
            cargarPruebas();
            if (onMapeoGuardado) onMapeoGuardado();
        } catch (error) {
            message.error('Error guardando mapeo');
        }
    };

    const columns = [
        {
            title: 'Examen',
            dataIndex: 'examen_nombre',
            key: 'examen',
            width: 250
        },
        {
            title: 'Cantidad',
            dataIndex: 'cantidad_realizada',
            key: 'cantidad',
            width: 100,
            render: (value) => <Tag color="blue">{value}</Tag>
        },
        {
            title: 'Estado',
            key: 'estado',
            width: 150,
            render: (_, record) => {
                if (record.examen_id_controlab) {
                    return <Tag color="green">Mapeado</Tag>;
                }
                return <Tag color="red">Sin mapear</Tag>;
            }
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 120,
            render: (_, record) => (
                <Space>
                    {!record.examen_id_controlab && (
                        <Button
                            type="link"
                            size="small"
                            icon={<LinkOutlined />}
                            onClick={() => abrirModalMapeo(record)}
                        >
                            Mapear
                        </Button>
                    )}
                </Space>
            )
        }
    ];

    return (
        <>
            <Table
                columns={columns}
                dataSource={pruebas}
                rowKey="examen_nombre"
                size="middle"
                pagination={{ pageSize: 10 }}
            />

            {/* Modal para mapear */}
            <Modal
                title={`Mapear: ${pruebaSeleccionada?.examen_nombre}`}
                visible={modalVisible}
                onCancel={() => setModalVisible(false)}
                onOk={() => form.submit()}
                width={500}
            >
                <Form form={form} layout="vertical" onFinish={guardarMapeo}>
                    <Form.Item name="nombre_prueba" hidden>
                        <input />
                    </Form.Item>
                    
                    <Form.Item
                        name="reactivo_id"
                        label="Seleccionar Reactivo"
                        rules={[{ required: true, message: 'Seleccione un reactivo' }]}
                    >
                        <Select
                            placeholder="Buscar reactivo..."
                            showSearch
                            optionFilterProp="children"
                        >
                            {reactivos.map(reactivo => (
                                <Select.Option key={reactivo.id} value={reactivo.id}>
                                    {reactivo.nombre} ({reactivo.codigo})
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    
                    <Form.Item
                        name="consumo_por_prueba"
                        label="Consumo por prueba (mL)"
                        rules={[{ required: true, message: 'Ingrese el consumo' }]}
                    >
                        <InputNumber
                            min={0.01}
                            max={100}
                            step={0.01}
                            style={{ width: '100%' }}
                            placeholder="Ej: 0.15"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default PruebasDiaTable;