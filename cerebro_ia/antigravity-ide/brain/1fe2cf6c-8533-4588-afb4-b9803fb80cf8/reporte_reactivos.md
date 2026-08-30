# Reporte de Consumo y Stock Actual de Reactivos

Este reporte muestra el impacto exacto en los inventarios luego del proceso de descuento masivo ejecutado para la jornada de hoy.

> [!TIP]
> Los descuentos se descontaron de manera acumulativa de los lotes correspondientes, permitiendo cubrir los mililitros necesarios usando la metodología FIFO.

## 🧪 Resumen de Consumo de Hoy

| Reactivo (Prueba) | Cantidad Descontada (ml) | Último Descuento | Stock Restante Total (ml) |
|:---|:---:|:---|---:|
| **GLUC - REACTIVO GLUCOSA** | 15.00 ml | Hoy | **85.00 ml** |
| **URIC - REACTIVO ACIDO URICO** | 15.84 ml | Hoy | **84.16 ml** |
| **COL - REACTIVO COLESTEROL** | 11.55 ml | Hoy | **88.45 ml** |
| **UREA - REACTIVO UREA** | 5.60 ml | Hoy | **94.40 ml** |

## 📦 Desglose General de Reactivos Mapeados (Lotes Activos)

| Reactivo (Código) | Stock Total en Lotes Activos | Stock Teórico de Ítem | Estado |
|:---|:---:|:---:|:---|
| **ALB-REACTIVO ALBUMINA** (`REACT-ALB-001`) | 100.00 ml | 100.00 ml | 🟢 Estable |
| **COL- REACTIVO COLESTEROL** (`REACT-COL-001`) | 89.89 ml | 88.45 ml | 🟢 Estable |
| **GLUC - REACTIVO GLUCOSA** (`REACT-GLUC-001`) | 31.25 ml | 85.00 ml | 🟡 Precaución |
| **HEMA - REACTIVO HEMATOLOGIA** (`REACT-HEMA-001`) | 100.00 ml | 1.00 ml | ⚠️ Alerta Mismatch |
| **UREA - REACTIVO UREA** (`REACT-UREA-001`) | 29.65 ml | 94.40 ml | 🟡 Precaución |
| **URIC - REACTIVO ACIDO URICO** (`REACT-URIC-001`) | 11.80 ml | 84.16 ml | 🔴 Bajo Stock |

> [!NOTE]
> - **Stock en Lotes Activos:** Sumatoria real de los mililitros que están dentro de un lote no vencido.
> - **Stock Teórico:** Sumatoria global registrada en el ítem principal.
> *Si el stock de lotes es menor al teórico, significa que algunos mililitros pertenecen a lotes vencidos o inactivos que ya no se usan en el descuento masivo.*
