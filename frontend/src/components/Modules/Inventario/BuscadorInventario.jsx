// components/Inventario/BuscadorInventario.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Input, Select, Card, List, Tag, Button, Empty, Spin, Alert } from 'antd';
import { SearchOutlined, PlusOutlined, BarcodeOutlined } from '@ant-design/icons';

const BuscadorInventario = ({ onSeleccionarItem, modoSeleccion = false }) => {
    const [resultados, setResultados] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [categoria, setCategoria] = useState('todas');
    const [categorias, setCategorias] = useState([]);
    const [timer, setTimer] = useState(null);

    // Cargar categorías al iniciar
    useEffect(() => {
        cargarCategorias();
    }, []);

    const cargarCategorias = async () => {
        try {
            const response = await fetch('/api/inventario/categorias');
            const data = await response.json();
            setCategorias(data);
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    };

    // Búsqueda con debounce
    const realizarBusqueda = useCallback(async (termino, cat) => {
        if (!termino && cat === 'todas') {
            setResultados([]);
            return;
        }

        setCargando(true);
        try {
            const params = new URLSearchParams({
                query: termino,
                categoria: cat,
                limit: 100
            });

            const response = await fetch(`/api/inventario/buscar?${params}`);
            const data = await response.json();
            setResultados(data);
        } catch (error) {
            console.error('Error en búsqueda:', error);
        }
        setCargando(false);
    }, []);

    // Debounce para búsqueda en tiempo real
    useEffect(() => {
        if (timer) {
            clearTimeout(timer);
        }

        const newTimer = setTimeout(() => {
            realizarBusqueda(busqueda, categoria);
        }, 300);

        setTimer(newTimer);

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [busqueda, categoria, realizarBusqueda]);

    const getColorCategoria = (cat) => {
        const colores = {
            'reactivo': 'blue',
            'material': 'green',
            'equipo': 'orange',
            'consumible': 'purple',
            'vidrio': 'cyan'
        };
        return colores[cat] || 'default';
    };

    const getEstadoStock = (stockActual, stockMinimo) => {
        if (stockActual <= 0) return { texto: 'AGOTADO', color: 'red' };
        if (stockActual <= stockMinimo) return { texto: 'BAJO', color: 'orange' };
        return { texto: 'DISPONIBLE', color: 'green' };
    };

    return (
        <Card 
            title="🔍 Buscador de Inventario" 
            size="small"
            className="buscador-inventario"
        >
            {/* BARRA DE BÚSQUEDA */}
            <div className="flex gap-2 mb-4">
                <Input
                    placeholder="Buscar por código, nombre o descripción..."
                    prefix={<SearchOutlined />}
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    allowClear
                    style={{ flex: 2 }}
                />
                
                <Select
                    value={categoria}
                    onChange={setCategoria}
                    style={{ flex: 1 }}
                    placeholder="Todas las categorías"
                >
                    <Select.Option value="todas">Todas las categorías</Select.Option>
                    {categorias.map(cat => (
                        <Select.Option key={cat} value={cat}>
                            {cat.toUpperCase()}
                        </Select.Option>
                    ))}
                </Select>
            </div>

            {/* RESULTADOS */}
            <div className="resultados-busqueda">
                {cargando ? (
                    <div className="text-center py-8">
                        <Spin size="large" />
                        <p className="mt-2 text-gray-500">Buscando items...</p>
                    </div>
                ) : resultados.length === 0 && (busqueda || categoria !== 'todas') ? (
                    <Empty 
                        description={
                            busqueda ? 
                            `No se encontraron items para "${busqueda}"` : 
                            "No hay items en esta categoría"
                        }
                    >
                        {busqueda && (
                            <Button 
                                type="primary" 
                                icon={<PlusOutlined />}
                                onClick={() => {/* función para crear nuevo item */}}
                            >
                                Crear Nuevo Item
                            </Button>
                        )}
                    </Empty>
                ) : resultados.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                        <SearchOutlined style={{ fontSize: '48px' }} />
                        <p>Ingresa un término de búsqueda</p>
                    </div>
                ) : (
                    <List
                        dataSource={resultados}
                        renderItem={(item) => (
                            <List.Item
                                className={`item-inventario ${modoSeleccion ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                                onClick={() => modoSeleccion && onSeleccionarItem(item)}
                                actions={modoSeleccion ? [
                                    <Button 
                                        type="link" 
                                        icon={<PlusOutlined />}
                                        onClick={() => onSeleccionarItem(item)}
                                    >
                                        Seleccionar
                                    </Button>
                                ] : []}
                            >
                                <List.Item.Meta
                                    avatar={
                                        <div className="text-center">
                                            <BarcodeOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
                                            <div className="text-xs mt-1 font-mono">
                                                {item.codigo}
                                            </div>
                                        </div>
                                    }
                                    title={
                                        <div className="flex items-center gap-2">
                                            <span>{item.nombre}</span>
                                            <Tag color={getColorCategoria(item.categoria)}>
                                                {item.categoria}
                                            </Tag>
                                            <Tag color={getEstadoStock(item.stock_actual, item.stock_minimo).color}>
                                                {getEstadoStock(item.stock_actual, item.stock_minimo).texto}
                                            </Tag>
                                        </div>
                                    }
                                    description={
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">
                                                {item.descripcion}
                                            </p>
                                            <div className="flex gap-4 text-xs text-gray-500">
                                                <span>
                                                    <strong>Stock:</strong> {item.stock_actual} 
                                                    {item.stock_minimo > 0 && ` / Mín: ${item.stock_minimo}`}
                                                </span>
                                                {item.proveedor && (
                                                    <span><strong>Proveedor:</strong> {item.proveedor}</span>
                                                )}
                                                {item.ubicacion && (
                                                    <span><strong>Ubicación:</strong> {item.ubicacion}</span>
                                                )}
                                            </div>
                                        </div>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </div>

            {/* ESTADÍSTICAS RÁPIDAS */}
            {resultados.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>{resultados.length} items encontrados</span>
                        <span>
                            {resultados.filter(item => item.stock_actual <= item.stock_minimo).length} con stock bajo
                        </span>
                    </div>
                </div>
            )}
        </Card>
    );
};

export default BuscadorInventario;