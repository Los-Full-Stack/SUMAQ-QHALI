# HOJA RESUMEN: SUMAQ QHALI
**XI Feria de Proyectos de Ingeniería de Sistemas e Informática (2026-1) - UC Cusco**  
**Lema:** *"Ingeniería con Impacto: Innovación, Investigación y Transformación Digital"*

---

### 📝 FICHA TÉCNICA
*   **Proyecto:** Sumaq Qhali (del quechua: *Buena Salud / Buen Vivir*)
*   **Categoría:** Salud Digital y Tecnologías para el Bienestar / IA y Ciencia de Datos
*   **Línea ODS:** ODS 3 (Salud y Bienestar) y ODS 10 (Reducción de Desigualdades)
*   **Tecnologías:** React, Node.js (Express, TS), PostgreSQL (Supabase), Gemini 3.5 Flash, Jitsi Meet API

---

### 🚨 PROBLEMA IDENTIFICADO
En las comunidades rurales altoandinas de Cusco, los quechua hablantes enfrentan una **doble brecha**: la **geográfica** (horas de viaje para ver a un médico) y la **cultural-lingüística** (falta de comprensión de diagnósticos y recetas en español). Esto genera una bajísima adherencia a tratamientos clínicos y una preocupante automedicación peligrosa.

---

### 💡 SOLUCIÓN PROPUESTA
**Sumaq Qhali** es una plataforma de telemedicina rural andina bajo demanda que conecta a pacientes en zonas alejadas con médicos mediante videollamada integrada (Jitsi Meet). El núcleo innovador del sistema es la integración de un **Agente Residente de Inteligencia Artificial (Gemini 3.5 Flash)** que traduce y simplifica diagnósticos, recetas y dosis complejas del español al quechua collao de manera contextual.

---

### 🛠️ ARQUITECTURA Y APLICACIÓN TECNOLÓGICA
*   **Frontend (React + Zustand + Tailwind CSS):** Interfaz fluida adaptada a conexiones inestables. Posee un portal del paciente de 3 columnas (tratamientos e historial a la izquierda; perfil, agenda y alergias a la derecha).
*   **Backend (Node.js + Express + TypeScript):** Orquestador seguro que valida roles (JWT) e inyecta directrices de traducción médica y seguridad clínica a la IA.
*   **Base de Datos (Supabase / PostgreSQL):** Base de datos relacional en la nube para persistencia del triage virtual ("Cola de Espera") y almacenamiento de historias clínicas bilingües.
*   **Resiliencia de Red (Mecanismo Fallback):** Sistema desacoplado que, ante fallas de internet en zonas rurales, activa traducciones locales estáticas automáticas, evitando caídas del servicio.

---

### 🌟 CAPA DE INNOVACIÓN Y SEGURIDAD (IA)
1.  **Traducción contextual, no literal:** La IA interpreta dosis clínicas y las adapta a términos culturales andinos comprensibles para el paciente nativo.
2.  **Triage y prevención de automedicación:** El recomendador de síntomas andino tradicional posee filtros de seguridad integrados. Si detecta banderas rojas críticas (ej: pérdida de conocimiento o dolor opresivo de pecho), bloquea recetas herbales y genera alertas urgentes de derivación a telemedicina.

---

### 🌍 IMPACTO SOCIAL Y RIGOR CIENTÍFICO
*   **Impacto Social:** Democratización de la e-Health para el quechuahablante andino.
*   **Investigación y Patentes:** El algoritmo de triage con resiliencia en red e inclusión lingüística LLM posee el potencial de patentamiento ante INDECOPI y de publicación en revistas indexadas (IEEE / Scopus) sobre informática médica cultural.
*   **Emprendimiento (SaaS):** Modelo escalable para ser licenciado a Gobiernos Regionales (DIRESA) y postas de nivel I-1 / I-2 que carecen de médicos especialistas.
