# Esquema de Integración LIS: Prueba de Inmunodifusión en Agar Gel (IDGA / Test de Coggins) para Anemia Infecciosa Equina (AIE)

Este documento detalla la viabilidad y el esquema de configuración técnica para incorporar la prueba diagnóstica de **Anemia Infecciosa Equina (AIE)** por **Inmunodifusión en Agar Gel (IDGA)** en **Controlab Vet** sin realizar modificaciones en el código fuente.

---

## 1. Perspectiva Clínica Veterinaria (Rol: Médico Veterinario)

Como **Médico Veterinario**, el análisis de Anemia Infecciosa Equina mediante IDGA (Test de Coggins) representa la prueba de oro regulada por las entidades de sanidad agropecuaria a nivel mundial. Es una prueba crucial debido al carácter infectocontagioso crónico del lentivirus (familia *Retroviridae*):

* **Muestra de Entrada**: Suero sanguíneo equino (tubo rojo, libre de hemólisis extrema).
* **Interpretación Clínica**:
  * **Negativo (Normal)**: Sin bandas de precipitación inmunológica frente al antígeno viral oficial (glicoproteínas gp45 o p26). El equino se considera libre del virus para la fecha de muestreo y apto para expedición de guías de movilización.
  * **Positivo (Alterado/Patológico)**: Presencia de bandas de precipitación idénticas con el suero control. Implica portabilidad permanente y viremia activa. **Acción inmediata obligatoria**: Aislamiento estricto y notificación a las autoridades sanitarias oficiales para eutanasia o cuarentena permanente, ya que no existe vacuna ni cura.
  * **Sospechoso / No Concluyente**: Presencia de bandas débiles o atípicas; requiere repetición a los 14 días o confirmación por ELISA o PCR.

---

## 2. Factibilidad Técnica en Controlab Vet (Sin Modificar Código)

El diseño actual del modelo de datos y la interfaz de Controlab Vet es **completamente genérico** y soporta la incorporación de esta prueba a nivel de base de datos.
La validación en caliente del frontend y el formateo del PDF manejan de manera nativa los siguientes casos:
1. **Rangos Cualitativos**: A través del campo `texto_ref` en los valores de referencia.
2. **Validación Automática de Estados**: Al mapear numéricamente el resultado cualitativo (ej. `0` = Negativo, `1` = Positivo), permitiendo que la lógica actual de comparación numérica active el flag `fuera_rango` (Alterado) de forma automática.

---

## 3. Esquema de Datos en SQL Server (Prisma Schema Mapping)

Para registrar la prueba, se insertan los registros correspondientes en las tablas maestras de parámetros y rangos de referencia para la especie **Equino**:

### A. Registro del Parámetro (`ParametroExamen`)
Se define el parámetro de inmunodifusión con un código identificador cualitativo:
```sql
INSERT INTO parametros_examen (nombre, codigo, unidad, activo)
VALUES (
  'Inmunodifusión en Agar Gel (AIE - Test de Coggins)', 
  'AIE_IDGA', 
  'Cualitativo', 
  1
);
```

### B. Configuración de Referencia para Equinos (`ValReferenciaExamen`)
Establecemos el rango normal cualitativo (`texto_ref` = 'Negativo'). 
Para disparar el flag `fuera_rango = 1` (ALTERADO) en el backend y el frontend cuando el resultado sea positivo, usamos un mapeo numérico donde `0` es el valor de referencia máximo tolerado (Negativo):
```sql
-- Obtenemos el ID de la especie "Equino" y el parámetro "AIE_IDGA"
-- Se inserta el valor de referencia general para la especie (raza_id = NULL, sexo = NULL/Ambos):
INSERT INTO valores_referencia_examen (parametro_id, especie_id, raza_id, sexo, min_valor, max_valor, texto_ref)
VALUES (
  (SELECT id FROM parametros_examen WHERE codigo = 'AIE_IDGA'),
  (SELECT id FROM especies_vet WHERE nombre = 'Equino'),
  NULL, -- Aplica a todas las razas
  'Ambos', 
  0.00, -- Mínimo esperado
  0.00, -- Máximo esperado (cualquier valor > 0.00 será marcado como ALTERADO)
  'Negativo' -- Texto descriptivo que se muestra en el reporte y PDF
);
```

---

## 4. Flujo de Trabajo en el Sistema

### Paso 1: Creación de la Orden
El recepcionista registra una orden de examen para un paciente equino y selecciona el parámetro **`AIE_IDGA`**.

### Paso 2: Carga de Resultados (Bioanalista)
En la pantalla de carga de resultados (`/examenes/:id/resultados`), el sistema carga dinámicamente la fila del parámetro:
* **Parámetro**: `AIE_IDGA` (Inmunodifusión en Agar Gel)
* **Rango de Referencia**: `Negativo` (obtenido de `texto_ref`)
* **Valor Reportado (Numérico)**:
  * Si es negativo, el analista ingresa `0`.
  * Si es positivo, el analista ingresa `1`.
* **Comentarios / Cualitativo**: El analista escribe `"Negativo"` o `"Positivo (Precipitación Detectada)"` para complementar el reporte descriptivo.
* **Lógica del Estado**:
  * Si se ingresa `0` (Negativo): `val <= max_valor` ($0 \le 0$) $\rightarrow$ Estado: **NORMAL** (Fondo verde).
  * Si se ingresa `1` (Positivo): `val > max_valor` ($1 > 0$) $\rightarrow$ Estado: **ALTERADO** (Fondo rojo de advertencia).

### Paso 3: Emisión de Reporte PDF
El motor de generación PDF (`pdf.service.js`) escribe:
* **Línea de Resultado**: `AIE_IDGA` | `1.00 *` | `Cualitativo` | `Negativo` | `ALTERADO` (con asterisco y color rojo).
* **Observaciones**: Muestra el comentario del bioanalista: *"Positivo (Precipitación detectada. Notificar de inmediato al ente sanitario correspondiente)"*.

---

## 5. Script de Migración de Datos (Seed Complementario)
Para inyectar esta configuración directamente en la base de datos sin alterar el código de la aplicación, ejecutamos el siguiente código de semilla con Node.js:

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAIE() {
  console.log('Inserting EIA AGID parameter into DB...');
  
  // 1. Crear parámetro
  const parametro = await prisma.parametroExamen.upsert({
    where: { codigo: 'AIE_IDGA' },
    update: {
      nombre: 'Inmunodifusión en Agar Gel (AIE - Test de Coggins)',
      unidad: 'Cualitativo'
    },
    create: {
      nombre: 'Inmunodifusión en Agar Gel (AIE - Test de Coggins)',
      codigo: 'AIE_IDGA',
      unidad: 'Cualitativo',
      activo: true
    }
  });

  // 2. Obtener especie Equino
  const equino = await prisma.especie.findUnique({
    where: { nombre: 'Equino' }
  });

  if (!equino) {
    console.error('Species "Equino" not found. Seed canceled.');
    return;
  }

  // 3. Crear Rango de Referencia Cualitativo
  await prisma.valReferenciaExamen.create({
    data: {
      parametro_id: parametro.id,
      especie_id: equino.id,
      raza_id: null,
      sexo: 'Ambos',
      min_valor: 0.00,
      max_valor: 0.00,
      texto_ref: 'Negativo'
    }
  });

  console.log('EIA AGID parameter successfully introduced into Controlab Vet!');
}

seedAIE().catch(console.error).finally(() => prisma.$disconnect());
```
