import { useCallback, useState } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  FocusLayout,
  ControlBar,
  LayoutContextProvider,
  FocusLayoutContainer,
  CarouselLayout,
  ParticipantTile,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

// Predefined list of rooms in Russian
const ROOMS = [
  'Комната Биккиняевы',
  'Комната Юновичи',
];

// Predefined list of funny Russian usernames
const USERNAMES = [
  'Хитрый Лис', 'Кудрявый Бобр', 'Веселый Енот', 'Задумчивый Барсук',
  'Быстрый Заяц', 'Смелый Волк', 'Мудрая Сова', 'Ловкая Белка',
  'Сонный Медведь', 'Колючий Еж', 'Пушистый Хомяк', 'Гордый Орел',
  'Поющий Соловей', 'Важный Пингвин', 'Осторожный Олень'
];

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);

  const handleJoin = useCallback(async (roomName: string) => {
    // Generate a random username from the predefined list
    const name = USERNAMES[Math.floor(Math.random() * USERNAMES.length)];

    const resp = await fetch(process.env.NEXT_PUBLIC_API_URL + '/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: roomName, name: name }),
    });

    if (!resp.ok) {
      const error = await resp.json();
      alert(`Failed to get token: ${error.error}`);
      return;
    }

    const data = await resp.json();
    setToken(data.token);
    setWsUrl(data.wsUrl);
  }, []);

  const onDisconnected = useCallback(() => {
    setToken(null);
  }, []);

  const renderLobby = () => (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center gap-6">
      <h1 className="text-4xl font-bold">Выберите комнату</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ROOMS.map((room) => (
          <button
            key={room}
            onClick={() => handleJoin(room)}
            style={{ height: '100px', width: '100%', margin: '10px' }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105"
          >
            {room}
          </button>
        ))}
      </div>
    </div>
  );

  const renderRoom = () => (
    <LiveKitRoom
      serverUrl={wsUrl!}
      token={token!}
      connect
      video={true}
      audio={true}
      onDisconnected={onDisconnected}
      data-lk-theme="default"
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* <div style={{ display: 'flex' }}> */}
      <LayoutContextProvider >
        <MyVideoConference />
        <ControlBar
          controls={{
            microphone: true,
            camera: true,
            screenShare: false, // Disabling screen share for 1:1
            chat: false, // Disabling chat for now
            leave: true,
          }}
        />
      </LayoutContextProvider>
      <RoomAudioRenderer />
      {/* </div> */}
    </LiveKitRoom>
  );

  return token && wsUrl ? renderRoom() : renderLobby();
}

function MyVideoConference() {
  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])
  const otherTracks = tracks.filter((track) => !track.participant.isLocal);
  if (tracks.length === 0) {
    return null;
  }
  return (
    <FocusLayoutContainer>
      <CarouselLayout tracks={tracks} >
        <ParticipantTile />
      </CarouselLayout>
      {otherTracks.length > 0 && (
        <FocusLayout trackRef={otherTracks[0]} />)}
    </FocusLayoutContainer>
  );
}
