# 🛒 Te Importamos — E-Commerce Store

**Te Importamos** es una tienda online de productos importados construida sobre **TanStack Start (React 19 + SSR + Vite)**, conectada con **Supabase** para gestión de usuarios u órdenes, **Google Sheets (OpenSheet)** para catálogo en tiempo real y **Mercado Pago** para procesamiento de pagos.

---

## 🚀 Tecnologías Principales

- **Framework**: [TanStack Start](https://tanstack.com/router) (React 19, Vite, Server-Side Rendering).
- **Estilos & UI**: Tailwind CSS v4, Lucide Icons, Shadcn UI / Radix primitives.
- **Base de Datos & Auth**: [Supabase](https://supabase.com) (Autenticación de usuarios y tabla de pedidos).
- **Fuente de Productos**: Google Sheets API (vía OpenSheet).
- **Pagos**: [Mercado Pago SDK](https://www.mercadopago.com.ar/developers) (Checkout Pro & Card Payment Bricks).

---

## 📂 Estructura del Proyecto

```text
offer-sync-store/
├── public/                 # Archivos estáticos públicos
├── supabase/               # Configuraciones locales de Supabase
├── src/
│   ├── routes/             # Páginas y rutas de la app (File-Based Routing)
│   │   ├── __root.tsx      # Layout raíz y proveedores globales
│   │   ├── index.tsx       # Landing page (Ofertas, destacados, reseñas)
│   │   ├── catalogo.tsx    # Catálogo completo con filtros y búsqueda
│   │   ├── producto.$id.tsx# Ficha técnica y descuentos por volumen
│   │   ├── carrito.tsx     # Vista de carrito de compras
│   │   ├── auth.tsx        # Login y registro de usuarios
│   │   └── gracias.tsx     # Confirmación de compra y estado del pago
│   ├── components/         # Componentes de interfaz de usuario
│   │   ├── ui/             # Componentes de diseño atómicos (Shadcn/UI)
│   │   ├── SiteChrome.tsx  # Header y Footer globales
│   │   ├── ProductCard.tsx # Tarjeta de producto
│   │   ├── CheckoutFlow.tsx# Formulario de datos y flujo de checkout
│   │   └── CardPaymentForm.tsx # Formulario seguro de tarjeta Mercado Pago
│   ├── lib/                # Lógica de negocio y servicios
│   │   ├── store.ts        # Tipos y utilidades de precios/descuentos
│   │   ├── store.functions.ts # Carga de datos de Google Sheets
│   │   ├── cart.tsx        # Contexto y estado del carrito de compras
│   │   └── orders.functions.ts# Server functions para órdenes y pagos MP
│   └── integrations/       # Clientes de servicios externos (Supabase)
```

---

## 🛠️ Configuración e Instalación Local

### 1. Requisitos Previos
Tener instalado [Node.js](https://nodejs.org) (v18 o superior).

### 2. Clonar e Instalar Dependencias
```bash
git clone https://github.com/ManuelBerasategui/offer-sync-store.git
cd offer-sync-store
npm install
```

### 3. Variables de Entorno (`.env`)
Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
VITE_MERCADOPAGO_PUBLIC_KEY=tu_public_key_mercadopago
MERCADOPAGO_ACCESS_TOKEN=tu_access_token_mercadopago

VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_supabase
```

### 4. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

---

## 📜 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo Vite con SSR habilitado.
- `npm run build`: Compila la aplicación para producción.
- `npm run preview`: Previsualiza la versión construida localmente.
- `npm run lint`: Ejecuta ESLint para validar el código.

