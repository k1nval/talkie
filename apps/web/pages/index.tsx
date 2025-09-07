import { useCallback, useEffect, useMemo, useState } from 'react';
import { LiveKitRoom, GridLayout, ParticipantTile, RoomAudioRenderer, useTracks } from '@livekit/components-react';
import { Track } from 'livekit-client';

export default function Home() {
  const [room, setRoom] = useState('talkie-demo');
  const [name, setName] = useState('guest-' + Math.floor(Math.random() * 1000));
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  const handleJoin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const resp = await fetch(process.env.NEXT_PUBLIC_API_URL + '/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, name }),
    });
    if (!resp.ok) {
      alert('Failed to get token');
      return;
    }
    const data = await resp.json();
    setToken(data.token);
    setWsUrl(data.wsUrl);
  }, [room, name]);

  const onDisconnected = useCallback(() => {
    setToken(null);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      {!token || !wsUrl ? (
        <form onSubmit={handleJoin} style={{ display: 'grid', gap: 8, maxWidth: 360 }}>
          <h1>Talkie</h1>
          <label>
            Room
            <input value={room} onChange={(e) => setRoom(e.target.value)} required />
          </label>
          <label>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <button type="submit">Join</button>
          <p style={{ fontSize: 12, opacity: 0.7 }}>Set NEXT_PUBLIC_API_URL in web env.</p>
        </form>
      ) : (
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          connect
          video={true}
          audio={true}
          onDisconnected={onDisconnected}
          data-lk-theme="default"
          style={{ height: '100vh' }}
        >
          <RoomAudioRenderer />
          <MyVideoConference />
        </LiveKitRoom>
      )}
    </div>
  );
}

function MyVideoConference() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  return (
    <GridLayout tracks={tracks} />
  );
}
