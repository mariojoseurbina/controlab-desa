# Arquitectura Técnica Definitiva: Sniffer Controlab IA
*(Cero Ficción. Así se hace en el mundo real).*

Esta es la arquitectura final y hermética que garantiza dos cosas: **1) Independencia total de Infolab** y **2) Protección absoluta de tu Código Fuente (Propiedad Intelectual).**

---

## 1. El Límite Estricto (Infolab no se toca)
Tienes toda la razón y esa es la estrategia correcta para evitar conflictos de software y responsabilidades. **Infolab es intocable.**

El flujo de información es de **una sola vía (Solo lectura)**:
- Infolab hace lo suyo (Facturar y entregar resultados finales).
- A través del *Linked Server*, Controlab hace un `SELECT` (Lectura) a la tabla de estadísticas de Infolab.
- Controlab solo extrae un número frío: *"Infolab, dime cuántas Glucosas cobraste hoy"*. Infolab responde *"100"*. **Fin de la interacción con Infolab.**

## 2. Controlab IA es el único Juez y Garante (El Sniffer)
Infolab no tiene idea de qué es una repetición o una merma. Todo el cerebro recae sobre Controlab IA.

1. **La Intercepción Independiente:** El Proxy de Controlab intercepta la trama cruda ASTM/HL7 que escupe la máquina. 
2. **El Algoritmo Propio:** Es el algoritmo de Controlab (no la máquina, ni Infolab) el que analiza ese texto crudo.
3. **El Cruce de Datos Interno:**
   Controlab IA guarda en su propia base de datos aislada que capturó **140** ejecuciones de Glucosa. 
   El algoritmo de Controlab es el que tiene la inteligencia para decir:
   - *"De estas 140, veo que 5 tienen la bandera de QC en la trama ASTM".*
   - *"De las 135 restantes, veo que el paciente ID#444 pasó a las 10:00 y volvió a pasar a las 10:15. Eso es 1 repetición".*

**La conclusión final:** Controlab toma sus **140** ejecuciones capturadas, las compara con las **100** estadísticas base del Linked Server, y Controlab (como único garante) define que hubo **40** mermas y las descuenta de sus neveras.

## 3. El Blindaje del "Santo Grial" (Anticopia y Antirrobo)
Como este Sniffer Proxy es el corazón del valor comercial, no puede ser un archivo de texto (como Javascript o Python) que cualquier técnico de laboratorio pueda copiar en un pendrive y robárselo.

**La Estrategia de Protección Militar:**
El Sniffer no se programará en lenguajes interpretados. Se desarrollará utilizando lenguajes de bajo nivel compilados (La mejor opción mundial para redes hoy es **Golang (Go)** o **C# .NET con Ofuscación**).

1. **Compilación Binaria:** El código fuente se transforma en un archivo `.exe` sólido e ininteligible. Si alguien se roba el `.exe` y lo abre, solo verá ceros y unos (código máquina).
2. **Ofuscación:** Se le aplica un proceso criptográfico al código antes de compilarlo. Esto destruye los nombres de las variables y la lógica para que sea imposible hacer "Ingeniería Inversa" (Reverse Engineering).
3. **Licenciamiento por Hardware:** El `.exe` del Sniffer de Controlab estará amarrado al número de serie de la Tarjeta Madre o Disco Duro del servidor de ese cliente. Si alguien copia el `.exe` a otra computadora, el Sniffer se autodestruye o simplemente se niega a arrancar, arrojando un error de "Licencia Inválida".

---

**Para mañana, este es tu argumento de cierre maestro:**
> *"Nuestro Sniffer es una caja negra impenetrable. No toca, no altera y no interactúa con Infolab; Infolab sigue siendo su sistema de facturación. Nosotros usamos Infolab solo como una línea base estadística. Toda la Inteligencia Artificial, la detección de controles de calidad, calibraciones y repeticiones de muestras, ocurre en el motor propietario de Controlab IA. Y lo mejor de todo: este motor proxy está compilado y encriptado a nivel binario con validación de hardware, garantizando un ecosistema seguro, auditable y, sobre todo, incopiable en el mercado."*
