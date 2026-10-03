import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { C as Package, Y as ArrowLeft, d as ShoppingBag, f as Settings } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/AdminHeader-BLhPJ18f.js
var import_jsx_runtime = require_jsx_runtime();
function AdminHeader({ title, subtitle, currentRoute, actions }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "mb-6 space-y-4 sm:mb-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
					to: "/",
					className: "inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Volver a la tienda" })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "rounded-md bg-primary/10 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary border border-primary/20",
					children: "⚙️ Panel Admin"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl",
					children: title
				}), subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-0.5 text-xs text-muted-foreground sm:text-sm",
					children: subtitle
				})] }), actions && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap items-center gap-2 sm:gap-3 shrink-0",
					children: actions
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-xs no-scrollbar",
				children: [
					{
						id: "productos",
						label: "Productos y Ofertas",
						mobileLabel: "Productos",
						href: "/admin/productos",
						icon: Package
					},
					{
						id: "ordenes",
						label: "Órdenes Pagadas",
						mobileLabel: "Órdenes",
						href: "/admin/ordenes",
						icon: ShoppingBag
					},
					{
						id: "configuracion",
						label: "Configuración",
						mobileLabel: "Config.",
						href: "/admin/configuracion",
						icon: Settings
					}
				].map((tab) => {
					const Icon = tab.icon;
					const isActive = currentRoute === tab.id;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: tab.href,
						className: `flex flex-1 min-w-[90px] sm:min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-all sm:px-4 ${isActive ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3.5 w-3.5 shrink-0" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden sm:inline",
								children: tab.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "sm:hidden",
								children: tab.mobileLabel
							})
						]
					}, tab.id);
				})
			})
		]
	});
}
//#endregion
export { AdminHeader as t };
