import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import { AccessToken, ParticipantInfo, RoomServiceClient } from 'livekit-server-sdk';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_WS_URL = process.env.LIVEKIT_WS_URL; // e.g., wss://livekit.example.com
const LIVEKIT_TALKIE_DOMAIN = process.env.LIVEKIT_TALKIE_DOMAIN;

const roomService = new RoomServiceClient(LIVEKIT_TALKIE_DOMAIN!, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

const rooms = ['Сюда иди'];
const names = [
  'Счастливый Барсук',
  'Мудрая Сова',
  'Веселый Лось',
  'Задумчивый Енот',
  'Добрый Медведь',
  'Хитрая Лиса',
  'Быстрый Заяц',
  'Важный Волк',
  'Игривый Бобер',
  'Спокойный Олень'
];

if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_WS_URL) {
  console.error('Missing LIVEKIT env vars. Please set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_WS_URL');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

const JoinRoomRequestSchema = z.object({
  metadata: z.record(z.string(), z.any()).optional(),
  ttlSeconds: z.number().int().positive().max(3600).optional(),
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/rooms', (_req, res) => {
  res.json({ rooms });
});

app.post('/rooms/:roomName/join', async (req, res) => {
  const { roomName } = req.params;
  if (!rooms.includes(roomName)) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const parse = JoinRoomRequestSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid payload', details: parse.error.flatten() });
  }
  const { metadata, ttlSeconds } = parse.data;
  const name = await getNextParticipantName(roomName);
  console.log(name);

  try {
    const at = new AccessToken(LIVEKIT_API_KEY!, LIVEKIT_API_SECRET!, {
      identity: name,
      ttl: ttlSeconds ?? 600,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();
    res.json({ token, wsUrl: LIVEKIT_WS_URL, name });
  } catch (e) {
    console.error('Error creating token', e);
    res.status(500).json({ error: 'Failed to create token' });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
async function getNextParticipantName(roomName: string) {
  const runningRooms = await roomService.listRooms([roomName]);

  let participantNames = new Array<string>();
  if (runningRooms.some((r) => r.name === roomName)) {
    participantNames = (await roomService.listParticipants(roomName)).map((p) => p.identity);
  }

  const availableNames = names.filter((n) => !participantNames.includes(n));

  return availableNames[Math.floor(Math.random() * availableNames.length)];
}
