import { useState, useRef } from "react";
import { useStopwatch } from "react-timer-hook";
import "./App.css";
import FrecuenciaChart from "./components/espFrecuenciaChart";
import servicioConverter from "./services/converter";
import GuardarConversion from "./services/guardarConversion";

function App() {
  const { seconds, minutes, isRunning, start, pause, reset } = useStopwatch({
    autoStart: false,
  });
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const chunksRef = useRef([]);
  const [recordings, setRecordings] = useState([]);
  const [originalSpectrum, setOriginalSpectrum] = useState(null);
  const [convertedSpectrum, setConvertedSpectrum] = useState(null);
  const [microfonoDetectado, setMicrofonoDetectado] = useState(true)
  const streamRef = useRef(null);

  const handleStart = async () => {
    start();

    if (!navigator.mediaDevices) {
      alert("Tu navegador no soporta getUserMedia");
      setMicrofonoDetectado(false);
      return;
    }

    const constraints = { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
      chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, {
        type: "audio/ogg; codecs=opus",
      });
      const audioURL = URL.createObjectURL(blob);

      setRecordings([{ name: "antes", audioURL, blob }]);
      chunksRef.current = [];
    };

    recorder.start();
    setMediaRecorder(recorder);
  };

  const handleStop = () => {
    reset(0, false);
    if (mediaRecorder) {
      mediaRecorder.stop();
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const hanldeConversion = async (e) => {
    e.preventDefault();

    if (recordings.length === 0) {
      alert("No hay grabación para convertir");
      return;
    }

    const form = e.target;
    const formato = form.formato.value;
    const configMap = {
      low: 8000,
      "medium-low": 16000,
      medium: 22050,
      high: 44100,
      "very-high": 96000,
    };
    const selectedConfig = form.configuracion.value;
    const sampleRate = configMap[selectedConfig];

    const bitDepth = Number(form.tasa.value);
    const blobAudio = recordings[0].blob;

    try {
      const result = await servicioConverter({
        inputBlob: blobAudio,
        targetSampleRate: sampleRate,
        bitDepth,
        format: formato,
      });

      const audioURL = URL.createObjectURL(result.outputBlob);
      setRecordings((prev) => [
        prev[0],
        { name: "despues", audioURL, blob: result.outputBlob },
      ]);

      setOriginalSpectrum(result.originalSpectrum);
      setConvertedSpectrum(result.convertedSpectrum);

      // Guardar en backend
      if (import.meta.env.VITE_API_URL) {
        await GuardarConversion.postConversion(
          result.originalDuration,
          result.originalSampleRate,
          result.targetSampleRate,
          result.bitDepth,
          result.format
        );
        console.log("Conversión guardada exitosamente");
      }
    } catch (error) {
      console.error("Error durante la conversión o al guardar:", error);
    }
  };

  return (
    <main className="container mt-5 text-light">
      <h1 className="text-center mb-5">CONVERSOR DE A/D</h1>
      <section className="row g-3">
        <div className="col-lg-7 d-flex">
          <article className="card card-body card-gris">
            <h2 className="text-center fs-1 mb-5">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </h2>
            <div className="container-fluid d-flex flex-column align-items-center">
              <button
                className={`mb-3 boton-mic ${
                  microfonoDetectado ? "mic-detectado" : "mic-no-detectado"
                }`}
              >
                {microfonoDetectado
                  ? "Micrófono detectado"
                  : "Micrófono no detectado"}
              </button>

              <button
                onClick={() => {
                  isRunning ? handleStop() : handleStart();
                }}
                className={`mb-5 boton-circular ${
                  isRunning ? "boton-pausa" : "boton-grabar"
                }`}
                title={isRunning ? "Parar" : "Grabar"}
              ></button>
            </div>
          </article>
        </div>

        <div className="col-lg-5">
          <article className="card card-body card-gris d-flex px-5 py-4">
            <form action="/enviar" method="post" onSubmit={hanldeConversion}>
              <label htmlFor="formato">FORMATO</label>
              <select id="formato" name="formato" className="form-select mb-3">
                <option value="wav">WAV</option>
                <option value="mp3">MP3</option>
              </select>

              <div className="d-flex flex-column mb-3">
                <label htmlFor="configuracion">TASA DE MUESTREO</label>
                <select
                  name="configuracion"
                  id="configuracion"
                  className="form-select"
                >
                  <option value="low">Baja (8 kHz - Teléfono)</option>
                  <option value="medium-low">
                    Media-Baja (16 kHz - Voz clara)
                  </option>
                  <option value="medium">Media (22.05 kHz - Radio)</option>
                  <option value="high">Alta (44.1 kHz - CD)</option>
                  <option value="very-high">Muy Alta (96 kHz - Estudio)</option>
                </select>
              </div>

              <label htmlFor="tasa">NIVELES DE BITS</label>
              <select id="tasa" name="tasa" className="form-select mb-3">
                <option value="8">8 bits</option>
                <option value="16">16 bits</option>
                <option value="32">32 bits</option>
              </select>

              <button type="submit" className="btn btn-primary mt-3 w-100">
                CONVERTIR
              </button>
            </form>
          </article>
        </div>
        <div className="col-lg-9">
          <article className="card card-body card-frecuencia">
            <h2 className="text-center">ESPECTRO DE FRECUENCIA</h2>

            <div className="row">
              <div className="col-lg-6">
                <h3 className="text-center fs-5">ANTES</h3>
                {originalSpectrum ? (
                  <FrecuenciaChart data={originalSpectrum} />
                ) : (
                  <p className="text-center"></p>
                )}
              </div>

              <div className="col-lg-6">
                <h3 className="text-center fs-5">DESPUES</h3>
                {convertedSpectrum ? (
                  <FrecuenciaChart data={convertedSpectrum} />
                ) : (
                  <p className="text-center"></p>
                )}
              </div>
            </div>
          </article>
        </div>

        <div className="col-lg-3 d-flex">
          <article className="card card-body card-gris d-flex gap-2">
            {recordings.map((clip, index) => {
              const sizeKB = (clip.blob.size / 1024).toFixed(2);
              const sizeMB = (clip.blob.size / (1024 * 1024)).toFixed(2);
              const isLarge = clip.blob.size >= 1024 * 1024;

              return (
                <div
                  key={index}
                  className="card p-2 shadow-sm card-gris text-light "
                >
                  <p className="mb-1 text-light fw-bold">
                    {clip.name.toUpperCase()}
                  </p>
                  <audio controls src={clip.audioURL} className="w-100 mb-2" />
                  <p className="mb-1 text-light">
                    Tamaño: {isLarge ? `${sizeMB} MB` : `${sizeKB} KB`}
                  </p>
                  <a
                    href={clip.audioURL}
                    download={`audio-${clip.name}.${
                      clip.audioURL.includes("mp3") ? "mp3" : "wav"
                    }`}
                    className="btn btn-sm btn-outline-primary w-100"
                  >
                    Descargar
                  </a>
                </div>
              );
            })}
          </article>
        </div>
      </section>
    </main>
  );
}

export default App;
