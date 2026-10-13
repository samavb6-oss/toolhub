import { Link } from "wouter";
import { ArrowLeft, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="dark flex min-h-screen items-center justify-center bg-[#070b14] px-4 text-white">
      <section className="w-full max-w-lg rounded-3xl border border-[#263751] bg-[#111b29] p-8 text-center shadow-2xl sm:p-10">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1d2e49] text-[#8db7ff]">
          <SearchX aria-hidden="true" className="h-7 w-7" />
        </span>
        <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-[#8db7ff]">Error 404</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">We couldn’t find that page</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#aab7c9]">The link may be outdated, or the address may have been typed incorrectly. The ToolHub directory has the tools that are currently available.</p>
        <Link href="/" className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2d6cdf] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#2258ba] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/25">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Browse all tools
        </Link>
      </section>
    </main>
  );
}
