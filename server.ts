import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const getGeminiClient = (): GoogleGenAI | null => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

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

// 1. Instagram Lead Extractor
app.post('/api/instagram/extract', async (req: Request, res: Response) => {
  const { url = '', rawBioText = '' } = req.body || {};
  const handleMatch = url.match(/(?:instagram\.com\/)([\w._]+)/i);
  const handle = handleMatch ? `@${handleMatch[1].replace(/\/$/, '')}` : '@localbusiness';
  const inferredName = extractNameFromHandle(url || handle);

  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `Analyze this restaurant / hospitality prospect Instagram profile:
URL: ${url}
Handle: ${handle}
User Bio / Context: ${rawBioText || 'N/A'}

Return a strictly valid JSON object (no markdown, no backticks, just raw JSON) with these fields:
{
  "restaurantName": "Clean Name of the Restaurant",
  "contactName": "Owner / GM",
  "category": "italian" | "sushi" | "steakhouse" | "cafe" | "cocktail_bar" | "medspa",
  "city": "City or Metro Area",
  "handle": "${handle}",
  "phone": "Phone if found or empty string",
  "email": "Email if found or empty string",
  "detectedBio": "Summary of bio",
  "frictionPoints": ["friction point 1", "friction point 2", "friction point 3"],
  "auditChecklist": [true, true, true],
  "notes": "Short analysis of website/menu opportunity",
  "mockupLink": "https://demo.closer.app/${handle.replace('@', '')}",
  "estimatedDealValue": 299,
  "pitchHook": "A compelling 1-2 sentence hook highlighting the $299 frictionless direct booking upgrade"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.json({
        ...parsed,
        source: 'gemini',
        model: 'gemini-2.5-flash',
      });
    } catch (err) {
      console.warn('Gemini extraction failed, using heuristic fallback:', err);
    }
  }

  // Heuristic Fallback
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

// 2. Facebook Profile Extractor
app.post('/api/facebook/extract', async (req: Request, res: Response) => {
  const { url = '', rawText = '' } = req.body || {};
  let restaurantName = extractNameFromHandle(url);

  if (rawText && rawText.trim().length > 0) {
    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `Extract the exact business/restaurant name from this text or Facebook URL:
URL: ${url}
Text: ${rawText}

Return only the business name as plain text.`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });
        const extracted = response.text?.trim();
        if (extracted && extracted.length > 1 && extracted.length < 60) {
          restaurantName = extracted;
        }
      } catch (_e) {
        // Fallback to heuristic
      }
    }
  }

  return res.json({ restaurantName });
});

// 3. Gemini Pitch Generator
app.post('/api/gemini/pitch', async (req: Request, res: Response) => {
  const {
    leadName = 'The Restaurant',
    ownerName = '',
    platform = 'instagram',
    followupCount = 0,
    mockupUrl = '',
    customNotes = '',
    pitchType = 'value_first',
  } = req.body || {};

  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `You are a high-velocity B2B sales closer specializing in selling custom restaurant websites & booking systems for a fixed $299 setup fee.
Generate a high-converting, concise outreach message for:
- Restaurant Name: ${leadName}
- Decision Maker: ${ownerName || 'Owner'}
- Platform: ${platform}
- Touchpoint: ${followupCount === 0 ? 'First touch initial DM' : `Follow-up #${followupCount}`}
- Mockup Preview URL: ${mockupUrl}
- Custom Notes: ${customNotes || 'N/A'}
- Desired Pitch Angle: ${pitchType}

Guidelines:
- Keep it punchy (under 60 words for DMs, under 100 words for Email).
- Emphasize the interactive mockup preview built specifically for them.
- Mention the low-friction $299 one-time offer.
- Clear, zero-pressure call to action (e.g., "mind if I drop the 20-second video preview here?").
- Return ONLY the final message copy. No greetings like "Here is your pitch:".`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const pitch = response.text?.trim();
      if (pitch) {
        return res.json({
          pitch,
          source: 'gemini',
          model: 'gemini-2.5-flash',
        });
      }
    } catch (err) {
      console.warn('Gemini pitch generation failed:', err);
    }
  }

  // Preset Template Fallback
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

// 4. Gemini Objection Buster
app.post('/api/gemini/objection', async (req: Request, res: Response) => {
  const { customQuery = '', leadName = 'The Restaurant', price = '$299' } = req.body || {};

  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `You are an elite B2B sales closer for restaurant website solutions priced at ${price}.
A prospect from "${leadName}" just gave this objection:
"${customQuery}"

Respond with a strictly valid JSON object (no markdown, no backticks, just raw JSON) containing:
{
  "reframe": "One sentence reframing the objection into an immediate revenue opportunity",
  "response": "A 2-sentence empathetic yet confident rebuttal resolving the concern",
  "closeQuestion": "A low-friction, high-converting closing question"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      return res.json({
        ...parsed,
        source: 'gemini',
      });
    } catch (err) {
      console.warn('Gemini objection resolution failed:', err);
    }
  }

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
