import mysql.connector

conn = mysql.connector.connect(
    host="localhost",
    user="root",
    password="rootpass",
    database="conversiones_db"
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
