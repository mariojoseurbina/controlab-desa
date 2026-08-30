# Proyecto: LIS Veterinario (Controlab Vet)
**Filosofía:** Automatización total, arquitectura moderna (Node.js + Prisma + React), integración de IA para análisis financiero/clínico, y diseño centrado en la alta eficiencia de laboratorio.

A diferencia de un LIS humano, la medicina veterinaria (especialmente en animales de producción como vacas, ovejas y cabras) requiere una estructura de datos multidimensional debido a que los valores de referencia cambian drásticamente entre especies, razas e incluso el propósito productivo del animal.

---

## 1. Diferencias Clave (Humano vs Veterinario)

| Característica | LIS Humano (Controlab) | LIS Veterinario (Producción) |
| :--- | :--- | :--- |
| **Sujeto** | Paciente directo (Cédula) | Propietario / Finca ➔ Animal (Arete/Nombre) |
| **Agrupación** | Individual | Muestras por Lote (Rebaños completos) |
| **Valores de Referencia** | Edad, Sexo | **Especie, Raza, Edad, Estado Fisiológico (Gestante, Lactancia), Propósito (Leche/Carne)** |
| **Reportes** | Diagnóstico clínico individual | Salud del rebaño, impacto epidemiológico y productivo |

---

## 2. Recomendaciones de Arquitectura de Base de Datos (Prisma)

Para mantener la filosofía de Controlab, la base de datos debe ser altamente relacional. El núcleo del sistema cambia de `Paciente` a una estructura jerárquica: `Cliente (Finca)` -> `Especie` -> `Animal` -> `Orden de Laboratorio`.

### Modelo Base Recomendado (Schema Prisma)

```prisma
// 1. El Cliente es el dueño o la Finca (Hacienda)
model ClientePropietario {
  id              Int       @id @default(autoincrement())
  nombre_finca    String
  propietario     String
  telefono        String?
  animales        Animal[]
  ordenes         OrdenLaboratorio[]
}

// 2. Catálogo de Especies y Razas (Crucial para los rangos de referencia)
model Especie {
  id              Int       @id @default(autoincrement())
  nombre          String    // Ej: Bovino, Caprino, Ovino
  razas           Raza[]
  animales        Animal[]
}

model Raza {
  id              Int       @id @default(autoincrement())
  especie_id      Int
  nombre          String    // Ej: Holstein, Brahman, Alpina
  especie         Especie   @relation(fields: [especie_id], references: [id])
  animales        Animal[]
}

// 3. El Paciente (Animal)
model Animal {
  id              Int       @id @default(autoincrement())
  propietario_id  Int
  especie_id      Int
  raza_id         Int?
  identificador   String    // Número de Arete, Chapeta o Nombre
  fecha_nacimiento DateTime? // Para calcular la edad dinámicamente
  sexo            String    // Macho, Hembra
  proposito       String?   // Leche, Carne, Doble Propósito, Reproductor
  estado_fisiologico String? // Seca, Lactando, Gestante (Afecta los valores)
  
  propietario     ClientePropietario @relation(fields: [propietario_id], references: [id])
  especie         Especie @relation(fields: [especie_id], references: [id])
  raza            Raza? @relation(fields: [raza_id], references: [id])
  muestras        MuestraAnimal[]
}

// 4. Configuración de Valores de Referencia Complejos
model RangoReferenciaVeterinario {
  id              Int       @id @default(autoincrement())
  prueba_id       Int
  especie_id      Int
  raza_id         Int?      // Nullable (Si aplica a todas las razas)
  edad_min_meses  Int?
  edad_max_meses  Int?
  sexo            String?
  estado_fisiologico String? 
  rango_minimo    Float
  rango_maximo    Float
  interpretacion  String?   // Texto para la IA
}
```

---

## 3. Funcionalidades "Killer" (Vanguardia Comercial)

Para que este LIS domine el mercado y siga la filosofía "Controlab", debe tener herramientas que los LIS tradicionales no tienen:

### A. Reportes por Lotes (Batch Reporting)
En ganadería, un veterinario no envía sangre de 1 vaca, envía sangre de 50 vacas para despistaje de Brucelosis o Anemia Infecciosa. 
*   **Recomendación:** Crear una interfaz de "Carga en Lote" (Grid tipo Excel) donde se puedan ingresar los resultados de 50 animales en una sola pantalla, y el sistema genere un **Reporte Epidemiológico Consolidado** (Ej: "El 15% del rebaño presenta anemia").

### B. Módulo de Agente IA Veterinario
Reutilizando a Gemini (tu motor actual):
*   **Diagnóstico de Rebaño:** El Agente puede analizar los resultados de 20 vacas y decirle al dueño: *"Los niveles bajos de Calcio y Fósforo en este lote sugieren un problema en los pastos o la suplementación mineral. Recomendación: Revisar la dieta de transición."*

### C. Alertas de Propósito Productivo
Un nivel de glucosa o urea en sangre significa cosas distintas si la vaca es de **Carne** o de **Leche de Alta Producción**. El sistema debe resaltar alertas automáticamente basándose en el propósito productivo del animal.

### D. Interfaz Visual Amigable para el Campo
Los reportes impresos o en PDF no deben parecer de hospital humano. 
*   Deben incluir el **Logo de la Hacienda**.
*   Deben ser legibles en celulares, ya que los dueños de fincas y veterinarios revisan los resultados directamente en el campo.

---

## 4. Hoja de Ruta Sugerida (Roadmap)

1. **Fase 1: Motor de Reglas (Core)**
   * Crear la base de datos con la jerarquía `Propietario -> Especie -> Raza -> Animal`.
   * Diseñar el motor de Valores de Referencia Dinámicos (El mayor reto técnico).
2. **Fase 2: Procesamiento Masivo**
   * Pantallas de ingreso masivo de resultados para rebaños.
   * Generador de reportes en PDF grupales e individuales.
3. **Fase 3: Inteligencia de Negocios (La Filosofía Controlab)**
   * Conectar tu sistema de costos actual (Márgenes de reactivos) a las pruebas veterinarias.
   * Conectar a Gemini para sugerencias de manejo nutricional/sanitario basado en los exámenes de sangre.
