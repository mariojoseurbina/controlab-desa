const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Obtener todos los mapeos actuales
router.get('/', async (req, res) => {
    try {
        const mapeos = await prisma.mapeo_pruebas_reactivos.findMany();
        // Obtener nombres de reactivos para enriquecer
        const items = await prisma.itemInventario.findMany({
            select: { id: true, nombre: true, codigo: true }
        });
        
        const data = mapeos.map(m => {
            const item = items.find(i => i.id === m.reactivo_id);
            return {
                ...m,
                reactivo_nombre: item ? item.nombre : 'Desconocido',
                reactivo_codigo: item ? item.codigo : 'N/A'
            };
        });
        
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching mapeos:', error);
        res.status(500).json({ success: false, message: 'Error interno.' });
    }
});

// 2. Obtener lista de reactivos para los selects/excel
router.get('/reactivos', async (req, res) => {
    try {
        const items = await prisma.itemInventario.findMany({
            select: { id: true, nombre: true, codigo: true },
            orderBy: { nombre: 'asc' }
        });
        res.json({ success: true, data: items });
    } catch (error) {
        console.error('Error fetching reactivos:', error);
        res.status(500).json({ success: false, message: 'Error interno.' });
    }
});

// 3. Guardar o actualizar un mapeo manual
router.post('/', async (req, res) => {
    try {
        const { id, nombre_prueba, patron_busqueda, reactivo_id, consumo_por_prueba, activo } = req.body;
        
        const dataPayload = {
            nombre_prueba,
            patron_busqueda,
            reactivo_id: parseInt(reactivo_id),
            consumo_por_prueba: parseFloat(consumo_por_prueba),
            activo: activo !== undefined ? activo : true,
            fecha_actualizacion: new Date(),
            tipo_mapeo: 'DIRECTO',
            prioridad: 1
        };

        if (id) {
            await prisma.mapeo_pruebas_reactivos.update({
                where: { id: parseInt(id) },
                data: dataPayload
            });
        } else {
            await prisma.mapeo_pruebas_reactivos.create({
                data: dataPayload
            });
        }
        
        res.json({ success: true, message: 'Mapeo guardado exitosamente.' });
    } catch (error) {
        console.error('Error saving mapeo:', error);
        res.status(500).json({ success: false, message: 'Error al guardar.' });
    }
});

// 4. Carga Masiva (Array parseado desde Excel)
router.post('/upload', async (req, res) => {
    try {
        const { mapeos } = req.body;
        if (!mapeos || !Array.isArray(mapeos)) {
            return res.status(400).json({ success: false, message: 'Formato inválido.' });
        }

        let agregados = 0;
        let actualizados = 0;

        for (const row of mapeos) {
            // Se asume que el Excel envía: ID_Mapeo (opcional), Nombre Prueba, Patrón Búsqueda, ID Reactivo, Consumo
            if (!row.Patron_Busqueda || !row.ID_Reactivo) continue;

            const reactivoId = parseInt(row.ID_Reactivo);
            if (isNaN(reactivoId)) continue;

            // Delete duplicates first to avoid errors
            const existingMany = await prisma.mapeo_pruebas_reactivos.findMany({
                where: { patron_busqueda: row.Patron_Busqueda }
            });
            let existing = existingMany[0];
            
            if(existingMany.length > 1) {
                 for(let i = 1; i < existingMany.length; i++){
                      await prisma.mapeo_pruebas_reactivos.delete({where: {id: existingMany[i].id}});
                 }
            }

            const data = {
                nombre_prueba: row.Nombre_Prueba || row.Patron_Busqueda,
                patron_busqueda: row.Patron_Busqueda,
                reactivo_id: reactivoId,
                consumo_por_prueba: parseFloat(row.Consumo_mL) || 0.25,
                activo: true,
                fecha_actualizacion: new Date(),
                tipo_mapeo: 'EXCEL_MASS',
                prioridad: 1
            };

            if (existing) {
                await prisma.mapeo_pruebas_reactivos.update({
                    where: { id: existing.id },
                    data
                });
                actualizados++;
            } else {
                await prisma.mapeo_pruebas_reactivos.create({
                    data
                });
                agregados++;
            }
        }

        res.json({ success: true, message: 'Proceso completado. Agregados: ' + agregados + ', Actualizados: ' + actualizados });
    } catch (error) {
        console.error('Error mass upload mapeo:', error);
        res.status(500).json({ success: false, message: 'Error al procesar el Excel.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await prisma.mapeo_pruebas_reactivos.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true, message: 'Borrado con éxito' });
    } catch(e) {
        res.status(500).json({ success: false });
    }
});

module.exports = router;

