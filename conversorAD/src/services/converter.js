import lamejs from "lamejs";

export default async function servicioConverter({
  inputBlob,         // Blob de audio cargado o grabado
  targetSampleRate,  // 8000, 16000, 44100, 96000 (ejemplo)
  bitDepth = 16,     // 8, 16, 24 bits
  format = "wav",    // "wav" o "mp3"
}) {
  const arrayBuffer = await inputBlob.arrayBuffer();

  // Decodificar audio original
  const audioCtx = new AudioContext();
  const originalBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  // Obtener espectro original para comparación
  const originalSpectrum = getFrequencySpectrum(originalBuffer);

  // Crear buffer offline para resampleo a targetSampleRate
  const offlineCtx = new OfflineAudioContext({
    numberOfChannels: originalBuffer.numberOfChannels,
    length: Math.floor(originalBuffer.duration * targetSampleRate),
    sampleRate: targetSampleRate,
  });

  // Crear fuente y conectar
  const source = offlineCtx.createBufferSource();
  source.buffer = originalBuffer;
  source.connect(offlineCtx.destination);
  source.start();

  // Renderizar nuevo buffer con nueva tasa de muestreo
  const renderedBuffer = await offlineCtx.startRendering();

  // Obtener espectro del audio convertido
  const convertedSpectrum = getFrequencySpectrum(renderedBuffer);

  // Convertir a formato final
  let outputBlob;
  if (format === "mp3") {
    outputBlob = convertToMp3(renderedBuffer, bitDepth);
  } else {
    outputBlob = convertToWav(renderedBuffer, bitDepth);
  }

  // Retornar objeto con datos para UI
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

// Obtiene espectro de frecuencias usando FFT (simplificado)
function getFrequencySpectrum(audioBuffer) {
  const channelData = audioBuffer.getChannelData(0);
  // Usamos la Web Audio API AnalyserNode para FFT (modo offline)
  // Pero en Node o fuera de contexto, usar FFTJS o similar
  
  // Simplificado: calcular magnitud de frecuencias con FFT (puedes usar fft.js)
  // Aquí un ejemplo muy básico (no es exacto, solo demo):
  const fftSize = 2048;
  const fft = new FFT(fftSize);
  const slice = channelData.slice(0, fftSize);
  fft.forward(slice);
  return fft.spectrum; // Array con magnitud espectral
}

// Convierte a MP3 usando lamejs (solo 16 bits soportado)
function convertToMp3(audioBuffer, bitDepth) {
  if (bitDepth !== 16) {
    console.warn("MP3 solo soporta 16 bits. Ignorando bitDepth.");
  }
  const samples = audioBuffer.getChannelData(0);
  const pcm = floatTo16BitPCM(samples);

  const encoder = new lamejs.Mp3Encoder(audioBuffer.numberOfChannels, audioBuffer.sampleRate, 128);
  const blockSize = 1152;
  const mp3Data = [];

  for (let i = 0; i < pcm.length; i += blockSize) {
    const chunk = pcm.subarray(i, i + blockSize);
    const mp3buf = encoder.encodeBuffer(chunk);
    if (mp3buf.length > 0) mp3Data.push(mp3buf);
  }

  const end = encoder.flush();
  if (end.length > 0) mp3Data.push(end);

  return new Blob(mp3Data, { type: "audio/mp3" });
}

// Convierte a WAV con bitDepth 8, 16, 24 bits
function convertToWav(audioBuffer, bitDepth) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;

  // Mezclar canales si es más de 1
  let interleaved;
  if (numChannels === 1) {
    interleaved = audioBuffer.getChannelData(0);
  } else {
    interleaved = interleaveChannels(audioBuffer);
  }

  const pcmBuffer = floatToPCM(interleaved, bitDepth);

  const wavBuffer = encodeWavHeader(pcmBuffer, sampleRate, bitDepth, numChannels);
  return new Blob([wavBuffer], { type: "audio/wav" });
}

// Interleave para canales múltiples
function interleaveChannels(audioBuffer) {
  const channels = [];
  for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i));
  }
  const length = channels[0].length;
  const result = new Float32Array(length * channels.length);
  let index = 0;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < channels.length; ch++) {
      result[index++] = channels[ch][i];
    }
  }
  return result;
}

function floatTo16BitPCM(floatSamples) {
  const output = new Int16Array(floatSamples.length);
  for (let i = 0; i < floatSamples.length; i++) {
    let s = Math.max(-1, Math.min(1, floatSamples[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

function floatToPCM(samples, bitDepth) {
  const length = samples.length;
  const buffer = new ArrayBuffer(length * (bitDepth / 8));
  const view = new DataView(buffer);

  for (let i = 0; i < length; i++) {
    let sample = Math.max(-1, Math.min(1, samples[i]));
    if (bitDepth === 16) {
      view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    } else if (bitDepth === 8) {
      view.setInt8(i, (sample + 1) * 127);
    } else if (bitDepth === 24) {
      // 24 bits PCM requiere 3 bytes por muestra (little-endian)
      const val = sample < 0 ? sample * 0x800000 : sample * 0x7FFFFF;
      view.setUint8(i * 3, val & 0xFF);
      view.setUint8(i * 3 + 1, (val >> 8) & 0xFF);
      view.setUint8(i * 3 + 2, (val >> 16) & 0xFF);
    } else if (bitDepth === 32) {
      view.setFloat32(i * 4, sample, true);
    }
  }

  return buffer;
}

function encodeWavHeader(pcmBuffer, sampleRate, bitDepth, numChannels) {
  const byteRate = (sampleRate * numChannels * bitDepth) / 8;
  const blockAlign = (numChannels * bitDepth) / 8;
  const dataSize = pcmBuffer.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  new Uint8Array(buffer).set(new Uint8Array(pcmBuffer), 44);
  return buffer;
}

// ---- FFT básica (usando librería externa o implementar) ----
// Aquí deberías incluir o importar una librería FFT para obtener espectros de frecuencia.
// Puedes usar por ejemplo https://github.com/corbanbrook/dsp.js o fft.js

class FFT {
  constructor(size) {
    this.size = size;
    this.spectrum = new Float32Array(size / 2);
    // Implementar FFT real o usar librería externa
  }
  forward(buffer) {
    // Calcular FFT, llenar this.spectrum
    // Aquí va el código FFT o llamada a librería
  }
}
