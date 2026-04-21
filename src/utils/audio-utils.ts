export function createBlob(pcmData: Float32Array): Blob {
  const buffer = new ArrayBuffer(pcmData.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < pcmData.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([buffer], { type: 'audio/l16' });
}

export function decode(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(data: Uint8Array, context: AudioContext, sampleRate: number = 24000, channels: number = 1): Promise<AudioBuffer> {
  const numberOfSamples = data.length / 2;
  const audioBuffer = context.createBuffer(channels, numberOfSamples, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  const dataView = new DataView(data.buffer);
  
  for (let i = 0; i < numberOfSamples; i++) {
    // Assuming 16-bit PCM
    channelData[i] = dataView.getInt16(i * 2, true) / 32768;
  }
  
  return audioBuffer;
}
