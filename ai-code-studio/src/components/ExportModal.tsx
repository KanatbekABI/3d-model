import { useState } from 'react';
import {
  X,
  Download,
  FileCode2,
  FileArchive,
  Check,
  Copy,
} from 'lucide-react';
import type { CodeFiles } from '../types/studio';
import {
  buildLinkedIndexHtml,
  buildStandaloneHtml,
  downloadIndividualFile,
  downloadProjectZip,
} from '../utils/exporter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  code: CodeFiles;
}

export function ExportModal({
  isOpen,
  onClose,
  projectName,
  code,
}: ExportModalProps) {
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      await downloadProjectZip(projectName, code);
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleCopy = async (key: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Ignore clipboard failure
    }
  };

  const individualFiles = [
    {
      key: 'html',
      filename: 'index.html',
      subtitle: 'HTML document linked to styles.css & script.js',
      content: buildLinkedIndexHtml(projectName, code.html),
      mime: 'text/html',
    },
    {
      key: 'css',
      filename: 'styles.css',
      subtitle: 'Stylesheet rules from CSS editor',
      content: code.css,
      mime: 'text/css',
    },
    {
      key: 'js',
      filename: 'script.js',
      subtitle: 'JavaScript logic from JS editor',
      content: code.js,
      mime: 'application/javascript',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export Code"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#101322]/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <Download className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Export Code</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close export modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.07] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Primary Bundle Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloadingZip}
              className="flex flex-col items-start p-4 rounded-xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 hover:from-violet-600/30 hover:to-blue-600/30 border border-indigo-400/35 text-left transition-colors cursor-pointer"
            >
              <FileArchive className="w-5 h-5 text-indigo-300 mb-2" />
              <span className="text-sm font-semibold text-white">
                {downloadingZip ? 'Preparing ZIP...' : 'Download ZIP Bundle'}
              </span>
              <span className="text-xs text-slate-300 mt-1">
                Includes index.html, styles.css, script.js & README
              </span>
            </button>

            <button
              type="button"
              onClick={() =>
                downloadIndividualFile(
                  'index.html',
                  buildStandaloneHtml(projectName, code),
                  'text/html'
                )
              }
              className="flex flex-col items-start p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-left transition-colors cursor-pointer"
            >
              <FileCode2 className="w-5 h-5 text-sky-400 mb-2" />
              <span className="text-sm font-semibold text-white">
                Standalone HTML
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Single self-contained HTML file with inline CSS & JS
              </span>
            </button>
          </div>

          {/* Individual Files */}
          <div className="pt-2 border-t border-white/[0.07]">
            <p className="text-xs font-medium text-slate-400 mb-2.5">
              Individual Source Files
            </p>
            <div className="space-y-2">
              {individualFiles.map((file) => (
                <div
                  key={file.key}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.07]"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-mono font-semibold text-slate-100">
                      {file.filename}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {file.subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(file.key, file.content)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    >
                      {copiedKey === file.key ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === file.key ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        downloadIndividualFile(file.filename, file.content, file.mime)
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
