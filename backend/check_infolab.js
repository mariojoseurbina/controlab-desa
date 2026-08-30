const { executeQuery } = require('./config/database');

async function checkInfolab() {
    try {
        console.log("=== Tablas en Infolab ===");
        const tables = await executeQuery(`
            SELECT TABLE_NAME 
            FROM Infolab.INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE'
        `);
        console.log(tables.map(t => t.TABLE_NAME).join(', '));
        
        console.log("\n=== Columnas en Pacientes (si existe) ===");
        const pacColumns = await executeQuery(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM Infolab.INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Pacientes' OR TABLE_NAME = 'Paciente'
        `);
        console.log(pacColumns);

        console.log("\n=== Columnas en Examenes (si existe) ===");
        const exColumns = await executeQuery(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM Infolab.INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Examenes' OR TABLE_NAME = 'Examen'
        `);
        console.log(exColumns);
        
        console.log("\n=== Columnas en Ordenes (si existe) ===");
        const ordColumns = await executeQuery(`
            SELECT COLUMN_NAME, DATA_TYPE 
            FROM Infolab.INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Ordenes' OR TABLE_NAME = 'Orden'
        `);
        console.log(ordColumns);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        process.exit();
    }
}

checkInfolab();
