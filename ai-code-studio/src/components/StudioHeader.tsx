import { useState } from 'react';
import {
  Play,
  Save,
  FolderOpen,
  Download,
  Bot,
  Code2,
  Columns2,
  Eye,
  Check,
  Pencil,
  Zap,
} from 'lucide-react';
import type { LayoutMode } from '../types/studio';

interface StudioHeaderProps {
  projectName: string;
  onRenameProject: (nextName: string) => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
  autoRun: boolean;
  onToggleAutoRun: () => void;
  onRun: () => void;
  onSave: () => void;
  justSaved: boolean;
  hasUnsavedChanges: boolean;
  onOpenProjects: () => void;
  onOpenExport: () => void;
  isAiOpen: boolean;
  onToggleAi: () => void;
  savedCount: number;
}

export function StudioHeader({
  projectName,
  onRenameProject,
  layoutMode,
  onLayoutModeChange,
  autoRun,
  onToggleAutoRun,
  onRun,
  onSave,
  justSaved,
  hasUnsavedChanges,
  onOpenProjects,
  onOpenExport,
  isAiOpen,
  onToggleAi,
  savedCount,
}: StudioHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(projectName);

  const commitTitle = () => {
    setIsEditingTitle(false);
    const cleaned = draftTitle.trim();
    if (cleaned && cleaned !== projectName) {
      onRenameProject(cleaned);
    } else {
      setDraftTitle(projectName);
    }
  };

  return (
    <header className="h-14 px-3 sm:px-4 border-b border-white/[0.08] bg-[#0c0e18]/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 z-20">
      {/* Left: Brand & Editable Project Name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-950/50">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm sm:text-base font-bold tracking-tight text-white whitespace-nowrap">
            AI Code Studio
          </span>
        </div>

        <span className="hidden sm:inline text-slate-600 select-none">/</span>

        {isEditingTitle ? (
          <input
            type="text"
            value={draftTitle}
            autoFocus
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitTitle();
              if (e.key === 'Escape') {
                setDraftTitle(projectName);
                setIsEditingTitle(false);
              }
            }}
            className="hidden sm:block w-44 md:w-56 px-2 py-1 text-xs font-medium bg-[#080910] border border-indigo-500/60 rounded-md text-white focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraftTitle(projectName);
              setIsEditingTitle(true);
            }}
            title="Click to rename project"
            className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer max-w-[200px]"
          >
            <span className="truncate">{projectName}</span>
            {hasUnsavedChanges && (
              <span className="text-indigo-400 text-xs" title="Unsaved changes">
                *
              </span>
            )}
            <Pencil className="w-3 h-3 text-slate-500 shrink-0" />
          </button>
        )}
      </div>

      {/* Center: Desktop Layout Switcher & Auto-Run */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-0.5 p-1 rounded-lg bg-white/[0.04] border border-white/[0.07]">
          <button
            type="button"
            onClick={() => onLayoutModeChange('split')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              layoutMode === 'split'
                ? 'bg-indigo-500/25 text-indigo-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>
          <button
            type="button"
            onClick={() => onLayoutModeChange('code')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              layoutMode === 'code'
                ? 'bg-indigo-500/25 text-indigo-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>
          <button
            type="button"
            onClick={() => onLayoutModeChange('preview')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              layoutMode === 'preview'
                ? 'bg-indigo-500/25 text-indigo-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleAutoRun}
          title="Toggle automatic live preview on edit"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
            autoRun
              ? 'bg-indigo-500/15 border-indigo-400/30 text-indigo-200'
              : 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Auto-Run {autoRun ? 'On' : 'Off'}</span>
        </button>
      </div>

      {/* Right: Primary Workspace Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onRun}
          title="Run Project (Ctrl/Cmd + Enter)"
          className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 shadow-md shadow-indigo-950/40 transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Run</span>
        </button>

        <button
          type="button"
          onClick={onSave}
          title="Save Project (Ctrl/Cmd + S)"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          {justSaved ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Save className="w-3.5 h-3.5 text-slate-300" />
          )}
          <span className="hidden sm:inline">{justSaved ? 'Saved' : 'Save'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenProjects}
          title="Saved Projects & Templates"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <FolderOpen className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden md:inline">Projects</span>
          {savedCount > 0 && (
            <span className="hidden md:inline text-[11px] font-mono text-slate-400 tabular-nums">
              ({savedCount})
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          title="Export HTML, CSS & JS"
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-slate-300" />
          <span className="hidden md:inline">Export</span>
        </button>

        <button
          type="button"
          onClick={onToggleAi}
          title="Toggle AI Assistant"
          className={`hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            isAiOpen
              ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-100'
              : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/[0.08] text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Assistant</span>
        </button>
      </div>
    </header>
  );
}
