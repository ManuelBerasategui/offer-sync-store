# 🛒 Te Importamos — E-Commerce Store

**Te Importamos** es una plataforma de comercio electrónico de alto rendimiento para venta minorista y mayorista de productos importados. Construida sobre **TanStack Start (React 19 + SSR + Vite)**, conectada con **Supabase** (Base de datos, Autenticación y Storage), **Mercado Pago** para procesamiento de pagos y **Resend** para notificaciones transaccionales.

---

## ✨ Características Principales

### 🛍️ Experiencia de Compra & Catálogo
- **Catálogo Dinámico & Filtros**: Búsqueda en tiempo real por nombre, filtrado por categorías, ofertas del día y productos más vendidos.
- **Sistema de Talles y Variantes**:
  - Talles especializados para calzado (35-45) y vestimenta (XS-XXXL).
  - Variantes de color y fotos personalizadas con precios específicos por variante.
- **Reglas de Compra Mayorista y Mínimos**:
  - Compra mínima por categoría (unidades o monto mínimo configurable).
  - Descuentos escalonados por volumen y combinación de productos dentro de la misma categoría.
- **Sección de Combos & Banners**: Promociones destacadas con cuenta regresiva interactiva y landing de combos dedicados.

### 💳 Flujo de Checkout Flexible
- **Mercado Pago**: Integración completa con Checkout Pro y tarjeta en sitio.
- **Transferencia / Efectivo**: Descuentos automáticos configurables por método de pago directo.
- **Derivación por WhatsApp**: Flujo automatizado para productos de atención personalizada (por ejemplo calzado especial o ventas asistidas).
- **Notificaciones por Email**: Envío automático de confirmaciones de compra tanto al comprador como al administrador vía **Resend**.

### 🛡️ Panel de Administración (`/admin`)
- **Gestión Integral de Productos**: Creación, edición, control de stock, fotos múltiples, variantes, talles, badges y visibilidad.
- **Control de Órdenes**: Seguimiento en tiempo real del estado del pedido (Pendiente, Pagado, Entregado, Cancelado) y detalle del cliente.
- **Configuración del Negocio**: Ajuste dinámico de teléfonos de WhatsApp, redes sociales, reglas de categorías, banners de promoción y costos de envío.

---

## 🚀 Tecnologías

- **Framework**: [TanStack Start](https://tanstack.com/router) (React 19, Vite, Server-Side Rendering, Nitro Engine).
- **Estilos & UI**: [Tailwind CSS v4](https://tailwindcss.com), Lucide Icons, Radix UI Primitives, Sonner (Toasts), Embla Carousel.
- **Base de Datos & Auth**: [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, Storage de imágenes, Auth).
- **Pagos**: [Mercado Pago SDK](https://www.mercadopago.com.ar/developers).
- **Emails Transaccionales**: [Resend](https://resend.com).
- **Testing & Seguridad**: Vitest, Semgrep (AppSec & SAST), ESLint v9, Prettier.

---

## 📂 Estructura del Proyecto

```text
offer-sync-store/
├── public/                     # Recursos estáticos
├── supabase/                   # Migraciones y configuraciones locales
├── src/
│   ├── routes/                 # Enrutamiento basado en archivos (TanStack Router)
│   │   ├── __root.tsx          # Layout raíz, Providers y Header/Footer
│   │   ├── index.tsx           # Portada (Banners, Ofertas, Mínimos, Reseñas)
│   │   ├── catalogo.tsx        # Catálogo general y filtros
│   │   ├── producto.$id.tsx    # Detalle de producto, talles y variantes
│   │   ├── combo.$index.tsx    # Vista detallada de combos
│   │   ├── carrito.tsx         # Carrito y validación de reglas de compra
│   │   ├── auth.tsx            # Login, Registro y Recuperación
│   │   ├── reset-password.tsx  # Restablecimiento de contraseña
│   │   ├── gracias.tsx         # Confirmación y estado de orden
│   │   ├── admin.index.tsx     # Redirección del panel admin
│   │   ├── admin.productos.tsx # Gestión de catálogo y stock
│   │   ├── admin.ordenes.tsx   # Panel de control de pedidos
│   │   └── admin.configuracion.tsx # Configuración global de la tienda
│   ├── components/             # Componentes de interfaz de usuario
│   │   ├── ui/                 # Componentes atómicos (Botones, Diálogos, etc.)
│   │   ├── CheckoutFlow.tsx    # Formulario y pasarelas de pago
│   │   ├── ProductCard.tsx     # Tarjeta de producto reutilizable
│   │   ├── SiteChrome.tsx      # Barra de navegación y pie de página
│   │   ├── AdminHeader.tsx     # Navegación del panel de administración
│   │   └── CardPaymentForm.tsx # Formulario seguro de pago
│   ├── lib/                    # Lógica de negocio y Server Functions
│   │   ├── store.ts            # Tipos, parseo de reglas y helpers de precios
│   │   ├── cart.tsx            # Contexto global del carrito de compras
│   │   ├── products.functions.ts # Server functions para CRUD de productos
│   │   ├── orders.functions.ts # Server functions para procesamiento de órdenes
│   │   ├── checkout.functions.ts # Creación de preferencias Mercado Pago
│   │   ├── email.functions.ts  # Plantillas y despacho de emails con Resend
│   │   └── store.test.ts       # Tests unitarios de reglas y descuentos
│   └── integrations/           # Clientes externos (Supabase Client/Server)
```

---

## 🛠️ Configuración e Instalación Local

### 1. Requisitos Previos
- [Node.js](https://nodejs.org) (v20 o superior recomendado).
- Cuenta en [Supabase](https://supabase.com).
- Cuenta de desarrollador en [Mercado Pago](https://www.mercadopago.com.ar/developers).
- *(Opcional)* Cuenta en [Resend](https://resend.com) para emails.

### 2. Clonar e Instalar
```bash
git clone https://github.com/ManuelBerasategui/offer-sync-store.git
cd offer-sync-store
npm install
```

### 3. Variables de Entorno (`.env`)
Crear un archivo `.env` en la raíz del proyecto con la siguiente configuración:

```env
# Mercado Pago
VITE_MERCADOPAGO_PUBLIC_KEY=tu_public_key_mercadopago
MERCADOPAGO_ACCESS_TOKEN=tu_access_token_mercadopago

# Supabase (Público y Server)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tu_anon_key_supabase
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_supabase

# Administradores (emails separados por coma para acceso al panel /admin)
ADMIN_EMAILS=admin@teimportamos.com,tu-email@gmail.com

# Resend (Emails transaccionales)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM="Te Importamos <notificaciones@tudominio.com>"
```

### 4. Ejecutar en Desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:3000`.

---

## 📜 Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo Vite con SSR habilitado.
- `npm run build`: Compila la aplicación optimizada para producción.
- `npm run preview`: Previsualiza la versión construida localmente.
- `npm run test`: Ejecuta los tests unitarios con Vitest.
- `npm run lint`: Ejecuta ESLint para validar la calidad del código.
- `npm run format`: Formatea el código con Prettier.
- `npm run security:scan`: Análisis estático de seguridad con Semgrep.

---

## 🔒 Seguridad y Buenas Prácticas
- **Autenticación y Roles**: Acceso protegido a rutas `/admin` validado en el servidor contra la lista `ADMIN_EMAILS`.
- **Row Level Security (RLS)**: Políticas estrictas en Supabase para proteger datos de órdenes y configuración.
- **Validación Estricta**: Sanitización de inputs y validación de esquemas con Zod.
