# Propuestas de Mejora para Sumaq Qhali

## Objetivo

Fortalecer el sistema Sumaq Qhali para que sea mas confiable en escenarios reales de telemedicina, especialmente con pacientes que tienen baja conectividad, dispositivos modestos o poca experiencia usando plataformas digitales.

Las mejoras se enfocan en cinco frentes:

1. Videollamada clinica estable.
2. Atencion para pacientes con mala conexion.
3. Grabacion breve bajo consentimiento.
4. Traduccion eficiente espanol-quechua.
5. Seguimiento medico y notificaciones.

## 1. Videollamada Clinica para Baja Conectividad

### Problema

Actualmente, si la conexion del paciente es inestable, la camara puede desaparecer, congelarse o perder la llamada. En un entorno medico esto es critico, porque el doctor necesita ver al paciente para evaluar signos visibles y apoyar el diagnostico.

### Propuesta

Implementar un modo de videollamada llamado **Video Clinico Prioritario**.

Este modo prioriza que el medico vea al paciente, incluso si la calidad de imagen debe reducirse. La meta no es tener video en alta definicion, sino mantener una imagen continua y suficiente para la evaluacion clinica.

### Funcionalidades recomendadas

- Iniciar la videollamada en baja resolucion por defecto.
- Limitar FPS para reducir consumo de datos.
- Priorizar el video del paciente sobre el video del medico.
- Agregar deteccion de conexion inestable.
- Mostrar estado de "Reconectando camara" sin cerrar la consulta.
- Evitar que la ficha medica o receta se pierdan si falla la llamada.
- Agregar boton "Reintentar camara".
- Permitir que el medico active "Modo senal baja".

### Modo senal baja

Cuando la conexion del paciente sea mala:

- El paciente mantiene su camara encendida.
- El medico sigue viendo al paciente.
- El paciente escucha al medico por audio.
- El video del medico hacia el paciente se apaga.
- El paciente ve una pantalla ligera con el mensaje "Medico conectado".
- El sistema consume menos ancho de banda de bajada en el celular del paciente.

Esto ayuda a que la conexion disponible se use principalmente para enviar la imagen del paciente al medico.

## 2. Cambio de Proveedor de Videollamada

### Situacion actual

El sistema usa una sala Jitsi incrustada mediante `iframe`. Esto es util para pruebas, pero limita el control sobre eventos de conexion, reconexion, calidad de video y grabacion.

### Opciones evaluadas

#### Jitsi propio o JaaS

Ventajas:

- Similar a la implementacion actual.
- Permite incrustar la llamada en la pagina.
- Se puede integrar con API.
- Con servidor propio se puede configurar TURN y grabacion con Jibri.

Desventajas:

- Requiere administrar infraestructura.
- La grabacion con Jibri necesita configuracion adicional.
- Mayor carga de mantenimiento.

#### Daily

Ventajas:

- Buena integracion web.
- Permite incrustar la videollamada.
- Tiene SDK y opcion prebuilt.
- Maneja eventos de conexion.
- Permite grabacion.
- Menor dificultad de integracion que Agora.

Desventajas:

- Tiene costo segun uso.
- Menor control tecnico profundo que Agora.

#### Agora

Ventajas:

- Mucho control sobre pistas de audio y video.
- Muy potente para optimizar baja conectividad.
- Permite construir una interfaz totalmente personalizada.

Desventajas:

- Mayor complejidad tecnica.
- Requiere mas desarrollo de interfaz y logica WebRTC.

### Recomendacion

Se recomienda usar **Daily** como primera opcion.

Daily ofrece el mejor equilibrio entre estabilidad, facilidad de implementacion, grabacion, eventos de conexion e integracion dentro de la pagina web.

Agora puede considerarse en una fase posterior si se necesita control avanzado sobre calidad de red, pistas de video y optimizacion fina.

## 3. Grabacion Breve Bajo Solicitud del Medico

### Problema

Grabar toda la llamada puede generar problemas de privacidad, almacenamiento y consentimiento. Ademas, en zonas de baja conectividad no siempre es necesario guardar toda la sesion.

### Propuesta

Permitir que el medico solicite grabar solo un fragmento clinico de la videollamada.

### Flujo propuesto

1. El medico presiona "Solicitar grabacion".
2. Al paciente le aparece una solicitud clara de consentimiento.
3. El paciente acepta o rechaza.
4. Si acepta, se graba un fragmento corto.
5. El medico puede detener la grabacion.
6. El sistema guarda el archivo vinculado a la consulta.
7. El expediente muestra el fragmento como evidencia audiovisual clinica.

### Reglas sugeridas

- Duracion maxima por fragmento: 15, 30 o 60 segundos.
- Maximo de fragmentos por consulta.
- Consentimiento registrado con fecha, hora, paciente y medico.
- El medico debe poder marcar si el fragmento es valido o debe repetirse.

### Complemento: captura o foto clinica

Si la calidad de la videollamada es mala, la grabacion puede salir borrosa. Como respaldo, se recomienda permitir que el medico solicite una foto clinica guiada:

- El medico solicita foto.
- El paciente recibe instrucciones simples.
- El paciente toma o sube la foto.
- La foto queda asociada a la consulta.

Esto puede dar mejor calidad visual que una captura tomada desde un video inestable.

## 4. Traduccion Espanol-Quechua con Bajo Consumo de API

### Problema

Traducir automaticamente cada texto con IA puede elevar costos y generar dependencia innecesaria de la API. Tambien puede introducir riesgos si se traduce contenido medico sin revision.

### Propuesta

Implementar un sistema hibrido de traduccion:

1. Traduccion local para interfaz.
2. Diccionario medico local.
3. Plantillas clinicas bilingues.
4. Cache de traducciones.
5. IA solo bajo demanda para texto libre.
6. Revision del medico antes de guardar.

### Textos fijos

Los textos de interfaz no deben usar IA:

- Botones.
- Menus.
- Titulos.
- Errores.
- Etiquetas.
- Mensajes frecuentes.

Deben estar en archivos locales de idioma.

### Plantillas clinicas

Las recetas e indicaciones comunes deben manejarse con plantillas:

```txt
Tomar {{cantidad}} {{unidad}} cada {{frecuencia}} por {{duracion}}.
Reposo por {{dias}} dias.
Beber abundante liquido.
Volver si presenta fiebre alta.
```

La plantilla se traduce una sola vez y luego se rellenan los valores.

### Cache exacto y por segmentos

Cuando se traduce una frase, se guarda:

- Texto original.
- Idioma origen.
- Idioma destino.
- Traduccion.
- Hash normalizado.
- Fecha.
- Si fue revisada por medico.

Si aparece el mismo texto otra vez, se reutiliza sin consumir API.

### Textos largos

Los textos largos no deben traducirse como un solo bloque. Deben separarse por oraciones o indicaciones:

```txt
1. Tomar paracetamol cada 8 horas por 3 dias.
2. Mantener reposo.
3. Beber abundante liquido.
4. Volver si presenta fiebre alta.
```

Cada segmento pasa por:

```txt
Plantilla -> Cache exacto -> Cache similar -> IA bajo demanda
```

### Indicaciones por bloques

Se recomienda que el medico escriba las indicaciones en campos separados:

```txt
1. [Indicacion]
2. [Indicacion]
3. [Indicacion]
+ Agregar indicacion
```

Esto mejora:

- Claridad para el paciente.
- Reutilizacion del cache.
- Calidad de traduccion.
- Menor consumo de API.

Tambien se puede mantener un modo de texto libre para casos especiales.

### Modelo propio de traduccion

No se recomienda entrenar un modelo propio desde el inicio.

Primero se debe construir una base de datos con traducciones validadas por medicos o personal bilingue. Luego, con suficiente informacion, se podria evaluar un modelo ajustado o especializado.

Ruta sugerida:

1. Diccionario + plantillas + cache.
2. IA solo bajo demanda.
3. Base de traducciones validadas.
4. Entrenamiento o ajuste de modelo propio en una fase futura.

## 5. Portal del Paciente: Web Responsive o App Movil

### Recomendacion

Para esta etapa se recomienda usar una **PWA responsive**, no una app movil nativa.

### Justificacion

Una PWA permite:

- Abrir desde un enlace.
- Usar en navegador.
- Instalar como app si el paciente desea.
- Reducir friccion de descarga.
- Funcionar mejor en celulares con poco espacio.
- Mantener un solo desarrollo para web y movil.
- Cachear recursos basicos.

### Distribucion recomendada

```txt
Paciente: PWA movil ligera.
Medico/Admin: dashboard web.
```

Una app nativa podria evaluarse mas adelante si se requieren notificaciones avanzadas, uso offline profundo o integracion con funciones especificas del dispositivo.

## 6. Seguimiento Medico al Paciente

### Problema

La atencion no debe terminar al finalizar la videollamada. Algunos pacientes necesitan control posterior, especialmente si presentan fiebre, dolor persistente, lesiones, dificultad respiratoria u otros signos de alarma.

### Propuesta

Crear un modulo de seguimiento clinico.

### Flujo propuesto

1. Al cerrar la consulta, el medico define un plan de seguimiento.
2. El sistema crea tareas automaticas.
3. El paciente recibe preguntas simples.
4. El medico revisa respuestas y alertas.
5. Si hay signos de alarma, el sistema prioriza al paciente.

### Ejemplos de seguimiento

```txt
Control en 3 dias.
Revisar fiebre y dolor.
Confirmar si tomo medicamento.
Solicitar foto de evolucion.
Alertar si hay dificultad para respirar.
```

### Formulario del paciente

El paciente debe responder preguntas simples:

```txt
Como te sientes hoy?
[Mejor] [Igual] [Peor]

Tienes fiebre?
[Si] [No]

Tomaste tus medicamentos?
[Si] [No]

Presentas dificultad para respirar?
[Si] [No]
```

### Panel del medico

El medico debe ver los seguimientos organizados por prioridad:

```txt
Urgentes:
- Paciente con dificultad para respirar.
- Paciente con fiebre persistente.

Pendientes:
- Paciente no respondio seguimiento.
- Paciente debe enviar foto.

Estables:
- Paciente reporta mejoria.
```

### Estados del seguimiento

```txt
pendiente
notificado
visto
respondido
no respondio
alertado al medico
resuelto
derivado
```

## 7. Notificaciones para Seguimiento

### Problema

No se puede garantizar que el paciente entre al sistema por voluntad propia. El sistema debe insistir, facilitar el acceso y alertar al medico si el paciente no responde.

### Propuesta

Usar notificaciones multicanal.

### Canales recomendados

1. SMS.
2. WhatsApp.
3. Push notification de PWA.
4. Aviso dentro del portal del paciente.

### Mensaje sugerido

```txt
Sumaq Qhali: Tiene un seguimiento medico pendiente.
Ingrese aqui: https://...
```

El enlace debe llevar directamente al seguimiento, no a la pagina inicial.

### Recordatorios escalonados

```txt
09:00 Primer aviso.
13:00 Recordatorio.
18:00 Ultimo aviso.
Dia siguiente: alerta al medico.
```

### Seguridad

El enlace debe usar un token seguro:

- Token unico.
- Expiracion.
- Asociado al paciente y seguimiento.
- Registro de acceso.

## 8. Fases de Implementacion

### Fase 1: Estabilizacion de videollamada

- Reemplazar el iframe simple por una integracion controlada.
- Evaluar Daily como proveedor principal.
- Agregar modo senal baja.
- Mantener consulta activa aunque falle video.
- Agregar reconexion automatica y boton de reintento.

### Fase 2: Traduccion eficiente

- Crear diccionario medico local.
- Crear plantillas de recetas e indicaciones.
- Implementar cache exacto.
- Implementar indicaciones por bloques.
- Usar IA solo bajo demanda.

### Fase 3: Seguimiento clinico

- Crear entidad de seguimiento.
- Crear panel de seguimientos para el medico.
- Crear formularios simples para el paciente.
- Crear alertas por sintomas de riesgo.

### Fase 4: Notificaciones

- Implementar recordatorios por SMS o WhatsApp.
- Agregar links seguros de seguimiento.
- Registrar estados de notificacion.
- Alertar al medico si el paciente no responde.

### Fase 5: Grabacion clinica breve

- Agregar solicitud de grabacion desde el medico.
- Agregar consentimiento del paciente.
- Grabar fragmentos cortos.
- Guardar evidencia en expediente.
- Agregar foto clinica guiada como respaldo.

## 9. Prioridad Recomendada

Orden sugerido para desarrollar:

1. Modo senal baja y reconexion de videollamada.
2. Migracion a Daily o mejora profunda de Jitsi.
3. Indicaciones por bloques y cache de traduccion.
4. Seguimiento medico basico.
5. Notificaciones por WhatsApp/SMS.
6. Grabacion breve con consentimiento.
7. Modelo propio de traduccion en fase futura.

## Conclusion

La mejora principal no es solo cambiar tecnologia, sino adaptar el sistema a un contexto real de salud rural o baja conectividad.

Sumaq Qhali deberia evolucionar hacia una plataforma de telemedicina resiliente:

- La videollamada debe priorizar que el medico vea al paciente.
- La consulta no debe perderse si falla la red.
- La traduccion debe ser economica, segura y reutilizable.
- El seguimiento debe continuar despues de la consulta.
- Las notificaciones deben ayudar a que el paciente vuelva al sistema.

Con estas mejoras, el proyecto seria mas solido tecnicamente y mas coherente con las necesidades de pacientes que no siempre tienen buena conexion a internet.
