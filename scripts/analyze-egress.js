// Análisis de egress de Supabase
// ====================================
// Egress en Supabase = datos transferidos DESDE Supabase hacia afuera
// "Cached egress" = Supabase sirve la imagen al proxy/CDN → eso cuenta
// Pero una vez que el CDN tiene la imagen cacheada por 1 año, ya no vuelve a pedirla.

// DATOS REALES (medidos):
const PAYLOAD_PER_CALL_KB = 310.2; // KB por cada getStoreData() (products + variants + banners + config)
const PAYLOAD_PER_CALL_MB = PAYLOAD_PER_CALL_KB / 1024;

// staleTime = 15 min => max 4 fetches por hora por sesión activa
// Pero el server fn se ejecuta en el edge de Vercel → SSR. Cada visita única a la página hace 1 fetch.
// El edge también está en Cloudflare Workers → sin cache entre requests SSR.

// ESTIMACIÓN DE FETCH SSR:
// Si el store data NO está cacheado en Vercel Edge → cada visita = 1 getStoreData call
// Cache-Control en el SSR response: "public, max-age=0, must-revalidate" → NO cachea el HTML
// Por lo tanto cada visita de usuario = 1 fetch a Supabase DB = 310 KB de egress de BD

// ESTIMACIÓN DE VISITAS (para llegar a 130 MB/día):
const EGRESS_PER_DAY_MB = 130;
const visitsPerDay = (EGRESS_PER_DAY_MB * 1024) / PAYLOAD_PER_CALL_KB;
console.log(`Visitas/día estimadas para generar 130 MB de DB egress: ${Math.round(visitsPerDay)}`);
// 130 * 1024 / 310.2 ≈ 429 visitas/día

// IMAGEN EGRESS (Cached):
// El proxy /api/img cachea en Vercel CDN por 1 año.
// Primera vez que alguien ve una imagen → Vercel CDN se la pide a Supabase Storage → genera egress.
// Después → Vercel CDN la sirve directo, ya NO genera egress de Supabase.
// Pero si hay mucho tráfico de usuarios NUEVOS que nunca visitaron → el CDN puede no tener la imagen en cache.

// Tamaño típico de imagen WebP: ~17-20 KB (medido: 17460 bytes)
const AVG_IMAGE_SIZE_KB = 17.5;
// Productos en catálogo: 281 (del sitemap)
const TOTAL_PRODUCTS = 281;
const TOTAL_IMAGE_SIZE_MB = (TOTAL_PRODUCTS * AVG_IMAGE_SIZE_KB) / 1024;
console.log(`Tamaño total de todas las imágenes si se cachean desde cero: ${TOTAL_IMAGE_SIZE_MB.toFixed(1)} MB`);
// 281 * 17.5 / 1024 ≈ 4.8 MB → relativamente pequeño, se cachea rápido

// CONCLUSIÓN:
// El egress principal viene de las llamadas SSR a getStoreData (~310 KB/visita)
// NO de las imágenes (que se cachean en CDN después de la primera carga)

console.log("\n=== RESUMEN ===");
console.log(`Payload getStoreData: ${PAYLOAD_PER_CALL_KB.toFixed(1)} KB por visita`);
console.log(`Para 130 MB/día → necesita ≈ ${Math.round(visitsPerDay)} visitas/día`);
console.log(`Total imágenes si se re-cachearan todas: ${TOTAL_IMAGE_SIZE_MB.toFixed(1)} MB`);
console.log(`\nLA CAUSA PROBABLE: Las llamadas SSR de getStoreData() NO están cacheadas en el edge.`);
console.log(`Cada visita a teimportamosarg.com hace 1 fetch a Supabase DB = 310 KB de egress.`);
console.log(`Con 429 visitas/día eso genera los ~130 MB/día observados.`);
