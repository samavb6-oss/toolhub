import { lazy, Suspense } from "react";
import { useParams } from "wouter";
import { ToolPageFrame } from "@/tools/ToolPageFrame";
import { toolDefinitions } from "@/tools/toolRegistry";
import NotFound from "./not-found";

const BmiCalculator = lazy(() =>
  import("@/tools/BmiCalculator").then((module) => ({ default: module.BmiCalculator })),
);
const GstCalculatorTool = lazy(() =>
  import("@/tools/GstCalculatorTool").then((module) => ({ default: module.GstCalculatorTool })),
);
const LoanCalculatorTool = lazy(() =>
  import("@/tools/LoanCalculatorTool").then((module) => ({ default: module.LoanCalculatorTool })),
);
const InterestCalculator = lazy(() =>
  import("@/tools/InterestCalculator").then((module) => ({ default: module.InterestCalculator })),
);
const SipCalculator = lazy(() =>
  import("@/tools/BasicTools").then((module) => ({ default: module.SipCalculator })),
);
const AgeCalculator = lazy(() =>
  import("@/tools/AgeCalculator").then((module) => ({ default: module.AgeCalculator })),
);
const CaseConverter = lazy(() =>
  import("@/tools/BasicTools").then((module) => ({ default: module.CaseConverter })),
);
const CharacterCounter = lazy(() =>
  import("@/tools/BasicTools").then((module) => ({ default: module.CharacterCounter })),
);
const EmiCalculator = lazy(() =>
  import("@/tools/BasicTools").then((module) => ({ default: module.EmiCalculator })),
);
const MergePdfTool = lazy(() =>
  import("@/tools/MergePdfTool").then((module) => ({ default: module.MergePdfTool })),
);
const CompressImageTool = lazy(() =>
  import("@/tools/ImageTools").then((module) => ({ default: module.CompressImageTool })),
);
const ResizeImageTool = lazy(() =>
  import("@/tools/ImageTools").then((module) => ({ default: module.ResizeImageTool })),
);
const WordCounter = lazy(() =>
  import("@/tools/BasicTools").then((module) => ({ default: module.WordCounter })),
);
const PasswordGenerator = lazy(() =>
  import("@/tools/BasicTools").then((module) => ({ default: module.PasswordGenerator })),
);
const QrGeneratorTool = lazy(() =>
  import("@/tools/QrGeneratorTool").then((module) => ({ default: module.QrGeneratorTool })),
);
const AiPromptGenerator = lazy(() =>
  import("@/tools/BasicTools").then((module) => ({ default: module.AiPromptGenerator })),
);

const toolComponents = {
  "bmi-calculator": BmiCalculator,
  "gst-calculator": GstCalculatorTool,
  "loan-calculator": LoanCalculatorTool,
  "interest-calculator": InterestCalculator,
  "sip-calculator": SipCalculator,
  "age-calculator": AgeCalculator,
  "case-converter": CaseConverter,
  "character-counter": CharacterCounter,
  "emi-calculator": EmiCalculator,
  "merge-pdf": MergePdfTool,
  "compress-image": CompressImageTool,
  "word-counter": WordCounter,
  "password-generator": PasswordGenerator,
  "resize-image": ResizeImageTool,
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
      <Suspense fallback={<p role="status">Loading tool…</p>}>
        <ToolComponent />
      </Suspense>
    </ToolPageFrame>
  );
}
