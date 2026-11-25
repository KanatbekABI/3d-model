import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Code2, Eye, Bot, Layers, Rows3 } from 'lucide-react';
import type {
  ChatMessage,
  CodeFiles,
  ConsoleEntry,
  EditorLanguage,
  LayoutMode,
  MobilePanel,
  PreviewViewport,
  StarterTemplate,
  StudioProject,
} from './types/studio';
import {
  deleteProjectFromStorage,
  loadSavedProjects,
  loadWorkspaceDraft,
  saveProjectToStorage,
  saveWorkspaceDraft,
} from './utils/storage';
import { buildSandboxedSrcDoc, SANDBOX_MESSAGE_SOURCE } from './utils/previewBuilder';
import { buildStandaloneHtml } from './utils/exporter';
import { extractCodeBlocksFromMarkdown } from './utils/aiCodeParser';
import { StudioHeader } from './components/StudioHeader';
import { CodeEditor } from './components/CodeEditor';
import { PreviewPane } from './components/PreviewPane';
import { AiAssistantPanel, type AiAssistantMode } from './components/AiAssistantPanel';
import { ProjectsModal } from './components/ProjectsModal';
import { ExportModal } from './components/ExportModal';

const INITIAL_TOPIC_PROMPT_MESSAGE: ChatMessage = {
  id: 'msg_welcome_topic',
  role: 'assistant',
  content:
    'Сәлем! Қандай тақырыпта 3D модель жасағыңыз келеді?\n\nТақырыпты жазыңыз (мысалы: **Күн жүйесі**, **Сиыр**, **Робот**, **Спорттық көлік** немесе кез келген нысан) — мен бірден HTML, CSS және Three.js кодын дайындап, Live Preview-да **3D модель** ретінде шығарып беремін!',
  createdAt: Date.now(),
};

export default function App() {
  const initialDraft = useMemo(() => loadWorkspaceDraft(), []);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    initialDraft.activeProjectId
  );
  const [projectName, setProjectName] = useState<string>(initialDraft.name);
  const [code, setCode] = useState<CodeFiles>(initialDraft.code);
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() =>
    JSON.stringify({ name: initialDraft.name, code: initialDraft.code })
  );
  const [savedProjects, setSavedProjects] = useState<StudioProject[]>(() =>
    loadSavedProjects()
  );

  // Live preview execution state
  const [compiledCode, setCompiledCode] = useState<CodeFiles>(initialDraft.code);
  const [runKey, setRunKey] = useState<number>(1);
  const [autoRun, setAutoRun] = useState<boolean>(true);
  const runIdRef = useRef<string>('run_1');

  // Console state
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);

  // Layout & UI state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [editorStackMode, setEditorStackMode] = useState<'stacked' | 'tabbed'>('stacked');
  const [activeEditorTab, setActiveEditorTab] = useState<EditorLanguage>('html');
  const [expandedEditor, setExpandedEditor] = useState<EditorLanguage | null>(null);
  const [previewViewport, setPreviewViewport] = useState<PreviewViewport>('desktop');
  const [splitRatio, setSplitRatio] = useState<number>(48);
  const [isAiOpen, setIsAiOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1180 : true
  );
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('code');

  // Modals & toast feedback
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // AI chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    INITIAL_TOPIC_PROMPT_MESSAGE,
  ]);
  const [aiMode, setAiMode] = useState<AiAssistantMode>('3d-generator');
  const [autoApply3d, setAutoApply3d] = useState<boolean>(true);
  const [isAiStreaming, setIsAiStreaming] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2600);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const hasUnsavedChanges = useMemo(() => {
    return JSON.stringify({ name: projectName, code }) !== savedSnapshot;
  }, [projectName, code, savedSnapshot]);

  // Persist active draft to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      saveWorkspaceDraft({
        activeProjectId,
        name: projectName,
        code,
        updatedAt: Date.now(),
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [activeProjectId, projectName, code]);

  // Execute project in sandboxed iframe
  const runProject = useCallback(
    (overrideCode?: CodeFiles) => {
      const targetCode = overrideCode ?? code;
      const nextKey = Date.now();
      runIdRef.current = `run_${nextKey}`;
      setConsoleEntries([]);
      setCompiledCode({ ...targetCode });
      setRunKey((prev) => prev + 1);
    },
    [code]
  );

  // Auto-run debounced execution when editing
  useEffect(() => {
    if (!autoRun) return;
    const timer = setTimeout(() => {
      const nextKey = Date.now();
      runIdRef.current = `run_${nextKey}`;
      setConsoleEntries([]);
      setCompiledCode({ ...code });
      setRunKey((prev) => prev + 1);
    }, 450);
    return () => clearTimeout(timer);
  }, [code, autoRun]);

  // Listen to sandboxed iframe console/error messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (
        !data ||
        typeof data !== 'object' ||
        data.source !== SANDBOX_MESSAGE_SOURCE ||
        data.runId !== runIdRef.current
      ) {
        return;
      }

      const level =
        data.level === 'error' || data.level === 'warn' || data.level === 'info'
          ? data.level
          : 'log';

      const entry: ConsoleEntry = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        level,
        message: String(data.message ?? ''),
        timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
      };

      setConsoleEntries((prev) => [...prev.slice(-99), entry]);
      if (level === 'error') {
        setIsConsoleOpen(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Save current project to localStorage
  const handleSaveProject = useCallback(() => {
    const { project, allProjects } = saveProjectToStorage({
      id: activeProjectId,
      name: projectName,
      code,
    });
    setActiveProjectId(project.id);
    setProjectName(project.name);
    setSavedProjects(allProjects);
    setSavedSnapshot(JSON.stringify({ name: project.name, code }));
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1800);
    showToast(`Saved "${project.name}"`);
  }, [activeProjectId, projectName, code, showToast]);

  // Global keyboard shortcuts (Cmd/Ctrl+S, Cmd/Ctrl+Enter)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveProject();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runProject();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSaveProject, runProject]);

  // Resizable desktop split drag handler
  const handleStartSplitDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const container = workspaceRef.current;
    if (!container) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const availableWidth = rect.width;
      if (availableWidth <= 0) return;
      const offsetX = moveEvent.clientX - rect.left;
      const nextRatio = Math.min(72, Math.max(28, (offsetX / availableWidth) * 100));
      setSplitRatio(nextRatio);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Project management handlers
  const handleLoadProject = (project: StudioProject) => {
    setActiveProjectId(project.id);
    setProjectName(project.name);
    setCode({ ...project.code });
    setSavedSnapshot(JSON.stringify({ name: project.name, code: project.code }));
    runProject(project.code);
    showToast(`Loaded "${project.name}"`);
  };

  const handleDeleteProject = (id: string) => {
    const next = deleteProjectFromStorage(id);
    setSavedProjects(next);
    if (activeProjectId === id) {
      setActiveProjectId(null);
    }
    showToast('Project deleted');
  };

  const handleDuplicateProject = (project: StudioProject) => {
    const { project: copy, allProjects } = saveProjectToStorage({
      id: null,
      name: `${project.name} Copy`,
      code: project.code,
    });
    setSavedProjects(allProjects);
    showToast(`Duplicated "${copy.name}"`);
  };

  const handleCreateFromTemplate = (template: StarterTemplate) => {
    setActiveProjectId(null);
    setProjectName(template.name);
    setCode({ ...template.code });
    setSavedSnapshot(JSON.stringify({ name: template.name, code: template.code }));
    runProject(template.code);
    showToast(`Started from "${template.name}"`);
  };

  const handleApplyAllAndRun = useCallback(
    (nextPartial: Partial<CodeFiles>) => {
      setCode((prev) => {
        const merged: CodeFiles = {
          html: nextPartial.html ?? prev.html,
          css: nextPartial.css ?? prev.css,
          js: nextPartial.js ?? prev.js,
        };
        runProject(merged);
        return merged;
      });
      showToast('3D код редакторға қойылып, іске қосылды');
    },
    [runProject, showToast]
  );

  // AI chat streaming handler
  const handleSendAiMessage = useCallback(
    async (userPrompt: string, overrideMode?: AiAssistantMode) => {
      const trimmed = userPrompt.trim();
      if (!trimmed || isAiStreaming) return;

      const activeMode = overrideMode ?? aiMode;

      const userMessage: ChatMessage = {
        id: `msg_${Date.now()}_u`,
        role: 'user',
        content: trimmed,
        createdAt: Date.now(),
      };

      const assistantId = `msg_${Date.now()}_a`;
      const placeholderAssistant: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };

      const historyForApi = [...chatMessages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      setChatMessages((prev) => [...prev, userMessage, placeholderAssistant]);
      setIsAiStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      let fullResponseText = '';
      let hadError = false;

      try {
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            messages: historyForApi,
            code,
            consoleLogs: consoleEntries.map((c) => ({
              level: c.level,
              message: c.message,
            })),
            projectName,
            mode: activeMode,
          }),
        });

        if (!response.ok) {
          let errMsg = `Request failed (${response.status})`;
          try {
            const errJson = await response.json();
            if (errJson?.error) errMsg = errJson.error;
          } catch {
            // Keep default error
          }
          hadError = true;
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: errMsg, isError: true } : m
            )
          );
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Streaming response body is unavailable.');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const evt of events) {
            const line = evt.trim();
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') break;

            try {
              const parsed = JSON.parse(payload) as { text?: string; error?: string };
              if (parsed.error) {
                hadError = true;
                setChatMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: parsed.error!, isError: true }
                      : m
                  )
                );
              } else if (parsed.text) {
                fullResponseText += parsed.text;
                setChatMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.text }
                      : m
                  )
                );
              }
            } catch {
              // Ignore malformed SSE fragment
            }
          }
        }

        if (!hadError && autoApply3d && activeMode === '3d-generator') {
          const extracted = extractCodeBlocksFromMarkdown(fullResponseText);
          if (extracted.html || extracted.css || extracted.js) {
            if (trimmed.length <= 45) {
              setProjectName(`${trimmed} 3D`);
            }
            handleApplyAllAndRun(extracted);
          }
        }
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && m.content === ''
                ? { ...m, content: 'Generation stopped.' }
                : m
            )
          );
        } else {
          const msg =
            err instanceof Error
              ? err.message
              : 'Unable to reach AI Assistant backend.';
          setChatMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: msg, isError: true } : m
            )
          );
        }
      } finally {
        setIsAiStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [
      aiMode,
      autoApply3d,
      chatMessages,
      code,
      consoleEntries,
      handleApplyAllAndRun,
      isAiStreaming,
      projectName,
    ]
  );

  const handleStopAiStreaming = () => {
    abortControllerRef.current?.abort();
  };

  const handleAskAiToFix = (errorMessage: string) => {
    setIsAiOpen(true);
    setMobilePanel('ai');
    setAiMode('chat');
    handleSendAiMessage(
      `I encountered this runtime error in the preview console:\n\n\`${errorMessage}\`\n\nPlease explain why it occurred and show me how to fix it in my code.`,
      'chat'
    );
  };

  const handleApplyCodeFromAi = (language: EditorLanguage, nextCode: string) => {
    setCode((prev) => ({
      ...prev,
      [language]: nextCode,
    }));
    setActiveEditorTab(language);
    showToast(`Applied ${language.toUpperCase()} snippet to editor`);
  };

  const sandboxSrcDoc = useMemo(
    () => buildSandboxedSrcDoc(compiledCode, runIdRef.current),
    [compiledCode]
  );

  const standaloneHtml = useMemo(
    () => buildStandaloneHtml(projectName, compiledCode),
    [projectName, compiledCode]
  );

  const updateCodeField = (lang: EditorLanguage, val: string) => {
    setCode((prev) => ({ ...prev, [lang]: val }));
  };

  const editorTabs: { id: EditorLanguage; label: string; accent: string }[] = [
    { id: 'html', label: 'HTML', accent: 'text-orange-400' },
    { id: 'css', label: 'CSS', accent: 'text-sky-400' },
    { id: 'js', label: 'JavaScript', accent: 'text-amber-300' },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#080910] text-slate-100">
      <StudioHeader
        projectName={projectName}
        onRenameProject={(name) => setProjectName(name)}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        autoRun={autoRun}
        onToggleAutoRun={() => setAutoRun((prev) => !prev)}
        onRun={() => runProject()}
        onSave={handleSaveProject}
        justSaved={justSaved}
        hasUnsavedChanges={hasUnsavedChanges}
        onOpenProjects={() => setIsProjectsModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        isAiOpen={isAiOpen}
        onToggleAi={() => setIsAiOpen((prev) => !prev)}
        savedCount={savedProjects.length}
      />

      {/* Mobile / Tablet Panel Switcher (< md) */}
      <div className="md:hidden px-3 py-2 border-b border-white/[0.07] bg-[#0c0e18] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.07] flex-1">
          <button
            type="button"
            onClick={() => setMobilePanel('code')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              mobilePanel === 'code'
                ? 'bg-indigo-500/25 text-indigo-100'
                : 'text-slate-400'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel('preview')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              mobilePanel === 'preview'
                ? 'bg-indigo-500/25 text-indigo-100'
                : 'text-slate-400'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setMobilePanel('ai')}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              mobilePanel === 'ai'
                ? 'bg-indigo-500/25 text-indigo-100'
                : 'text-slate-400'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>AI Chat</span>
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Mobile Workspace (< md) */}
        <div className="md:hidden flex-1 min-h-0 flex flex-col">
          {mobilePanel === 'code' && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-1 px-3 py-2 border-b border-white/[0.07] bg-[#101320] shrink-0">
                {editorTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveEditorTab(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                      activeEditorTab === tab.id
                        ? `bg-white/[0.08] ${tab.accent}`
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-1 min-h-0">
                <CodeEditor
                  language={activeEditorTab}
                  label={
                    activeEditorTab === 'html'
                      ? 'HTML'
                      : activeEditorTab === 'css'
                      ? 'CSS'
                      : 'JavaScript'
                  }
                  value={code[activeEditorTab]}
                  onChange={(val) => updateCodeField(activeEditorTab, val)}
                  onRun={() => runProject()}
                  onSave={handleSaveProject}
                  hideHeader
                />
              </div>
            </div>
          )}

          {mobilePanel === 'preview' && (
            <div className="flex-1 min-h-0">
              <PreviewPane
                srcDoc={sandboxSrcDoc}
                standaloneHtml={standaloneHtml}
                runKey={runKey}
                viewport={previewViewport}
                onViewportChange={setPreviewViewport}
                onReload={() => runProject()}
                consoleEntries={consoleEntries}
                onClearConsole={() => setConsoleEntries([])}
                isConsoleOpen={isConsoleOpen}
                onToggleConsole={() => setIsConsoleOpen((prev) => !prev)}
                onAskAiToFix={handleAskAiToFix}
              />
            </div>
          )}

          {mobilePanel === 'ai' && (
            <div className="flex-1 min-h-0">
              <AiAssistantPanel
                code={code}
                consoleEntries={consoleEntries}
                projectName={projectName}
                messages={chatMessages}
                isStreaming={isAiStreaming}
                mode={aiMode}
                onModeChange={setAiMode}
                autoApply3d={autoApply3d}
                onToggleAutoApply3d={() => setAutoApply3d((prev) => !prev)}
                onSendMessage={handleSendAiMessage}
                onStopStreaming={handleStopAiStreaming}
                onClearMessages={() =>
                  setChatMessages([
                    {
                      ...INITIAL_TOPIC_PROMPT_MESSAGE,
                      id: `msg_welcome_${Date.now()}`,
                      createdAt: Date.now(),
                    },
                  ])
                }
                onApplyCode={handleApplyCodeFromAi}
                onApplyAllAndRun={handleApplyAllAndRun}
              />
            </div>
          )}
        </div>

        {/* Desktop & Tablet Workspace (>= md) */}
        <div
          ref={workspaceRef}
          className="hidden md:flex flex-1 min-w-0 min-h-0 overflow-hidden"
        >
          {/* Code Editors Pane */}
          {layoutMode !== 'preview' && (
            <div
              style={
                layoutMode === 'split'
                  ? { width: `${splitRatio}%` }
                  : { width: '100%' }
              }
              className="flex flex-col min-w-0 min-h-0 border-r border-white/[0.08] bg-[#0b0d16]"
            >
              {layoutMode === 'code' ? (
                /* 3-Column Side-by-Side Editors in Code-Only Mode */
                <div className="flex-1 min-h-0 grid grid-cols-3 divide-x divide-white/[0.07]">
                  <CodeEditor
                    language="html"
                    label="HTML"
                    value={code.html}
                    onChange={(val) => updateCodeField('html', val)}
                    onRun={() => runProject()}
                    onSave={handleSaveProject}
                  />
                  <CodeEditor
                    language="css"
                    label="CSS"
                    value={code.css}
                    onChange={(val) => updateCodeField('css', val)}
                    onRun={() => runProject()}
                    onSave={handleSaveProject}
                  />
                  <CodeEditor
                    language="js"
                    label="JavaScript"
                    value={code.js}
                    onChange={(val) => updateCodeField('js', val)}
                    onRun={() => runProject()}
                    onSave={handleSaveProject}
                  />
                </div>
              ) : (
                /* Split Mode: Stacked or Tabbed Editors */
                <div className="flex-1 min-h-0 flex flex-col">
                  {/* Editor View Mode Strip */}
                  <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.07] bg-[#0e111c] shrink-0">
                    {editorStackMode === 'tabbed' ? (
                      <div className="flex items-center gap-1">
                        {editorTabs.map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveEditorTab(tab.id)}
                            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                              activeEditorTab === tab.id
                                ? `bg-white/[0.08] ${tab.accent}`
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">
                        Editors (HTML · CSS · JS)
                      </span>
                    )}

                    <div className="flex items-center gap-1 p-0.5 rounded-md bg-white/[0.03] border border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => {
                          setEditorStackMode('stacked');
                          setExpandedEditor(null);
                        }}
                        title="Stack all 3 editors"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          editorStackMode === 'stacked'
                            ? 'bg-indigo-500/25 text-indigo-100'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Rows3 className="w-3 h-3" />
                        <span>Stack</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorStackMode('tabbed')}
                        title="Switch editors with tabs"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                          editorStackMode === 'tabbed'
                            ? 'bg-indigo-500/25 text-indigo-100'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Layers className="w-3 h-3" />
                        <span>Tabs</span>
                      </button>
                    </div>
                  </div>

                  {editorStackMode === 'tabbed' ? (
                    <div className="flex-1 min-h-0">
                      <CodeEditor
                        language={activeEditorTab}
                        label={
                          activeEditorTab === 'html'
                            ? 'HTML'
                            : activeEditorTab === 'css'
                            ? 'CSS'
                            : 'JavaScript'
                        }
                        value={code[activeEditorTab]}
                        onChange={(val) => updateCodeField(activeEditorTab, val)}
                        onRun={() => runProject()}
                        onSave={handleSaveProject}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 min-h-0 flex flex-col divide-y divide-white/[0.07]">
                      {(['html', 'css', 'js'] as EditorLanguage[]).map((lang) => {
                        if (expandedEditor && expandedEditor !== lang) {
                          return null;
                        }
                        return (
                          <div key={lang} className="flex-1 min-h-0">
                            <CodeEditor
                              language={lang}
                              label={
                                lang === 'html'
                                  ? 'HTML'
                                  : lang === 'css'
                                  ? 'CSS'
                                  : 'JavaScript'
                              }
                              value={code[lang]}
                              onChange={(val) => updateCodeField(lang, val)}
                              onRun={() => runProject()}
                              onSave={handleSaveProject}
                              isExpanded={expandedEditor === lang}
                              onToggleExpand={() =>
                                setExpandedEditor((prev) =>
                                  prev === lang ? null : lang
                                )
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Drag Splitter (only in Split mode) */}
          {layoutMode === 'split' && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize code editor and preview panes"
              onMouseDown={handleStartSplitDrag}
              className="w-1.5 bg-[#0c0e18] hover:bg-indigo-500/50 cursor-col-resize transition-colors shrink-0 flex items-center justify-center group"
            >
              <div className="w-0.5 h-8 rounded-full bg-white/10 group-hover:bg-indigo-300/80 transition-colors" />
            </div>
          )}

          {/* Live Preview Pane */}
          {layoutMode !== 'code' && (
            <div className="flex-1 min-w-0 min-h-0">
              <PreviewPane
                srcDoc={sandboxSrcDoc}
                standaloneHtml={standaloneHtml}
                runKey={runKey}
                viewport={previewViewport}
                onViewportChange={setPreviewViewport}
                onReload={() => runProject()}
                consoleEntries={consoleEntries}
                onClearConsole={() => setConsoleEntries([])}
                isConsoleOpen={isConsoleOpen}
                onToggleConsole={() => setIsConsoleOpen((prev) => !prev)}
                onAskAiToFix={handleAskAiToFix}
              />
            </div>
          )}
        </div>

        {/* Desktop AI Assistant Sidebar */}
        {isAiOpen && (
          <div className="hidden md:block w-[340px] lg:w-[380px] xl:w-[410px] shrink-0 h-full min-h-0">
            <AiAssistantPanel
              code={code}
              consoleEntries={consoleEntries}
              projectName={projectName}
              messages={chatMessages}
              isStreaming={isAiStreaming}
              mode={aiMode}
              onModeChange={setAiMode}
              autoApply3d={autoApply3d}
              onToggleAutoApply3d={() => setAutoApply3d((prev) => !prev)}
              onSendMessage={handleSendAiMessage}
              onStopStreaming={handleStopAiStreaming}
              onClearMessages={() =>
                setChatMessages([
                  {
                    ...INITIAL_TOPIC_PROMPT_MESSAGE,
                    id: `msg_welcome_${Date.now()}`,
                    createdAt: Date.now(),
                  },
                ])
              }
              onApplyCode={handleApplyCodeFromAi}
              onApplyAllAndRun={handleApplyAllAndRun}
              onClose={() => setIsAiOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <ProjectsModal
        isOpen={isProjectsModalOpen}
        onClose={() => setIsProjectsModalOpen(false)}
        projects={savedProjects}
        activeProjectId={activeProjectId}
        onLoadProject={handleLoadProject}
        onDeleteProject={handleDeleteProject}
        onDuplicateProject={handleDuplicateProject}
        onCreateFromTemplate={handleCreateFromTemplate}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectName={projectName}
        code={code}
      />

      {/* Non-blocking Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-[#161a2e]/95 backdrop-blur-md border border-indigo-400/30 text-xs font-medium text-slate-100 shadow-xl pointer-events-none"
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
