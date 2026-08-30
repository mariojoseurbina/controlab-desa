import React, { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Popconfirm, message } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../../../services/api';

const MapeosTable = () => {
    const [mapeos, setMapeos] = useState([]);
    const [cargando, setCargando] = useState(false);

    useEffect(() => {
        cargarMapeos();
    }, []);

    const cargarMapeos = async () => {
        setCargando(true);
        try {
            const response = await api.get('/descuentos/mapeos');
            setMapeos(response.data.data || []);
        } catch (error) {
            message.error('Error cargando mapeos');
        } finally {
            setCargando(false);
        }
    };

    const desactivarMapeo = async (id) => {
        try {
            // En tu caso, actualizarías el campo 'activo' a 0
            await api.put(`/descuentos/mapeos/${id}`, { activo: 0 });
            message.success('Mapeo desactivado');
            cargarMapeos();
        } catch (error) {
            message.error('Error desactivando mapeo');
        }
    };

    const columns = [
        {
            title: 'Prueba',
            dataIndex: 'nombre_prueba',
            key: 'prueba',
            width: 200
        },
        {
            title: 'Reactivo',
            key: 'reactivo',
            width: 200,
            render: (_, record) => (
                <div>
                    <div>{record.reactivo_nombre}</div>
                    <small className="text-muted">{record.codigo}</small>
                </div>
            )
        },
        {
            title: 'Consumo/Prueba',
            dataIndex: 'consumo_por_prueba',
            key: 'consumo',
            width: 120,
            render: (valor) => `${valor} mL`
        },
        {
            title: 'Estado',
            dataIndex: 'activo',
            key: 'estado',
            width: 100,
            render: (activo) => (
                <Tag color={activo ? 'green' : 'red'}>
                    {activo ? 'Activo' : 'Inactivo'}
                </Tag>
            )
        },
        {
            title: 'Acciones',
            key: 'acciones',
            width: 100,
            render: (_, record) => (
                <Space>
                    <Button
                        type="link"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => message.info('Editar - implementar según necesidad')}
                    />
                    <Popconfirm
                        title="¿Desactivar este mapeo?"
                        onConfirm={() => desactivarMapeo(record.id)}
                    >
                        <Button
                            type="link"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <Table
            columns={columns}
            dataSource={mapeos}
            rowKey="id"
            loading={cargando}
            size="middle"
            pagination={{ pageSize: 10 }}
        />
    );
};

export default MapeosTable;