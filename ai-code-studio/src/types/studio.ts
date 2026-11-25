export type EditorLanguage = 'html' | 'css' | 'js';

export type LayoutMode = 'split' | 'code' | 'preview';

export type PreviewViewport = 'desktop' | 'tablet' | 'mobile';

export type MobilePanel = 'code' | 'preview' | 'ai';

export interface CodeFiles {
  html: string;
  css: string;
  js: string;
}

export interface StudioProject {
  id: string;
  name: string;
  description?: string;
  code: CodeFiles;
  createdAt: number;
  updatedAt: number;
}

export interface StarterTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  code: CodeFiles;
}

export interface ConsoleEntry {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  isError?: boolean;
}
