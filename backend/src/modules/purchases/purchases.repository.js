const prisma = require('../../core/prisma');

class PurchasesRepository {
  async findAll() {
    return prisma.compras_inventario.findMany({
      orderBy: { fecha_creacion: 'desc' }
    });
  }

  async findById(id) {
    return prisma.compras_inventario.findUnique({
      where: { id: parseInt(id) }
    });
  }

  async create(data) {
    const {
      proveedor_id,
      numero_factura,
      fecha_compra,
      fecha_recibido,
      item_id,
      cantidad,
      precio_unitario,
      total_linea,
      estado,
      creado_por
    } = data;

    return prisma.compras_inventario.create({
      data: {
        proveedor_id: proveedor_id ? parseInt(proveedor_id) : null,
        numero_factura,
        fecha_compra: fecha_compra ? new Date(fecha_compra) : null,
        fecha_recibido: fecha_recibido ? new Date(fecha_recibido) : null,
        item_id: item_id ? parseInt(item_id) : null,
        cantidad: cantidad ? parseFloat(cantidad) : null,
        precio_unitario: precio_unitario ? parseFloat(precio_unitario) : null,
        total_linea: total_linea ? parseFloat(total_linea) : null,
        estado,
        creado_por: creado_por || 'admin',
        fecha_creacion: new Date(),
        fecha_actualizacion: new Date()
      }
    });
  }

  async update(id, data) {
    const {
      proveedor_id,
      numero_factura,
      fecha_compra,
      fecha_recibido,
      item_id,
      cantidad,
      precio_unitario,
      total_linea,
      estado,
      creado_por
    } = data;

    return prisma.compras_inventario.update({
      where: { id: parseInt(id) },
      data: {
        proveedor_id: proveedor_id ? parseInt(proveedor_id) : null,
        numero_factura,
        fecha_compra: fecha_compra ? new Date(fecha_compra) : null,
        fecha_recibido: fecha_recibido ? new Date(fecha_recibido) : null,
        item_id: item_id ? parseInt(item_id) : null,
        cantidad: cantidad ? parseFloat(cantidad) : null,
        precio_unitario: precio_unitario ? parseFloat(precio_unitario) : null,
        total_linea: total_linea ? parseFloat(total_linea) : null,
        estado,
        creado_por,
        fecha_actualizacion: new Date()
      }
    });
  }

  async delete(id) {
    return prisma.compras_inventario.delete({
      where: { id: parseInt(id) }
    });
  }
}

module.exports = new PurchasesRepository();
