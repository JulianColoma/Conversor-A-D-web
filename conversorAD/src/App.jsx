import { useState, useRef } from "react";
import { useStopwatch } from "react-timer-hook";
import "./App.css";

function App() {
  const { seconds, minutes, isRunning, start, pause, reset } = useStopwatch({
    autoStart: false,
  });
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [recordings, setRecordings] = useState([]);

  const streamRef = useRef(null);

  const handleStart = async () => {
    start();

    if (!navigator.mediaDevices) {
      alert("Tu navegador no soporta getUserMedia");
      return;
    }

    const constraints = { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = stream;

    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (e) => {
      setChunks((prev) => [...prev, e.data]);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/ogg; codecs=opus" });
      const audioURL = URL.createObjectURL(blob);
      const name = prompt("Nombre del clip:");
      setRecordings((prev) => [...prev, { name, audioURL }]);
      setChunks([]);
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

  const handleDelete = (index) => {
    setRecordings((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <main className="container">
      <h1 className="text-center">CONVERSOR DE A/D</h1>
      <section className="row">
        <article className="col-lg-7 card card-body">
          <h2 className="text-center">
            {String(minutes).padStart(2, "0")}:
            {String(seconds).padStart(2, "0")}
          </h2>

          <button
            onClick={() => {
              isRunning ? handleStop() : handleStart();
            }}
            className="btn btn-primary"
          >
            {isRunning ? "Parar" : "Grabar"}
          </button>
        </article>

        <article className="col-lg-5 card card-body">
          <h3>FORMATO</h3>

          <form action="/enviar" method="post">
            <label htmlFor="formato">FORMATO</label>
            <select id="formato" name="formato" className="form-select mb-3">
              <option value="wav">WAV</option>
              <option value="mp3">MP3</option>
            </select>

            <div className="d-flex flex-column">
              <label htmlFor="configuracion">CONFIGURACIÓN</label>
              <input type="range" name="frecuencia" id="rango-frecuencia" />
            </div>

            <label htmlFor="tasa">TASA DE MUESTREO</label>
            <select id="tasa" name="tasa" className="form-select mb-3">
              <option value="8">8 bits</option>
              <option value="16">16 bits</option>
              <option value="32">32 bits</option>
            </select>

            <button type="submit" className="btn btn-primary mt-3">
              EXPORTAR
            </button>
          </form>
        </article>

        <article className="card card-body col-lg-9">
          <h2 className="text-center">ESPECTRO DE FRECUENCIA</h2>

          <div className="row">
            <div className="col-lg-6">
              <h3 className="text-center fs-5">ANTES</h3>
            </div>

            <div className="col-lg-6">
              <h3 className="text-center fs-5">DESPUES</h3>
            </div>
          </div>
        </article>

        <article className="card card-body col-lg-3">
          {recordings.map((clip, index) => (
            <div key={index} className="clip">
              <p>{clip.name}</p>
              <audio controls src={clip.audioURL}></audio>
              <button onClick={() => handleDelete(index)}>Eliminar</button>
            </div>
          ))}
        </article>
      </section>
    </main>
  );
}

export default App;
