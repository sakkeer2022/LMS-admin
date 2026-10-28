"use client";
import { Button, Typography } from "@/components/ui";
import { useEffect, useRef, useState } from "react";
export type ConnectionState =
  | "idle"
  | "checking"
  | "connecting"
  | "connected"
  | "disconnected"
  | "failed";
export interface VideoSession {
  setMicrophone: (enabled: boolean) => Promise<void>;
  setCamera: (enabled: boolean) => Promise<void>;
  leave: () => Promise<void>;
}
export interface VideoAdapter {
  mount: (
    element: HTMLElement,
    options: {
      sessionId: string;
      signal: AbortSignal;
      onState: (state: ConnectionState) => void;
    },
  ) => Promise<VideoSession>;
}
export function VideoContainer({
  adapter,
  sessionId,
  onEscalate,
}: {
  adapter: VideoAdapter;
  sessionId: string;
  onEscalate: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<ConnectionState>("idle");
  const [active, setActive] = useState<VideoSession>();
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    if (!requested) return;
    const controller = new AbortController();
    let connection: VideoSession | undefined;
    void (async () => {
      try {
        setState("checking");
        const devices = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        devices.getTracks().forEach((track) => track.stop());
        if (controller.signal.aborted) return;
        setState("connecting");
        connection = await adapter.mount(root.current!, {
          sessionId,
          signal: controller.signal,
          onState: (next) => {
            if (!controller.signal.aborted) setState(next);
          },
        });
        if (controller.signal.aborted) await connection.leave();
        else setActive(connection);
      } catch {
        if (!controller.signal.aborted) setState("failed");
      }
    })();
    return () => {
      controller.abort();
      void connection?.leave().catch(() => {});
    };
  }, [adapter, sessionId, requested]);
  const control = (action: () => Promise<void>) => {
    void action().catch(() => setState("failed"));
  };
  return (
    <section aria-label="Video session">
      <Typography role="status">Connection: {state}</Typography>
      <div ref={root} className="min-h-80 rounded-xl border border-slate-600" />
      {!requested && (
        <Button onClick={() => setRequested(true)}>
          Check devices and join
        </Button>
      )}
      {active && (
        <div className="flex gap-3 my-4">
          <Button onClick={() => control(() => active.setMicrophone(false))}>
            Mute mic
          </Button>
          <Button onClick={() => control(() => active.setMicrophone(true))}>
            Unmute mic
          </Button>
          <Button onClick={() => control(() => active.setCamera(false))}>
            Camera off
          </Button>
          <Button onClick={() => control(() => active.setCamera(true))}>
            Camera on
          </Button>
          <Button
            onClick={() =>
              control(async () => {
                await active.leave();
                setActive(undefined);
                setRequested(false);
                setState("disconnected");
              })
            }
          >
            Leave
          </Button>
        </div>
      )}
      {(state === "failed" || state === "disconnected") && (
        <div role="alert">
          <Typography>
            Connection interrupted. Check device permissions or contact support.
          </Typography>
          <Button onClick={onEscalate}>Request administrator assistance</Button>
        </div>
      )}
    </section>
  );
}
