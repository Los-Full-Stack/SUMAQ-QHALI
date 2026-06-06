# Propuesta de Arquitectura: Telemedicina Rural (Sumaq Qhali)

Entiendo perfectamente tu visión. El problema con el diseño actual de los paneles es que están pensados para un **hospital físico tradicional**, cuando nuestro verdadero objetivo es **romper la brecha geográfica mediante telemedicina**. 

Para lograr que un paciente en una comunidad lejana sea atendido por el primer médico disponible mediante videollamada, debemos rediseñar los paneles hacia un modelo de **Atención Bajo Demanda (Triage Virtual)**.

## Consideraciones Clave

> **Integración de Video:** Desarrollar videollamadas desde cero (WebRTC) es muy complejo y propenso a errores en conexiones lentas. Propongo integrar **Jitsi Meet API** (es gratuito, de código abierto, encriptado y funciona muy bien embebido directamente en la página web sin que el paciente instale nada).
> 
> **Cambio de Paradigma:** Esto cambiará la lógica de citas. Pasaremos de un modelo estático de "Cita programada a las 10:00 AM" a un modelo híbrido enfocado en **"Tickets en Sala de Espera Virtual"**.
>
> **Pregunta Abierta:** ¿Queremos que el paciente rural pueda subir fotos de sus síntomas (ej. una herida) mientras está en la sala de espera virtual, para que el médico las vea apenas inicie la videollamada?

---

## Cambios Propuestos (Qué quitar y qué agregar)

### 1. Panel del Paciente (Patient Portal)
*Lo que ya está bien:* El historial clínico, las recetas bilingües y el acceso a su expediente.
*   **[AGREGAR] Botón de "Atención Inmediata / Teleconsulta":** Un botón muy visible que diga "Hablar con un médico ahora".
*   **[AGREGAR] Sala de Espera Virtual:** Al hacer clic, el paciente entra a una pantalla que dice: *"Buscando médico disponible... Hay 2 personas antes que tú"*.
*   **[AGREGAR] Interfaz de Video:** Cuando el médico acepta, la pantalla del paciente se transforma en la videollamada.

### 2. Panel Médico (Doctor Dashboard)
*Lo que está mal:* Parece la agenda de una secretaria. Muestra "Total de Consultas" que no ayuda a la atención inmediata.
*   **[QUITAR]** Gráficos estadísticos y la "Agenda Diaria" estática.
*   **[AGREGAR] Switch de Estado Global:** Un botón gigante arriba que diga "DISPONIBLE PARA TELEMEDICINA" o "OCUPADO".
*   **[AGREGAR] Cola de Pacientes en Vivo:** Una lista parpadeante que muestre quién está esperando en línea (ej. "Juan Pérez - Esperando hace 5 min").
*   **[AGREGAR] Vista Dividida de Teleconsulta:** Al aceptar a un paciente, la pantalla del doctor se divide en dos:
    *   *Izquierda:* El video en vivo del paciente.
    *   *Derecha:* El historial clínico del paciente (para escribir notas y emitir recetas sin cambiar de pestaña).

### 3. Panel Administrativo (Administrator Panel)
*Lo que está mal:* Muestra un mapa estático de clínicas físicas en Cusco y gráficos predefinidos que no reflejan la realidad de un sistema remoto.
*   **[QUITAR]** El mapa topográfico estático y el gráfico de barras anual.
*   **[AGREGAR] Centro de Monitoreo de Red (Command Center):**
    *   *Métrica Crítica 1:* **Doctores Online vs. Pacientes Esperando.**
    *   *Métrica Crítica 2:* **Tiempo Promedio de Espera** (para asegurar que nadie espere horas).
    *   *Métricas de Conectividad:* Un log real que muestre caídas de conexión o llamadas exitosas completadas hacia zonas rurales.
