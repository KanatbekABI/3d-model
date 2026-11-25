import { useEffect, useRef, useState } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { Check, Copy, Maximize2, Minimize2 } from 'lucide-react';
import type { EditorLanguage } from '../types/studio';

interface CodeEditorProps {
  language: EditorLanguage;
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
  onRun?: () => void;
  onSave?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  hideHeader?: boolean;
}

const studioEditorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: '#0b0d16',
      color: '#e2e8f0',
    },
    '.cm-gutters': {
      backgroundColor: '#0b0d16',
      color: '#475569',
      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      paddingRight: '6px',
      userSelect: 'none',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(99, 102, 241, 0.08)',
      color: '#a5b4fc',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(99, 102, 241, 0.05)',
    },
    '.cm-cursor': {
      borderLeftColor: '#818cf8',
      borderLeftWidth: '2px',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(99, 102, 241, 0.28)',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
    },
    '.cm-content': {
      padding: '12px 0',
      caretColor: '#818cf8',
    },
  },
  { dark: true }
);

function getLanguageExtension(lang: EditorLanguage) {
  switch (lang) {
    case 'html':
      return html({ autoCloseTags: true, matchClosingTags: true });
    case 'css':
      return css();
    case 'js':
      return javascript();
  }
}

const LANGUAGE_ACCENT: Record<EditorLanguage, string> = {
  html: 'text-orange-400',
  css: 'text-sky-400',
  js: 'text-amber-300',
};

export function CodeEditor({
  language,
  label,
  value,
  onChange,
  onRun,
  onSave,
  isExpanded = false,
  onToggleExpand,
  hideHeader = false,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const languageCompartment = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  const onSaveRef = useRef(onSave);
  const isExternalUpdateRef = useRef(false);

  const [copied, setCopied] = useState(false);

  onChangeRef.current = onChange;
  onRunRef.current = onRun;
  onSaveRef.current = onSave;

  useEffect(() => {
    if (!containerRef.current) return;

    const customShortcuts = keymap.of([
      {
        key: 'Mod-Enter',
        run: () => {
          onRunRef.current?.();
          return true;
        },
      },
      {
        key: 'Mod-s',
        run: () => {
          onSaveRef.current?.();
          return true;
        },
      },
    ]);

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        indentOnInput(),
        bracketMatching(),
        EditorView.lineWrapping,
        oneDark,
        studioEditorTheme,
        languageCompartment.current.of(getLanguageExtension(language)),
        customShortcuts,
        keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !isExternalUpdateRef.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Initialize editor once per mounted panel; updates handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconfigure language if tab switched on shared editor instance
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: languageCompartment.current.reconfigure(getLanguageExtension(language)),
    });
  }, [language]);

  // Sync external value changes (template switch, project restore, AI apply)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== value) {
      isExternalUpdateRef.current = true;
      view.dispatch({
        changes: {
          from: 0,
          to: currentDoc.length,
          insert: value,
        },
      });
      isExternalUpdateRef.current = false;
    }
  }, [value]);

  const lineCount = value ? value.split('\n').length : 1;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#0b0d16]">
      {!hideHeader && (
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/[0.07] bg-[#101320]/90 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`text-xs font-semibold tracking-wide ${LANGUAGE_ACCENT[language]}`}>
              {label}
            </span>
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              {lineCount} {lineCount === 1 ? 'line' : 'lines'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopy}
              title={`Copy ${label}`}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            {onToggleExpand && (
              <button
                type="button"
                onClick={onToggleExpand}
                title={isExpanded ? 'Restore pane size' : `Expand ${label}`}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className="cm-editor-wrapper flex-1 min-h-0 overflow-hidden"
        aria-label={`${label} code editor`}
      />
    </div>
  );
}
