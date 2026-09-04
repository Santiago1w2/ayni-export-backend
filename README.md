# Ayni Exports API

Monolito modular Node.js + Express + TypeScript para el MVP B2B/TradeTech Ayni Exports. Prisma es la fuente de verdad del modelo PostgreSQL; Gemini aporta explicaciones y revisión preliminar, pero nunca decide scores, precios o estados.

## Arquitectura

El flujo es `route → controller → service → Prisma / Gemini / Storage`. `prisma/schema.prisma` contiene el modelo, `prisma/migrations` la migración reproducible y `prisma/seed.ts` datos ficticios. Los archivos se guardan en Supabase Storage o, sin configuración, en `uploads/` durante desarrollo.

## Requisitos

- Node.js 20+
- PostgreSQL (Supabase PostgreSQL o PostgreSQL estándar)
- Una API key Gemini opcional

## Configuración

Copia `.env.example` a `.env` y completa:

```env
PORT=3000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=
DIRECT_URL=
JWT_SECRET=
JWT_EXPIRES_IN=12h
GEMINI_API_KEY=
GEMINI_MODEL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=ayni-documents
RUC_API_URL=
RUC_API_KEY=
NODE_ENV=development
```

En Supabase abre **Project Settings → Database → Connection string**. Usa la URL pooled de runtime como `DATABASE_URL` y, cuando sea necesario para migraciones, la conexión directa como `DIRECT_URL`. Escapa caracteres especiales de la contraseña según formato URL. Nunca expongas `JWT_SECRET`, `GEMINI_API_KEY` o `SUPABASE_SERVICE_ROLE_KEY` al frontend.

## Prisma y base de datos

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:studio
```

En producción ejecuta `npm run db:deploy`, no `migrate dev`. Las tablas se crean mediante la migración; no es necesario crearlas desde el dashboard de Supabase.

El seed crea un exportador y seis importadores claramente ficticios, intereses para Palta Hass, Mango, Arándano, Café y Cacao, además de formularios y requisitos documentales demo. La contraseña demo es `Demo12345!`; úsala solo localmente.

## Ejecución

```bash
npm run dev
npm run build
npm start
```

## Capacidades y endpoints

- `/api/auth`: registro, login y usuario actual.
- `/api/companies`: empresa propia, actualización, perfil público y verificación básica.
- `/api/importers`: marketplace, filtros y paginación.
- `/api/interests`: CRUD de intereses de compra para importadores.
- `/api/requirement-forms`, `/api/requirement-fields`, `/api/document-requirements`: constructor de requisitos.
- `/api/offers`: CRUD de ofertas del exportador y matching persistente.
- `/api/requests`: solicitud convergente, respuestas, documentos, feedback, dashboards, estados y contacto posterior a aceptación.
- `/api/requests/:id/agreement`: crea el acuerdo y calcula el valor comercial.
- `/api/agreements/:id/pdf`: PDF profesional del acuerdo.
- `/api/agreements/:id/complete`: registra la operación completada.
- `/api/agreements/:id/completion-pdf`: constancia interna de finalización.
- `/api/chat`: Ayni AI con contexto opcional de oferta, importador o solicitud.
- `/api/documents/analyze`: análisis preliminar independiente de PDF.

Salvo health, root, marketplace y perfil público, los endpoints requieren `Authorization: Bearer <JWT>`. El backend valida rol y ownership.

## Flujo de estados

`DRAFT → SUBMITTED → UNDER_REVIEW → ACCEPTED → NEGOTIATING → AGREEMENT_REACHED → COMPLETED`.

También se permiten `UNDER_REVIEW → CHANGES_REQUESTED → SUBMITTED`, `UNDER_REVIEW → REJECTED` y cancelación desde estados iniciales. Cada transición se registra en `RequestStatusHistory`.

## Flujos del MVP

Exportador: registra empresa y oferta, elige directamente un importador o solicita ranking, crea una solicitud, responde el formulario, sube documentos, obtiene feedback y envía. Tras aceptación accede al contacto, negocia, registra el acuerdo y completa la operación.

Importador: registra empresa, intereses y formularios, recibe solicitudes, pide cambios o acepta/rechaza. La negociación ocurre fuera de Ayni mediante los contactos liberados tras aceptación.

## Gemini y fallbacks

Gemini se usa en chatbot y análisis preliminar directo de PDF con structured output. Las instrucciones documentales creadas por el importador se añaden al contexto. Si falta la key, hay timeout, cuota o JSON inválido, se usa fallback TypeScript/mock. Gemini no verifica empresas, no calcula matching y no genera el PDF.

## Supabase Storage

Con las tres variables `SUPABASE_*`, `storage.service.ts` usa un bucket privado y guarda solo paths/metadatos en PostgreSQL. Sin ellas usa `uploads/` local. La service-role key permanece exclusivamente en backend.

## Postman - Full MVP Testing

1. Inicia el backend con `npm run dev`.
2. Importa `postman/Ayni-Exports.postman_collection.json` en Postman.
3. Confirma que `baseUrl` sea `http://localhost:3000`.
4. Ejecuta los login de exportador e importador. Sus tests guardan automáticamente `exporterToken` e `importerToken`; el login administrativo guarda `adminToken`.
5. Para verificar una cuenta nueva, copia desde Gmail el código de seis dígitos en `verificationCode` y ejecuta manualmente **Verify Email**. Postman no recibe ni conoce credenciales SMTP.
6. En las requests documentales selecciona manualmente un PDF en `document`. La colección no contiene rutas locales. Activa `runFileUploads=true` para incluirlas en Collection Runner.
7. Para guardar el acuerdo o la constancia usa **Send and Download**.
8. Collection Runner puede encadenar los IDs de empresa, interés, formulario, campos, oferta, solicitud, acuerdo y notificación mediante variables de colección.
9. Los pasos que requieren correo, archivos, estados previos o que son destructivos se omiten por defecto. Se habilitan con las variables `run*` indicadas en cada descripción.
10. Para administración configura `adminEmail` y `adminPassword` solo en tu Postman local. La colección no incluye credenciales administrativas.

Orden recomendado:

`Health → Register/Login Exporter → Verify Email → Create Exporter Company → Register/Login Importer → Verify Email → Create Importer Company → Create Buying Interest → Create Requirement Form/Requirements → Create Export Offer → Matching → Create Export Request → Complete Responses/Documents → Opportunity Feedback → Submit → Importer Accepts → Contact → Start Negotiation → Create Agreement → Agreement PDF → Complete Agreement → Completion PDF → Review`.

El seed incluye usuarios ficticios verificados para desarrollo: `exporter.demo@ayni.local` e `importer.germany@ayni.local`, ambos con la contraseña demo documentada `Demo12345!`. No uses estas credenciales fuera de desarrollo.

## Migrar a AWS RDS

Prisma no depende del SDK de Supabase para consultas. Para migrar a RDS PostgreSQL, cambia `DATABASE_URL`/`DIRECT_URL`, configura SSL según RDS y ejecuta `npm run db:deploy`. Solo `storage.service.ts` requiere cambios si también sustituyes Supabase Storage.

## Verificación de correo con Gmail

Cada registro crea un código aleatorio de seis dígitos, almacena únicamente su hash y lo marca con expiración de 10 minutos. Hay un máximo de cinco intentos y cooldown de 60 segundos para reenvíos. Configura una contraseña de aplicación de Google:

```env
GMAIL_USER=
GMAIL_APP_PASSWORD=
EMAIL_FROM_NAME=Ayni Exports
```

Si Gmail no esta configurado o el servidor no puede conectarse a SMTP, el registro devuelve `emailSent: false`. La cuenta se conserva para que el usuario pueda iniciar sesion y reintentar con `POST /api/auth/resend-verification`; el reenvio devuelve HTTP 503 si Gmail sigue inaccesible. Los codigos que no pudieron enviarse se eliminan y no activan el cooldown. Un usuario sin correo verificado puede iniciar sesion, consultar `/api/auth/me`, verificar y reenviar; las operaciones comerciales permanecen bloqueadas.

## Administración y moderación

`UserRole` admite `EXPORTER`, `IMPORTER` y `ADMIN`. Todos usan el mismo login. Para crear idempotentemente el primer administrador mediante el seed configura:

```env
SUPER_ADMIN_EMAIL=
SUPER_ADMIN_PASSWORD=
```

No se incluyen credenciales admin por defecto. Las cuentas pueden estar `ACTIVE`, `SUSPENDED` o `BLOCKED`. Los administradores consultan estadísticas reales, usuarios y empresas; verifican o rechazan empresas y moderan cuentas. Cada acción queda en `AdminAuditLog`. El badge de marketplace depende exclusivamente de `Company.verificationStatus`, no de la verificación del correo.

## Dashboards, reseñas y notificaciones

- `GET /api/dashboard/exporter`: operaciones, valores, matching, productos, destinos y actividad del exportador autenticado.
- `GET /api/dashboard/importer`: solicitudes, aceptación, importaciones, productos, orígenes y rating del importador autenticado.
- `GET /api/admin/stats`: estadísticas globales calculadas con Prisma.
- `POST /api/agreements/:id/reviews`: reseña de 1 a 5, solo después de completar la operación y una vez por empresa/acuerdo.
- `GET /api/companies/:id/reviews`: rating y reseñas públicas paginadas.
- `GET /api/exporters/:id`: perfil público seguro del exportador.
- `/api/notifications`: listado, marcar una y marcar todas como leídas.

Los perfiles del marketplace incluyen rating, total de reseñas, intereses resumidos y operaciones completadas sin exponer datos privados.
