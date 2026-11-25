import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bot,
  Send,
  Square,
  Trash2,
  Copy,
  Check,
  ArrowDownToLine,
  Box,
  MessageSquareCode,
  Play,
  X,
  AlertCircle,
} from 'lucide-react';
import type { ChatMessage, CodeFiles, ConsoleEntry, EditorLanguage } from '../types/studio';
import { extractCodeBlocksFromMarkdown } from '../utils/aiCodeParser';

export type AiAssistantMode = '3d-generator' | 'chat';

interface AiAssistantPanelProps {
  code: CodeFiles;
  consoleEntries: ConsoleEntry[];
  projectName: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  mode: AiAssistantMode;
  onModeChange: (mode: AiAssistantMode) => void;
  autoApply3d: boolean;
  onToggleAutoApply3d: () => void;
  onSendMessage: (prompt: string, overrideMode?: AiAssistantMode) => void;
  onStopStreaming: () => void;
  onClearMessages: () => void;
  onApplyCode: (language: EditorLanguage, nextCode: string) => void;
  onApplyAllAndRun: (nextPartial: Partial<CodeFiles>) => void;
  onClose?: () => void;
}

const TOPIC_EXAMPLES_3D = [
  { label: 'Күн жүйесі (Solar System)', topic: 'Күн жүйесі' },
  { label: 'Сиыр 3D (Cow)', topic: 'Сиыр' },
  { label: 'Спорттық көлік (Sports Car)', topic: 'Спорттық көлік' },
  { label: 'Қазақ үй (Yurt)', topic: 'Қазақ үй (Киіз үй)' },
];

const QUICK_PROMPTS = [
  {
    label: 'Explain code',
    prompt: 'Explain how my current HTML, CSS, and JavaScript work together step by step.',
  },
  {
    label: 'Find & fix bugs',
    prompt: 'Review my HTML, CSS, JavaScript, and console output for any bugs, edge cases, or errors and explain how to fix them.',
  },
  {
    label: 'Improve code',
    prompt: 'Suggest practical improvements to make this code cleaner, more accessible, and more polished.',
  },
  {
    label: 'Make responsive',
    prompt: 'Review my CSS and HTML and provide improvements so this layout works great on mobile and tablet screens.',
  },
];

interface ParsedSegment {
  type: 'text' | 'code';
  content: string;
  lang?: string;
}

function parseMessageSegments(markdown: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const fenceRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceRegex.exec(markdown)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: markdown.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: 'code',
      lang: (match[1] || 'text').toLowerCase(),
      content: match[2].replace(/\n$/, ''),
    });
    lastIndex = fenceRegex.lastIndex;
  }

  if (lastIndex < markdown.length) {
    segments.push({
      type: 'text',
      content: markdown.slice(lastIndex),
    });
  }

  return segments;
}

function mapFenceLangToEditor(lang?: string): EditorLanguage | null {
  if (!lang) return null;
  if (lang === 'html' || lang === 'htm') return 'html';
  if (lang === 'css' || lang === 'scss') return 'css';
  if (lang === 'js' || lang === 'javascript') return 'js';
  return null;
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-white/[0.08] text-indigo-200 font-mono text-[12px]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function CodeBlockCard({
  lang,
  content,
  onApplyCode,
}: {
  lang?: string;
  content: string;
  onApplyCode: (language: EditorLanguage, nextCode: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const targetEditor = mapFenceLangToEditor(lang);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleApply = () => {
    if (!targetEditor) return;
    onApplyCode(targetEditor, content);
    setApplied(true);
    setTimeout(() => setApplied(false), 1600);
  };

  return (
    <div className="my-2.5 rounded-lg overflow-hidden border border-white/[0.08] bg-[#080a12]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#121628] border-b border-white/[0.06]">
        <span className="text-[11px] font-mono font-medium text-slate-400">
          {lang || 'code'}
        </span>
        <div className="flex items-center gap-1.5">
          {targetEditor && (
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/35 text-indigo-200 text-[11px] font-medium transition-colors cursor-pointer"
            >
              {applied ? <Check className="w-3 h-3 text-emerald-400" /> : <ArrowDownToLine className="w-3 h-3" />}
              <span>{applied ? 'Applied' : `Apply to ${targetEditor.toUpperCase()}`}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-white/[0.08] text-slate-400 hover:text-slate-100 text-[11px] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>
      <pre className="p-3 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed max-h-60">
        <code>{content}</code>
      </pre>
    </div>
  );
}

export function AiAssistantPanel({
  code,
  consoleEntries,
  projectName,
  messages,
  isStreaming,
  mode,
  onModeChange,
  autoApply3d,
  onToggleAutoApply3d,
  onSendMessage,
  onStopStreaming,
  onClearMessages,
  onApplyCode,
  onApplyAllAndRun,
  onClose,
}: AiAssistantPanelProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const errorCount = consoleEntries.filter((e) => e.level === 'error').length;
  const totalLines =
    code.html.split('\n').length +
    code.css.split('\n').length +
    code.js.split('\n').length;

  return (
    <aside
      aria-label="AI Coding Assistant"
      className="flex flex-col h-full min-h-0 bg-[#0d101b] border-l border-white/[0.08]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07] bg-[#111424]/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 truncate">
              AI Assistant
            </h2>
            <p className="text-[11px] text-slate-400 truncate font-mono tabular-nums">
              {projectName} · {totalLines} lines
              {errorCount > 0 ? ` · ${errorCount} err` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onClearMessages}
            title="New topic / reset chat"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close AI Assistant"
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher & Auto-Run 3D Bar */}
      <div className="px-3 py-2 border-b border-white/[0.06] bg-[#0e111e] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => onModeChange('3d-generator')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mode === '3d-generator'
                ? 'bg-gradient-to-r from-violet-600/80 to-blue-600/80 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3 h-3" />
            <span>3D Модель</span>
          </button>
          <button
            type="button"
            onClick={() => onModeChange('chat')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
              mode === 'chat'
                ? 'bg-indigo-500/25 text-indigo-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquareCode className="w-3 h-3" />
            <span>Code Chat</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleAutoApply3d}
          title="Automatically apply generated code and run in Live Preview"
          className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer whitespace-nowrap ${
            autoApply3d
              ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
              : 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:text-slate-200'
          }`}
        >
          Auto-Run: {autoApply3d ? 'On' : 'Off'}
        </button>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[88%] px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-br from-violet-600/90 to-blue-600/90 text-white text-[13px] leading-relaxed shadow-sm">
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
              </div>
            );
          }

          const segments = parseMessageSegments(msg.content);
          const extractedBlocks = extractCodeBlocksFromMarkdown(msg.content);
          const hasMultipleBlocks =
            [extractedBlocks.html, extractedBlocks.css, extractedBlocks.js].filter(Boolean).length >= 2;

          return (
            <div key={msg.id} className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-md bg-white/[0.07] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                {msg.isError ? (
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-indigo-300" />
                )}
              </div>
              <div
                className={`flex-1 min-w-0 text-[13px] leading-relaxed ${
                  msg.isError
                    ? 'text-rose-200 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3'
                    : 'text-slate-200'
                }`}
              >
                {msg.content === '' && isStreaming ? (
                  <span className="text-slate-400 text-xs">
                    {mode === '3d-generator'
                      ? '3D модель коды дайындалуда...'
                      : 'Thinking...'}
                  </span>
                ) : (
                  <>
                    {segments.map((seg, idx) =>
                      seg.type === 'code' ? (
                        <CodeBlockCard
                          key={idx}
                          lang={seg.lang}
                          content={seg.content}
                          onApplyCode={onApplyCode}
                        />
                      ) : (
                        <div key={idx} className="whitespace-pre-wrap break-words space-y-1.5">
                          {seg.content.split('\n').map((line, lIdx) => {
                            if (line.startsWith('### ')) {
                              return (
                                <h4 key={lIdx} className="text-xs font-bold text-white pt-1.5">
                                  {renderInlineMarkdown(line.slice(4))}
                                </h4>
                              );
                            }
                            if (line.startsWith('## ')) {
                              return (
                                <h3 key={lIdx} className="text-sm font-bold text-white pt-1.5">
                                  {renderInlineMarkdown(line.slice(3))}
                                </h3>
                              );
                            }
                            return (
                              <span key={lIdx} className="block">
                                {renderInlineMarkdown(line)}
                              </span>
                            );
                          })}
                        </div>
                      )
                    )}

                    {hasMultipleBlocks && !isStreaming && (
                      <div className="mt-2 pt-2 border-t border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => onApplyAllAndRun(extractedBlocks)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Apply All & Run 3D</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Topic Quick Picks when waiting for the topic */}
        {messages.length <= 1 && mode === '3d-generator' && !isStreaming && (
          <div className="pt-1 space-y-2">
            <p className="text-[11px] font-medium text-slate-400">
              Дайын тақырыптар (немесе төменге өз тақырыбыңызды жазыңыз):
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {TOPIC_EXAMPLES_3D.map((item) => (
                <button
                  key={item.topic}
                  type="button"
                  onClick={() => onSendMessage(item.topic, '3d-generator')}
                  className="text-left px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-indigo-500/15 border border-white/[0.07] hover:border-indigo-400/35 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick chips bar */}
      <div className="px-3 py-1.5 border-t border-white/[0.05] flex items-center gap-1.5 overflow-x-auto shrink-0">
        {QUICK_PROMPTS.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={isStreaming}
            onClick={() => onSendMessage(item.prompt, 'chat')}
            className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-indigo-500/20 border border-white/[0.06] text-[11px] font-medium text-slate-300 hover:text-indigo-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Input Composer */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-white/[0.07] bg-[#101320]/90 shrink-0"
      >
        <div className="flex items-end gap-2 rounded-xl bg-[#080a12] border border-white/[0.1] focus-within:border-indigo-500/60 px-3 py-2 transition-colors">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === '3d-generator'
                ? 'Тақырыпты жазыңыз (мысалы: Сиыр, Күн жүйесі)...'
                : 'Ask AI about your code...'
            }
            className="flex-1 bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 resize-none focus:outline-none max-h-[120px] leading-relaxed"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              title="Stop generating"
              className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors cursor-pointer shrink-0"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              title="Send message"
              className="p-2 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>
    </aside>
  );
}
