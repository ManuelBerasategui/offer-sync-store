import { queryOptions } from "@tanstack/react-query";
import { getStoreData } from "./store.functions";

export const storeQueryOptions = queryOptions({
  queryKey: ["store"],
  queryFn: () => getStoreData(),
  staleTime: 1000 * 60 * 5, // 5 minutos de cache activo (reduce lecturas de Supabase en 80%+)
  gcTime: 1000 * 60 * 15, // Mantener en memoria 15 minutos
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});

