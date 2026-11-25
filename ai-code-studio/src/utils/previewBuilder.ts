import type { CodeFiles } from '../types/studio';

export const SANDBOX_MESSAGE_SOURCE = 'ai-code-studio-sandbox';

export function buildSandboxedSrcDoc(code: CodeFiles, runId: string): string {
  // Prevent premature closing of <script> tags inside user JS
  const safeJs = (code.js || '').replace(/<\/script>/gi, '<\\/script>');
  // Prevent premature closing of <style> tags inside user CSS
  const safeCss = (code.css || '').replace(/<\/style>/gi, '<\\/style>');

  const bridgeScript = `
    (function() {
      var RUN_ID = ${JSON.stringify(runId)};
      var SOURCE = ${JSON.stringify(SANDBOX_MESSAGE_SOURCE)};

      function formatArg(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.name + ': ' + arg.message;
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }

      function emit(level, args) {
        try {
          var message = Array.prototype.slice.call(args).map(formatArg).join(' ');
          window.parent.postMessage({
            source: SOURCE,
            runId: RUN_ID,
            level: level,
            message: message,
            timestamp: Date.now()
          }, '*');
        } catch (err) {
          // Ignore postMessage failures
        }
      }

      ['log', 'info', 'warn', 'error'].forEach(function(level) {
        var original = console[level];
        console[level] = function() {
          emit(level, arguments);
          if (original) {
            return original.apply(console, arguments);
          }
        };
      });

      window.addEventListener('error', function(event) {
        var loc = event.lineno ? ' (line ' + event.lineno + ')' : '';
        emit('error', [ (event.message || 'Runtime error') + loc ]);
      });

      window.addEventListener('unhandledrejection', function(event) {
        var reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
        emit('error', ['Unhandled Promise Rejection: ' + reason]);
      });
    })();
  `;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${safeCss}</style>
    <script>${bridgeScript}</script>
  </head>
  <body>
    ${code.html || ''}
    <script>
      try {
        ${safeJs}
      } catch (err) {
        console.error(err instanceof Error ? err.name + ': ' + err.message : String(err));
      }
    </script>
  </body>
</html>`;
}
