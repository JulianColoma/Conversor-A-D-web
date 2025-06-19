export default class GuardarConversion {
    static apiUrl = import.meta.env.VITE_API_URL;
  
    static async postConversion(duracion_original, fm_original, fm_convertida, bitD, formato) {
      try {
        const body = {
          duracion_original,
          frecuencia_original: fm_original,
          frecuencia_convertida: fm_convertida,
          bit_depth: bitD,
          formato,
        };
  
        const res = await fetch(GuardarConversion.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
  
        if (!res.ok) {
          throw new Error(`Error del servidor: ${res.status}`);
        }
  
        const data = await res.json();
        return data;
      } catch (error) {
        console.error("Error al guardar la conversión:", error);
        throw error;
      }
    }
  }
  