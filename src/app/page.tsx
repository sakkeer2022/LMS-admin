import { Card, ButtonLink, Typography } from "@/components/ui";
import { Layers3, ShieldCheck, Video } from "lucide-react";
export default function Home() {
  return (
    <main id="main" className="max-w-5xl mx-auto py-16">
      <Typography tone="muted">PLATFORM / FOUNDATION</Typography>
      <Typography variant="h1">One platform. Every portal.</Typography>
      <Typography>
        A secure starting point for operations, providers, consumers, and live
        sessions.
      </Typography>
      <div className="grid">
        {[
          [Layers3, "Isolated portals", "Independent navigation and layouts."],
          [
            ShieldCheck,
            "Explicit access",
            "Verified sessions and granular permissions.",
          ],
          [
            Video,
            "Provider adapters",
            "Replace SDKs without rewriting workflows.",
          ],
        ].map(([Icon, title, copy]) => {
          const Glyph = Icon as typeof Layers3;
          return (
            <Card key={String(title)}>
              <Glyph aria-hidden="true" />
              <Typography variant="h2">{String(title)}</Typography>
              <Typography>{String(copy)}</Typography>
            </Card>
          );
        })}
      </div>
      <ButtonLink variant="primary" href="/login">
        Sign in
      </ButtonLink>
      <Typography tone="muted" className="mt-6">
        Tenant portals activate after backend membership claims are configured.
      </Typography>
    </main>
  );
}
