import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

function FrecuenciaChart({ data }) {
  const canvasRef = useRef();

  useEffect(() => {
    if (!data || data.length === 0) return;

    const ctx = canvasRef.current.getContext("2d");

    const chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: data.map((_, i) => i),
        datasets: [
          {
            label: "Frecuencia (dB)",
            data: data,
            backgroundColor: "#a855f7",
            barThickness: 1.5,
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        maintainAspectRatio: false,
        scales: {
          y: {
            min: -100,
            max: 0,
            reverse: true, // 🔁 Esto invierte visualmente el eje
            title: {
              display: true,
              text: "dB",
            },
            ticks: {
              callback: (value) => `${value} dB`,
            },
          },
          x: {
            display: false,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });

    return () => chart.destroy();
  }, [data]);

  return (
    <div style={{ width: "100%", height: "200px" }}>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
}

export default FrecuenciaChart;
