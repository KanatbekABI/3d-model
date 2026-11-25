import { useState } from 'react';
import {
  X,
  Search,
  FolderOpen,
  Trash2,
  Plus,
  Copy,
  Clock,
  Layers,
} from 'lucide-react';
import type { StarterTemplate, StudioProject } from '../types/studio';
import { STARTER_TEMPLATES } from '../data/templates';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: StudioProject[];
  activeProjectId: string | null;
  onLoadProject: (project: StudioProject) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (project: StudioProject) => void;
  onCreateFromTemplate: (template: StarterTemplate) => void;
}

function formatUpdatedAt(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ProjectsModal({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onLoadProject,
  onDeleteProject,
  onDuplicateProject,
  onCreateFromTemplate,
}: ProjectsModalProps) {
  const [activeTab, setActiveTab] = useState<'saved' | 'templates'>(
    projects.length > 0 ? 'saved' : 'templates'
  );
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Projects and Templates"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-[#101322]/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">
              Projects & Templates
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.07] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs & Search */}
        <div className="px-5 py-3 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0c0e18]/60">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.04] border border-white/[0.06] self-start">
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'saved'
                  ? 'bg-indigo-500/25 text-indigo-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Saved Projects ({projects.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'templates'
                  ? 'bg-indigo-500/25 text-indigo-100'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Starter Templates ({STARTER_TEMPLATES.length})
            </button>
          </div>

          {activeTab === 'saved' && (
            <div className="relative flex-1 sm:max-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search saved..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#080910] border border-white/[0.08] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          {activeTab === 'saved' ? (
            filteredProjects.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <p className="text-sm text-slate-300 font-medium">
                  {projects.length === 0
                    ? 'No saved projects yet'
                    : 'No projects match your search'}
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {projects.length === 0
                    ? 'Click the Save button in the top bar at any time to store your current HTML, CSS, and JavaScript project locally.'
                    : 'Try another project title or switch to Starter Templates.'}
                </p>
                {projects.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('templates')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Browse Starter Templates</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredProjects.map((project) => {
                  const isActive = project.id === activeProjectId;
                  return (
                    <div
                      key={project.id}
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-colors ${
                        isActive
                          ? 'bg-indigo-500/10 border-indigo-400/35'
                          : 'bg-white/[0.02] border-white/[0.07] hover:bg-white/[0.04]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onLoadProject(project);
                          onClose();
                        }}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">
                            {project.name}
                          </span>
                          {isActive && (
                            <span className="text-[11px] font-medium text-indigo-300">
                              · Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-mono tabular-nums">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Updated {formatUpdatedAt(project.updatedAt)}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {project.code.html.length + project.code.css.length + project.code.js.length} chars
                          </span>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onLoadProject(project);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-100 transition-colors cursor-pointer"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateProject(project)}
                          title="Duplicate project"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.07] transition-colors cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProject(project.id)}
                          title="Delete project"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STARTER_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-col justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-400/35 transition-colors"
                >
                  <div>
                    <p className="text-[11px] font-medium text-indigo-300 mb-1">
                      {template.category}
                    </p>
                    <h3 className="text-sm font-semibold text-white">
                      {template.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onCreateFromTemplate(template);
                      onClose();
                    }}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-indigo-500/25 border border-white/[0.08] text-slate-100 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Use Template</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
