const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed para el LIS Humano...');

  // 1. Limpiar datos existentes (humano)
  await prisma.resultadoExamenHumano.deleteMany();
  await prisma.examenHumano.deleteMany();
  await prisma.valReferenciaExamenHumano.deleteMany();
  await prisma.parametroExamenHumano.deleteMany();
  await prisma.laboratorioReferencia.deleteMany();
  await prisma.paciente.deleteMany();

  console.log('🧹 Limpieza completada.');

  // 2. Crear Pacientes
  const juan = await prisma.paciente.create({
    data: {
      identificacion: '12345678',
      nombre: 'Juan',
      apellido: 'Perez',
      fecha_nacimiento: new Date('1988-03-10'), // Adulto
      sexo: 'Masculino',
      telefono: '555-0199',
      correo: 'juan.perez@email.com',
      direccion: 'Av. Libertador Nro 45, Caracas'
    }
  });

  const sofia = await prisma.paciente.create({
    data: {
      identificacion: '87654321',
      nombre: 'Sofía',
      apellido: 'Silva',
      fecha_nacimiento: new Date('2026-06-01'), // Bebé de 1 mes (al 1 de Julio de 2026)
      sexo: 'Femenino',
      telefono: '555-9822',
      correo: 'padres.sofia@email.com',
      direccion: 'Colinas del Norte, Calle C'
    }
  });

  console.log('👥 Pacientes creados:', juan.nombre, 'y', sofia.nombre);

  // 3. Crear Laboratorios de Referencia
  const labCentral = await prisma.laboratorioReferencia.create({
    data: {
      nombre: 'Laboratorio de Referencia Metropolitano',
      codigo: 'LAB_METROPOLITANO',
      telefono: '555-2244',
      correo: 'contacto@labmetro.com',
      direccion: 'Av. Principal de Las Mercedes, Caracas',
      contacto: 'Dra. María Colmenares'
    }
  });

  const bioPremium = await prisma.laboratorioReferencia.create({
    data: {
      nombre: 'Bio-Analítica Premium Internacional',
      codigo: 'BIO_PREMIUM_INT',
      telefono: '555-8899',
      correo: 'derivaciones@biopremium.com',
      direccion: 'Centro Empresarial Euro, Piso 4',
      contacto: 'Dr. Arthur Pendelton'
    }
  });

  console.log('🏢 Laboratorios de referencia creados:', labCentral.nombre, 'y', bioPremium.nombre);

  // 4. Crear Parámetros y Valores de Referencia
  // A. Hemoglobina (HGB)
  const hgb = await prisma.parametroExamenHumano.create({
    data: {
      nombre: 'Hemoglobina',
      codigo: 'HGB',
      unidad: 'g/dL'
    }
  });

  // HGB Adulto Masculino: 13.8 - 17.2 (edad >= 18 años -> 216 meses)
  await prisma.valReferenciaExamenHumano.create({
    data: {
      parametro_id: hgb.id,
      sexo: 'Masculino',
      edad_min_meses: 216,
      edad_max_meses: 12000,
      min_valor: 13.8,
      max_valor: 17.2
    }
  });

  // HGB Adulto Femenino: 12.1 - 15.1 (edad >= 18 años -> 216 meses)
  await prisma.valReferenciaExamenHumano.create({
    data: {
      parametro_id: hgb.id,
      sexo: 'Femenino',
      edad_min_meses: 216,
      edad_max_meses: 12000,
      min_valor: 12.1,
      max_valor: 15.1
    }
  });

  // HGB Bebé/Infantil (0 a 17 años -> 0 a 215 meses): 11.0 - 16.0
  await prisma.valReferenciaExamenHumano.create({
    data: {
      parametro_id: hgb.id,
      sexo: 'Ambos',
      edad_min_meses: 0,
      edad_max_meses: 215,
      min_valor: 11.0,
      max_valor: 16.0
    }
  });

  // B. Glicemia (GLU)
  const glu = await prisma.parametroExamenHumano.create({
    data: {
      nombre: 'Glicemia en ayunas',
      codigo: 'GLU',
      unidad: 'mg/dL'
    }
  });

  // Rango general: 70 - 100
  await prisma.valReferenciaExamenHumano.create({
    data: {
      parametro_id: glu.id,
      sexo: 'Ambos',
      edad_min_meses: 0,
      edad_max_meses: 12000,
      min_valor: 70.0,
      max_valor: 100.0
    }
  });

  // C. Colesterol Total (COL)
  const col = await prisma.parametroExamenHumano.create({
    data: {
      nombre: 'Colesterol Total',
      codigo: 'COL',
      unidad: 'mg/dL'
    }
  });

  // Rango general: 120 - 200
  await prisma.valReferenciaExamenHumano.create({
    data: {
      parametro_id: col.id,
      sexo: 'Ambos',
      edad_min_meses: 0,
      edad_max_meses: 12000,
      min_valor: 120.0,
      max_valor: 200.0
    }
  });

  console.log('🔬 Parámetros y Valores de Referencia Humanos creados.');

  // 5. Crear Examen Inicial de Prueba para Juan
  const examenJuan = await prisma.examenHumano.create({
    data: {
      codigo_orden: 'HUM-20260701-001',
      paciente_id: juan.id,
      fecha_muestra: new Date(),
      estado: 'PENDIENTE',
      observaciones: 'Paciente refiere ayuno de 12 horas.'
    }
  });

  await prisma.resultadoExamenHumano.create({
    data: {
      examen_id: examenJuan.id,
      parametro_id: glu.id,
      valor_numerico: null,
      valor_texto: null,
      fuera_rango: false
    }
  });

  await prisma.resultadoExamenHumano.create({
    data: {
      examen_id: examenJuan.id,
      parametro_id: col.id,
      valor_numerico: null,
      valor_texto: null,
      fuera_rango: false
    }
  });

  console.log('📝 Examen inicial de prueba creado para Juan Perez.');
  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
