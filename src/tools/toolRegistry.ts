import {
  Bot, Calculator, FilePlus2, Fingerprint, ImageMinus, ListChecks, QrCode, Type, ZoomIn,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ToolDefinition = {
  slug: string;
  name: string;
  category: string;
  icon: LucideIcon;
  title: string;
  description: string;
  intro: string;
};

export const toolDefinitions: ToolDefinition[] = [
  {
    slug: "emi-calculator",
    name: "EMI Calculator",
    category: "Finance",
    icon: Calculator,
    title: "Free EMI Calculator: Monthly Loan Payment | ToolHub",
    description: "Calculate your monthly loan EMI, total interest and repayment amount in seconds. Adjust the loan amount, interest rate and term with this free EMI calculator.",
    intro: "Estimate a fixed-rate monthly loan payment and see the total interest before you borrow.",
  },
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    category: "PDF Tools",
    icon: FilePlus2,
    title: "Merge PDF Files Online — Free & Private | ToolHub",
    description: "Combine multiple PDF files into one document in your browser. Reorder files before merging and download the finished PDF without uploading your documents.",
    intro: "Combine PDFs in the order you choose. Your files stay on this device.",
  },
  {
    slug: "compress-image",
    name: "Compress Image",
    category: "Image Tools",
    icon: ImageMinus,
    title: "Compress Images Online — Free Image Compressor | ToolHub",
    description: "Reduce image file size in your browser. Choose an output format and quality, compare the new size, and download the compressed image privately.",
    intro: "Reduce an image’s file size locally, with control over its output format and quality.",
  },
  {
    slug: "character-counter",
    name: "Character Counter",
    category: "Writing Tools",
    icon: ListChecks,
    title: "Free Character Counter — Count Characters, Words & Spaces | ToolHub",
    description: "Count characters with and without spaces, words, letters, numbers and lines instantly. Useful for social media limits, titles and descriptions; text stays in your browser.",
    intro: "Count characters, words, letters, numbers, whitespace and lines instantly as you type.",
  },
  {
    slug: "word-counter",
    name: "Word Counter",
    category: "Writing Tools",
    icon: Type,
    title: "Free Word Counter: Words, Characters & Read Time | ToolHub",
    description: "Count words, characters, sentences and paragraphs as you type. Check reading time with this free online word counter; your text stays in your browser.",
    intro: "See live word, character, sentence and reading-time counts for your text.",
  },
  {
    slug: "password-generator",
    name: "Password Generator",
    category: "Utilities",
    icon: Fingerprint,
    title: "Free Secure Password Generator | ToolHub",
    description: "Create a strong random password in your browser. Choose its length, character types and ambiguity settings; passwords are generated locally and never sent.",
    intro: "Generate a strong, random password locally with the character types you choose.",
  },
  {
    slug: "resize-image",
    name: "Resize Image",
    category: "Image Tools",
    icon: ZoomIn,
    title: "Resize Images Online — Free Image Resizer | ToolHub",
    description: "Resize an image by pixels or scale while keeping its aspect ratio. Convert to PNG, JPEG or WebP and download the result directly from your browser.",
    intro: "Set precise pixel dimensions, preserve the aspect ratio, and download a resized image.",
  },
  {
    slug: "qr-generator",
    name: "QR Generator",
    category: "Utilities",
    icon: QrCode,
    title: "Free QR Code Generator — Download as PNG | ToolHub",
    description: "Turn a link or text into a downloadable QR code. Choose its size and error correction level; generation happens in your browser with no upload.",
    intro: "Create a QR code for a URL or text and save it as a PNG image.",
  },
  {
    slug: "ai-prompt-generator",
    name: "AI Prompt Generator",
    category: "AI Tools",
    icon: Bot,
    title: "AI Prompt Generator — Write Better Prompts | ToolHub",
    description: "Build a clear, detailed AI prompt from your task, audience, context and preferred output. Generate and copy prompts privately in your browser.",
    intro: "Turn a task and a few useful details into a structured prompt for your preferred AI.",
  },
];

export function getToolPathByName(name: string): string | undefined {
  const definition = toolDefinitions.find((tool) => tool.name === name);
  return definition ? `/tools/${definition.slug}` : undefined;
}