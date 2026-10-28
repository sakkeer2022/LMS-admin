"use client";
import { Button, Typography } from "@/components/ui";
import { useState } from "react";
export type PaymentState =
  | "idle"
  | "authorizing"
  | "authorized"
  | "pending"
  | "captured"
  | "cancelled"
  | "failed";
export interface CheckoutAdapter {
  authorize: (options: {
    orderId: string;
    signal: AbortSignal;
  }) => Promise<"authorized" | "pending" | "cancelled">;
}
export function PaymentLauncher({
  adapter,
  orderId,
  confirmCapture,
}: {
  adapter: CheckoutAdapter;
  orderId: string;
  confirmCapture: (orderId: string) => Promise<"pending" | "captured">;
}) {
  const [state, setState] = useState<PaymentState>("idle");
  async function launch() {
    setState("authorizing");
    try {
      const result = await adapter.authorize({
        orderId,
        signal: AbortSignal.timeout(120_000),
      });
      setState(result);
      if (result === "authorized") setState(await confirmCapture(orderId));
    } catch {
      setState("failed");
    }
  }
  return (
    <section aria-label="Secure checkout">
      <Typography role="status">Payment: {state}</Typography>
      <Button
        disabled={["authorizing", "authorized", "pending", "captured"].includes(
          state,
        )}
        onClick={launch}
      >
        Open secure checkout
      </Button>
      {state === "pending" && (
        <Typography>
          Awaiting backend confirmation. Do not pay again.
        </Typography>
      )}
    </section>
  );
}
// Adapter owns SDK modal. Backend creates orders, validates amounts, captures, and verifies webhooks.
