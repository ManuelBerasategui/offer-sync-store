import { queryOptions } from "@tanstack/react-query";
import { getStoreData } from "./store.functions";

export const storeQueryOptions = queryOptions({
  queryKey: ["store"],
  queryFn: () => getStoreData(),
  staleTime: 1000 * 60 * 15, // 15 min — reduce fetches a Supabase; los precios no cambian por minuto
  gcTime: 1000 * 60 * 60,   // Mantener en memoria 1 hora — evita re-fetch al navegar entre páginas
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

