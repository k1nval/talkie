import {
  ControlBar,
  CarouselLayout,
  FocusLayout,
  LayoutContextProvider,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useLocalParticipant,
  useMediaDeviceSelect,
  useParticipants,
  useTracks,
} from '@livekit/components-react';
import { LocalAudioTrack, Track } from 'livekit-client';
import { useRouter } from 'next/router';
import { ChangeEvent, CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { TrackReference } from '@livekit/components-core';
import { GainAudioProcessor } from '../../lib/audio/GainAudioProcessor';

type RoomType = 'Video' | 'Audio';

const styles: Record<string, CSSProperties> = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  audioContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
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

interface AudioRoomViewProps {
  roomName: string;
  participantName: string | null;
}

function AudioRoomView({ roomName, participantName }: AudioRoomViewProps) {
  const participants = useParticipants();
  const { microphoneTrack } = useLocalParticipant();
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind: 'audioinput' });
  const [inputVolume, setInputVolume] = useState(1);
  const volumeRef = useRef(inputVolume);
  const processorRef = useRef<GainAudioProcessor | null>(null);
  const appliedTrackRef = useRef<LocalAudioTrack | null>(null);

  useEffect(() => {
    volumeRef.current = inputVolume;
    processorRef.current?.setGain(inputVolume);
  }, [inputVolume]);

  useEffect(() => {
    const track = (microphoneTrack?.track as LocalAudioTrack) ?? null;

    if (!track) {
      appliedTrackRef.current = null;
      return;
    }

    const processor = processorRef.current ?? new GainAudioProcessor(volumeRef.current);
    processorRef.current = processor;
    let cancelled = false;

    (async () => {
      try {
        await track.setProcessor(processor);
        if (cancelled) {
          await track.stopProcessor().catch(() => undefined);
          return;
        }
        processor.setGain(volumeRef.current);
        appliedTrackRef.current = track;
      } catch (error) {
        console.error('Failed to apply input volume processor', error);
      }
    })();

    return () => {
      cancelled = true;
      if (appliedTrackRef.current === track) {
        track.stopProcessor().catch((error) => {
          console.warn('Failed to remove input processor', error);
        });
        appliedTrackRef.current = null;
      }
    };
  }, [microphoneTrack?.track]);

  const sortedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      if (a.isLocal === b.isLocal) {
        return a.identity.localeCompare(b.identity);
      }
      return a.isLocal ? -1 : 1;
    });
  }, [participants]);

  const currentDeviceId = activeDeviceId && activeDeviceId !== '' ? activeDeviceId : 'default';
  const canChangeDevice = devices.length > 0;

  const handleDeviceChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const deviceId = event.target.value;
    try {
      await setActiveMediaDevice(deviceId);
    } catch (error) {
      console.error('Failed to switch audio input device', error);
    }
  };

  const handleVolumeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputVolume(Number(event.target.value));
  };

  const participantCount = participants.length;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-gray-900 text-white p-6 overflow-y-auto w-full">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <header className="space-y-1">
          <h2 className="text-2xl font-semibold">Комната: {roomName}</h2>
          {participantName && <p className="text-sm text-gray-300">Вы вошли как {participantName}</p>}
          <p className="text-sm text-gray-400">Участников: {participantCount}</p>
        </header>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <h3 className="text-lg font-semibold mb-3">Участники</h3>
          {sortedParticipants.length > 0 ? (
            <ul className="space-y-2">
              {sortedParticipants.map((participant) => (
                <li
                  key={participant.identity}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                    participant.isSpeaking ? 'bg-blue-600/40' : 'bg-gray-900/60'
                  }`}
                >
                  <span className="font-medium">
                    {participant.name ?? participant.identity}
                    {participant.isLocal ? ' (Вы)' : ''}
                  </span>
                  {participant.isSpeaking && (
                    <span className="text-xs uppercase tracking-wider text-blue-200">Говорит</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Пока никого нет</p>
          )}
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-4">
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-200">
              <span>Громкость микрофона</span>
              <span>{Math.round(inputVolume * 100)}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={inputVolume}
              onChange={handleVolumeChange}
              className="mt-2 w-full accent-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-200" htmlFor="audio-input-select">
              Устройство ввода
            </label>
            <select
              id="audio-input-select"
              className="mt-2 w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={canChangeDevice ? currentDeviceId : ''}
              onChange={handleDeviceChange}
              disabled={!canChangeDevice}
            >
              {canChangeDevice ? (
                devices.map((device, index) => (
                  <option key={device.deviceId || device.label || index} value={device.deviceId || 'default'}>
                    {device.label || `Микрофон ${index + 1}`}
                  </option>
                ))
              ) : (
                <option value="">Нет доступных устройств</option>
              )}
            </select>
          </div>
        </div>
        <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
          <ControlBar
            controls={{ microphone: true, camera: false, screenShare: false, chat: false, leave: true }}
            variation="minimal"
          />
        </div>
      </div>
    </div>
  );
}

export default function RoomPage() {
  const [token, setToken] = useState<string | null>(null);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [pinnedTrack, setPinnedTrack] = useState<TrackReference | null>(null);
  const router = useRouter();
  const { roomName } = router.query;

  const normalizedRoomName = typeof roomName === 'string' ? roomName : roomName?.[0];

  useEffect(() => {
    if (!normalizedRoomName) return;

    const joinRoom = async () => {
      const resp = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/rooms/${encodeURIComponent(normalizedRoomName)}/join`,
        {
          method: 'POST',
        },
      );

      if (!resp.ok) {
        let errorMessage = 'Не удалось подключиться к комнате';
        try {
          const error = await resp.json();
          errorMessage = error.error ?? errorMessage;
        } catch (error) {
          console.error('Failed to parse join error', error);
        }
        alert(`Failed to join room: ${errorMessage}`);
        router.push('/');
        return;
      }

      const data = await resp.json();
      setToken(data.token);
      setWsUrl(data.wsUrl);
      setRoomType(data.type as RoomType);
      setParticipantName(data.name ?? null);
    };

    joinRoom();
  }, [normalizedRoomName, router]);

  const onDisconnected = () => {
    router.push('/');
  };

  if (!normalizedRoomName) {
    return <div>Loading...</div>;
  }

  if (!token || !wsUrl || !roomType) {
    return <div>Loading...</div>;
  }

  return (
    <LiveKitRoom
      serverUrl={wsUrl}
      token={token}
      connect
      video={roomType === 'Video'}
      audio={true}
      onDisconnected={onDisconnected}
      data-lk-theme="default"
      style={roomType === 'Video' ? styles.container : styles.audioContainer}
    >
      {roomType === 'Video' ? (
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
      ) : (
        <AudioRoomView roomName={normalizedRoomName} participantName={participantName} />
      )}
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
