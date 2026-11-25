import type { CodeFiles } from '../types/studio';

export function extractCodeBlocksFromMarkdown(markdown: string): Partial<CodeFiles> {
  const extracted: Partial<CodeFiles> = {};
  const fenceRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(markdown)) !== null) {
    const lang = (match[1] || '').toLowerCase();
    const content = match[2].replace(/\n$/, '');

    if (lang === 'html' || lang === 'htm') {
      extracted.html = content;
    } else if (lang === 'css' || lang === 'scss') {
      extracted.css = content;
    } else if (lang === 'js' || lang === 'javascript') {
      extracted.js = content;
    }
  }

  return extracted;
}
