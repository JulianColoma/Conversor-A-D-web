import mysql.connector
import os
from dotenv import load_dotenv
load_dotenv()

conn = mysql.connector.connect(
    host=os.environ.get("DB_HOST", "localhost"),
    user=os.environ.get("DB_USER", "root"),
    password=os.environ.get("DB_PASSWORD", "rootpass"),
    database=os.environ.get("DB_NAME", "conversiones_db")
)

cursor = conn.cursor()
cursor.execute("""
CREATE TABLE IF NOT EXISTS conversiones_audio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    duracion_original FLOAT,
    frecuencia_muestreo_original INT,
    frecuencia_muestreo_objetivo INT,
    profundidad_bits INT,
    formato VARCHAR(10)
)
""")
conn.commit()
cursor.close()
conn.close()

print("✅ Tabla creada")
