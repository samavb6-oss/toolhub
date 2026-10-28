import { lazy, Suspense } from "react";
import { useParams } from "wouter";
import { ToolPageFrame } from "@/tools/ToolPageFrame";
import { toolDefinitions } from "@/tools/toolRegistry";
import NotFound from "./not-found";

// Keep tool code out of the initial app bundle. Each page loads only the tool
// component it needs; related tools may share a chunk when they share a module.
const AiPromptGenerator = lazy(() => import("@/tools/BasicTools").then((m) => ({ default: m.AiPromptGenerator })));
const CaseConverter = lazy(() => import("@/tools/BasicTools").then((m) => ({ default: m.CaseConverter })));
const CharacterCounter = lazy(() => import("@/tools/BasicTools").then((m) => ({ default: m.CharacterCounter })));
const EmiCalculator = lazy(() => import("@/tools/BasicTools").then((m) => ({ default: m.EmiCalculator })));
const PasswordGenerator = lazy(() => import("@/tools/BasicTools").then((m) => ({ default: m.PasswordGenerator })));
const SipCalculator = lazy(() => import("@/tools/BasicTools").then((m) => ({ default: m.SipCalculator })));
const WordCounter = lazy(() => import("@/tools/BasicTools").then((m) => ({ default: m.WordCounter })));
const AgeCalculator = lazy(() => import("@/tools/AgeCalculator").then((m) => ({ default: m.AgeCalculator })));
const BmiCalculator = lazy(() => import("@/tools/BmiCalculator").then((m) => ({ default: m.BmiCalculator })));
const GstCalculatorTool = lazy(() => import("@/tools/GstCalculatorTool").then((m) => ({ default: m.GstCalculatorTool })));
const LoanCalculatorTool = lazy(() => import("@/tools/LoanCalculatorTool").then((m) => ({ default: m.LoanCalculatorTool })));
const IncomeTaxCalculatorTool = lazy(() => import("@/tools/IncomeTaxCalculatorTool").then((m) => ({ default: m.IncomeTaxCalculatorTool })));
const DividendCalculatorTool = lazy(() => import("@/tools/DividendCalculatorTool").then((m) => ({ default: m.DividendCalculatorTool })));
const InterestCalculator = lazy(() => import("@/tools/InterestCalculator").then((m) => ({ default: m.InterestCalculator })));
const MergePdfTool = lazy(() => import("@/tools/MergePdfTool").then((m) => ({ default: m.MergePdfTool })));
const SplitPdfTool = lazy(() => import("@/tools/SplitPdfTool"));
const JpgToPdfTool = lazy(() => import("@/tools/JpgToPdfTool"));
const CompressPdfTool = lazy(() => import("@/tools/CompressPdfTool"));
const PdfToWordTool = lazy(() => import("@/tools/DocumentConversionTools").then((m) => ({ default: m.PdfToWordTool })));
const WordToPdfTool = lazy(() => import("@/tools/DocumentConversionTools").then((m) => ({ default: m.WordToPdfTool })));
const UnlockPdfTool = lazy(() => import("@/tools/UnlockPdfTool"));
const CompressImageTool = lazy(() => import("@/tools/ImageTools").then((m) => ({ default: m.CompressImageTool })));
const ResizeImageTool = lazy(() => import("@/tools/ImageTools").then((m) => ({ default: m.ResizeImageTool })));
const PngToJpgTool = lazy(() => import("@/tools/ImageTools").then((m) => ({ default: m.PngToJpgTool })));
const JpgToPngTool = lazy(() => import("@/tools/ImageTools").then((m) => ({ default: m.JpgToPngTool })));
const CropImageTool = lazy(() => import("@/tools/ImageUtilityTools").then((m) => ({ default: m.CropImageTool })));
const RotateImageTool = lazy(() => import("@/tools/ImageUtilityTools").then((m) => ({ default: m.RotateImageTool })));
const QrGeneratorTool = lazy(() => import("@/tools/QrGeneratorTool").then((m) => ({ default: m.QrGeneratorTool })));
const TextCleanerTool = lazy(() => import("@/tools/TextCleanerTool"));
const ReadTimeTool = lazy(() => import("@/tools/WritingExtraTools").then((m) => ({ default: m.ReadTimeTool })));
const LoremIpsumTool = lazy(() => import("@/tools/WritingExtraTools").then((m) => ({ default: m.LoremIpsumTool })));
const GrammarCheckerTool = lazy(() => import("@/tools/WritingAdvancedTools").then((m) => ({ default: m.GrammarCheckerTool })));
const TextSummarizerTool = lazy(() => import("@/tools/WritingAdvancedTools").then((m) => ({ default: m.TextSummarizerTool })));

const toolComponents = {
  "bmi-calculator": BmiCalculator,
  "gst-calculator": GstCalculatorTool,
  "loan-calculator": LoanCalculatorTool,
  "income-tax-calculator": IncomeTaxCalculatorTool,
  "dividend-calculator": DividendCalculatorTool,
  "interest-calculator": InterestCalculator,
  "sip-calculator": SipCalculator,
  "age-calculator": AgeCalculator,
  "case-converter": CaseConverter,
  "text-cleaner": TextCleanerTool,
  "character-counter": CharacterCounter,
  "emi-calculator": EmiCalculator,
  "merge-pdf": MergePdfTool,
  "split-pdf": SplitPdfTool,
  "jpg-to-pdf": JpgToPdfTool,
  "compress-pdf": CompressPdfTool,
  "pdf-to-word": PdfToWordTool,
  "word-to-pdf": WordToPdfTool,
  "unlock-pdf": UnlockPdfTool,
  "compress-image": CompressImageTool,
  "word-counter": WordCounter,
  "read-time": ReadTimeTool,
  "lorem-ipsum": LoremIpsumTool,
  "grammar-checker": GrammarCheckerTool,
  "text-summarizer": TextSummarizerTool,
  "password-generator": PasswordGenerator,
  "resize-image": ResizeImageTool,
  "crop-image": CropImageTool,
  "png-to-jpg": PngToJpgTool,
  "jpg-to-png": JpgToPngTool,
  "rotate-image": RotateImageTool,
  "qr-generator": QrGeneratorTool,
  "ai-prompt-generator": AiPromptGenerator,
};

export default function ToolPage() {
  const { slug } = useParams();
  const tool = toolDefinitions.find((item) => item.slug === slug);
  if (!tool) return <NotFound />;
  const ToolComponent = toolComponents[tool.slug as keyof typeof toolComponents];
  if (!ToolComponent) return <NotFound />;

  return (
    <ToolPageFrame tool={tool}>
      <Suspense fallback={<div className="py-8 text-center text-muted-foreground" role="status">Loading tool…</div>}>
        <ToolComponent />
      </Suspense>
    </ToolPageFrame>
  );
}