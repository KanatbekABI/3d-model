import { useEffect, useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCw,
  Terminal,
  Trash2,
  Wand2,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  ExternalLink,
} from 'lucide-react';
import type { ConsoleEntry, PreviewViewport } from '../types/studio';

interface PreviewPaneProps {
  srcDoc: string;
  standaloneHtml: string;
  runKey: number;
  viewport: PreviewViewport;
  onViewportChange: (viewport: PreviewViewport) => void;
  onReload: () => void;
  consoleEntries: ConsoleEntry[];
  onClearConsole: () => void;
  isConsoleOpen: boolean;
  onToggleConsole: () => void;
  onAskAiToFix: (errorMessage: string) => void;
}

const VIEWPORT_WIDTHS: Record<PreviewViewport, string> = {
  desktop: 'w-full h-full',
  tablet: 'w-[768px] max-w-full h-full border-x border-white/10 shadow-2xl',
  mobile: 'w-[375px] max-w-full h-full border-x border-white/10 shadow-2xl',
};

function formatTime(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function PreviewPane({
  srcDoc,
  standaloneHtml,
  runKey,
  viewport,
  onViewportChange,
  onReload,
  consoleEntries,
  onClearConsole,
  isConsoleOpen,
  onToggleConsole,
  onAskAiToFix,
}: PreviewPaneProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string>('');
  const errorCount = consoleEntries.filter((e) => e.level === 'error').length;

  useEffect(() => {
    const blob = new Blob([standaloneHtml], { type: 'text/html;charset=utf-8' });
    const nextUrl = URL.createObjectURL(blob);
    setBlobUrl(nextUrl);
    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [standaloneHtml]);

  useEffect(() => {
    if (!isFullScreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  return (
    <div
      className={
        isFullScreen
          ? 'fixed inset-0 z-50 flex flex-col bg-[#0b0d16]'
          : 'flex flex-col h-full min-h-0 bg-[#0b0d16]'
      }
    >
      {/* Preview Toolbar */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 border-b border-white/[0.07] bg-[#101320]/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-slate-200 whitespace-nowrap">
            Live Preview
          </span>
          {viewport !== 'desktop' && (
            <span className="text-[11px] font-mono text-slate-400 tabular-nums whitespace-nowrap">
              {viewport === 'tablet' ? '768px' : '375px'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Responsive Viewport Switcher */}
          <div className="hidden sm:flex items-center gap-0.5 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <button
              type="button"
              onClick={() => onViewportChange('desktop')}
              title="Desktop width (100%)"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewport === 'desktop'
                  ? 'bg-indigo-500/25 text-indigo-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewportChange('tablet')}
              title="Tablet width (768px)"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewport === 'tablet'
                  ? 'bg-indigo-500/25 text-indigo-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onViewportChange('mobile')}
              title="Mobile width (375px)"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewport === 'mobile'
                  ? 'bg-indigo-500/25 text-indigo-200'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onReload}
            title="Reload preview"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Reload</span>
          </button>

          <button
            type="button"
            onClick={onToggleConsole}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
              isConsoleOpen
                ? 'bg-indigo-500/15 border-indigo-400/30 text-indigo-200'
                : 'bg-white/[0.03] border-white/[0.07] text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Console</span>
            {consoleEntries.length > 0 && (
              <span
                className={`font-mono text-[11px] tabular-nums ${
                  errorCount > 0 ? 'text-rose-400 font-semibold' : 'text-slate-400'
                }`}
              >
                ({consoleEntries.length})
              </span>
            )}
            {isConsoleOpen ? (
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5 opacity-70" />
            )}
          </button>

          {blobUrl && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open website in a new tab"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/[0.03] border border-white/[0.07] text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">New Tab</span>
            </a>
          )}

          <button
            type="button"
            onClick={() => setIsFullScreen((prev) => !prev)}
            title={isFullScreen ? 'Exit full screen (Esc)' : 'Full screen preview'}
            aria-label={isFullScreen ? 'Exit full screen preview' : 'Full screen preview'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
              isFullScreen
                ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-100 hover:bg-indigo-500/30'
                : 'bg-white/[0.03] border-white/[0.07] text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Full Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sandboxed iframe Canvas */}
      <div className="flex-1 min-h-0 flex justify-center overflow-auto bg-[#06070d]">
        <div className={`${VIEWPORT_WIDTHS[viewport]} transition-[width] duration-200 bg-white`}>
          <iframe
            key={runKey}
            title="AI Code Studio Live Preview"
            srcDoc={srcDoc}
            sandbox="allow-scripts"
            className="w-full h-full border-0 block bg-white"
          />
        </div>
      </div>

      {/* Console Drawer */}
      {isConsoleOpen && (
        <div className="h-44 sm:h-48 border-t border-white/[0.08] bg-[#0a0c15] flex flex-col shrink-0">
          <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-white/[0.06] bg-[#0f1220] shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-medium">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sandbox Console</span>
              {errorCount > 0 && (
                <span className="text-[11px] text-rose-400 font-mono tabular-nums">
                  {errorCount} {errorCount === 1 ? 'error' : 'errors'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClearConsole}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2 font-mono text-xs space-y-1">
            {consoleEntries.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Console output and runtime errors will appear here.
              </div>
            ) : (
              consoleEntries.map((entry) => {
                const isError = entry.level === 'error';
                const isWarn = entry.level === 'warn';
                return (
                  <div
                    key={entry.id}
                    className={`flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-md ${
                      isError
                        ? 'bg-rose-500/10 text-rose-200 border border-rose-500/20'
                        : isWarn
                        ? 'bg-amber-500/10 text-amber-200 border border-amber-500/20'
                        : 'text-slate-300 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span className="text-[10px] text-slate-500 tabular-nums shrink-0 mt-0.5">
                        {formatTime(entry.timestamp)}
                      </span>
                      {isError ? (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                      )}
                      <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                        {entry.message}
                      </pre>
                    </div>
                    {isError && (
                      <button
                        type="button"
                        onClick={() => onAskAiToFix(entry.message)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-200 text-[11px] font-sans font-medium shrink-0 transition-colors cursor-pointer"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>Explain & Fix</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
