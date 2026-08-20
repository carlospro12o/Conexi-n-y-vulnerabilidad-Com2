import socket
import threading
import random
import time
import argparse

# Configuración
PROXY_HOST = '127.0.0.1'
PROXY_PORT = 8080
SERVER_HOST = '127.0.0.1'
SERVER_PORT = 9090

# Probabilidades de fallo (0.0 a 1.0)
PROBABILIDAD_PERDIDA = 0.2
PROBABILIDAD_CORRUPCION = 0.2
PROBABILIDAD_LATENCIA = 0.2
LATENCIA_MAXIMA_SEG = 3

def aplicar_adversidad(datos):
    """Aplica condiciones de fallo al mensaje interceptado."""
    # 1. Pérdida de paquetes
    if random.random() < PROBABILIDAD_PERDIDA:
        print("[!] ATACANTE: Paquete descartado (Pérdida)")
        return None
        
    # 2. Latencia
    if random.random() < PROBABILIDAD_LATENCIA:
        retraso = random.uniform(0.5, LATENCIA_MAXIMA_SEG)
        print(f"[!] ATACANTE: Aplicando latencia de {retraso:.2f} segundos")
        time.sleep(retraso)
        
    # 3. Corrupción de datos
    if random.random() < PROBABILIDAD_CORRUPCION:
        print("[!] ATACANTE: Paquete corrupto (Alteración de bits)")
        # Corrompemos un byte aleatorio
        if len(datos) > 0:
            datos_mutables = bytearray(datos)
            idx = random.randint(0, len(datos_mutables) - 1)
            datos_mutables[idx] = (datos_mutables[idx] + 1) % 256
            datos = bytes(datos_mutables)
            
    return datos

def reenviar_trafico(origen, destino, nombre_origen, nombre_destino, aplicar_fallas=False):
    """Lee de un socket y escribe en el otro."""
    try:
        while True:
            datos = origen.recv(4096)
            if not datos:
                break
                
            print(f"[*] Tráfico {nombre_origen} -> {nombre_destino}: {len(datos)} bytes")
            
            if aplicar_fallas:
                datos = aplicar_adversidad(datos)
                
            if datos: # Si no fue descartado
                destino.sendall(datos)
                
    except Exception as e:
        print(f"[-] Error en conexión {nombre_origen}->{nombre_destino}: {e}")
    finally:
        origen.close()
        destino.close()

def manejar_cliente(cliente_conn, cliente_addr):
    print(f"[+] Proxy interceptando conexión desde {cliente_addr}")
    
    # Conectar al servidor real
    servidor_conn = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        servidor_conn.connect((SERVER_HOST, SERVER_PORT))
        print(f"[+] Conectado al servidor real en {SERVER_HOST}:{SERVER_PORT}")
    except Exception as e:
        print(f"[-] No se pudo conectar al servidor: {e}")
        cliente_conn.close()
        return

    # Hilo para Cliente -> Proxy -> Servidor (Aquí aplicamos ataques)
    hilo_c2s = threading.Thread(
        target=reenviar_trafico, 
        args=(cliente_conn, servidor_conn, "Cliente", "Servidor", True)
    )
    
    # Hilo para Servidor -> Proxy -> Cliente (Podríamos atacar aquí también, pero lo haremos de ida)
    hilo_s2c = threading.Thread(
        target=reenviar_trafico, 
        args=(servidor_conn, cliente_conn, "Servidor", "Cliente", False)
    )
    
    hilo_c2s.start()
    hilo_s2c.start()

def iniciar_proxy():
    proxy = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    proxy.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    proxy.bind((PROXY_HOST, PROXY_PORT))
    proxy.listen()
    print(f"[*] Proxy MITM (Atacante) escuchando en {PROXY_HOST}:{PROXY_PORT}")
    print(f"[*] Interceptando tráfico hacia {SERVER_HOST}:{SERVER_PORT}")
    print(f"[*] Probabilidades - Pérdida: {PROBABILIDAD_PERDIDA}, Corrupción: {PROBABILIDAD_CORRUPCION}, Latencia: {PROBABILIDAD_LATENCIA}")
    
    try:
        while True:
            conn, addr = proxy.accept()
            hilo = threading.Thread(target=manejar_cliente, args=(conn, addr))
            hilo.start()
    except KeyboardInterrupt:
        print("\n[*] Deteniendo proxy...")
    finally:
        proxy.close()

if __name__ == "__main__":
    iniciar_proxy()
