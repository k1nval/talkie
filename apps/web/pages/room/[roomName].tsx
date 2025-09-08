import {
  ControlBar,
  CarouselLayout,
  FocusLayout,
  FocusLayoutContainer,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function RoomPage() {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const router = useRouter();
  const { roomName } = router.query;

  useEffect(() => {
    if (!roomName) return;

    const joinRoom = async () => {
      const resp = await fetch(process.env.NEXT_PUBLIC_API_URL + `/rooms/${roomName}/join`, {
        method: 'POST',
      });

      if (!resp.ok) {
        const error = await resp.json();
        alert(`Failed to join room: ${error.error}`);
        router.push('/');
        return;
      }

      const data = await resp.json();
      setToken(data.token);
      setWsUrl(data.wsUrl);
    };

    joinRoom();
  }, [roomName, router]);

  const onDisconnected = () => {
    router.push('/');
  };

  if (!token || !wsUrl) {
    return <div>Loading...</div>;
  }

  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token}
      connect
      video={true}
      audio={true}
      onDisconnected={onDisconnected}
      data-lk-theme="default"
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
    >
      <LayoutContextProvider>
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
    </LiveKitRoom>
  );
}

function MyVideoConference() {
  const tracks = useTracks([{ source: Track.Source.Camera }]);
  const otherTracks = tracks.filter((track) => !track.participant.isLocal);
  if (tracks.length === 0) {
    return null;
  }
  return (
    <FocusLayoutContainer>
      <CarouselLayout tracks={tracks}>
        <ParticipantTile />
      </CarouselLayout>
      {otherTracks.length > 0 && <FocusLayout trackRef={otherTracks[0]} key={otherTracks[0].participant.identity} />}
    </FocusLayoutContainer>
  );
}
