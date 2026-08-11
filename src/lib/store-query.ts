import { queryOptions } from "@tanstack/react-query";
import { getStoreData } from "./store.functions";

export const storeQueryOptions = queryOptions({
  queryKey: ["store"],
  queryFn: () => getStoreData(),
  staleTime: 60_000,
  refetchOnWindowFocus: true,
});
