"use client";
import { Typography } from "./Typography";
export function PdfViewer({ url, title }: { url: string; title: string; }) {
  if (!url.startsWith("/api/v1/") || url.includes(".."))
    return <Typography role="alert">Invalid report URL</Typography>;
  return (
    <section>
      <Typography variant="h2">{title}</Typography>
      <iframe src={url} title={title} className="w-full h-[70vh]" />
      <a href={url} target="_blank" rel="noopener noreferrer">
        Open PDF to download or print
      </a>
    </section>
  );
}
