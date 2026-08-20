import socket
import threading
import json

# Configuración del servidor (Loopback)
HOST = '127.0.0.1' 
PORT = 65432

def procesar_peticion(mensaje_crudo):
    """Aquí definiremos la estructura del protocolo acordado"""
    try:
        # Asumimos que el cliente envía un JSON
        datos = json.loads(mensaje_crudo)
        print(f"[+] Payload recibido: {datos}")
        
        # Respuesta estructurada según el protocolo
        respuesta = {
            "HEADER": {"TIPO": "RES", "ESTADO": 200},
            "PAYLOAD": "Mensaje procesado con éxito por el Servidor A"
        }
        return json.dumps(respuesta) + "\n"
    except json.JSONDecodeError:
        # Manejo de excepciones básico (se mejorará en la Fase 3)
        error = {"HEADER": {"TIPO": "ERR", "ESTADO": 400}, "PAYLOAD": "Trama malformada"}
        return json.dumps(error) + "\n"

def manejar_cliente(conn, addr):
    print(f"[NUEVA CONEXIÓN] Cliente conectado desde {addr}")
    try:
        while True:
            data = conn.recv(1024)
            if not data:
                break # El cliente se desconectó
            
            mensaje = data.decode('utf-8').strip()
            print(f"[{addr}] Mensaje recibido: {mensaje}")
            
            # Procesamos y respondemos
            respuesta = procesar_peticion(mensaje)
            conn.sendall(respuesta.encode('utf-8'))
            
    except Exception as e:
        print(f"[ERROR] Conexión con {addr} interrumpida: {e}")
    finally:
        conn.close()

def iniciar_servidor():
    # Socket TCP/IP estándar
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((HOST, PORT))
    server.listen()
    print(f"[ESCUCHANDO] Servidor de Estudiante A activo en {HOST}:{PORT}")
    
    while True:
        # Gestión de concurrencia: un hilo por cada cliente
        conn, addr = server.accept()
        thread = threading.Thread(target=manejar_cliente, args=(conn, addr))
        thread.start()
        print(f"[CONCURRENCIA] Hilos activos: {threading.active_count() - 1}")

if __name__ == "__main__":
    iniciar_servidor()
