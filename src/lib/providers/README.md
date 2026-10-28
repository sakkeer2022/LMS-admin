# Replaceable external services

video.tsx defines VideoAdapter, VideoSession, ConnectionState and VideoContainer. payment.tsx defines CheckoutAdapter, PaymentState and PaymentLauncher. These are interfaces and lifecycle shells; no vendor SDK or real payment flow is bundled.

Implement a concrete adapter in this directory and inject a stable instance from a composition component. Use dynamic import inside the client adapter for browser-only SDKs. Features cannot import vendor packages. Vendor credentials and room/order creation belong on the backend.

Video adapters must check participant authorization through the backend, obtain expiring room tokens, bind/unbind connection/device listeners, handle abort/reconnect events, and release media/listeners on leave. mount receives an AbortSignal and state callback. Respect cancellation after async work. Container requests mic/camera only after the join button. A support callback must call an authorized, audited backend action, never silently add an administrator to a call.

Payment adapters launch vendor modal UX and report authorized, pending or cancelled. SDK authorization is not captured payment. confirmCapture must query an authoritative backend order endpoint backed by verified webhook state and idempotent capture. Never trust price, tenant, tax or captured status supplied by the browser. Add status polling/reconciliation for pending orders once the contract exists. Backend owns authorization/capture/refund policy.

Tests may inject deterministic adapters that emit failure/disconnection/pending states. Label test/demo adapters and never use them as production defaults. Validate teardown, permissions denied, cancellation, interrupted connections, duplicate payment callbacks and unconfirmed capture. Select a vendor only when a real integration is requested; update CSP and Permissions-Policy specifically for that vendor.
