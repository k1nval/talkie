import { TrackReference } from '@livekit/components-core';
import { RemoteAudioTrack } from 'livekit-client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RemoteParticipantAudioMixer } from './RemoteParticipantAudioMixer';

interface RemoteParticipantAudioState {
  volumes: Record<string, number>;
  setVolume: (identity: string, volume: number) => void;
}

/**
 * Hook that keeps a RemoteParticipantAudioMixer in sync with the current remote tracks and exposes
 * a simple volume map that React components can render.
 */
export function useRemoteParticipantAudio(tracks: TrackReference[]): RemoteParticipantAudioState {
  const mixerRef = useRef<RemoteParticipantAudioMixer | null>(null);
  const volumeMemoryRef = useRef<Record<string, number>>({});
  const activeVolumesRef = useRef<Record<string, number>>({});
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  const mixer = useMemo(() => {
    if (!mixerRef.current) {
      mixerRef.current = new RemoteParticipantAudioMixer();
    }
    return mixerRef.current;
  }, []);

  useEffect(() => {
    const nextVolumes: Record<string, number> = {};
    const seenIdentities = new Set<string>();

    tracks.forEach((trackRef) => {
      if (trackRef.participant.isLocal) {
        return;
      }

      const identity = trackRef.participant.identity;
      const liveTrack = trackRef.publication?.track;
      const storedVolume = volumeMemoryRef.current[identity] ?? 1;

      seenIdentities.add(identity);
      volumeMemoryRef.current[identity] = storedVolume;
      nextVolumes[identity] = storedVolume;

      if (liveTrack instanceof RemoteAudioTrack) {
        mixer.connectTrack(identity, liveTrack, storedVolume);
      } else {
        if (mixer.hasParticipant(identity)) {
          mixer.disconnectParticipant(identity);
        }
      }
    });

    Object.keys(activeVolumesRef.current).forEach((identity) => {
      if (!seenIdentities.has(identity)) {
        mixer.disconnectParticipant(identity);
      }
    });

    const changed = hasVolumeChanges(activeVolumesRef.current, nextVolumes);

    if (changed) {
      activeVolumesRef.current = nextVolumes;
      setVolumes({ ...nextVolumes });
    }
  }, [mixer, tracks]);

  const setVolume = useCallback(
    (identity: string, volume: number) => {
      volumeMemoryRef.current = { ...volumeMemoryRef.current, [identity]: volume };
      activeVolumesRef.current = { ...activeVolumesRef.current, [identity]: volume };
      setVolumes({ ...activeVolumesRef.current });
      mixer.setVolume(identity, volume);
    },
    [mixer],
  );

  useEffect(() => {
    return () => {
      mixerRef.current?.destroy();
      mixerRef.current = null;
    };
  }, []);

  return { volumes, setVolume };
}

function hasVolumeChanges(
  prev: Record<string, number>,
  next: Record<string, number>,
): boolean {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);

  if (prevKeys.length !== nextKeys.length) {
    return true;
  }

  for (const key of nextKeys) {
    if (prev[key] !== next[key]) {
      return true;
    }
  }

  return false;
}
