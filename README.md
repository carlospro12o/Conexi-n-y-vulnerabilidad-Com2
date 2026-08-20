# Parcial III: Comunicaciones II - Protocolo con Tolerancia a Fallos

Este repositorio contiene el diseño, evaluación y robustecimiento de un protocolo de comunicación de la capa de aplicación, sometido a inyección de fallas simuladas (Pérdida, Corrupción y Latencia) usando un atacante MITM, y defendido mediante control de integridad (**CRC32**) y control de flujo (**ARQ Stop-and-Wait** con **Timeouts**).

## 📌 Roles del Equipo
* **Estudiante A**: Servidor Concurrente en Python (`servidor.py`)
* **Estudiante B**: Cliente Interactivo en Node.js (`cliente.js`)
* **Estudiante C**: Agente de Adversidad / Proxy Atacante en Python (`proxy_atacante.py`)

---

## 🚀 Requisitos Previos
- **Para el Servidor y el Atacante:** Python 3.x
- **Para el Cliente:** Node.js v16+

---

## 🛠️ Instrucciones de Ejecución

### 1. Iniciar el Servidor (Estudiante A - Terminal 1)
```powershell
python servidor.py
```
> *El servidor arrancará y se quedará escuchando en el puerto directo `9090`. Posee validación criptográfica y lógica para rechazar paquetes corruptos (NACK).*

### 2. Iniciar el Agente de Adversidad / Proxy MITM (Estudiante C - Terminal 2)
Para simular el ataque al canal (Fase 2 y Fase 4):
```powershell
python proxy_atacante.py
```
> *El proxy se levantará en el puerto `8080` e interceptará el tráfico hacia el servidor (`9090`). Aplicará pérdida de paquetes, corrupción de bits y latencia aleatoria del 20-33%.*

### 3. Iniciar el Cliente (Estudiante B - Terminal 3)

Para realizar una conexión segura con protección y pasar a través del canal atacado:
```powershell
node cliente.js 8080
```
> *El cliente se conecta al puerto del atacante (`8080`), pero internamente activará sus protecciones de Timeout (2 segundos), retransmisión (máximo 5 intentos) y cálculo de CRC32.*

---

## 🛡️ Mecanismos de Robustecimiento Implementados (Fases 3 y 4)

- **Control de Integridad (CRC32):** El cliente Node.js calcula nativamente la firma de la carga útil y el servidor en Python (`zlib`) la verifica. Si no coinciden, se emite un `NACK`.
- **Manejo de Errores Estructurado:** Las respuestas del servidor malformadas devuelven `ERR`.
- **Timeouts y Retransmisión:** Si un paquete es descartado por el proxy o retrasado artificialmente más de 2000 ms, el cliente inicia una retransmisión automática, salvando el canal de desconexiones o congelamientos.
