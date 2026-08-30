# 🧠 Guía Comercial de Preguntas para la Demo de "Controlab Brain"

Esta guía contiene la lista completa de reportes de inteligencia que puedes extraer del **Cerebro (Brain)** de Controlab durante tu presentación comercial, junto con las **preguntas exactas** (prompts) que debes ingresar en el chat.

> [!IMPORTANT]
> **Modo Demostración Offline Activado:** El sistema está preparado para responder localmente y sin internet. Para obtener respuestas inmediatas y precisas, utiliza los términos clave de la columna **"Pregunta Recomendada"**.

---

## 📂 Módulo 1: Gestión de Inventario y Almacén

| Reporte Operativo / Financiero | Pregunta Recomendada (Escribe tal cual) | ¿Qué responde el Cerebro? |
| :--- | :--- | :--- |
| **📉 Reactivos con Stock Bajo** | `Dame los reactivos con stock bajo` | Lista de reactivos y consumibles que están en punto mínimo o crítico. |
| **💎 Valor Financiero Inmovilizado** | `¿Cuál es el valor financiero del inventario?` o `inmovilizado` | Monto total en dólares bloqueado en almacén, detallado por áreas. |
| **📊 Proporción del Inventario** | `Dame la proporción del inventario por categorías` | Distribución porcentual y conteo de ítems por categoría de reactivos. |
| **⚠️ Exceso de Stock / Sobrecompra** | `Muestra los ítems con sobrecompra` o `stock máximo` | Alertas de reactivos donde hay compras excesivas superando el máximo permitido. |
| **📤 Historial de Salidas de Almacén** | `Dame los movimientos de salida de inventario` | Reporte cronológico de consumos y salidas, indicando el motivo y quién lo hizo. |
| **🔄 Kárdex General de Movimientos** | `Muestra todos los movimientos` | Consolidado detallado de entradas y salidas de almacén. |
| **📦 Rotación / Promedio en Almacén** | `¿Cuál es el promedio de días en almacén?` | Promedio de días que pasa un reactivo en stock antes de agotarse al 100%. |

---

## ⏳ Módulo 2: Vencimientos y Mermas (Merma Invisible)

| Reporte Operativo / Financiero | Pregunta Recomendada (Escribe tal cual) | ¿Qué responde el Cerebro? |
| :--- | :--- | :--- |
| **⏳ Lotes Próximos a Vencer** | `¿Qué lotes vencen pronto?` | Lotes que caducan en los próximos 60 días con su cantidad restante. |
| **🚨 Lotes Vencidos pero Activos** | `Muestra los lotes vencidos pero activos` | Alerta de seguridad sobre reactivos ya caducados que siguen marcados para uso. |
| **💸 Pérdida Financiera Proyectada** | `Calcula la pérdida económica por vencer` | Proyección en dólares de cuánto dinero se perderá si esos lotes caducan. |
| **🗑️ Causas Comunes de Mermas** | `Muestra los motivos de mermas` | Desglose gráfico de las razones de pérdidas (daños, vencimientos, etc.). |
| **⚖️ Discrepancias Teóricas vs Reales** | `Dame las discrepancias de volumen teórico` | Auditoría que compara los ml calculados por el sistema vs la medición física real. |

---

## 🛍️ Módulo 3: Compras e Inteligencia de Proveedores

| Reporte Operativo / Financiero | Pregunta Recomendada (Escribe tal cual) | ¿Qué responde el Cerebro? |
| :--- | :--- | :--- |
| **🛍️ Compras Recientes** | `Dame las compras recientes` | Historial de las últimas órdenes de compra, precios unitarios y proveedores. |
| **⏱️ Órdenes de Compra Pendientes** | `¿Cuáles compras están pendientes de recibir?` | Lista de facturas no recibidas y los días exactos que llevan retrasadas. |
| **🚚 Desempeño y Demoras de Proveedor**| `Muestra los retrasos de proveedores` | Análisis del gasto histórico por proveedor y su promedio de días de demora en entrega. |
| **📈 Inflación y Historial de Precios** | `Muestra la inflación y variaciones de precio` | Detección automática de reactivos que han sufrido aumentos de costo en el tiempo. |

---

## 🔋 Módulo 4: Ritmo de Consumo y Autonomía de Stock

| Reporte Operativo / Financiero | Pregunta Recomendada (Escribe tal cual) | ¿Qué responde el Cerebro? |
| :--- | :--- | :--- |
| **🔥 Consumibles Más Utilizados** | `¿Cuáles son los ítems que más rápido se agotan?` o `top consumos` | Top de reactivos y consumibles con mayor velocidad de agotamiento. |
| **🔋 Ritmo de Consumo Diario** | `Calcula el ritmo de consumo y autonomía` | Proyección de cuántos días de stock quedan exactamente según el uso actual. |

---

## 💰 Módulo 5: Estructura de Costos y Rentabilidad Financiera

| Reporte Operativo / Financiero | Pregunta Recomendada (Escribe tal cual) | ¿Qué responde el Cerebro? |
| :--- | :--- | :--- |
| **💰 Gastos Fijos de Laboratorio** | `Muestra los gastos fijos del mes` | Historial de nómina y gastos administrativos globales. |
| **💵 Costos Reales vs Venta** | `Calcula los márgenes de ganancia` | Análisis de rentabilidad de cada examen (Costo de reactivo + consumibles vs precio). |
| **⚖️ Punto de Equilibrio (Breakeven)** | `Calcula el punto de equilibrio` | Cuántas pruebas diarias/mensuales debes hacer para no tener pérdidas. |
| **🗑️ Costo de la Merma Semanal** | `Calcula la pérdida financiera por desperdicios` | Monto en dólares de dinero botado a la basura por desperdicios de reactivo. |
| **🔬 Costo de Equipos Médicos** | `Compara el mantenimiento de equipos` | Análisis de costo por soluciones, calibradores y controles por equipo. |
| **⚠️ Reactivos Caros, Margen Bajo** | `Busca reactivos muy costosos con bajo margen` | Alerta de exámenes que usan insumos caros pero dejan una rentabilidad mínima. |
| **🔮 Simulador de Impacto de Precios** | `Simula el alza de precios en tubos` | Simulación financiera de cómo afectará al costo de cada prueba si un insumo sube 10%. |

---

## 🩺 Módulo 6: Auditoría de Red en Tiempo Real (Sniffer)

| Reporte Operativo / Financiero | Pregunta Recomendada (Escribe tal cual) | ¿Qué responde el Cerebro? |
| :--- | :--- | :--- |
| **🩺 Tráfico de Analizadores** | `Muestra el reporte del sniffer` o `auditoria de red` | **¡El plato fuerte!** Extrae el reporte en tiempo real de todas las pruebas capturadas directamente desde la red del analizador, desglosando exámenes de pacientes normales vs controles de calidad/repeticiones (mermas invisibles). |

---

> [!TIP]
> **Consejo de Venta:** Muestra primero los **Márgenes de Ganancia** y el **Punto de Equilibrio** para demostrar cómo el sistema ayuda a controlar las finanzas. Luego, haz el descuento masivo o arrastra un archivo a `C:\hl7_in` y pregúntale al Cerebro por el **Reporte del Sniffer** para demostrar la automatización en tiempo real. 

### ¿Cómo probarlo ahora mismo?
1. Ve al chat de **Controlab Brain**.
2. Escribe: `¿Cuál es el valor financiero del inventario?` o `Muestra el reporte del sniffer`.
3. El cerebro te responderá de inmediato con la estructura de datos real que cargamos en tu base de datos local.
