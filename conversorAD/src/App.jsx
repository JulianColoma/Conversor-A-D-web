import { useState } from "react";
import { useStopwatch } from "react-timer-hook";
import "./App.css";

function App() {
  const { seconds, minutes, isRunning, start, pause, reset } = useStopwatch({
    autoStart: false,
  });

  const handleGrabar = (e) => {
  e.preventDefault();
  if (isRunning){
    reset(0, false)
  }else{
    start()
  }
  
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

          <button onClick={handleGrabar} className="btn btn-primary">
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
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Quia
            veritatis dolorum possimus, quaerat nisi ipsum nihil voluptas
            accusantium esse debitis ea fugit hic eveniet quos at! Eius
            recusandae aliquam minus!
          </p>
        </article>
      </section>
    </main>
  );
}

export default App;
