const { PrismaClient } = require('@prisma/client');
const sql = require('mssql');

const prisma = new PrismaClient();

const infolabConfig = {
    user: 'infolab',
    password: '110367',
    server: 'localhost',
    database: 'Infolab',
    options: {
        encrypt: false,
        trustServerCertificate: true,
        requestTimeout: 600000 // 10 minutos
    }
};

async function migrateData() {
    let pool;
    try {
        console.log('🔌 Conectando a Infolab...');
        pool = await sql.connect(infolabConfig);
        console.log('✅ Conectado a Infolab.');

        // 1. Migrar Pacientes
        console.log('🔄 Obteniendo Pacientes de Infolab...');
        const pacientesResult = await pool.request().query(`
            SELECT 
                ID, Nombre, Apellido, Cedula, FNacimiento, Sexo, Telefono, Mail, Dir1, FecUltAct
            FROM Pacientes
        `);
        const pacientes = pacientesResult.recordset;
        console.log(`📦 Encontrados ${pacientes.length} pacientes.`);

        let pacientesNuevos = 0;
        let pacientesExistentes = 0;

        console.log('⏳ Insertando pacientes en Controlab H (Prisma)...');
        // Mapeo para saber qué ID de Infolab corresponde a qué ID de ControlabH
        const mapPacienteId = {}; 
        
        // Creamos un diccionario local de pacientes para acelerar la comprobación si son demasiados
        const localPacientes = await prisma.paciente.findMany({ select: { id: true, identificacion: true } });
        const localMap = {};
        for(let lp of localPacientes) {
            localMap[lp.identificacion] = lp.id;
        }

        const pacientesAInsertar = [];
        const seenIdentificacion = new Set(Object.keys(localMap));

        for (let i = 0; i < pacientes.length; i++) {
            const p = pacientes[i];
            
            // Generar identificacion fallback
            let ident = p.Cedula ? p.Cedula.trim() : `INFO-${p.ID}`;
            if (!ident) continue;

            if (localMap[ident]) {
                pacientesExistentes++;
                mapPacienteId[p.ID] = localMap[ident];
            } else {
                if (seenIdentificacion.has(ident)) {
                    // Deduplicate
                    ident = `${ident}-INFO${p.ID}`;
                }
                seenIdentificacion.add(ident);

                // Preparamos para batch insert
                pacientesAInsertar.push({
                    identificacion: ident,
                    nombre: p.Nombre ? p.Nombre.trim() : 'Desconocido',
                    apellido: p.Apellido ? p.Apellido.trim() : 'Desconocido',
                    fecha_nacimiento: p.FNacimiento ? new Date(p.FNacimiento) : new Date('1900-01-01'),
                    sexo: p.Sexo === 'M' ? 'Masculino' : (p.Sexo === 'F' ? 'Femenino' : 'Desconocido'),
                    telefono: p.Telefono ? p.Telefono.substring(0, 50) : null,
                    correo: p.Mail ? p.Mail.substring(0, 100) : null,
                    direccion: p.Dir1 ? p.Dir1.substring(0, 500) : null,
                    activo: true,
                    fecha_registro: p.FecUltAct ? new Date(p.FecUltAct) : new Date()
                });
                pacientesNuevos++;
            }
        }
        
        if (pacientesAInsertar.length > 0) {
            console.log(`⏳ Insertando ${pacientesAInsertar.length} pacientes en batch...`);
            // Insertamos en batch
            // CreateMany no devuelve los IDs generados, así que luego tenemos que volver a consultarlos
            const batchSize = 5000;
            for (let i = 0; i < pacientesAInsertar.length; i += batchSize) {
                const batch = pacientesAInsertar.slice(i, i + batchSize);
                await prisma.paciente.createMany({
                    data: batch
                });
                console.log(`✅ Insertados hasta el índice ${i + batch.length}`);
            }

            // Actualizar diccionario
            const nuevosPacientes = await prisma.paciente.findMany({ select: { id: true, identificacion: true } });
            for(let lp of nuevosPacientes) {
                localMap[lp.identificacion] = lp.id;
            }
            
            // Llenar el mapa de IDs
            for (let p of pacientes) {
                const ident = p.Cedula ? p.Cedula.trim() : `INFO-${p.ID}`;
                if (localMap[ident]) {
                    mapPacienteId[p.ID] = localMap[ident];
                }
            }
        }
        
        console.log(`🎉 Migración de Pacientes completada. Nuevos: ${pacientesNuevos}, Existentes: ${pacientesExistentes}`);

        // 2. Migrar Exámenes / Órdenes
        console.log('🔄 Obteniendo Órdenes/Exámenes de Infolab...');
        // Join con Ingresos para obtener el idPaciente
        const examenesResult = await pool.request().query(`
            SELECT 
                O.idMuestra,
                O.idExamen,
                O.FHOrden,
                O.StatusExa,
                E.Reporte as NombreExamen,
                I.idPaciente as InfolabPacienteID
            FROM Ordenes O
            INNER JOIN Examenes E ON O.idExamen = E.ID
            INNER JOIN Ingresos I ON I.ID = O.idMuestra
            ORDER BY O.FHOrden DESC
        `);
        
        const examenesInfolab = examenesResult.recordset;
        console.log(`📦 Encontrados ${examenesInfolab.length} órdenes (limitado a 50k recientes para prueba/migración).`);

        const examenesAInsertar = [];
        let ordenesExistentes = 0;
        
        const localExamenes = await prisma.examenHumano.findMany({ select: { codigo_orden: true } });
        const localExamenesMap = new Set(localExamenes.map(e => e.codigo_orden));

        for (let i = 0; i < examenesInfolab.length; i++) {
            const ex = examenesInfolab[i];
            const controlabPacienteId = mapPacienteId[ex.InfolabPacienteID];
            
            if (!controlabPacienteId) continue; // Paciente no encontrado o no migrado

            const codigoOrden = `INFO-${ex.idMuestra}-${ex.idExamen}`;
            
            if (localExamenesMap.has(codigoOrden)) {
                ordenesExistentes++;
                continue;
            }

            let estadoStr = 'PENDIENTE';
            if (ex.StatusExa === 'R' || ex.StatusExa === 'I') estadoStr = 'COMPLETO';
            else if (ex.StatusExa === 'P') estadoStr = 'PARCIAL';

            examenesAInsertar.push({
                codigo_orden: codigoOrden,
                paciente_id: controlabPacienteId,
                fecha_muestra: ex.FHOrden ? new Date(ex.FHOrden) : new Date(),
                fecha_resultado: (estadoStr === 'COMPLETO' && ex.FHOrden) ? new Date(ex.FHOrden) : null,
                estado: estadoStr,
                observaciones: `Examen histórico Infolab: ${ex.NombreExamen}`,
                fecha_creacion: ex.FHOrden ? new Date(ex.FHOrden) : new Date()
            });
        }

        if (examenesAInsertar.length > 0) {
            console.log(`⏳ Insertando ${examenesAInsertar.length} órdenes/exámenes en batch...`);
            const batchSize = 5000;
            for (let i = 0; i < examenesAInsertar.length; i += batchSize) {
                const batch = examenesAInsertar.slice(i, i + batchSize);
                await prisma.examenHumano.createMany({
                    data: batch
                });
                console.log(`✅ Insertados órdenes hasta el índice ${i + batch.length}`);
            }
        }
        
        console.log(`🎉 Migración de Órdenes completada. Nuevas: ${examenesAInsertar.length}, Existentes/Saltadas: ${ordenesExistentes}`);

    } catch (error) {
        console.error('❌ Error en la migración:', error);
    } finally {
        if (pool) {
            await pool.close();
            console.log('🔌 Conexión a Infolab cerrada.');
        }
        await prisma.$disconnect();
        console.log('🔌 Conexión a Prisma cerrada.');
    }
}

migrateData();
