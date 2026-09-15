# 📋 Prompt Maestro para Claude: Generador de Cotizaciones GSD Quoter & PDFs Profesionales

Copia y pega el siguiente prompt en Claude para que construya el módulo de cotizaciones compatible y listo para integrar en el CRM:

```markdown
Hola Claude, necesitamos que desarrolles el módulo completo de "GSD Quoter / Generador de Cotizaciones Profesionales" para integrarlo de forma directa en nuestro CRM corporativo Express.js + EJS.

### 🏢 Contexto y Arquitectura del Proyecto:
- **Stack Backend**: Node.js v20 o v22 (LTS), Express.js 4.x, EJS como motor de plantillas, SQLite / Neon PostgreSQL.
- **Identidad de Marca**: GSD (Geosolutions Source Dominicana, S.R.L.) - Agrimensura, Derecho Inmobiliario, Bienes Raíces. Colores: Azul Marino (#091724 / #15233A), Verde Bosque/Lima (#57A32B / #10B981), Acentos grises y tipografías limpias (Inter / Playfair).
- **Cero Emojis**: Todo debe utilizar iconos SVG vectoriales limpios (estilo Lucide / Feather).

---

### 🎯 Requerimientos del Módulo "GSD Quoter":

#### 1. Interfaz de Usuario (UI/UX Responsiva y Docked):
- **Diseño a 3 Columnas en Pantallas Grandes (Desktop)** que se apile elegantemente en Tablet y Móvil:
  - **Columna Izquierda (Servicios)**: Selector lateral con lista de servicios categorizados con iconos SVG:
    - *Iguala Legal (General, Empresarial, Inmobiliaria)*
    - *Deslinde Catastral*
    - *Transferencia de Inmuebles (CONFOTUR / Ordinaria)*
    - *Investigación Parcelaria & Revisión de Títulos*
    - *Levantamiento Topográfico & Curvas de Nivel*
    - *Condominio (Constitución)*
    - *Regularización Parcelaria*
    - *Asesoría Inmobiliaria & Litigios*
    - *Creación de Empresas & Cobros Compulsivos*
    - *Hipotecas, Embargos, Sucesiones & Particiones*
    - *Planos, Subdivisiones & Proyectos de Desarrollo*
  - **Columna Central (Formulario de Cotización Reactivo)**:
    1. *Datos del Cliente*: Nombre, Cédula / RNC, Email, Teléfono, Dirección.
    2. *Información del Documento*: Número de Referencia (ej. GSD-PRO-2026-015), Fecha actual, Vigencia (15, 30, 60 días).
    3. *Detalles Específicos según el Servicio*: Tipo de iguala / servicio, duración, superficie m², monto base (RD$ / US$), ítems desglosados adicionales, ITBIS (18%) opcional, forma de pago (50/50, cuotas).
    4. *Observaciones y Términos Especiales*.
  - **Columna Derecha (Live Preview & Acciones)**:
    - *Previsualizador en tiempo real* del PDF / Hoja de Cotización idéntico a la vista física antes de exportar.
    - Botones principales: **"Generar PDF"**, **"Descargar"**, **"Abrir en nueva pestaña"**, **"Guardar en Historial"**.
    - *Historial Reciente*: Lista interactiva de las últimas cotizaciones emitidas con estado y fecha.

#### 2. Generación del Documento PDF Profesional:
Necesitamos que los PDFs generados tengan la calidad exacta y la elegancia corporativa de nuestras propuestas (A4, encabezado institucional con logo GSD, desglose de servicios, tabla de honorarios económicos y condiciones, timeline de pasos, bloque de aceptación de propuesta con firmas formales y pie de página con RNC y datos de contacto en Punta Cana).
- Puedes usar una librería de Node.js ligera y confiable como **PDFKit** o generación HTML-to-PDF / Puppeteer-lite / SVG-to-canvas sin dependencias pesadas que fallen en Vercel o servidores Linux/Docker.

#### 3. Entregable Requerido:
Por favor, empaca todo el código en una estructura modular y limpia que contenga:
1. `routes/cotizaciones.js`: Rutas Express para renderizar el quoter, guardar cotizaciones, listar historial y descargar el PDF (`/admin/cotizaciones`, `/admin/cotizaciones/generar-pdf`, `/admin/cotizaciones/:id/descargar`).
2. `views/admin/cotizaciones/index.ejs`: Plantilla EJS completa y 100% responsiva con CSS embebido (modern flexbox & CSS grid adaptable a móviles, tablet y desktop).
3. `services/pdfGenerator.js`: Motor de generación de PDF en Node.js que reciba los datos JSON de la cotización y devuelva el buffer PDF con el diseño gráfico exacto institucional de GSD.
4. `database/cotizaciones-schema.sql`: Tabla SQLite/PostgreSQL para almacenar las cotizaciones generadas.
5. Instrucciones claras de integración y un archivo comprimido o bloques de código listos para copiar.
```
