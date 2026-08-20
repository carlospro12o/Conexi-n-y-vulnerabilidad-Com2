# Parcial III - Comunicaciones II

Proyecto de Diseño, Adversidad y Robustecimiento de Protocolos de Comunicación.

## Estructura del Proyecto

- `servidor.py`: Implementación del Servidor (Estudiante A). Escucha en el puerto 65432, procesa peticiones JSON y responde en el mismo formato. Maneja múltiples clientes concurrentemente usando hilos.
- `proxy_atacante.py`: Agente de Adversidad / Proxy MITM (Estudiante C). Escucha en el puerto 8080 e intercepta el tráfico hacia el servidor. Inyecta fallas (pérdida, corrupción, latencia) según probabilidades configurables.

## Instrucciones de Ejecución

1. **Iniciar el Servidor**:
   Abre una terminal y ejecuta:
   ```bash
   python servidor.py
   ```
   El servidor quedará escuchando en `127.0.0.1:65432`.

2. **Iniciar el Proxy Atacante**:
   Abre otra terminal y ejecuta:
   ```bash
   python proxy_atacante.py
   ```
   El proxy quedará escuchando en `127.0.0.1:8080`.

3. **Conectar el Cliente**:
   El Estudiante B (Cliente) debe conectarse al puerto `8080` (el proxy) en lugar del puerto del servidor, para que el tráfico pase por el atacante y se simulen las fallas.

## Protocolo Acordado (Fase 1)

Los mensajes se envían en formato JSON y están delimitados por un salto de línea (`\n`).

**Ejemplo de Petición (Cliente -> Servidor):**
```json
{"mensaje": "hola servidor"}
```

**Ejemplo de Respuesta (Servidor -> Cliente):**
```json
{
  "HEADER": {"TIPO": "RES", "ESTADO": 200},
  "PAYLOAD": "Mensaje procesado con éxito por el Servidor A"
}
```
