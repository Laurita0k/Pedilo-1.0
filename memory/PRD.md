# Pedilo — Lo de Juan · PRD

## Problem Statement
Web app mobile-first de pedidos para la rotisería "Lo de Juan" usando el sistema "Pedilo". Dos sistemas: (1) app del cliente para ver menú y enviar pedido por WhatsApp, (2) panel admin para que el dueño edite todo sin código. Sin login cliente, sin pagos online. UX < 1 minuto por pedido.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB). JWT auth con bcrypt + httpOnly cookies + Bearer fallback. Emergent Object Storage para imágenes.
- **Frontend**: React (CRA + Tailwind + Shadcn UI). Mobile-first (max-w-md shell). Lucide icons. Sonner toasts.
- **Mensajería**: WhatsApp via `wa.me/{phone}?text=...`; orden persistida en DB antes del redirect.
- **Timezone**: America/Argentina/Buenos_Aires.

## User Personas
- **Cliente**: visitante anónimo desde móvil. Arma pedido, envía por WhatsApp en < 1 min.
- **Juan (dueño)**: gestiona negocio, pedidos en vivo, productos, combos, horarios desde `/admin`.

## Core Requirements
- Gestión dinámica de categorías, productos y combos.
- Personalización de productos con price-deltas.
- Carrito flotante con total en tiempo real, mezcla productos + combos.
- Mensaje WhatsApp automático + orden persistida en admin.
- Panel admin con tabs: Pedidos, Negocio, Categorías, Productos, Combos.
- Sin login cliente.

## What's Implemented

### Iteration 1 (2026-02)
- Backend completo: auth JWT, CRUD categorías/productos/combos/config, endpoints públicos.
- Seed automático (admin, 4 cats, 7 productos, 1 combo, WhatsApp +5492291570800).
- Frontend cliente: home, drawer de personalización, carrito flotante, checkout, envío WhatsApp.
- Frontend admin: login, dashboard con 4 tabs.
- 23/23 tests backend, 15/15 flows e2e.

### Iteration 2 (2026-02) — Pedidos + Horarios + Multi-imágenes + Object Storage
- **Pedidos persistentes**: `orders` collection; `POST /api/public/orders` se llama antes del redirect a WhatsApp; admin ve tab "Pedidos" con stats (pedidos de hoy, facturado, pendientes), filtros por estado, acciones (Preparando / Entregado / Cancelar / Eliminar), polling cada 20s, badge con contador en pestaña.
- **Horarios de atención**: `BusinessConfig.schedule` (mon-sun open/close/closed) + `open_override` (auto/open/closed). `GET /api/public/config` devuelve `is_open` computado con timezone AR, soporta horarios overnight (19:00-00:30). UI admin con editor de 7 días. Customer app muestra banner "Cerrado ahora · Abre mañana 19:00", deshabilita botón de envío con texto "Tienda cerrada".
- **Múltiples imágenes por producto**: campo `images: List[str]` + imagen principal; editor admin con galería visual; drawer de cliente muestra carrusel horizontal.
- **Object storage real**: Emergent Object Storage via `EMERGENT_LLM_KEY`; endpoints `POST /api/upload/image` (admin-auth) + `GET /api/files/{path}` (público con cache). Subida de imágenes en editores de productos y combos con fallback a base64.
- 37/37 tests backend, todos los flujos e2e.

## Prioritized Backlog
- **P1**: Notificación push/sonora al dueño cuando llega pedido nuevo (hoy polling 20s + badge).
- **P2**: Analytics por producto/día, productos más vendidos.
- **P2**: Soft-delete en imágenes subidas que ya no se usan (cleanup).
- **P2**: Cupones / códigos de descuento.
- **P3**: Editor de horarios con shadcn time picker (hoy `<input type="time">` nativo).
- **P3**: Whitelist server-side de `payment_method` en OrderCreate.

## Test Credentials
Ver `/app/memory/test_credentials.md`.
