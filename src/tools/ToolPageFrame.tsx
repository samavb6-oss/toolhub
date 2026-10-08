import type { ReactNode } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Link } from "wouter";
import type { ToolDefinition } from "./toolRegistry";
import { ToolSeo } from "./ToolSeo";

export const toolInputClass =
  "mt-2 h-12 w-full rounded-xl border border-[#2c3a4c] bg-[#111b29] px-4 text-sm text-[#e8eef7] outline-none transition placeholder:text-[#718197] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#3b82f6]/15";

export const toolTextareaClass =
  "mt-2 min-h-32 w-full rounded-xl border border-[#2c3a4c] bg-[#111b29] px-4 py-3 text-sm leading-6 text-[#e8eef7] outline-none transition placeholder:text-[#718197] focus:border-[#3b82f6] focus:ring-4 focus:ring-[#3b82f6]/15";

export const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#2d6cdf] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(45,108,223,0.22)] transition hover:bg-[#2258ba] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/25";

export const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#33455c] bg-[#1a2636] px-4 py-2 text-sm font-bold text-[#cbd5e1] transition hover:border-[#4b6381] hover:bg-[#223146] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/25";

export function ToolPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[24px] border border-[#2a394d] bg-[#111b29] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.2)] sm:p-7 ${className}`}>{children}</section>;
}

export function ToolField({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return <div className="min-w-0">
    <label htmlFor={htmlFor} className="text-xs font-bold text-[#cbd5e1]">{label}</label>
    {children}
    {hint && <p className="mt-1.5 text-xs leading-5 text-[#8291a3]">{hint}</p>}
  </div>;
}

export function ToolPageFrame({ tool, children }: { tool: ToolDefinition; children: ReactNode }) {
  const Icon = tool.icon;
  return <div className="dark min-h-screen overflow-x-clip bg-[#070b14] text-white">
    <ToolSeo tool={tool} />
    <header className="sticky top-0 z-40 border-b border-[#172235]/90 bg-[#070b14]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1180px] items-center justify-between gap-4 px-4 sm:px-7">
        <Link href="/" aria-label="ToolHub home" className="flex items-center gap-2.5 rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/25">
          <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[linear-gradient(135deg,#3b82f6,#7c3aed)] text-white"><Icon aria-hidden="true" className="h-[18px] w-[18px]" /></span>
          <span className="text-[15px] font-extrabold tracking-[-0.04em] text-[#eff4fc]">ToolHub</span>
        </Link>
        <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-[#aab7c9] transition hover:bg-[#1a2636] hover:text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/25">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /><span>All tools</span>
        </Link>
      </div>
    </header>
    <main className="mx-auto max-w-[1180px] px-4 pb-16 pt-8 sm:px-7 sm:pt-12">
      <nav aria-label="Breadcrumb" className="mb-7 flex items-center gap-2 text-xs font-semibold text-[#8291a3]">
        <Link href="/" className="transition hover:text-white">ToolHub</Link><span aria-hidden="true">/</span><span>{tool.category}</span>
      </nav>
      <div className="mb-8 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#263751] bg-[#101827] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#9fb8df]">
            <Icon aria-hidden="true" className="h-3.5 w-3.5 text-[#6da1ff]" />{tool.category}
          </div>
          <h1 className="text-3xl font-extrabold tracking-[-0.055em] text-white sm:text-4xl">{tool.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aab7c9]">{tool.intro}</p>
        </div>
        <p className="inline-flex items-center gap-2 text-xs font-semibold text-[#8192a8]"><LockKeyhole aria-hidden="true" className="h-4 w-4 text-[#63c293]" />Runs privately in your browser</p>
      </div>
      {children}
      <footer className="mt-10 border-t border-[#1d2b3d] pt-5 text-xs leading-5 text-[#74859b]">
        <p>ToolHub processes this task in your browser. Your content is not uploaded to a ToolHub server.</p>
      </footer>
    </main>
  </div>;
}