import JSZip from 'jszip';
import type { CodeFiles } from '../types/studio';

function slugifyFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'ai-code-studio-project'
  );
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildLinkedIndexHtml(projectName: string, htmlBody: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
    <link rel="stylesheet" href="./styles.css" />
  </head>
  <body>
${htmlBody}
    <script src="./script.js"></script>
  </body>
</html>
`;
}

export function buildStandaloneHtml(projectName: string, code: CodeFiles): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
    <style>
${code.css}
    </style>
  </head>
  <body>
${code.html}
    <script>
${code.js.replace(/<\/script>/gi, '<\\/script>')}
    </script>
  </body>
</html>
`;
}

export function downloadIndividualFile(
  filename: string,
  content: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  triggerDownload(blob, filename);
}

export async function downloadProjectZip(
  projectName: string,
  code: CodeFiles
): Promise<void> {
  const zip = new JSZip();
  const slug = slugifyFileName(projectName);

  zip.file('index.html', buildLinkedIndexHtml(projectName, code.html));
  zip.file('styles.css', code.css);
  zip.file('script.js', code.js);
  zip.file(
    'README.md',
    `# ${projectName}\n\nExported from AI Code Studio.\n\nOpen \`index.html\` in your browser or serve the folder with any static web server.\n`
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `${slug}.zip`);
}
