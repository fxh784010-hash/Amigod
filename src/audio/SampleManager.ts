export type SampleType = 'idle' | 'low' | 'mid' | 'high' | 'exhaust' | 'intake' | 'turbo';

export interface SamplePack {
  idle: AudioBuffer | null;
  low: AudioBuffer | null;
  mid: AudioBuffer | null;
  high: AudioBuffer | null;
  exhaust: AudioBuffer | null;
  intake: AudioBuffer | null;
  turbo: AudioBuffer | null;
}

export class SampleManager {
  private ctx: AudioContext;
  private samples: SamplePack = {
    idle: null,
    low: null,
    mid: null,
    high: null,
    exhaust: null,
    intake: null,
    turbo: null
  };
  private sampleNames: Record<SampleType, string | null> = {
    idle: null,
    low: null,
    mid: null,
    high: null,
    exhaust: null,
    intake: null,
    turbo: null
  };

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  public async loadUserSample(type: SampleType, file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.samples[type] = audioBuffer;
    this.sampleNames[type] = file.name;
    return file.name;
  }

  public getSample(type: SampleType): AudioBuffer | null {
    return this.samples[type];
  }

  public getSampleName(type: SampleType): string | null {
    return this.sampleNames[type];
  }

  public hasAnySamples(): boolean {
    return Object.values(this.samples).some(s => s !== null);
  }

  public clearSamples() {
    this.samples = {
      idle: null,
      low: null,
      mid: null,
      high: null,
      exhaust: null,
      intake: null,
      turbo: null
    };
    this.sampleNames = {
      idle: null,
      low: null,
      mid: null,
      high: null,
      exhaust: null,
      intake: null,
      turbo: null
    };
  }
}
