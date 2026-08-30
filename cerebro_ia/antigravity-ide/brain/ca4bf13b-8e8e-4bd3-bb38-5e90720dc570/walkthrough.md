# Walkthrough: Desglose de Gastos & Prorrateo por Área (Controlab IA)

Hemos diseñado e implementado una solución premium e interactiva para la estructura de costos de **Controlab IA**. Esta entrega consta de dos funcionalidades clave: el desglose detallado de 20 rubros de gastos administrativos, y el prorrateo de los costos mensuales de equipos y consumibles basado en el volumen específico de pruebas de cada área operativa.

---

## 🏗️ 1. Estructura y Persistencia en Base de Datos

Para persistir las configuraciones mensuales sin distorsionar o sobrecargar el esquema de SQL Server, diseñamos la siguiente solución de almacenamiento:

1. **Desglose Administrativo**: Añadimos el campo `desglose_admin String? @db.NVarChar(Max)` a la tabla `gastos_mensual_global`.
2. **Volumen de Pruebas por Área**: Creamos un nuevo modelo `VolumenAreaMensual` en `prisma/schema.prisma`:
   ```prisma
   model VolumenAreaMensual {
     id        Int      @id @default(autoincrement())
     mes       Int      // 1-12
     anio      Int      // Año
     area      String   @db.NVarChar(100) // E.g., "Química", "Hematología"
     volumen   Int      // Cantidad de pruebas procesadas en el área
     
     @@unique([mes, anio, area], name: "mes_anio_area")
     @@map("volumen_area_mensual")
   }
   ```
3. **Migración del Esquema**: Ejecutamos exitosamente `npx prisma db push` para sincronizar los modelos con la base de datos de SQL Server.

---

## 📊 2. Interfaz de Usuario (UI) Premium e Inputs de Área

En el frontend ([Costos.jsx](file:///c:/controlab-ia/frontend/src/pages/Costos/Costos.jsx)), actualizamos el diseño para reflejar ambas características de forma elegante:

* **Desglose Administrativo (Pestaña Interna 3)**:
  * Agrupa en cards los 20 campos de egresos (Alquiler, Condominio, Electricidad, Agua, Aseo, Telefonía, Internet, Asesorías, Honorarios, Legales, Colegio de Bioanalistas, Software, Tecnología, Infraestructura, Remodelaciones, Mobiliario, Impuestos Nacionales, Impuestos Municipales, Papelería y Suscripciones).
  * Realiza la sumatoria automática reactiva alimentando la nómina global del mes.
* **Campos Fijos de Volumen por Área del Laboratorio**:
  * Definimos explícitamente las **8 áreas operativas estándar** solicitadas por el usuario:
    1. **Química**
    2. **Hematología**
    3. **Serología**
    4. **Uroanálisis**
    5. **Coproanálisis**
    6. **Especiales**
    7. **Bacteriología**
    8. **Pruebas Referidas**
  * Estas 8 áreas se complementan con cualquier otra área dinámica encontrada en el inventario o transacciones comerciales.
  * **Definición de Contenido por Área**: Se incluye una guía visual interactiva en el `helperText` de cada input. Éste indica de forma precisa la lista de nombres de las pruebas genéricas vinculadas a esa área (e.g., *Glucosa, Creatinina* bajo *Química*). Esto define con total claridad a qué pruebas pertenece el volumen ingresado.
  * Autocarga y limpia de forma inteligente el estado al cambiar de mes o año.

---

## 🧮 3. Lógica de Prorrateo Específico por Área

En [costos.service.js](file:///c:/controlab-ia/backend/src/modules/costos/costos.service.js):
* **Gastos Administrativos e Indirectos**: Se siguen dividiendo entre el volumen total global (`total_pruebas_mes`) del mes.
* **Calibradores, Controles y Soluciones de Equipos**: 
  1. Identifica el área operativa a la que pertenece la prueba basándose en el reactivo comercial principal vinculado (e.g., *Glucosa* pertenece a *Química*).
  2. Obtiene el volumen de pruebas registrado de esa área para el periodo de cálculo.
  3. Divide los gastos del equipo entre el volumen de su área respectiva.
  4. *Fallback Seguro*: Si el usuario no ha registrado volúmenes por área para ese mes, el sistema usa como denominador el valor predeterminado del equipo (`total_pruebas_equipo`), garantizando que la calculadora nunca devuelva errores.

---

## 4. Verificación Automatizada

Escribimos y ejecutamos un script de pruebas de negocio `test-prorrateo-area.js` en el entorno real de base de datos de SQL Server con los siguientes resultados exitosos:

1. **Registro**: Insertó gastos de Junio de 2026 con volúmenes de `Química = 10,000` y `Hematología = 5,000`.
2. **Cálculo de Prorrateo**: Ejecutó la calculadora de costos para una prueba de Química. El costo acumulado de equipo de `$300.00` fue dividido entre las `10,000` pruebas del área de Química, resultando en un costo prorrateado unitario de **`$0.03`** (en lugar de `$0.30` que se obtenía dividiendo por el divisor general de equipo de 1,000).
3. **Auditoría visual**: Confirmó que el objeto de respuesta del backend devuelve los detalles de prorrateo e indica claramente qué volumen de área fue utilizado como divisor.
