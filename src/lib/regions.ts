"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import type { DialCountry } from "@/lib/phone";

export const countriesKey = ["regions", "countries"] as const;

/**
 * The countries the platform serves (GET /regions/countries, public), for the phone number's country
 * picker. Empty until loaded; nothing about a country is hard-coded in the app.
 */
export function useServedCountries(): DialCountry[] {
  const query = useQuery({
    queryKey: countriesKey,
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => api<DialCountry[]>("/regions/countries", { signal }).then((r) => r.data),
  });
  return query.data ?? [];
}
