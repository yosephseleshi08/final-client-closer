import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Helper to extract clean name from URL/handle
function extractNameFromHandle(handleOrUrl: string): string {
  const clean = handleOrUrl
    .replace(/https?:\/\/(www\.)?(instagram|facebook|fb)\.com\//i, '')
    .replace(/[\/?#].*$/, '')
    .replace(/[^a-zA-Z0-9_\-.]/g, '')
    .replace(/^[_\-.]+|[_\-.]+$/g, '');

  if (!clean) return 'Artisan Restaurant';

  return clean
    .split(/[_\-.]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// 1. Instagram Lead Extractor (Pure Heuristic / Regex, No LLM)
app.post('/api/instagram/extract', async (req: Request, res: Response) => {
  const { url = '', rawBioText = '' } = req.body || {};
  const handleMatch = url.match(/(?:instagram\.com\/)([\w._]+)/i);
  const handle = handleMatch ? `@${handleMatch[1].replace(/\/$/, '')}` : '@localbusiness';
  const inferredName = extractNameFromHandle(url || handle);

  // Pure Deterministic Manual Extractor
  return res.json({
    restaurantName: inferredName,
    contactName: 'Owner / GM',
    category: 'italian',
    city: 'Local Area',
    handle,
    phone: '',
    email: '',
    detectedBio: rawBioText || 'Local culinary establishment focused on hospitality and dining experiences.',
    frictionPoints: [
      'Bio links to PDF menu causing mobile dropoff',
      'Missing 0-commission direct reservation engine',
      'Losing 30% margin to third-party delivery aggregators',
    ],
    auditChecklist: [true, true, true],
    notes: 'Profile demonstrates strong foot-traffic potential. Ideal candidate for the $299 high-velocity conversion mockup.',
    mockupLink: `https://demo.closer.app/${handle.replace('@', '') || 'showcase'}`,
    estimatedDealValue: 299,
    pitchHook: `Hey! Built a 0.3s mobile ordering & reservation prototype for ${inferredName} that saves 30% aggregator commissions.`,
    source: 'preset',
  });
});

// 2. Facebook Profile Extractor (Pure Deterministic, No LLM)
app.post('/api/facebook/extract', async (req: Request, res: Response) => {
  const { url = '', rawText = '' } = req.body || {};
  let restaurantName = extractNameFromHandle(url);

  if (rawText && rawText.trim().length > 0) {
    const firstLine = rawText.trim().split('\n')[0].trim();
    if (firstLine.length > 1 && firstLine.length < 60) {
      restaurantName = firstLine;
    }
  }

  return res.json({ restaurantName });
});

// 3. Preset Pitch Provider (Pure Template, No LLM)
app.post('/api/gemini/pitch', async (req: Request, res: Response) => {
  const {
    leadName = 'The Restaurant',
    ownerName = '',
    followupCount = 0,
    mockupUrl = '',
  } = req.body || {};

  const recipient = ownerName ? `Hey ${ownerName}` : 'Hey there';
  let defaultPitch = `${recipient}, love what you're doing at ${leadName}! I put together a quick 0.3s interactive mobile reservation prototype: ${mockupUrl || 'https://demo.closer.app'} - wanted to see if you'd like the direct link to check it out? (Zero commitment, $299 turnkey if you ever want it live).`;

  if (followupCount > 0) {
    defaultPitch = `${recipient}, bumping this quick! Wondering if you had 30 seconds to click through the interactive demo I put together for ${leadName}: ${mockupUrl || 'https://demo.closer.app'}. No pressure at all!`;
  }

  return res.json({
    pitch: defaultPitch,
    source: 'preset',
  });
});

// 3.5. 3-Step Sequence Preset Provider (Pure Template, No LLM)
app.post('/api/gemini/sequence', async (req: Request, res: Response) => {
  const {
    leadName = 'The Prospect',
    ownerName = '',
  } = req.body || {};

  const recipient = ownerName ? ownerName.trim() : leadName.trim();
  const initial = `Hey ${recipient}! Love what you're doing. Built a 0.3s interactive prototype specifically for ${leadName}: mind if I share the 20-second preview? (Zero commitment, $299 turnkey if you ever want it live).`;
  const followup3 = `Hey ${recipient}, bumping this quick! Wondering if you had 30 seconds to click through the interactive demo I put together for ${leadName}? No pressure at all!`;
  const followup7 = `Hey ${recipient}, wanted to send one final quick note! Recorded a 45-second screen recording showing how the direct booking upgrade works for ${leadName}. Should I drop the link here or leave you be?`;

  return res.json({
    initialDM: initial,
    followup3DM: followup3,
    followup7DM: followup7,
    source: 'preset',
  });
});

// 4. Objection Buster Preset Provider (Pure Template, No LLM)
app.post('/api/gemini/objection', async (req: Request, res: Response) => {
  const { leadName = 'The Restaurant' } = req.body || {};

  return res.json({
    reframe: 'Reframe to immediate weekend booking revenue and zero owner workload.',
    response: `I hear you completely. Our entire system for ${leadName} is fully managed and designed to bring in 5-10 extra covers this weekend without taking any of your time.`,
    closeQuestion: 'Would you be open to taking 60 seconds to see the interactive preview before deciding?',
    source: 'preset',
  });
});

// Vite or Static handling
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // Serve dist assets or service worker if requested by cached browser clients
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use('/assets', express.static(path.resolve(distPath, 'assets')));
      app.get(['/registerSW.js', '/sw.js', '/manifest.webmanifest', '/workbox-*.js'], (req: Request, res: Response, next) => {
        const filePath = path.resolve(distPath, req.path.replace(/^\//, ''));
        if (fs.existsSync(filePath)) {
          return res.sendFile(filePath);
        }
        next();
      });
    }

    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback for HTML pages transformed with Vite in dev
    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      try {
        const templatePath = path.resolve(__dirname, 'index.html');
        if (fs.existsSync(templatePath)) {
          let template = fs.readFileSync(templatePath, 'utf-8');
          template = await vite.transformIndexHtml(url, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          return;
        }
        next();
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';
  app.listen(PORT, HOST, () => {
    console.log(`Outreach Engine Pro running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
