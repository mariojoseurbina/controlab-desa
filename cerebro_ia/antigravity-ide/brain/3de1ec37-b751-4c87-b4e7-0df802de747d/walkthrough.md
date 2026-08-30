# Walkthrough: El Director de Finanzas Automático 💰

¡Acabamos de transformar a la Inteligencia Artificial en el Director de Finanzas de Controlab! He creado un archivo completamente nuevo llamado `costTools.js` dedicado a procesar y analizar únicamente la estructura de costos del laboratorio.

## 📈 Nuevas Herramientas Financieras Inyectadas

1. **`calculateTestMargins`**: Calcula el costo real de una prueba sumando consumibles + reactivos + mantenimiento del equipo + desperdicio. Te lista desde la prueba que deja más ganancias hasta la que te hace perder dinero.
2. **`calculateBreakEvenPoint`**: ¡Punto de equilibrio automático! Calcula exactamente cuántas pruebas debes procesar al mes para cubrir tus costos fijos.
3. **`simulatePriceImpact`**: Simulador financiero. Si un proveedor sube un X% un reactivo o tubo, la IA te dirá cuánto dinero extra te va a costar por prueba.
4. **`compareEquipmentCosts`**: Compara el gasto total en soluciones y calibradores para saber qué equipo automatizado es el más caro de mantener.
5. **`calculateWasteCost`**: Calcula la fuga de dinero exacta por culpa de las mermas (repeticiones y vencimientos).
6. **`calculateGlobalExpenses`**: Cruza tus gastos de nómina versus tus gastos administrativos.
7. **`checkExpensiveLowVolumeReagents`**: Detecta reactivos muy caros que estás gastando en pruebas que casi no vendes (para evaluar tercerizarlas).

## Tu Turno de Probar
Haz un último reinicio del backend (`Ctrl + C` y `npm run dev`) y ponte a bombardear a la Inteligencia Artificial con el bloque de las preguntas 31 a la 40. 

Intenta preguntarle: *"¿Cuál es la prueba que nos está dejando el menor margen o incluso pérdidas?"* o *"Calcula el punto de equilibrio mensual"*.
