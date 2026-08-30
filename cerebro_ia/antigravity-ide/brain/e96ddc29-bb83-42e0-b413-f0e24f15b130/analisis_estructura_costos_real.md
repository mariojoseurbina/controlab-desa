# Análisis: Módulo de Estructura de Costos Reales para Laboratorio Clínico

Este documento detalla las especificaciones técnicas y operativas necesarias para desarrollar un módulo de costos apegado a la realidad diaria de un laboratorio clínico, listo para validación de la dirección técnica/bioanalista.

---

## 1. La Fórmula del Costo Real Unitario (CRU)

En un laboratorio, el costo real de una prueba para paciente no es solo el reactivo puro consumido. La bioanalista requiere evaluar e introducir las siguientes variables:

$$CRU = C_{Reactivo} + C_{Calibrador} + C_{Control} + C_{Consumibles} + C_{Merma}$$

Donde:
* **$C_{Reactivo}$ (Costo Reactivo):** $\text{ml por prueba} \times \text{precio por ml}$.
* **$C_{Calibrador}$ (Costo Prorrateado de Calibración):** El reactivo y calibrador gastado al calibrar el lote, dividido entre el número estimado de pruebas que rinde ese lote antes de la próxima calibración requerida.
* **$C_{Control}$ (Costo Prorrateado de Control de Calidad):** Consumo diario de alícuotas de control (ej: control normal y patológico ejecutados 1 o 2 veces al día) dividido entre el número de pruebas de pacientes facturadas en el día.
* **$C_{Consumibles}$:** Copas de muestra, puntas de pipeta descartables, tubos de extracción primaria, etiquetas de código de barras.
* **$C_{Merma}$ (Volumen Muerto):** Reactivo remanente en el frasco que la aguja del analizador no puede aspirar debido al límite físico del contenedor (usualmente del 5% al 10% del envase).

---

## 2. Implicaciones de Integración en el Dashboard

Para incorporar este flujo al Frontend de Controlab, se requieren tres vistas principales:

### A. Ficha del Reactivo / Configuración de Rendimiento
Una sección donde la bioanalista define para cada reactivo:
* **Frecuencia de Calibración:** Cada cuántas pruebas o cuántos días se calibra (ej: cada 30 días, o cada cambio de frasco).
* **Frecuencia de Controles:** Cuántas veces al día/semana se corre el control de calidad.
* **Margen de Volumen Muerto:** Porcentaje del envase que se descarta por merma física del equipo.

### B. Simulador de Punto de Equilibrio y Costo Unitario
Una pantalla interactiva con controles deslizantes (sliders) donde la bioanalista puede simular escenarios:
* *"Si el volumen de pacientes de Glucosa baja de 1,000 a 100 mensuales, ¿cómo impacta la calibración y el control de calidad al costo unitario real?"*
* El sistema calculará y graficará la curva de costo marginal por volumen, mostrando cómo a menor cantidad de pacientes, el costo real por prueba se incrementa exponencialmente debido a los controles diarios fijos.

---

## 3. Complicaciones Operativas y Mitigación

1. **Reconstitución y Caducidad de Controles:**
   * **Complicación:** Un frasco de control liofilizado de Controlab se reconstituye y solo dura 7 días estable en nevera. Si no se usa por completo en 7 días, se desecha el sobrante.
   * **Mitigación:** La base de datos debe almacenar las fechas de apertura de los viales de control y alertar de la merma financiera por descarte de material vencido.
2. **Precios y Tasas en Moneda Dual:**
   * **Complicación:** Las compras se pagan a tasa oficial (VES) pero los reactivos se valoran a costo de reposición en USD.
   * **Mitigación:** Mantener la equivalencia histórica de las compras en base al tipo de cambio registrado al momento de la compra.
