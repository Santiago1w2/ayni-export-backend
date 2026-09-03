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

## Postman

Importa `postman/Ayni-Exports.postman_collection.json`. Configura `baseUrl`, ejecuta Login para guardar automáticamente `token` y completa los IDs generados por cada request. Los uploads dejan el campo File vacío para selección manual. Para PDFs usa **Send and Download**. Collection Runner permite ejecutar la secuencia, aunque los archivos deben seleccionarse manualmente.

## Migrar a AWS RDS

Prisma no depende del SDK de Supabase para consultas. Para migrar a RDS PostgreSQL, cambia `DATABASE_URL`/`DIRECT_URL`, configura SSL según RDS y ejecuta `npm run db:deploy`. Solo `storage.service.ts` requiere cambios si también sustituyes Supabase Storage.
