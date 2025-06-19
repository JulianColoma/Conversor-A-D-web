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
          },
        ],
      },
      options: {
        responsive: true,
        animation: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 255,
          },
          x: {
            display: false,
          },
        },
      },
    });

    return () => chart.destroy();
  }, [data]);

  return <canvas ref={canvasRef} width={400} height={150}></canvas>;
}

export default FrecuenciaChart;
