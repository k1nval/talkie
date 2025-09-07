import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { AccessToken } from '@livekit/server-sdk';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_WS_URL = process.env.LIVEKIT_WS_URL; // e.g., wss://livekit.example.com

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_WS_URL) {
  console.error('Missing LIVEKIT env vars. Please set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_WS_URL');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

const TokenRequestSchema = z.object({
  room: z.string().min(1),
  name: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
  ttlSeconds: z.number().int().positive().max(3600).optional(),
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/token', async (req, res) => {
  const parse = TokenRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }
  const { room, name, metadata, ttlSeconds } = parse.data;

  try {
    const at = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
      identity: name,
      ttl: ttlSeconds ?? 600,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    res.json({ token, wsUrl: LIVEKIT_WS_URL });
  } catch (e) {
    console.error('Error creating token', e);
    res.status(500).json({ error: 'Failed to create token' });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
