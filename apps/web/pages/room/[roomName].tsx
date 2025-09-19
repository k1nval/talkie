import {
  ControlBar,
  CarouselLayout,
  FocusLayout,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useRouter } from 'next/router';
import { CSSProperties, useEffect, useState } from 'react';
import { TrackReference } from '@livekit/components-core';

const styles: Record<string, CSSProperties> = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  videoContainer: {
    minHeight: '0',
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  focusLayoutContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    minHeight: '0',
    maxHeight: '100%',
  },
  focusLayout: {
    padding: '1rem',
    height: '100%',
  },
  participantTile: {
    maxHeight: '200px',
    maxWidth: '200px',
  },
  controlBar: {
    padding: '1rem',
  },
};

interface MyVideoConferenceProps {
  pinnedTrack: TrackReference | null;
}

function MyVideoConference({ pinnedTrack }: MyVideoConferenceProps) {
  const allTracks = useTracks([{ source: Track.Source.Camera }]);

  if (allTracks.length === 0) {
    return <div>Совсем никого нет</div>;
  }

  const localTrack = allTracks.find((track) => track.participant.isLocal);
  const remoteTracks = allTracks.filter((track) => !track.participant.isLocal);

  const focusedTrack = pinnedTrack ?? remoteTracks[0] ?? localTrack;

  const carouselTracks = allTracks.filter(
    (track) => track.participant.identity !== focusedTrack?.participant.identity,
  );

  return (
    <div style={styles.videoContainer}>
      {focusedTrack && (
        <div style={styles.focusLayoutContainer}>
          <FocusLayout
            className="focused-video"
            trackRef={focusedTrack}
            key={focusedTrack.participant.identity}
            style={styles.focusLayout}
          />
        </div>
      )}
      {carouselTracks.length > 0 && (
        <CarouselLayout tracks={carouselTracks}>
          <ParticipantTile style={styles.participantTile} />
        </CarouselLayout>
      )}
    </div>
  );
}

export default function RoomPage() {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [pinnedTrack, setPinnedTrack] = useState<TrackReference | null>(null);
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
      connectOptions={{
        rtcConfig: {
          iceTransportPolicy: 'relay',
        }
      }}
      data-lk-theme="default"
      style={styles.container}
    >
      <LayoutContextProvider
        onPinChange={(state) => {
          if (state.length > 0) {
            setPinnedTrack(state[0]);
          } else {
            setPinnedTrack(null);
          }
        }}
      >
        <MyVideoConference pinnedTrack={pinnedTrack} />
        <div style={styles.controlBar}>
          <ControlBar
            controls={{
              microphone: true,
              camera: true,
              screenShare: false, // Disabling screen share for 1:1
              chat: false, // Disabling chat for now
              leave: true,
            }}
          />
        </div>
      </LayoutContextProvider>
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
