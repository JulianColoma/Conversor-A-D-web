from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import os
import time
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

def get_db_connection():
    return mysql.connector.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        user=os.environ.get("DB_USER", "root"),
        password=os.environ.get("DB_PASSWORD", "rootpass"),
        database=os.environ.get("DB_NAME", "conversiones_db")
    )


@app.route("/conversiones", methods=["POST"])
def agregar_conversion():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO conversiones_audio (
            duracion_original,
            frecuencia_muestreo_original,
            frecuencia_muestreo_objetivo,
            profundidad_bits,
            formato
        ) VALUES (%s, %s, %s, %s, %s)
    """, (
        data["duracion_original"],
        data["frecuencia_muestreo_original"],
        data["frecuencia_muestreo_objetivo"],
        data["profundidad_bits"],
        data["formato"]
    ))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"mensaje": "Conversion de audio guardada"}), 201

@app.route("/conversiones", methods=["GET"])
def obtener_conversiones():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM conversiones_audio")
    resultado = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(resultado)

if __name__ == "__main__":
    time.sleep(5)
    app.run(host="0.0.0.0", port=5000, debug=True)

