import { RemoteAudioTrack } from 'livekit-client';

interface ParticipantNodes {
  track: RemoteAudioTrack;
  stream: MediaStream;
  source: MediaStreamAudioSourceNode;
  gainNode: GainNode;
}

/**
 * RemoteParticipantAudioMixer wires remote LiveKit audio tracks through a GainNode so we can
 * adjust per-participant playback levels without touching what other listeners hear.
 */
export class RemoteParticipantAudioMixer {
  private readonly audioContext: AudioContext;

  private readonly destination: AudioNode;

  private readonly participants = new Map<string, ParticipantNodes>();

  private readonly volumeMemory = new Map<string, number>();

  constructor() {
    this.audioContext = new AudioContext();
    this.destination = this.audioContext.destination;
  }

  /**
   * Attach a remote microphone track to the Web Audio graph and remember its preferred volume.
   */
  connectTrack(identity: string, track: RemoteAudioTrack, volume: number): void {
    const existing = this.participants.get(identity);

    if (existing?.track === track) {
      existing.gainNode.gain.value = volume;
      this.volumeMemory.set(identity, volume);
      return;
    }

    if (existing) {
      this.disconnectParticipant(identity);
    }

    const stream = new MediaStream([track.mediaStreamTrack]);
    const source = this.audioContext.createMediaStreamSource(stream);
    const gainNode = this.audioContext.createGain();

    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(this.destination);

    this.participants.set(identity, { track, stream, source, gainNode });
    this.volumeMemory.set(identity, volume);
    void this.resume();
  }

  /**
   * Update the stored gain value for a participant. This only affects the local mix.
   */
  setVolume(identity: string, volume: number): void {
    this.volumeMemory.set(identity, volume);
    const nodes = this.participants.get(identity);

    if (nodes) {
      nodes.gainNode.gain.value = volume;
    }
  }

  /**
   * Remove a participant from the graph when their track unsubscribes or they leave.
   */
  disconnectParticipant(identity: string): void {
    const nodes = this.participants.get(identity);

    if (!nodes) {
      return;
    }

    nodes.source.disconnect();
    nodes.gainNode.disconnect();
    this.participants.delete(identity);
  }

  /**
   * True when we currently mix audio for the given participant.
   */
  hasParticipant(identity: string): boolean {
    return this.participants.has(identity);
  }

  /**
   * Retrieve the last requested gain for a participant, defaulting to unity (1.0).
   */
  getVolume(identity: string): number {
    return this.volumeMemory.get(identity) ?? 1;
  }

  /**
   * Resume the audio context if the browser suspended it.
   */
  async resume(): Promise<void> {
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context', error);
      }
    }
  }

  /**
   * Tear down the graph so garbage collection can release the audio context.
   */
  destroy(): void {
    this.participants.forEach((nodes) => {
      nodes.source.disconnect();
      nodes.gainNode.disconnect();
    });
    this.participants.clear();
    void this.audioContext.close();
  }
}
