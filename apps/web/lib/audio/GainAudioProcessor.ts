import type { AudioProcessorOptions, TrackProcessor, Track } from 'livekit-client';

export class GainAudioProcessor implements TrackProcessor<Track.Kind.Audio, AudioProcessorOptions> {
  name = 'gain-audio-processor';

  processedTrack?: MediaStreamTrack;
  private context?: AudioContext;
  private source?: MediaStreamAudioSourceNode;
  private destination?: MediaStreamAudioDestinationNode;
  private gainNode?: GainNode;
  private stream?: MediaStream;
  private gainValue: number;

  constructor(initialGain = 1) {
    this.gainValue = initialGain;
  }

  async init(options: AudioProcessorOptions) {
    this.context = options.audioContext;
    this.setupNodes(options.track);
  }

  async restart(options: AudioProcessorOptions) {
    this.teardown();
    this.context = options.audioContext;
    this.setupNodes(options.track);
  }

  async destroy() {
    this.teardown();
  }

  setGain(gain: number) {
    this.gainValue = gain;
    if (this.gainNode) {
      this.gainNode.gain.value = gain;
    }
  }

  private setupNodes(track: MediaStreamTrack) {
    if (!this.context) {
      return;
    }

    this.stream = new MediaStream([track]);
    this.source = this.context.createMediaStreamSource(this.stream);
    this.destination = this.context.createMediaStreamDestination();
    this.gainNode = this.context.createGain();
    this.gainNode.gain.value = this.gainValue;

    this.source.connect(this.gainNode).connect(this.destination);

    const [processedTrack] = this.destination.stream.getAudioTracks();
    if (processedTrack) {
      this.processedTrack = processedTrack;
    }
  }

  private teardown() {
    this.source?.disconnect();
    this.gainNode?.disconnect();
    this.destination?.disconnect();
    this.processedTrack?.stop();

    this.processedTrack = undefined;
    this.source = undefined;
    this.destination = undefined;
    this.stream = undefined;
  }
}
