"use client";
import { useState, type ReactNode } from "react";
import {
  QueryCache,
  MutationCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { ApiError } from "@/lib/api/contracts";
import { TooltipProvider } from "@/components/shadcn/tooltip";
import { BannerProvider } from "@/components/feedback/banner-provider";
function report(error: Error) {
  toast.error(
    error instanceof ApiError && error.status >= 500
      ? `Service unavailable${error.traceId ? ` · Reference ${error.traceId}` : ""}`
      : error.message,
  );
}
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        queryCache: new QueryCache({ onError: report }),
        // Forms that show the error next to their fields opt out with meta.inlineErrors
        mutationCache: new MutationCache({
          onError: (error, _variables, _context, mutation) => {
            if (!mutation.meta?.inlineErrors) report(error);
          },
        }),
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (count, error) =>
              count < 1 && !(error instanceof ApiError && error.status < 500),
            refetchOnWindowFocus: false,
          },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={200}>
        <BannerProvider>{children}</BannerProvider>
      </TooltipProvider>
      <Toaster richColors />
    </QueryClientProvider>
  );
}
