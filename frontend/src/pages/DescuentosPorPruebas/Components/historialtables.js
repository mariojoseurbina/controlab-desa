import React, { useState, useEffect } from 'react';
import { Table, Tag, DatePicker, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import moment from 'moment';
import api from '../../../services/api';

const HistorialTable = () => {
    const [historial, setHistorial] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [fechaInicio, setFechaInicio] = useState(moment().subtract(7, 'days'));
    const [fechaFin, setFechaFin] = useState(moment());

    useEffect(() => {
        cargarHistorial();
    }, []);

    const cargarHistorial = async () => {
        setCargando(true);
        try {
            const params = {
                fechaInicio: fechaInicio.format('YYYY-MM-DD'),
                fechaFin: fechaFin.format('YYYY-MM-DD')
            };
            
            const response = await api.get('/descuentos/historial', { params });
            setHistorial(response.data.data || []);
        } catch (error) {
            console.error('Error cargando historial:', error);
        } finally {
            setCargando(false);
        }
    };

    const columns = [
        {
            title: 'Fecha',
            dataIndex: 'fecha_proceso',
            key: 'fecha',
            width: 120,
            render: (fecha) => moment(fecha).format('DD/MM/YYYY')
        },
        {
            title: 'Hora',
            key: 'hora',
            width: 100,
            render: (_, record) => moment(record.fecha_inicio).format('HH:mm')
        },
        {
            title: 'Usuario',
            dataIndex: 'usuario',
            key: 'usuario',
            width: 120
        },
        {
            title: 'Modo',
            dataIndex: 'modo',
            key: 'modo',
            width: 100,
            render: (modo) => (
                <Tag color={modo === 'EJECUCION' ? 'green' : 'blue'}>
                    {modo}
                </Tag>
            )
        },
        {
            title: 'Estado',
            dataIndex: 'estado',
            key: 'estado',
            width: 100,
            render: (estado) => (
                <Tag color={estado === 'COMPLETADO' ? 'green' : 
                            estado === 'ERROR' ? 'red' : 'orange'}>
                    {estado}
                </Tag>
            )
        },
        {
            title: 'Detalles',
            dataIndex: 'detalles',
            key: 'detalles',
            ellipsis: true
        },
        {
            title: 'Duración',
            key: 'duracion',
            width: 100,
            render: (_, record) => {
                if (record.fecha_inicio && record.fecha_fin) {
                    const inicio = moment(record.fecha_inicio);
                    const fin = moment(record.fecha_fin);
                    const segundos = fin.diff(inicio, 'seconds');
                    return `${segundos}s`;
                }
                return '-';
            }
        }
    ];

    return (
        <div>
            {/* Filtros */}
            <Card className="mb-3" size="small">
                <Space>
                    <DatePicker
                        value={fechaInicio}
                        onChange={setFechaInicio}
                        format="DD/MM/YYYY"
                        placeholder="Fecha inicio"
                    />
                    <span>a</span>
                    <DatePicker
                        value={fechaFin}
                        onChange={setFechaFin}
                        format="DD/MM/YYYY"
                        placeholder="Fecha fin"
                    />
                    <Button
                        type="primary"
                        icon={<SearchOutlined />}
                        onClick={cargarHistorial}
                        loading={cargando}
                    >
                        Buscar
                    </Button>
                    <Button onClick={cargarHistorial}>
                        Actualizar
                    </Button>
                </Space>
            </Card>

            {/* Tabla */}
            <Table
                columns={columns}
                dataSource={historial}
                rowKey="id"
                loading={cargando}
                size="middle"
                pagination={{ pageSize: 10 }}
            />
        </div>
    );
};

export default HistorialTable;