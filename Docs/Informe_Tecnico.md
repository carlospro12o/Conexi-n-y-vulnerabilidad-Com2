# Informe Técnico — Parcial III: Comunicaciones II
**Materia:** Comunicaciones II  
**Actividad:** Diseño, Adversidad y Robustecimiento de Protocolos de Comunicación  
**Integrantes:**
- Estudiante A (Servidor — Python)
- Estudiante B (Cliente — Node.js)
- Estudiante C (Agente de Adversidad — Proxy MITM)

---

## 1. Especificación del Protocolo

### 1.1 Descripción General
El protocolo diseñado opera en la **capa de aplicación** sobre una conexión TCP/IP. Utiliza **JSON** como formato de serialización de mensajes, lo que permite la interoperabilidad entre el Servidor (Python) y el Cliente (Node.js) sin necesidad de codificación binaria adicional.

La comunicación sigue el esquema **Request/Response (REQ → RES)**, donde el cliente envía peticiones estructuradas al servidor y este responde con una confirmación o código de error.

### 1.2 Arquitectura del Sistema

```
┌─────────────────┐     TCP/JSON      ┌─────────────────┐
│   CLIENTE       │  ─────────────►  │    SERVIDOR     │
│  (Node.js)      │  ◄─────────────  │    (Python)     │
│  cliente.js     │   Puerto 65432   │  servidor.py    │
└─────────────────┘                  └─────────────────┘

                ↕ (Fase 2 — Interferencia)

┌─────────────────────────────────────────────────────┐
│              PROXY MITM (Atacante C)                │
│              proxy_atacante.py : 8080               │
│    Pérdida 33% | Corrupción 33% | Latencia 33%      │
└─────────────────────────────────────────────────────┘
```

### 1.3 Estructura de Trama del Protocolo

Cada mensaje transmitido por el canal TCP sigue la siguiente estructura en formato **JSON**:

**Trama de Petición (Cliente → Servidor):**
```json
{
  "HEADER": {
    "TIPO": "REQ",
    "SECUENCIA": 1
  },
  "PAYLOAD": "Contenido del mensaje enviado por el usuario"
}
```

**Trama de Respuesta Exitosa (Servidor → Cliente):**
```json
{
  "HEADER": {
    "TIPO": "RES",
    "ESTADO": 200
  },
  "PAYLOAD": "Mensaje procesado con éxito por el Servidor A"
}
```

**Trama de Error (Servidor → Cliente — Trama malformada):**
```json
{
  "HEADER": {
    "TIPO": "ERR",
    "ESTADO": 400
  },
  "PAYLOAD": "Trama malformada"
}
```

### 1.4 Descripción de Campos del HEADER

| Campo      | Tipo    | Valores Posibles            | Descripción                                        |
|------------|---------|-----------------------------|----------------------------------------------------|
| TIPO       | String  | "REQ", "RES", "ERR"        | Indica el propósito del mensaje                    |
| SECUENCIA  | Integer | 1, 2, 3, ...               | Número de secuencia incremental del mensaje        |
| ESTADO     | Integer | 200 (OK), 400 (Error)      | Código de estado en respuestas del servidor        |

### 1.5 Flujo de Comunicación (Fase 1 — Sin Adversidad)

```
Cliente (Node.js)              Servidor (Python)
       |                              |
       |  ── REQ Seq#1 ─────────►   |
       |                              |   Procesa petición
       |  ◄── RES (200) ──────────   |
       |                              |
       |  ── REQ Seq#2 ─────────►   |
       |  ◄── RES (200) ──────────   |
       |                              |
       |  (usuario escribe "salir")   |
       |  ── TCP FIN ─────────────►  |
       |  ◄── TCP FIN/ACK ─────────  |
```

### 1.6 Parámetros de Configuración

| Parámetro            | Valor       | Descripción                                    |
|----------------------|-------------|------------------------------------------------|
| Protocolo de Red     | TCP/IP      | Transporte confiable de la capa 4              |
| Dirección del Servidor | 127.0.0.1 | Interfaz de loopback para pruebas locales     |
| Puerto del Servidor  | 65432       | Puerto de escucha del Servidor A               |
| Puerto del Proxy     | 8080        | Puerto de escucha del Agente de Adversidad C   |
| Codificación         | UTF-8       | Codificación de caracteres del payload JSON    |
| Formato de Mensajes  | JSON        | Serialización de trama de aplicación           |

---

## 2. Bitácora de Adversidad (Estudiante C — Agente Atacante)

### 2.1 Herramienta Utilizada

**Script:** `proxy_atacante.py` — Proxy MITM (Man-In-The-Middle) implementado en Python.

**Descripción:** El proxy se interpone entre el Cliente y el Servidor interceptando todo el tráfico TCP. Para cada paquete que transita del cliente hacia el servidor, el proxy evalúa tres condiciones de falla con probabilidades configurables, aplicando la adversidad antes de reenviar el paquete al destino real.

**Configuración de Probabilidades Aplicadas:**

| Tipo de Falla      | Probabilidad | Descripción                                                  |
|--------------------|:------------:|--------------------------------------------------------------|
| Pérdida de Paquetes | 33% (0.33)  | El paquete es descartado y nunca llega al servidor           |
| Corrupción de Datos | 33% (0.33)  | Se altera un byte aleatorio del contenido del paquete        |
| Latencia Artificial | 33% (0.33)  | Se aplica un retardo aleatorio de 0.5 a 3 segundos          |

### 2.2 Flujo de Ataque del Proxy MITM

```
Cliente ── REQ ──► [Proxy MITM] ──?──► Servidor
                        │
              ┌─────────┼────────────┐
              │         │            │
           Descarta   Corrompe    Retrasa
           paquete    un byte     N seg.
           (Pérdida)  (Corrupción)(Latencia)
```

### 2.3 Registro de Ataques Aplicados (Fases de Prueba)

**Prueba 1 — Pérdida de Paquetes (P=1.0):**

| Campo               | Detalle                                               |
|---------------------|-------------------------------------------------------|
| Configuración proxy | `PROBABILIDAD_PERDIDA = 1.0`                         |
| Mensaje enviado     | "Hola, prueba de pérdida de paquetes"                |
| Comportamiento proxy | `[!] ATACANTE: Paquete descartado (Pérdida)`        |
| Comportamiento cliente | El cliente queda bloqueado sin recibir respuesta  |
| Comportamiento servidor | El servidor no recibe ningún paquete            |
| Impacto observado   | Bloqueo indefinido en el cliente (sin timeout)       |

**Prueba 2 — Corrupción de Datos (P=1.0):**

| Campo               | Detalle                                               |
|---------------------|-------------------------------------------------------|
| Configuración proxy | `PROBABILIDAD_CORRUPCION = 1.0`                      |
| Mensaje enviado     | `{"HEADER":{"TIPO":"REQ","SECUENCIA":1},"PAYLOAD":"Test"}`|
| Comportamiento proxy | `[!] ATACANTE: Paquete corrupto (Alteración de bits)`|
| Comportamiento servidor | `json.JSONDecodeError` → Responde `ERR 400`     |
| Comportamiento cliente | Recibe `ERR 400` pero continúa sin reintentar    |
| Impacto observado   | El mensaje se pierde silenciosamente sin re-entrega  |

**Prueba 3 — Latencia Artificial (P=1.0, 3 seg máx.):**

| Campo               | Detalle                                               |
|---------------------|-------------------------------------------------------|
| Configuración proxy | `PROBABILIDAD_LATENCIA = 1.0, LATENCIA_MAXIMA_SEG = 3` |
| Comportamiento proxy | `[!] ATACANTE: Aplicando latencia de 2.87 segundos` |
| Comportamiento cliente | La respuesta tarda entre 0.5 y 3 segundos extra  |
| Impacto observado   | Experiencia de usuario degradada; sin gestión de timeout |

---

## 3. Matriz de Errores y Soluciones

### 3.1 Tabla Comparativa

| Falla Inyectada | Comportamiento Inicial (Fase 1 — Sin Protección) | Solución Implementada (Fase 3 — Protocolo Robustecido) |
|---|---|---|
| **Pérdida de Paquetes** (Proxy descarta el paquete) | El cliente queda bloqueado de forma indefinida esperando una respuesta que nunca llega. La aplicación deja de responder y debe cerrarse manualmente. | **Stop-and-Wait ARQ con Timeout (2s):** Si no se recibe respuesta ACK en 2 segundos, el cliente retransmite automáticamente la trama hasta 5 veces. Si el límite se supera, notifica fallo de canal. |
| **Corrupción de Datos** (Proxy altera un byte del JSON) | El servidor recibe un JSON sintácticamente inválido. Aunque captura la excepción `JSONDecodeError` y responde `ERR 400`, el cliente no reintenta el envío. El mensaje se pierde definitivamente. | **Verificación de Integridad CRC32 + NACK:** El cliente adjunta `"CRC32"` en el HEADER calculado sobre el PAYLOAD. El servidor verifica el CRC al recibirlo; si hay discrepancia responde `NACK` y el cliente retransmite la trama automáticamente. |
| **Latencia / Retardo** (Proxy introduce demoras de 0.5s a 3s) | La respuesta llega tarde pero eventualmente llega. Sin temporizadores, el cliente no distingue entre un canal lento y un canal caído. No hay gestión de tiempo de espera. | **Temporizador Stop-and-Wait (Timeout 2s):** El cliente controla activamente el tiempo de espera. Si la respuesta supera el límite de 2 segundos, activa la retransmisión, tratando la latencia extrema como pérdida de paquete recuperable. |
| **Trama Malformada / JSON Inviable** (Proxy corrompe estructura completa) | El servidor lanza excepción y responde con código `ERR 400`, pero el cliente muestra la respuesta de error sin tomar acción correctiva. El usuario debe reenviar el mensaje manualmente. | **Manejo de Excepciones en el Cliente:** Al detectar que la respuesta recibida no es un JSON válido (posible fragmentación o corrupción grave), el cliente lo notifica en pantalla. El servidor responde `ERR` con payload descriptivo. |

### 3.2 Comparativa Técnica de Soluciones

| Mecanismo              | Sin Protección (Fase 1)      | Con Protección (Fase 3)                   |
|------------------------|------------------------------|-------------------------------------------|
| Integridad de Datos    | Sin verificación             | Campo `CRC32` en HEADER + validación en servidor |
| Pérdida de Paquetes    | Bloqueo indefinido           | Timeout 2s + Retransmisión automática (5 intentos) |
| Respuestas del Servidor | Solo `RES` (200) o `ERR` (400) | `ACK` (200), `NACK` (400 + CRC error), `ERR` (400 + syntax) |
| Continuidad del Servicio | El cliente colapsa ante fallos | El cliente notifica y continúa operando  |
| Número de Secuencia    | Campo `SECUENCIA` incluido   | Campo `SECUENCIA` para trazabilidad      |
