import { useParams } from "wouter";
import {
  AiPromptGenerator, CaseConverter, CharacterCounter, EmiCalculator, PasswordGenerator, SipCalculator, WordCounter,
} from "@/tools/BasicTools";
import { AgeCalculator } from "@/tools/AgeCalculator";
import { BmiCalculator } from "@/tools/BmiCalculator";
import { GstCalculatorTool } from "@/tools/GstCalculatorTool";
import { LoanCalculatorTool } from "@/tools/LoanCalculatorTool";
import { DividendCalculatorTool } from "@/tools/DividendCalculatorTool";
import { MergePdfTool } from "@/tools/MergePdfTool";
import { CompressImageTool, ResizeImageTool } from "@/tools/ImageTools";
import { QrGeneratorTool } from "@/tools/QrGeneratorTool";
import { ToolPageFrame } from "@/tools/ToolPageFrame";
import { toolDefinitions } from "@/tools/toolRegistry";
import NotFound from "./not-found";

const toolComponents = {
  "bmi-calculator": BmiCalculator,
  "gst-calculator": GstCalculatorTool,
  "loan-calculator": LoanCalculatorTool,
  "sip-calculator": SipCalculator,
  "dividend-calculator": DividendCalculatorTool,
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

  return <ToolPageFrame tool={tool}><ToolComponent /></ToolPageFrame>;
}
