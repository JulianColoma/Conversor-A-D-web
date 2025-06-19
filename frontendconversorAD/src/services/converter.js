import lamejs from "@breezystack/lamejs";
import FFT from "fft.js";

// Servicio de conversión de audio
export default async function servicioConverter({
  inputBlob,
  targetSampleRate,
  bitDepth = 16,
  format = "wav",
}) {
  const arrayBuffer = await inputBlob.arrayBuffer();

  const audioCtx = new AudioContext();
  const originalBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const originalSpectrum = getFrequencySpectrum(originalBuffer);

  const offlineCtx = new OfflineAudioContext({
    numberOfChannels: originalBuffer.numberOfChannels,
    length: Math.floor(originalBuffer.duration * targetSampleRate),
    sampleRate: targetSampleRate,
  });

  const source = offlineCtx.createBufferSource();
  source.buffer = originalBuffer;
  source.connect(offlineCtx.destination);
  source.start();

  const renderedBuffer = await offlineCtx.startRendering();
  const convertedSpectrum = getFrequencySpectrum(renderedBuffer);

  const outputBlob =
    format === "mp3"
      ? convertToMp3(renderedBuffer)
      : convertToWav(renderedBuffer, bitDepth);

  return {
    originalDuration: originalBuffer.duration,
    originalSampleRate: originalBuffer.sampleRate,
    targetSampleRate,
    bitDepth,
    format,
    originalSpectrum,
    convertedSpectrum,
    outputBlob,
  };
}


function convertToMp3(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const kbps = 128;

  const samplesL = floatTo16BitPCM(audioBuffer.getChannelData(0));
  const samplesR =
    numChannels > 1 ? floatTo16BitPCM(audioBuffer.getChannelData(1)) : null;

  const encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, kbps);
  const sampleBlockSize = 1152;
  const mp3Data = [];

  for (let i = 0; i < samplesL.length; i += sampleBlockSize) {
    const leftChunk = samplesL.subarray(i, i + sampleBlockSize);
    let mp3buf;

    if (numChannels === 2 && samplesR) {
      const rightChunk = samplesR.subarray(i, i + sampleBlockSize);
      mp3buf = encoder.encodeBuffer(leftChunk, rightChunk);
    } else {
      mp3buf = encoder.encodeBuffer(leftChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(mp3buf);
    }
  }

  const endBuf = encoder.flush();
  if (endBuf.length > 0) {
    mp3Data.push(endBuf);
  }

  return new Blob(mp3Data, { type: "audio/mp3" });
}



// WAV PCM (8, 16, 32 bits)
function convertToWav(audioBuffer, bitDepth) {
  const samples = audioBuffer.getChannelData(0);
  const pcmData = floatToPCM(samples, bitDepth);
  const wavBuffer = encodeWavHeader(pcmData, audioBuffer.sampleRate, bitDepth, 1);
  return new Blob([wavBuffer], { type: "audio/wav" });
}

// PCM conversion
function floatTo16BitPCM(floatSamples) {
  const output = new Int16Array(floatSamples.length);
  for (let i = 0; i < floatSamples.length; i++) {
    let s = Math.max(-1, Math.min(1, floatSamples[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

function floatToPCM(samples, bitDepth) {
  const bytesPerSample = bitDepth / 8;
  const buffer = new ArrayBuffer(samples.length * bytesPerSample);
  const view = new DataView(buffer);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));

    if (bitDepth === 8) {
      view.setUint8(i, (s + 1) * 127.5);
    } else if (bitDepth === 16) {
      view.setInt16(i * 2, s * 0x7FFF, true);
    } else if (bitDepth === 32) {
      view.setInt32(i * 4, s * 0x7FFFFFFF, true);
    } else {
      throw new Error("Bit depth no soportado. Usa 8, 16 o 32.");
    }
  }

  return buffer;
}


// WAV header
function encodeWavHeader(pcmBuffer, sampleRate, bitDepth, numChannels) {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBuffer.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer).set(new Uint8Array(pcmBuffer), 44);

  return buffer;
}

// Espectro de frecuencia real
function getFrequencySpectrum(buffer) {
  const samples = buffer.getChannelData(0);
  const fftSize = 2048;
  const fft = new FFT(fftSize);

  const input = new Array(fftSize).fill(0);
  for (let i = 0; i < fftSize; i++) {
    input[i] = samples[i] || 0;
  }

  const output = fft.createComplexArray();
  fft.realTransform(output, input);
  fft.completeSpectrum(output);

  const spectrum = new Float32Array(fftSize / 2);
  for (let i = 0; i < fftSize / 2; i++) {
    const re = output[2 * i];
    const im = output[2 * i + 1];
    const mag = Math.sqrt(re * re + im * im);
    spectrum[i] = 20 * Math.log10(mag + 1e-6); // Convertir a dB
  }

  return spectrum;
}
