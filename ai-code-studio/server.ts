import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface IncomingCode {
  html?: string;
  css?: string;
  js?: string;
}

interface IncomingConsoleLog {
  level: string;
  message: string;
}

interface ChatRequestBody {
  messages?: IncomingMessage[];
  code?: IncomingCode;
  consoleLogs?: IncomingConsoleLog[];
  projectName?: string;
  mode?: 'chat' | '3d-generator';
}

function createAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(
  code: IncomingCode,
  consoleLogs: IncomingConsoleLog[],
  projectName?: string,
  mode: 'chat' | '3d-generator' = 'chat'
): string {
  const html = (code.html ?? '').slice(0, 24000);
  const css = (code.css ?? '').slice(0, 24000);
  const js = (code.js ?? '').slice(0, 24000);

  const recentLogs = consoleLogs
    .slice(-15)
    .map((entry) => `[${entry.level.toUpperCase()}] ${entry.message}`)
    .join('\n');

  const threeDInstructions =
    mode === '3d-generator'
      ? [
          '',
          '=== 3D MODEL GENERATOR MODE (ACTIVE) ===',
          'The user is providing a topic/subject and wants you to IMMEDIATELY generate a complete, working, interactive 3D model of that topic using Three.js so it renders live in the preview.',
          'Follow these strict rules:',
          '1. Reply in the SAME language the user wrote in (e.g., Kazakh, Russian, or English).',
          '2. Do NOT ask further clarifying questions before coding — immediately generate all three complete runnable code blocks: ```html, ```css, and ```javascript.',
          '3. In the ```html block, include a container (<div id="scene-container"></div>), a minimal glassmorphic HUD showing the topic title and drag/zoom hint, and these exact script tags BEFORE user JS runs:',
          '   <script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>',
          '   <script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>',
          '4. In the ```css block, style html, body, and #scene-container to fill 100% viewport (margin: 0; overflow: hidden) with a dark atmospheric background and clean HUD styling (pointer-events: none).',
          '5. In the ```javascript block:',
          '   - Use global THREE and THREE.OrbitControls (NEVER use ES module `import` statements).',
          '   - Build a detailed, recognizable, multi-part 3D model of the user topic using THREE.Group and 8-25+ composed geometries (SphereGeometry, BoxGeometry, CylinderGeometry, ConeGeometry, TorusGeometry, etc.) with well-proportioned coordinates and distinct MeshStandardMaterial colors/roughness/metalness.',
          '   - Include proper lighting (AmbientLight, HemisphereLight, DirectionalLight) and a subtle ground/pedestal or starfield when fitting.',
          '   - Configure THREE.OrbitControls(camera, renderer.domElement) with enableDamping = true so the user can rotate and zoom smoothly.',
          '   - Include a requestAnimationFrame loop with gentle idle motion and a window resize listener.',
          '   - Write 100% complete, bug-free runnable code with no TODOs or placeholders.',
        ]
      : [];

  return [
    'You are the integrated AI coding assistant inside AI Code Studio, a browser-based HTML, CSS, and JavaScript code playground.',
    'Your role is to help developers write, understand, debug, and improve their web projects.',
    'Always reply in the same language as the user (Kazakh, Russian, English, etc.).',
    '',
    'Capabilities & Response Guidelines:',
    '- Answer programming questions clearly with concise, accurate explanations.',
    '- Explain HTML, CSS, and JavaScript behavior directly referencing the user code below.',
    '- Identify syntax errors, runtime exceptions, layout issues, or accessibility problems.',
    '- Suggest concrete improvements for clean code, responsiveness, performance, and visual polish.',
    '- When providing code that can be applied directly to one of the editor tabs, use standard Markdown fenced blocks labeled strictly with ```html, ```css, or ```javascript (complete runnable snippets for that tab work best).',
    '- Be direct and practical. Do not invent fake APIs or claim code was executed unless shown in the console output below.',
    ...threeDInstructions,
    '',
    `Current Project Name: ${projectName || 'Untitled Project'}`,
    '',
    '=== CURRENT HTML ===',
    html || '<!-- empty -->',
    '',
    '=== CURRENT CSS ===',
    css || '/* empty */',
    '',
    '=== CURRENT JAVASCRIPT ===',
    js || '// empty',
    '',
    recentLogs
      ? `=== RECENT SANDBOX CONSOLE OUTPUT ===\n${recentLogs}`
      : '=== RECENT SANDBOX CONSOLE OUTPUT ===\nNo console output recorded.',
  ].join('\n');
}

function extractReadableError(err: unknown): { status: number; message: string } {
  if (err && typeof err === 'object') {
    const record = err as Record<string, unknown>;
    const status = typeof record.status === 'number' ? record.status : 500;
    const rawMsg =
      typeof record.message === 'string'
        ? record.message
        : 'Failed to generate a response from the AI service.';

    if (status === 400 || rawMsg.includes('API_KEY_INVALID')) {
      return {
        status: 400,
        message: 'Invalid API key configuration. Please verify GEMINI_API_KEY in Settings > Secrets.',
      };
    }
    if (status === 403 || rawMsg.includes('PERMISSION_DENIED')) {
      return {
        status: 403,
        message: 'Permission denied by the AI service. Please verify your API key in Settings > Secrets.',
      };
    }
    if (status === 429 || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      return {
        status: 429,
        message: 'Rate limit reached. Please wait a moment and try again.',
      };
    }
    return { status, message: rawMsg };
  }
  return { status: 500, message: 'Unexpected server error while contacting AI service.' };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'ai-code-studio' });
  });

  app.post('/api/ai/chat', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as ChatRequestBody;
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const code = body.code && typeof body.code === 'object' ? body.code : {};
    const consoleLogs = Array.isArray(body.consoleLogs) ? body.consoleLogs : [];

    if (messages.length === 0) {
      res.status(400).json({ error: 'At least one message is required.' });
      return;
    }

    const sanitizedMessages = messages
      .filter(
        (m): m is IncomingMessage =>
          Boolean(m) &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim().length > 0
      )
      .slice(-20);

    if (sanitizedMessages.length === 0) {
      res.status(400).json({ error: 'Message content cannot be empty.' });
      return;
    }

    const ai = createAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'AI Assistant is not configured. Please add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const mode = body.mode === '3d-generator' ? '3d-generator' : 'chat';
    const systemInstruction = buildSystemInstruction(code, consoleLogs, body.projectName, mode);
    const contents = sanitizedMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    try {
      const stream = await ai.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.LOW,
          },
        },
      });

      for await (const chunk of stream) {
        if (closed) break;
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }

      if (!closed) {
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } catch (err) {
      const { message } = extractReadableError(err);
      if (!closed) {
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  const distDir = path.resolve(__dirname, 'dist');

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`AI Code Studio server listening on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start AI Code Studio server:', err);
  process.exit(1);
});
