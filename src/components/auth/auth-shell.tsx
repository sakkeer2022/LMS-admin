import type { ReactNode } from "react";
import Image from "next/image";

const ROW_ONE = [4, 1, 2, 3];
const ROW_TWO = [5, 6, 7, 8];

function PhotoRow({
  photos,
  className,
}: {
  photos: number[];
  className: string;
}) {
  return (
    <div aria-hidden className={`absolute flex items-center gap-2 ${className}`}>
      {photos.map((n) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={n}
          src={`/auth/photo-${n}.png`}
          alt=""
          className="h-[175px] w-[185px] max-w-none bg-[#d9d9d9] object-cover"
        />
      ))}
    </div>
  );
}

function Glow({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`absolute flex h-[526px] w-[602px] items-center justify-center ${className}`}
    >
      <div className="relative h-[204px] w-[601px] rotate-[37.28deg]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/auth/glow.svg"
          alt=""
          className="absolute inset-x-[-44.21%] inset-y-[-130.27%] block max-w-none"
        />
      </div>
    </div>
  );
}

function Fade({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`absolute h-[86px] w-[769px] bg-[#18082f] blur-[28.8px] ${className}`}
    />
  );
}

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-card">
      <aside className="relative hidden shrink-0 flex-col justify-between overflow-hidden bg-[#18082f] p-14 lg:flex lg:basis-[620px]">
        <PhotoRow photos={ROW_ONE} className="top-[133px] left-[-115px] opacity-[0.14]" />
        <PhotoRow photos={ROW_TWO} className="top-[320px] left-[-211px] opacity-10" />
        <Fade className="top-[446px] left-[-26px]" />
        <Fade className="top-[98px] left-[-98px]" />
        <Glow className="top-[700px] left-[-211px]" />
        <Glow className="top-[-249px] left-[287px]" />
        <div className="relative">
          <Image src="/auth/logo.svg" alt="Amentorz" width={122} height={18} priority unoptimized />
        </div>
        <div className="relative flex flex-col gap-5 text-purple-100">
          <p className="text-xs font-semibold tracking-[0.02em]">Amentorz Admin Portal</p>
          <p className="max-w-[422px] text-4xl leading-11 font-bold tracking-[-0.015em] text-white">
            Everything you need to manage Amentorz, in one place.
          </p>
          <p className="text-lg leading-7">
            Oversee faculty, students, sessions, content, payments, and
            day-to-day platform operations with clarity.
          </p>
        </div>
      </aside>
      <main id="main" className="flex flex-1 items-center justify-center px-6 py-14 lg:px-20">
        {children}
      </main>
    </div>
  );
}
