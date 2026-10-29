export type TextCleanerOptions = {
  trimLines: boolean;
  collapseHorizontalWhitespace: boolean;
  removeBlankLines: boolean;
  removeDuplicateLines: boolean;
  normalizeLineEndings: boolean;
};

export function cleanText(input: string, options: TextCleanerOptions): string {
  if (input === "") return "";

  let text = input;

  if (options.normalizeLineEndings) {
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    if (options.collapseHorizontalWhitespace) {
      lines[i] = lines[i].replace(/[ \t]+/g, " ");
    }
    if (options.trimLines) {
      const trailingCarriageReturn = lines[i].endsWith("\r") ? "\r" : "";
      const content = trailingCarriageReturn ? lines[i].slice(0, -1) : lines[i];
      lines[i] = content.trim() + trailingCarriageReturn;
    }
  }

  let result = lines;
  if (options.removeBlankLines) result = result.filter((line) => !/^[^\S\r\n]*\r?$/.test(line));
  if (options.removeDuplicateLines) {
    const seen = new Set<string>();
    result = result.filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    });
  }

  return result.join("\n");
}
