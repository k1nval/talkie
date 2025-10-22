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
import type { TrackReference } from '@livekit/components-core';
import type { Participant } from 'livekit-client';
import { LocalAudioTrack, Track } from 'livekit-client';
import { useRouter } from 'next/router';
import {
  ChangeEvent,
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GainAudioProcessor } from '../../lib/audio/GainAudioProcessor';
import { useRemoteParticipantAudio } from '../../lib/audio/useRemoteParticipantAudio';

type RoomType = 'Video' | 'Audio';

// Inline style map keeps the layout definitions close to the component logic.
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
  // Pull in every camera track so we can choose who to spotlight.
  const allTracks = useTracks([{ source: Track.Source.Camera }]);

  if (allTracks.length === 0) {
    return <div>Совсем никого нет</div>;
  }

  const localTrack = allTracks.find((track) => track.participant.isLocal);
  const remoteTracks = allTracks.filter((track) => !track.participant.isLocal);

  // Prefer the pinned track, otherwise show a remote participant, or fall back to ourselves.
  const focusedTrack = pinnedTrack ?? remoteTracks[0] ?? localTrack;

  // Anything not currently focused still shows up in the carousel.
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

interface AudioRoomHeaderProps {
  roomName: string;
  participantName: string | null;
  participantCount: number;
}

/**
 * Presents the room title and attendance stats so the main layout stays tidy.
 */
function AudioRoomHeader({ roomName, participantName, participantCount }: AudioRoomHeaderProps) {
  return (
    <header className="space-y-1">
      <h2 className="text-2xl font-semibold">Комната: {roomName}</h2>
      {participantName && <p className="text-sm text-gray-300">Вы вошли как {participantName}</p>}
      <p className="text-sm text-gray-400">Участников: {participantCount}</p>
    </header>
  );
}

interface ParticipantListProps {
  participants: Participant[];
  volumes: Record<string, number>;
  onVolumeChange: (identity: string, volume: number) => void;
}

/**
 * Renders every attendee with optional per-participant gain sliders for remote voices.
 */
function ParticipantList({ participants, volumes, onVolumeChange }: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-3">Участники</h3>
        <p className="text-sm text-gray-400">Пока никого нет</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4">
      <h3 className="text-lg font-semibold mb-3">Участники</h3>
      <ul className="space-y-2">
        {participants.map((participant) => (
          <ParticipantRow
            key={participant.identity}
            participant={participant}
            volume={volumes[participant.identity] ?? 1}
            onVolumeChange={onVolumeChange}
          />
        ))}
      </ul>
    </div>
  );
}

interface ParticipantRowProps {
  participant: Participant;
  volume: number;
  onVolumeChange: (identity: string, volume: number) => void;
}

/**
 * Keeps the participant card compact while exposing a gain slider for remote voices.
 */
function ParticipantRow({ participant, volume, onVolumeChange }: ParticipantRowProps) {
  const displayName = participant.name ?? participant.identity;
  const isLocal = participant.isLocal;

  return (
    <li
      className={`flex flex-col gap-3 rounded-lg px-3 py-2 transition-colors sm:flex-row sm:items-center sm:justify-between ${
        participant.isSpeaking ? 'bg-blue-600/40' : 'bg-gray-900/60'
      }`}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <span className="font-medium">
          {displayName}
          {isLocal ? ' (Вы)' : ''}
        </span>
        {participant.isSpeaking && (
          <span className="text-xs uppercase tracking-wider text-blue-200">Говорит</span>
        )}
      </div>
      {!isLocal && (
        <ParticipantVolumeSlider
          identity={participant.identity}
          volume={volume}
          onVolumeChange={onVolumeChange}
        />
      )}
    </li>
  );
}

interface ParticipantVolumeSliderProps {
  identity: string;
  volume: number;
  onVolumeChange: (identity: string, volume: number) => void;
}

/**
 * Slider component that reports gain changes back to the mixer hook.
 */
function ParticipantVolumeSlider({ identity, volume, onVolumeChange }: ParticipantVolumeSliderProps) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onVolumeChange(identity, Number(event.target.value));
    },
    [identity, onVolumeChange],
  );

  return (
    <div className="flex w-full items-center gap-3 sm:w-64">
      <label className="text-xs font-medium text-gray-400" htmlFor={`volume-${identity}`}>
        {Math.round(volume * 100)}%
      </label>
      <input
        id={`volume-${identity}`}
        type="range"
        min={0}
        max={2}
        step={0.05}
        value={volume}
        onChange={handleChange}
        className="flex-1 accent-blue-500"
        aria-label="Громкость участника"
      />
    </div>
  );
}

interface AudioSettingsPanelProps {
  inputVolume: number;
  onInputVolumeChange: (value: number) => void;
  noiseCancellationEnabled: boolean;
  onNoiseCancellationToggle: (enabled: boolean) => void;
  devices: MediaDeviceInfo[];
  canChangeDevice: boolean;
  currentDeviceId: string;
  onDeviceChange: (deviceId: string) => void;
}

/**
 * Groups microphone controls so the audio room stays approachable for new users.
 */
function AudioSettingsPanel({
  inputVolume,
  onInputVolumeChange,
  noiseCancellationEnabled,
  onNoiseCancellationToggle,
  devices,
  canChangeDevice,
  currentDeviceId,
  onDeviceChange,
}: AudioSettingsPanelProps) {
  const handleVolumeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onInputVolumeChange(Number(event.target.value));
    },
    [onInputVolumeChange],
  );

  const handleNoiseChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onNoiseCancellationToggle(event.target.checked);
    },
    [onNoiseCancellationToggle],
  );

  const handleDeviceChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onDeviceChange(event.target.value);
    },
    [onDeviceChange],
  );

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Шумоподавление</h3>
          <p className="text-xs text-gray-400">Использует встроенную фильтрацию браузера.</p>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only"
            checked={noiseCancellationEnabled}
            onChange={handleNoiseChange}
          />
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              noiseCancellationEnabled ? 'bg-blue-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                noiseCancellationEnabled ? 'translate-x-5' : 'translate-x-1'
              }`}
            />
          </span>
        </label>
      </div>
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
  );
}

interface AudioRoomViewProps {
  roomName: string;
  participantName: string | null;
  noiseCancellationEnabled: boolean;
  onNoiseCancellationToggle: (enabled: boolean) => void;
}

function AudioRoomView({
  roomName,
  participantName,
  noiseCancellationEnabled,
  onNoiseCancellationToggle,
}: AudioRoomViewProps) {
  const participants = useParticipants();
  const { microphoneTrack } = useLocalParticipant();
  // LiveKit hook gives us the available audio input devices and lets us switch between them.
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind: 'audioinput' });
  const microphoneTracks = useTracks([{ source: Track.Source.Microphone }]);
  const remoteMicrophoneTracks = useMemo(
    () => microphoneTracks.filter((trackRef) => !trackRef.participant.isLocal),
    [microphoneTracks],
  );
  const { volumes: playbackVolumes, setVolume: setParticipantPlaybackVolume } = useRemoteParticipantAudio(
    remoteMicrophoneTracks,
  );
  const [inputVolume, setInputVolume] = useState(1);
  const volumeRef = useRef(inputVolume);
  const processorRef = useRef<GainAudioProcessor | null>(null);
  const appliedTrackRef = useRef<LocalAudioTrack | null>(null);
  const noiseCancellationTrackRef = useRef<LocalAudioTrack | null>(null);
  const appliedNoiseCancellationRef = useRef<boolean | null>(null);

  // Whenever the slider moves we update the processor immediately.
  useEffect(() => {
    volumeRef.current = inputVolume;
    processorRef.current?.setGain(inputVolume);
  }, [inputVolume]);

  // Attach (or reattach) our custom GainAudioProcessor to the current microphone track.
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

  // Restart the browser's capture pipeline if the noise cancellation toggle changes.
  useEffect(() => {
    const track = (microphoneTrack?.track as LocalAudioTrack) ?? null;

    if (noiseCancellationTrackRef.current !== track) {
      noiseCancellationTrackRef.current = track;
      appliedNoiseCancellationRef.current = null;
    }

    if (!track) {
      return;
    }

    if (appliedNoiseCancellationRef.current === noiseCancellationEnabled) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await track.restartTrack({
          noiseSuppression: noiseCancellationEnabled,
          autoGainControl: noiseCancellationEnabled,
          echoCancellation: true,
        });
        if (!cancelled) {
          appliedNoiseCancellationRef.current = noiseCancellationEnabled;
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to update noise cancellation', error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [microphoneTrack?.track, noiseCancellationEnabled]);

  const sortedParticipants = useMemo(() => {
    // Keep the local user at the top and the rest sorted alphabetically for readability.
    return [...participants].sort((a, b) => {
      if (a.isLocal === b.isLocal) {
        return a.identity.localeCompare(b.identity);
      }
      return a.isLocal ? -1 : 1;
    });
  }, [participants]);

  const currentDeviceId = activeDeviceId && activeDeviceId !== '' ? activeDeviceId : 'default';
  const canChangeDevice = devices.length > 0;

  const handleDeviceChange = useCallback(
    async (deviceId: string) => {
      try {
        await setActiveMediaDevice(deviceId);
      } catch (error) {
        console.error('Failed to switch audio input device', error);
      }
    },
    [setActiveMediaDevice],
  );

  const handleInputVolumeChange = useCallback((value: number) => {
    setInputVolume(value);
  }, []);

  const handleNoiseCancellationChange = useCallback(
    (enabled: boolean) => {
      onNoiseCancellationToggle(enabled);
    },
    [onNoiseCancellationToggle],
  );

  const handleParticipantVolumeChange = useCallback(
    (identity: string, value: number) => {
      setParticipantPlaybackVolume(identity, value);
    },
    [setParticipantPlaybackVolume],
  );

  const participantCount = participants.length;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-gray-900 text-white p-6 overflow-y-auto w-full">
      <div className="w-full max-w-3xl flex flex-col gap-6">
        <AudioRoomHeader
          roomName={roomName}
          participantName={participantName}
          participantCount={participantCount}
        />
        <ParticipantList
          participants={sortedParticipants}
          volumes={playbackVolumes}
          onVolumeChange={handleParticipantVolumeChange}
        />
        <AudioSettingsPanel
          inputVolume={inputVolume}
          onInputVolumeChange={handleInputVolumeChange}
          noiseCancellationEnabled={noiseCancellationEnabled}
          onNoiseCancellationToggle={handleNoiseCancellationChange}
          devices={devices}
          canChangeDevice={canChangeDevice}
          currentDeviceId={currentDeviceId}
          onDeviceChange={handleDeviceChange}
        />
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
  const [noiseCancellationEnabled, setNoiseCancellationEnabled] = useState(true);
  const router = useRouter();
  const { roomName } = router.query;

  const normalizedRoomName = typeof roomName === 'string' ? roomName : roomName?.[0];

  // Memoize the capture options so the LiveKitRoom only reconnects when settings change.
  const audioCaptureOptions = useMemo(
    () => ({
      noiseSuppression: noiseCancellationEnabled,
      autoGainControl: noiseCancellationEnabled,
      echoCancellation: true,
    }),
    [noiseCancellationEnabled],
  );

  useEffect(() => {
    if (!normalizedRoomName) return;

    // Grab a LiveKit access token for this room and remember the type so we render the right UI.
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
      // Passing an object here lets us enable or disable browser noise suppression.
      audio={audioCaptureOptions}
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
                screenShare: false, // Screen share is off to keep the layout simple for now.
                chat: false, // Chat is disabled until we build a dedicated experience.
                leave: true,
              }}
            />
          </div>
        </LayoutContextProvider>
      ) : (
        <AudioRoomView
          roomName={normalizedRoomName}
          participantName={participantName}
          noiseCancellationEnabled={noiseCancellationEnabled}
          onNoiseCancellationToggle={(enabled) => setNoiseCancellationEnabled(enabled)}
        />
      )}
      {roomType === 'Video' ? <RoomAudioRenderer /> : null}
    </LiveKitRoom>
  );
}
