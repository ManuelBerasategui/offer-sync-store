import { createClient } from "@supabase/supabase-js";

function createSupabaseFetch(supabaseKey) {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }
    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const [p, v, b, c] = await Promise.all([
    supabase.from('products').select('*').neq('stock', 'NO'),
    supabase.from('product_variants').select('*'),
    supabase.from('banners').select('*').eq('activo', 'SI'),
    supabase.from('site_config').select('clave,valor'),
  ]);

  if (p.error) console.error("P error:", p.error);
  if (v.error) console.error("V error:", v.error);
  if (b.error) console.error("B error:", b.error);
  if (c.error) console.error("C error:", c.error);

  const pSize = JSON.stringify(p.data || []).length;
  const vSize = JSON.stringify(v.data || []).length;
  const bSize = JSON.stringify(b.data || []).length;
  const cSize = JSON.stringify(c.data || []).length;
  const total = pSize + vSize + bSize + cSize;

  console.log(`Products: ${p.data?.length} rows, ${(pSize / 1024).toFixed(1)} KB`);
  console.log(`Variants: ${v.data?.length} rows, ${(vSize / 1024).toFixed(1)} KB`);
  console.log(`Banners: ${b.data?.length} rows, ${(bSize / 1024).toFixed(1)} KB`);
  console.log(`Config: ${c.data?.length} rows, ${(cSize / 1024).toFixed(1)} KB`);
  console.log(`Total per getStoreData call: ${(total / 1024).toFixed(1)} KB (${(total / 1024 / 1024).toFixed(2)} MB)`);
}
check();
