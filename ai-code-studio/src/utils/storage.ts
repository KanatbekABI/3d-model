import type { CodeFiles, StudioProject } from '../types/studio';
import { STARTER_TEMPLATES } from '../data/templates';

const PROJECTS_STORAGE_KEY = 'ai_code_studio_projects_v1';
const DRAFT_STORAGE_KEY = 'ai_code_studio_draft_v1';

export interface WorkspaceDraft {
  activeProjectId: string | null;
  name: string;
  code: CodeFiles;
  updatedAt: number;
}

export function loadSavedProjects(): StudioProject[] {
  try {
    const raw = window.localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StudioProject =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string' &&
        item.code &&
        typeof item.code.html === 'string'
    );
  } catch {
    return [];
  }
}

export function persistProjects(projects: StudioProject[]): void {
  try {
    window.localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch (err) {
    console.error('Could not persist projects to localStorage:', err);
  }
}

export function saveProjectToStorage(
  projectData: { id?: string | null; name: string; code: CodeFiles }
): { project: StudioProject; allProjects: StudioProject[] } {
  const existing = loadSavedProjects();
  const now = Date.now();
  const cleanName = projectData.name.trim() || 'Untitled Project';

  const existingIndex = projectData.id
    ? existing.findIndex((p) => p.id === projectData.id)
    : -1;

  let saved: StudioProject;
  let updatedList: StudioProject[];

  if (existingIndex >= 0) {
    const prev = existing[existingIndex];
    saved = {
      ...prev,
      name: cleanName,
      code: { ...projectData.code },
      updatedAt: now,
    };
    updatedList = [
      saved,
      ...existing.filter((p) => p.id !== saved.id),
    ];
  } else {
    saved = {
      id: `proj_${now}_${Math.random().toString(36).slice(2, 7)}`,
      name: cleanName,
      code: { ...projectData.code },
      createdAt: now,
      updatedAt: now,
    };
    updatedList = [saved, ...existing];
  }

  persistProjects(updatedList);
  return { project: saved, allProjects: updatedList };
}

export function deleteProjectFromStorage(id: string): StudioProject[] {
  const existing = loadSavedProjects();
  const next = existing.filter((p) => p.id !== id);
  persistProjects(next);
  return next;
}

export function loadWorkspaceDraft(): WorkspaceDraft {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<WorkspaceDraft>;
      if (parsed && parsed.code && typeof parsed.code.html === 'string') {
        return {
          activeProjectId: parsed.activeProjectId ?? null,
          name: typeof parsed.name === 'string' && parsed.name ? parsed.name : 'Aurora Focus Counter',
          code: {
            html: parsed.code.html ?? '',
            css: parsed.code.css ?? '',
            js: parsed.code.js ?? '',
          },
          updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
        };
      }
    }
  } catch {
    // Fallback to default template
  }

  const starter = STARTER_TEMPLATES[0];
  return {
    activeProjectId: null,
    name: starter.name,
    code: { ...starter.code },
    updatedAt: Date.now(),
  };
}

export function saveWorkspaceDraft(draft: WorkspaceDraft): void {
  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Ignore quota errors on draft autosave
  }
}
