# Plan de Mejora Integral: Sumaq Qhali 2.0

Este plan detalla las mejoras arquitectónicas, de seguridad y de experiencia de usuario necesarias para transformar el proyecto Sumaq Qhali de un prototipo avanzado a un sistema clínico de nivel empresarial.

## User Review Required

> [!IMPORTANT]
> **Cambios Estructurales Críticos:** Este plan sugiere incorporar **React Router** para la navegación y **JWT (JSON Web Tokens)** junto con **bcrypt** para la seguridad. Estos cambios modificarán la forma en la que los usuarios navegan y se autentican. ¿Estás de acuerdo con implementar estas tecnologías o prefieres mantener la estructura actual y enfocarnos solo en UI?

> [!WARNING]
> **Migración de Contraseñas:** Actualmente, las contraseñas se guardan en texto plano en la base de datos SQL Server. Al implementar `bcrypt`, las contraseñas existentes deberán ser reseteadas o los usuarios de prueba tendrán que ser recreados.

## Open Questions

1. **Gestor de Estado:** Para limpiar `App.tsx`, sugiero usar un gestor de estado. ¿Prefieres **Zustand** (más ligero y moderno) o el **Context API** nativo de React?
2. **Framework de UI:** El proyecto usa Tailwind CSS nativo. ¿Te gustaría integrar una librería de componentes como **shadcn/ui** o **Radix UI** para un diseño más premium y accesible, o prefieres seguir creando componentes desde cero con Tailwind?
3. **ORM para Base de Datos:** ¿Te interesa migrar las consultas SQL directas (`mssql`) a un ORM moderno como **Prisma** para mejorar la mantenibilidad y el tipado estricto en el backend?

---

## Proposed Changes

A continuación, la división de los cambios propuestos por capa de la aplicación.

### 1. Seguridad y Autenticación (Backend)
Actualmente el login compara contraseñas directamente y el cliente guarda un objeto en `localStorage`.
- Integrar `bcrypt` para encriptar las contraseñas en el registro (`/api/auth/register`).
- Integrar `jsonwebtoken` para generar un JWT en el login (`/api/auth/login`).
- Crear un middleware de autenticación en `server.ts` para proteger las rutas privadas (ej. `/api/patients`, `/api/appointments`).

#### [MODIFY] server.ts

### 2. Refactorización Arquitectónica (Frontend)
El componente `App.tsx` tiene casi 700 líneas y maneja enrutamiento, estado global, modales y llamadas a la API.
- **Enrutamiento:** Implementar `react-router-dom` para manejar las vistas (`/`, `/paciente`, `/doctor`, `/admin`).
- **Separación de Lógica:** Extraer las llamadas a `fetch` a una carpeta `src/services/api.ts`.
- **Gestión de Estado:** Mover el estado del usuario (`isLoggedIn`, `role`, `portalPatient`) a un manejador de estado global.

#### [MODIFY] src/App.tsx
#### [NEW] src/services/api.ts
#### [NEW] src/store/useAuthStore.ts (si usamos Zustand)

### 3. Modernización del Backend
Aunque el archivo `server.ts` funciona bien, se está convirtiendo en un archivo monolítico.
- Extraer las rutas a controladores separados (ej. `routes/auth.routes.ts`, `routes/patients.routes.ts`).
- Mejorar el tipado de TypeScript usando interfaces unificadas compartidas entre el Front y el Back.

#### [NEW] routes/auth.routes.ts
#### [NEW] routes/patients.routes.ts

### 4. Mejoras de UI/UX y Diseño Dinámico
Para alcanzar ese efecto "WOW" y una estética premium:
- **Animaciones:** Expandir el uso de `framer-motion` o CSS animations para transiciones fluidas entre las rutas y los modales.
- **Diseño del Sistema:** Estandarizar la paleta de colores en `tailwind.config` y extraer componentes reutilizables menores (`Button.tsx`, `Modal.tsx`, `InputField.tsx`).

#### [NEW] src/components/ui/Button.tsx
#### [NEW] src/components/ui/Modal.tsx

---

## Verification Plan

### Automated Tests
- Al no contar con pruebas automatizadas actualmente, se propone configurar **Vitest** y escribir pruebas unitarias para las funciones principales del backend (ej. lógica de encriptación y generación de tokens).

### Manual Verification
- Levantar la base de datos SQL Server y correr `pnpm run dev`.
- Probar el flujo completo de registro de un nuevo paciente (verificando que la contraseña se guarde encriptada en la base de datos).
- Iniciar sesión y comprobar que el token JWT es devuelto y almacenado de forma segura en el cliente.
- Navegar a través de las distintas vistas comprobando que las nuevas rutas (React Router) mantienen el estado del paciente sin recargar la página.
