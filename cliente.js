/**
 * cliente.js - Cliente TCP en Node.js (Estudiante B)
 * Comunicaciones II - Parcial III
 * 
 * Compatible con el servidor de Estudiante A (servidor.py) y el proxy (proxy_atacante.py).
 */

const net = require('net');
const readline = require('readline');

// Configuración por defecto
const HOST = '127.0.0.1';
let PORT = 9090; // Puerto directo del servidor. Cambiar a 8080 para pasar por el proxy atacante.

let client = null;
let seqNum = 1;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Función para calcular CRC32 en Javascript estándar (compatible con UTF-8)
function calcularCrc32(str) {
    const buf = Buffer.from(str, 'utf8');
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
        crc ^= buf[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
        }
    }
    return (crc ^ -1) >>> 0;
}

// Variables para ARQ Stop-and-Wait
let timerTimeout = null;
let reintentos = 0;
const MAX_REINTENTOS = 5;
const TIMEOUT_MS = 2000;
let ultimoPaquete = null;

/**
 * Conecta al servidor TCP
 */
function conectar(port = PORT) {
    PORT = port;
    console.log(`\n[+] Conectando a ${HOST}:${PORT}...`);

    client = new net.Socket();

    client.connect(PORT, HOST, () => {
        console.log(`[CONECTADO] Conexión establecida con ${HOST}:${PORT}`);
        promptMensaje();
    });

    let buffer = "";
    client.on('data', (data) => {
        buffer += data.toString();

        let index;
        while ((index = buffer.indexOf('\n')) > -1) {
            const rawResponse = buffer.substring(0, index).trim();
            buffer = buffer.substring(index + 1);

            if (!rawResponse) continue;

            console.log(`\n[RESPUESTA DE SERVIDOR]: ${rawResponse}`);
            try {
                const parsed = JSON.parse(rawResponse);
                const header = parsed.HEADER || {};
                const payload = parsed.PAYLOAD || "";
                
                // Verificamos si la respuesta en sí viene corrupta
                const crcCalculado = calcularCrc32(payload);
                if (header.CRC32 !== undefined && header.CRC32 !== crcCalculado) {
                    console.log(`   [ADVERTENCIA] Respuesta corrupta (CRC esperado ${header.CRC32}, calculado ${crcCalculado}). Ignorando...`);
                    continue; // Ignoramos y dejamos que el Timeout actúe
                }

                console.log(`   Estado: ${header.ESTADO || 'OK'}`);
                console.log(`   Longitud: ${header.LONGITUD || 'N/A'}`);
                console.log(`   Payload: "${payload}"`);
                
                if (header.TIPO === "NACK") {
                    console.log(`   [!] El servidor solicitó retransmisión (NACK).`);
                    if (timerTimeout) clearTimeout(timerTimeout);
                    reintentos++;
                    enviarConReintentos();
                } else if (header.TIPO === "RES" || header.TIPO === "ERR") {
                    // Respuesta final exitosa o error definitivo
                    if (timerTimeout) clearTimeout(timerTimeout);
                    ultimoPaquete = null;
                    promptMensaje();
                }

            } catch (e) {
                console.log(`   [ADVERTENCIA] Respuesta no es JSON válido (posible alteración/corrupción de trama). Ignorando...`);
                // Ignoramos la basura, el Timeout del paquete original actuará
            }
        }
    });

    client.on('close', () => {
        console.log('\n[DESCONECTADO] Conexión finalizada por el servidor.');
        rl.close();
        process.exit(0);
    });

    client.on('error', (err) => {
        console.log(`\n[ERROR DE CONEXIÓN]: ${err.message}`);
        rl.close();
        process.exit(1);
    });
}

function enviarConReintentos() {
    if (reintentos >= MAX_REINTENTOS) {
        console.log(`\n[ERROR] Se alcanzó el número máximo de reintentos (${MAX_REINTENTOS}). El canal parece estar caído.`);
        reintentos = 0;
        ultimoPaquete = null;
        promptMensaje();
        return;
    }

    const jsonString = JSON.stringify(ultimoPaquete) + "\n";
    if (reintentos === 0) {
        console.log(`[ENVIANDO]: ${jsonString.trim()}`);
    } else {
        console.log(`[RETRANSMISIÓN ${reintentos}/${MAX_REINTENTOS}]: ${jsonString.trim()}`);
    }
    
    client.write(jsonString);
    
    if (timerTimeout) clearTimeout(timerTimeout);
    timerTimeout = setTimeout(() => {
        console.log(`\n[!] TIMEOUT: No se recibió respuesta en ${TIMEOUT_MS}ms. Retransmitiendo...`);
        reintentos++;
        enviarConReintentos();
    }, TIMEOUT_MS);
}

/**
 * Pide al usuario un mensaje por la consola
 */
function promptMensaje() {
    if (ultimoPaquete !== null) return; // Ya hay un paquete en vuelo

    rl.question('\n> Escriba un mensaje para enviar (o "salir"): ', (texto) => {
        const input = texto.trim();

        if (input.toLowerCase() === 'salir' || input.toLowerCase() === 'exit') {
            console.log('\nCerrando conexión...');
            client.end();
            return;
        }

        if (input.length === 0) {
            promptMensaje();
            return;
        }

        // Estructura del protocolo acordado en JSON
        ultimoPaquete = {
            HEADER: {
                TIPO: "REQ",
                SECUENCIA: seqNum++,
                LONGITUD: Buffer.byteLength(input, 'utf8'),
                CRC32: calcularCrc32(input)
            },
            PAYLOAD: input
        };

        reintentos = 0;
        enviarConReintentos();
    });
}

// Permitir especificar puerto por argumento de terminal (ej: node cliente.js 8080)
const puertoArg = process.argv[2] ? parseInt(process.argv[2]) : PORT;
conectar(puertoArg);
