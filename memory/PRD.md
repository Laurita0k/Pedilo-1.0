# Pedilo — Lo de Juan · PRD

## Problem Statement
Web app mobile-first de pedidos para la rotisería "Lo de Juan" usando el sistema "Pedilo". Dos sistemas: (1) app del cliente para ver menú y enviar pedido por WhatsApp, (2) panel admin para que el dueño edite todo sin código. Sin login cliente, sin pagos online. UX < 1 minuto por pedido.

## Architecture
- **Backend**: FastAPI + Motor (MongoDB). JWT auth con bcrypt + httpOnly cookies + Bearer fallback.
- **Frontend**: React (CRA + Tailwind + Shadcn UI). Mobile-first (max-w-md shell). Lucide icons. Sonner para toasts.
- **Storage**: MongoDB. Imágenes en URL o base64 data URI (sin object storage externo).
- **Mensajería**: WhatsApp via `wa.me/{phone}?text=...`.

## User Personas
- **Cliente**: visitante anónimo, entra desde móvil, elige, envía pedido por WhatsApp en < 1 min.
- **Juan (dueño)**: gestiona negocio, productos, combos y precios desde `/admin`.

## Core Requirements (static)
- Gestión dinámica de categorías, productos y combos.
- Personalización de productos con price-deltas (ej: +500 cheddar, sin tomate = 0).
- Carrito flotante con total en tiempo real, mezcla productos + combos.
- Mensaje WhatsApp automático con productos, opciones, total, dirección, pago.
- Panel admin con tabs: Negocio (config), Categorías, Productos, Combos.
- Sin login cliente.

## What's Implemented (2026-02)
- Backend completo: auth JWT, CRUD categorías/productos/combos/config, endpoints públicos.
- Seed automático: admin (admin@pedilo.com / pedilo123), config con WhatsApp 5492291570800, 4 categorías (Pollos, Hamburguesas, Milanesas, Empanadas), 7 productos, 1 Combo Familiar.
- Frontend cliente: home con categorías scroll, combos destacados, cards con botón Agregar, drawer de personalización, carrito flotante, checkout con dirección/notas/pago, envío WhatsApp.
- Frontend admin: login, dashboard con 4 tabs funcionales (editor rico de productos y combos con subida de imágenes).
- Diseño limpio, rojo #E53935 + naranja #FF7043, fuentes Outfit + Figtree.
- 23/23 tests backend y 15/15 flujos e2e pasando.

## Prioritized Backlog
- **P1**: Historial de pedidos persistente (que el dueño vea pedidos recibidos, no solo que lleguen por WhatsApp).
- **P1**: Múltiples imágenes por producto / galería.
- **P2**: Cupones / códigos de descuento.
- **P2**: Horarios de atención (cerrar tienda fuera de horario).
- **P2**: Object storage real (S3) para imágenes (hoy base64 o URL).
- **P3**: Notificaciones push al dueño cuando llega pedido.
- **P3**: Analytics básicos (pedidos por día, productos top).

## Test Credentials
Ver `/app/memory/test_credentials.md`.
