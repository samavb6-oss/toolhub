import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  Activity, ArrowUpRight, BadgeDollarSign, BarChart3, BookOpen, Bot,
  Braces, BriefcaseBusiness, Calculator, ChevronRight, Clock3, CloudSun,
  Code2, Copy, Crop, Dices, Droplets, FileArchive, FileCode2, FileImage,
  FileOutput, FilePlus2, FileText, Fingerprint, Flame, Gauge, Hash, HeartPulse,
  ImageMinus, ImagePlus, Images, Landmark, Languages, ListChecks, Menu,
  MessageSquareText, Moon, MoreHorizontal, MoveHorizontal, MoveVertical, Palette,
  PenLine, Play, QrCode, RefreshCw, RotateCw, Ruler, Search, Settings2,
  ShieldCheck, Sparkles, Split, Star, Sun, Tag, Thermometer, Timer, Type,
  Unlock, UserRound, WandSparkles, Weight, X, Youtube, ZoomIn,
} from "lucide-react";
import { getToolPathByName } from "@/tools/toolRegistry";

type Tool = { name: string; icon: LucideIcon };
type Category = {
  name: string;
  eyebrow: string;
  icon: LucideIcon;
  tint: string;
  accent: string;
  tools: Tool[];
};

const categories: Category[] = [
  {
    name: "Finance", eyebrow: "Loan, EMI, GST, SIP, Tax and interest calculators.", icon: Landmark,
    tint: "#e8f8ef", accent: "#16865a", tools: [
      { name: "EMI Calculator", icon: Calculator }, { name: "SIP Calculator", icon: BarChart3 },
      { name: "GST Calculator", icon: BadgeDollarSign }, { name: "Loan Calculator", icon: Landmark },
      { name: "Income Tax Calculator", icon: FileText }, { name: "Salary Calculator", icon: BriefcaseBusiness },
      { name: "Interest Calculator", icon: Activity }, { name: "More Tools", icon: MoreHorizontal },
    ],
  },
  {
    name: "PDF Tools", eyebrow: "Merge, split, compress and convert PDF files.", icon: FileText,
    tint: "#fff0f0", accent: "#d84b52", tools: [
      { name: "Merge PDF", icon: FilePlus2 }, { name: "Split PDF", icon: Split },
      { name: "Compress PDF", icon: FileArchive }, { name: "PDF to Word", icon: FileOutput },
      { name: "Word to PDF", icon: FileText }, { name: "JPG to PDF", icon: FileImage },
      { name: "Unlock PDF", icon: Unlock }, { name: "More Tools", icon: MoreHorizontal },
    ],
  },
  {
    name: "Image Tools", eyebrow: "Resize, compress, crop and convert images.", icon: Images,
    tint: "#f3edff", accent: "#8057cf", tools: [
      { name: "Resize Image", icon: ZoomIn }, { name: "Compress Image", icon: ImageMinus },
      { name: "Crop Image", icon: Crop }, { name: "PNG to JPG", icon: FileImage },
      { name: "JPG to PNG", icon: ImagePlus }, { name: "Remove Background", icon: Palette },
      { name: "Rotate Image", icon: RotateCw }, { name: "More Tools", icon: MoreHorizontal },
    ],
  },
  {
    name: "Writing Tools", eyebrow: "Word counter, grammar checker and text utilities.", icon: PenLine,
    tint: "#fff5e9", accent: "#d77c22", tools: [
      { name: "Word Counter", icon: Type }, { name: "Character Counter", icon: ListChecks },
      { name: "Case Converter", icon: Languages }, { name: "Grammar Checker", icon: ShieldCheck },
      { name: "Text Summarizer", icon: FileText }, { name: "Read Time", icon: Timer },
      { name: "Lorem Ipsum", icon: BookOpen }, { name: "More Tools", icon: MoreHorizontal },
    ],
  },
  {
    name: "Converters", eyebrow: "Convert units, currencies, measurements and more.", icon: RefreshCw,
    tint: "#edf5ff", accent: "#326fc4", tools: [
      { name: "Length", icon: Ruler }, { name: "Weight", icon: Weight },
      { name: "Temperature", icon: Thermometer }, { name: "Area", icon: MoveHorizontal },
      { name: "Volume", icon: MoveVertical }, { name: "Currency", icon: BadgeDollarSign },
      { name: "Time", icon: Clock3 }, { name: "More Tools", icon: MoreHorizontal },
    ],
  },
  {
    name: "Utilities", eyebrow: "Password generators, QR codes, JSON tools and more.", icon: Settings2,
    tint: "#eef2f6", accent: "#536375", tools: [
      { name: "QR Code Generator", icon: QrCode }, { name: "Password Generator", icon: Fingerprint },
      { name: "UUID Generator", icon: Copy }, { name: "Barcode Generator", icon: Code2 },
      { name: "Random Number", icon: Dices }, { name: "JSON Formatter", icon: Braces },
      { name: "Base64 Encoder", icon: FileCode2 }, { name: "More Tools", icon: MoreHorizontal },
    ],
  },
  {
    name: "Health", eyebrow: "BMI, calorie and wellness calculators.", icon: HeartPulse,
    tint: "#fff0f2", accent: "#cf536b", tools: [
      { name: "BMI Calculator", icon: Gauge }, { name: "Calories Calculator", icon: Flame },
      { name: "Water Intake", icon: Droplets }, { name: "Body Fat", icon: Activity },
      { name: "Pregnancy Calculator", icon: HeartPulse }, { name: "Ovulation Calculator", icon: CloudSun },
      { name: "Ideal Weight", icon: Weight }, { name: "More Tools", icon: MoreHorizontal },
    ],
  },
  {
    name: "AI Tools", eyebrow: "Prompt generators and AI productivity tools.", icon: WandSparkles,
    tint: "#f1efff", accent: "#725ed2", tools: [
      { name: "AI Prompt Generator", icon: Bot }, { name: "Prompt Improver", icon: WandSparkles },
      { name: "Story Generator", icon: BookOpen }, { name: "Image Prompt Generator", icon: Images },
      { name: "Character Generator", icon: UserRound }, { name: "Business Name Generator", icon: BriefcaseBusiness },
      { name: "Blog Title Generator", icon: PenLine }, { name: "More Tools", icon: MoreHorizontal },
    ],
  },
  {
    name: "YouTube Tools", eyebrow: "SEO, title, tags and description generators.", icon: Youtube,
    tint: "#fff0f0", accent: "#d44350", tools: [
      { name: "YouTube Title Generator", icon: MessageSquareText }, { name: "Description Generator", icon: FileText },
      { name: "Tags Generator", icon: Tag }, { name: "Hashtag Generator", icon: Hash },
      { name: "Video Ideas", icon: Play }, { name: "Thumbnail Ideas", icon: ImagePlus },
      { name: "Channel Name", icon: Youtube }, { name: "More Tools", icon: MoreHorizontal },
    ],
  },
];

const trendingTools: Tool[] = [
  { name: "EMI Calculator", icon: Calculator }, { name: "Merge PDF", icon: FilePlus2 },
  { name: "Compress Image", icon: ImageMinus }, { name: "Word Counter", icon: Type },
  { name: "Password Generator", icon: Fingerprint }, { name: "Resize Image", icon: ZoomIn },
  { name: "QR Code Generator", icon: QrCode }, { name: "AI Prompt Generator", icon: Bot },
];

function getToolKey(categoryName: string, toolName: string): string {
  return `${categoryName}::${toolName}`;
}

function ToolTile({
  tool, category, isFavorite, isSelected, isAvailable, onSelect, onFavorite,
}: {
  tool: Tool; category: Category; isFavorite: boolean; isSelected: boolean; isAvailable: boolean;
  onSelect: () => void; onFavorite: () => void;
}) {
  const Icon = tool.icon;
  return (
    <div className="group relative min-w-0">
      <button
        type="button" onClick={onSelect} aria-current={isSelected ? "true" : undefined}
        aria-label={`Select ${tool.name}`} data-testid={`tool-${tool.name.toLowerCase().replaceAll(" ", "-")}`}
        className={`relative flex aspect-square w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[20px] border p-3 text-center transition duration-300 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20 ${
          isSelected
            ? "border-[#2d6cdf] bg-[#eef4ff] shadow-[0_16px_34px_rgba(45,108,223,0.16)] ring-2 ring-[#2d6cdf]/15 dark:bg-[#203452]"
            : "border-[#e6eaf0] bg-white shadow-[0_7px_24px_rgba(28,44,70,0.055)] hover:-translate-y-1 hover:border-[#cbd8eb] hover:shadow-[0_15px_30px_rgba(28,44,70,0.11)] dark:border-[#2c3a4c] dark:bg-[#1b2736] dark:hover:border-[#48617f]"
        }`}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition duration-300 group-hover:scale-105" style={{ color: category.accent, backgroundColor: category.tint }}>
          <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <span className="line-clamp-2 max-w-[10rem] text-[13px] font-semibold leading-[1.18] tracking-[-0.01em] text-[#26364a] dark:text-[#e8eef7]">{tool.name}</span>
        {tool.name !== "More Tools" && <span className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[9px] font-extrabold tracking-wide ${isAvailable ? "bg-[#e5f7ec] text-[#167447] dark:bg-[#173b2b] dark:text-[#91e0b2]" : "bg-[#f0f2f5] text-[#697789] dark:bg-[#273243] dark:text-[#a9b6c8]"}`}>{isAvailable ? "LIVE" : "PLANNED"}</span>}
        {isSelected && <span className="absolute inset-x-0 bottom-0 h-1 bg-[#2d6cdf]" />}
      </button>
      <button
        type="button" onClick={onFavorite} aria-label={`${isFavorite ? "Remove" : "Add"} ${tool.name} ${isFavorite ? "from" : "to"} favorites`}
        aria-pressed={isFavorite} data-testid={`favorite-${tool.name.toLowerCase().replaceAll(" ", "-")}`}
        className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full border transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20 ${
          isFavorite ? "border-[#f0c86a] bg-[#fff8df] text-[#bb7b11] dark:border-[#806c35] dark:bg-[#3b321e] dark:text-[#f0c86a]" : "border-transparent bg-white/80 text-[#9ba8b7] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-[#1b2736]/85 dark:text-[#718197]"
        }`}
      >
        <Star aria-hidden="true" className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function SectionHeading({ category, darkMode, headingId, onViewAll }: { category: Category; darkMode: boolean; headingId: string; onViewAll: () => void }) {
  const Icon = category.icon;
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: darkMode ? `${category.accent}25` : category.tint, color: category.accent }}>
          <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h2 id={headingId} className="text-lg font-bold tracking-[-0.03em] text-[#1d2c40] dark:text-[#f0f4fb] sm:text-xl">{category.name}</h2>
          <p className="text-xs font-medium text-[#8a98a9] dark:text-[#91a0b2]">{category.eyebrow}</p>
        </div>
      </div>
      <button type="button" onClick={onViewAll} className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-[#718198] transition hover:text-[#3b82f6] dark:text-[#a9b8cb] dark:hover:text-[#8db7ff]">
        View all <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToolsHomepage() {
  const [, setLocation] = useLocation();
  const [darkMode, setDarkMode] = useState(true);
  const [query, setQuery] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem("toolhub:favorites");
      const parsed: unknown = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
    } catch {
      return [];
    }
  });
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<{ tool: Tool; category: Category } | null>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem("toolhub:favorites", JSON.stringify(favorites));
    } catch {
      // Keep favorites usable for the current visit even if storage is disabled.
    }
  }, [favorites]);

  useEffect(() => {
    const targetId = decodeURIComponent(window.location.hash.slice(1));
    if (!targetId) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(targetId)?.scrollIntoView({ behavior: "auto", block: "start" });
      });
    });
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredCategories = useMemo(() => categories
    .map((category) => ({
      ...category,
      tools: category.tools.filter((tool) =>
        (!normalizedQuery || [tool.name, category.name, category.eyebrow].some((text) => text.toLowerCase().includes(normalizedQuery))) &&
        (!favoritesOnly || favorites.includes(getToolKey(category.name, tool.name)))),
    }))
    .filter((category) => category.tools.length > 0), [favorites, favoritesOnly, normalizedQuery]);
  const totalVisibleTools = filteredCategories.reduce((sum, category) => sum + category.tools.length, 0);

  function toggleFavorite(toolKey: string) {
    setFavorites((current) => current.includes(toolKey) ? current.filter((key) => key !== toolKey) : [...current, toolKey]);
  }
  function selectTool(tool: Tool, category: Category) {
    const path = getToolPathByName(tool.name);
    if (path) {
      setSelectedTool(null);
      setLocation(path);
      return;
    }
    setSelectedTool({ tool, category });
  }
  function scrollToCategory(name: string) {
    document.getElementById(`category-${name.toLowerCase().replaceAll(" ", "-")}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  }
  function clearFilters() {
    setQuery("");
    setFavoritesOnly(false);
    window.history.replaceState({}, "", window.location.pathname);
  }
  function updateSearch(value: string) {
    setQuery(value);
    const nextUrl = new URL(window.location.href);
    if (value.trim()) nextUrl.searchParams.set("q", value.trim());
    else nextUrl.searchParams.delete("q");
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
  }

  return (
    <div className={`min-h-[100dvh] overflow-x-clip font-['Plus_Jakarta_Sans'] transition-colors duration-500 ${darkMode ? "dark bg-[#070b14] text-white" : "bg-[#f5f7fa] text-[#1d2c40]"}`}>
      <div className="relative isolate min-h-[100dvh]">
        <header className="sticky top-0 z-40 border-b border-[#e5eaf0]/90 bg-[#f5f7fa]/90 backdrop-blur-xl dark:border-[#172235]/90 dark:bg-[#070b14]/90">
          <div className="mx-auto flex h-[72px] max-w-[1500px] items-center gap-3 px-4 sm:px-7 lg:h-[80px] lg:px-10">
            <button type="button" onClick={() => { setFavoritesOnly(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label="Go to tools home" className="group flex shrink-0 items-center gap-2.5 rounded-xl px-1 py-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20">
              <span className="flex h-9 w-9 items-center justify-center rounded-[13px] bg-[linear-gradient(135deg,#3b82f6,#7c3aed)] text-white shadow-[0_8px_18px_rgba(59,130,246,0.26)] transition duration-300 group-hover:rotate-[-5deg]"><Sparkles aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2.4} /></span>
              <span className="text-[15px] font-extrabold tracking-[-0.04em] text-[#203149] dark:text-[#eff4fc]">ToolHub</span>
            </button>
            <nav aria-label="Primary navigation" className="hidden items-center gap-6 text-[11px] font-semibold text-[#9aa8b7] lg:flex">
              <button type="button" onClick={() => { setFavoritesOnly(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-[#dce7f8] transition hover:text-white">All Tools</button>
              <button type="button" onClick={() => setFavoritesOnly((current) => !current)} className="transition hover:text-white">Favorites</button>
            </nav>
            <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
              <button type="button" onClick={() => setDarkMode((current) => !current)} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"} aria-pressed={darkMode} className="flex h-10 w-10 items-center justify-center rounded-xl text-[#68798d] transition hover:bg-white hover:text-[#2d6cdf] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20 dark:hover:bg-[#1d2a3b] dark:hover:text-[#96b7ef]">
                {darkMode ? <Sun aria-hidden="true" className="h-[18px] w-[18px]" /> : <Moon aria-hidden="true" className="h-[18px] w-[18px]" />}
              </button>
              <button type="button" onClick={() => setFavoritesOnly((current) => !current)} aria-label={`${favoritesOnly ? "Show all tools" : "Show favorite tools"}${favorites.length ? `, ${favorites.length} saved` : ""}`} aria-pressed={favoritesOnly} className={`hidden h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20 sm:flex ${favoritesOnly ? "bg-[#fff5d9] text-[#a27013] dark:bg-[#3b321e] dark:text-[#f0c86a]" : "text-[#68798d] hover:bg-white hover:text-[#2d6cdf] dark:hover:bg-[#1d2a3b] dark:hover:text-[#96b7ef]"}`}>
                <Star aria-hidden="true" className="h-[17px] w-[17px]" fill={favoritesOnly ? "currentColor" : "none"} /><span>Favorites</span>
                {favorites.length > 0 && <span className="rounded-full bg-current/10 px-1.5 py-0.5 text-[10px]">{favorites.length}</span>}
              </button>
              <button type="button" onClick={() => setMenuOpen((current) => !current)} aria-label={menuOpen ? "Close category menu" : "Open category menu"} aria-expanded={menuOpen} className="flex h-10 w-10 items-center justify-center rounded-xl text-[#68798d] transition hover:bg-white hover:text-[#2d6cdf] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20 dark:hover:bg-[#1d2a3b] dark:hover:text-[#96b7ef]">
                {menuOpen ? <X aria-hidden="true" className="h-[19px] w-[19px]" /> : <Menu aria-hidden="true" className="h-[19px] w-[19px]" />}
              </button>
            </div>
          </div>
          {menuOpen && (
            <div className="border-t border-[#e5eaf0] bg-[#f5f7fa] px-4 pb-5 pt-4 dark:border-[#2a3748] dark:bg-[#111b29] sm:hidden">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#9aa8b7]">Browse by category</span>
                <button type="button" onClick={() => setFavoritesOnly((current) => !current)} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-bold text-[#a27013] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20 dark:text-[#f0c86a]">
                  <Star aria-hidden="true" className="h-3.5 w-3.5" fill={favoritesOnly ? "currentColor" : "none"} />{favoritesOnly ? "All tools" : "Favorites"}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return <a href={`#category-${category.name.toLowerCase().replaceAll(" ", "-")}`} key={category.name} onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl border border-[#e1e7ee] bg-white px-2.5 py-2 text-left text-xs font-bold text-[#3e5068] transition hover:border-[#b9ccee] hover:text-[#2d6cdf] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20 dark:border-[#314055] dark:bg-[#1a2636] dark:text-[#b5c2d3]">
                    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" style={{ color: category.accent }} /><span className="truncate">{category.name}</span>
                  </a>;
                })}
              </div>
            </div>
          )}
        </header>

        <main>
          <section className="relative overflow-hidden border-b border-[#e9edf2] bg-[linear-gradient(125deg,#eef4ff_0%,#f8fafc_46%,#f5f1ff_100%)] dark:border-[#172235] dark:bg-[radial-gradient(circle_at_50%_10%,#111c2e_0%,#070b14_58%,#0c1320_100%)]">
            <div className="pointer-events-none absolute -right-28 -top-36 h-[380px] w-[380px] rounded-full border border-[#c8d9f5]/70 dark:border-[#3b82f6]/20" />
            <div className="pointer-events-none absolute -bottom-44 left-[-90px] h-[360px] w-[360px] rounded-full border border-[#d9cdf8]/80 dark:border-[#8b5cf6]/15" />
            <div className="relative mx-auto flex max-w-[1500px] flex-col items-center px-4 pb-12 pt-14 text-center sm:px-7 sm:pb-16 sm:pt-20 lg:px-10 lg:pb-20 lg:pt-[94px]">
              <div className="flex max-w-4xl flex-col items-center animate-[fadeUp_600ms_ease-out_both]">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#cbdcf5] bg-white/70 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#4770a9] dark:border-[#3a5274] dark:bg-[#111827]/70 dark:text-[#a5bee4]">
                  <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />Practical tools, all in one place
                </div>
                <h1 className="max-w-5xl text-[clamp(2.35rem,6.5vw,5.2rem)] font-extrabold leading-[0.98] tracking-[-0.075em] text-[#182b45] dark:text-white">
                  Free Online Tools, Calculators, Converters &amp; Generators
                </h1>
                <p className="mt-7 max-w-2xl text-sm leading-6 text-[#62748a] dark:text-[#cbd5e1] sm:text-[16px]">
                  Everything you need in one place. Use fast, free online calculators, PDF tools, image tools, converters, AI tools, writing tools and utilities without installing any software.
                </p>
                <label className="group relative mt-8 flex w-full max-w-2xl items-center">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-5 h-5 w-5 text-[#8b9bad] transition group-focus-within:text-[#3b82f6]" />
                  <input type="search" value={query} onChange={(event) => updateSearch(event.target.value)} placeholder="Search calculators, PDF tools, image tools, AI tools..." aria-label="Search calculators, PDF tools, image tools, AI tools" data-testid="input-tool-search" className="h-14 w-full rounded-[20px] border border-[#dfe6ee] bg-white/90 pl-14 pr-5 text-sm font-semibold text-[#26364a] outline-none transition placeholder:text-[#9aa8b7] focus:border-[#8ab0f0] focus:ring-4 focus:ring-[#3b82f6]/15 focus:shadow-[0_0_34px_rgba(59,130,246,0.18)] dark:border-[#33455c] dark:bg-[#1a2332] dark:text-white dark:placeholder:text-[#94a3b8] dark:focus:border-[#3b82f6] dark:focus:ring-[#3b82f6]/20 dark:focus:shadow-[0_0_42px_rgba(59,130,246,0.22)] sm:h-16 sm:text-base" />
                </label>
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-semibold text-[#7d8c9e] dark:text-[#94a3b8]">
                <span className="flex items-center gap-2"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-[#2d6cdf]" />Free to use</span>
                <span className="h-1 w-1 rounded-full bg-[#b8c3d0]" /><span>A growing collection of practical tools</span>
                <span className="h-1 w-1 rounded-full bg-[#b8c3d0]" /><span>No sign-up required</span>
              </div>
            </div>
          </section>
          <section className="sticky top-[72px] z-30 border-b border-[#e9edf2] bg-[#f5f7fa]/95 backdrop-blur-xl dark:border-[#172235] dark:bg-[#070b14]/95 lg:top-[80px]">
            <div className="mx-auto max-w-[1500px] overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-7 lg:px-10 [&::-webkit-scrollbar]:hidden">
              <nav aria-label="Tool categories" className="flex min-w-max items-center justify-center gap-2">
                {categories.map((category) => {
                  const Icon = category.icon;
                  return <a href={`#category-${category.name.toLowerCase().replaceAll(" ", "-")}`} key={category.name} className="flex items-center gap-2 rounded-xl border border-[#e1e7ee] bg-white/80 px-3.5 py-2 text-xs font-bold text-[#8291a3] transition hover:-translate-y-0.5 hover:border-[#b9ccee] hover:text-[#3d5f95] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20 dark:border-[#1a2a3e] dark:bg-[#101827] dark:text-[#cbd5e1] dark:hover:border-[#3b82f6]/50 dark:hover:bg-[#151f30] dark:hover:text-white">
                    <Icon aria-hidden="true" className="h-3.5 w-3.5" style={{ color: category.accent }} />{category.name}
                  </a>;
                })}
              </nav>
            </div>
          </section>

          <div className="mx-auto max-w-[1500px] px-4 pb-20 pt-8 sm:px-7 sm:pt-10 lg:px-10 lg:pt-12">
            <section aria-labelledby="trending-heading" className="mb-11">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div><p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9aa8b7]">Start here</p><h2 id="trending-heading" className="text-xl font-extrabold tracking-[-0.04em] text-[#203149] dark:text-[#f0f4fb] sm:text-2xl">Trending tools</h2></div>
                <button type="button" onClick={() => scrollToCategory("Finance")} className="hidden items-center gap-1 text-xs font-semibold text-[#cbd5e1] transition hover:text-white sm:flex">Browse all <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-8 lg:gap-5">
                {trendingTools.map((tool, index) => {
                  const category = categories.find((item) => item.tools.some((entry) => entry.name === tool.name)) ?? categories[0];
                  const Icon = tool.icon;
                  return <button type="button" key={tool.name} onClick={() => selectTool(tool, category)} data-testid={`trending-${tool.name.toLowerCase().replaceAll(" ", "-")}`} style={{ animationDelay: `${index * 60}ms` }} className="group flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-[20px] border border-[#e2e8ef] bg-white/75 px-3 py-4 text-center shadow-[0_7px_24px_rgba(28,44,70,0.045)] transition duration-300 hover:-translate-y-1 hover:border-[#c6d6ee] hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20 dark:border-[#2d3b4d] dark:bg-[#1a2332] dark:shadow-[0_14px_30px_rgba(0,0,0,0.16)] dark:hover:border-[#48617f] dark:hover:bg-[#243244]">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition duration-300 group-hover:scale-105" style={{ backgroundColor: darkMode ? `${category.accent}25` : category.tint, color: category.accent }}><Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} /></span>
                    <span className="line-clamp-2 max-w-[9rem] text-[12px] font-bold leading-[1.2] text-[#35485f] dark:text-[#f1f5fb]">{tool.name}</span>
                    <span className="rounded-full bg-[#e5f7ec] px-2 py-1 text-[9px] font-extrabold tracking-wide text-[#167447] dark:bg-[#173b2b] dark:text-[#91e0b2]">LIVE</span>
                  </button>;
                })}
              </div>
            </section>

            {selectedTool && <section aria-live="polite" className="mb-12 animate-[fadeUp_350ms_ease-out_both]">
              <div className="relative overflow-hidden rounded-[24px] border border-[#cfe0fa] bg-[#edf4ff] p-5 shadow-[0_14px_34px_rgba(45,108,223,0.09)] dark:border-[#385780] dark:bg-[#1b2e4b] sm:p-6">
                <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full border border-[#c6daf8] dark:border-[#4c6e9e]" />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2d6cdf] shadow-sm dark:bg-[#253c5d]"><selectedTool.tool.icon aria-hidden="true" className="h-6 w-6" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#6d8dbd] dark:text-[#a4c2ef]">{selectedTool.tool.name === "More Tools" ? "Browse category" : "Tool directory"}</p>
                    <h2 className="text-lg font-extrabold tracking-[-0.03em] text-[#203a64] dark:text-[#e8f0fc]">{selectedTool.tool.name === "More Tools" ? `More ${selectedTool.category.name} tools` : selectedTool.tool.name}</h2>
                    {selectedTool.tool.name !== "More Tools" && <p className="mt-1 text-xs font-medium text-[#7086a3] dark:text-[#aabbd1]">{getToolPathByName(selectedTool.tool.name) ? `Open the live ${selectedTool.tool.name} tool from this tile.` : `${selectedTool.tool.name} is planned but is not available yet. The eight LIVE tools in Trending tools are ready to use.`}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setSelectedTool(null)} aria-label="Close selected tool panel" className="flex h-10 w-10 items-center justify-center rounded-xl text-[#7e96b6] transition hover:bg-white hover:text-[#2d6cdf] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20 dark:hover:bg-[#263e60]"><X aria-hidden="true" className="h-[18px] w-[18px]" /></button>
                  </div>
                </div>
                {selectedTool.tool.name === "More Tools" && <ul aria-label={`${selectedTool.category.name} tools`} className="relative mt-5 grid gap-2 border-t border-[#cfe0fa] pt-4 dark:border-[#385780] sm:grid-cols-2 lg:grid-cols-3">
                  {selectedTool.category.tools.filter((tool) => tool.name !== "More Tools").map((tool) => {
                    const path = getToolPathByName(tool.name);
                    return <li key={tool.name} className="rounded-xl border border-[#d7e5f8] bg-white/70 px-3 py-2.5 text-xs font-bold text-[#385271] dark:border-[#385780] dark:bg-[#14243a] dark:text-[#d6e5f9]">
                      {path ? <Link href={path} className="flex items-center justify-between gap-2 hover:text-[#2d6cdf] dark:hover:text-[#8db7ff]">{tool.name}<span aria-hidden="true">→</span></Link> : <span className="flex items-center justify-between gap-2">{tool.name}<span className="rounded-full bg-[#f0f2f5] px-2 py-1 text-[9px] font-extrabold tracking-wide text-[#697789] dark:bg-[#273243] dark:text-[#a9b6c8]">PLANNED</span></span>}
                    </li>;
                  })}
                </ul>}
              </div>
            </section>}

            {favoritesOnly && favorites.length > 0 && <div className="mb-8 flex items-center justify-between gap-3 rounded-2xl border border-[#f0dfae] bg-[#fff9e7] px-4 py-3 dark:border-[#5a4d2c] dark:bg-[#2b281d]">
              <div className="flex items-center gap-2.5 text-xs font-bold text-[#8d6b20] dark:text-[#e3c778]"><Star aria-hidden="true" className="h-4 w-4" fill="currentColor" />Showing your {favorites.length} saved {favorites.length === 1 ? "tool" : "tools"}.</div>
              <button type="button" onClick={() => setFavoritesOnly(false)} className="text-xs font-extrabold text-[#a27013] underline decoration-[#d7b85f] underline-offset-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20 dark:text-[#f0c86a]">Show all</button>
            </div>}

            {totalVisibleTools === 0 ? <section className="mx-auto flex max-w-xl flex-col items-center rounded-[28px] border border-dashed border-[#cad5e2] bg-white/65 px-6 py-16 text-center dark:border-[#3a4b61] dark:bg-[#172333]">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#edf3fc] text-[#5f84c4] dark:bg-[#243957] dark:text-[#a8c3ef]"><Search aria-hidden="true" className="h-7 w-7" /></span>
              <h2 className="text-xl font-extrabold tracking-[-0.04em] text-[#253851] dark:text-[#eff4fc]">Nothing matched that search</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-[#7d8da1] dark:text-[#9daec2]">Try a broader phrase, or clear your filters to browse all the small tools in the library.</p>
              <button type="button" onClick={clearFilters} className="mt-6 flex h-10 items-center gap-2 rounded-xl bg-[#203a64] px-4 text-xs font-extrabold text-white transition hover:bg-[#2d6cdf] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2d6cdf]/20 dark:bg-[#dbe8fc] dark:text-[#203452] dark:hover:bg-white"><RefreshCw aria-hidden="true" className="h-4 w-4" />Clear search</button>
            </section> : <div className="space-y-12 sm:space-y-14">
              {filteredCategories.map((category) => <section key={category.name} id={`category-${category.name.toLowerCase().replaceAll(" ", "-")}`} aria-labelledby={`heading-${category.name.toLowerCase().replaceAll(" ", "-")}`} className="scroll-mt-[130px]">
                <div className="rounded-[28px] border border-[#e7ebf0] bg-white/35 p-4 sm:p-5 lg:p-6 dark:border-[#2a394d] dark:bg-[#1a2332]">
                  <SectionHeading category={category} darkMode={darkMode} headingId={`heading-${category.name.toLowerCase().replaceAll(" ", "-")}`} onViewAll={() => scrollToCategory(category.name)} />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-8 lg:gap-3">
                    {category.tools.map((tool) => {
                      const toolKey = getToolKey(category.name, tool.name);
                      const isAvailable = tool.name === "More Tools" || Boolean(getToolPathByName(tool.name));
                      return <ToolTile key={tool.name} tool={tool} category={category} isAvailable={isAvailable} isFavorite={favorites.includes(toolKey)} isSelected={selectedTool?.tool.name === tool.name && selectedTool.category.name === category.name} onSelect={() => selectTool(tool, category)} onFavorite={() => toggleFavorite(toolKey)} />;
                    })}
                  </div>
                </div>
              </section>)}
            </div>}
          </div>
        </main>
        <footer className="border-t border-[#e5eaf0] bg-[#eef2f6] dark:border-[#263548] dark:bg-[#111827]">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-7 text-xs font-semibold text-[#8b99a9] sm:flex-row sm:items-center sm:justify-between sm:px-7 lg:px-10">
            <div className="flex items-center gap-2 text-[#50647e] dark:text-[#a9b8cb]"><span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#3b82f6,#7c3aed)] text-white"><Sparkles aria-hidden="true" className="h-3.5 w-3.5" /></span>ToolHub, made for the five-minute task.</div>
            <span>Fresh tools, quiet interface, no distractions.</span>
          </div>
        </footer>
      </div>
      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}