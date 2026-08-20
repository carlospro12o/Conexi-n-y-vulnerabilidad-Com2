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
let PORT = 65432; // Puerto directo del servidor. Cambiar a 8080 para pasar por el proxy atacante.

let client = null;
let seqNum = 1;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

/**
 * Conecta al servidor TCP
 */
function conectar(port = PORT) {
    PORT = port;
    console.log(`\n[+] Conectando a ${HOST}:${PORT}...`);
    
    client = new net.Socket();

    client.connect(PORT, HOST, () => {
        console.log(`[✅ CONECTADO] Conexión establecida con ${HOST}:${PORT}`);
        promptMensaje();
    });

    client.on('data', (data) => {
        const rawResponse = data.toString().trim();
        console.log(`\n📥 [RESPUESTA DE SERVIDOR]: ${rawResponse}`);
        
        try {
            const parsed = JSON.parse(rawResponse);
            console.log(`   Estado: ${parsed.HEADER ? parsed.HEADER.ESTADO : 'OK'}`);
            console.log(`   Payload: "${parsed.PAYLOAD}"`);
        } catch (e) {
            console.log(`   ⚠️ Respuesta no es JSON válido (posible alteración/corrupción de trama).`);
        }

        promptMensaje();
    });

    client.on('close', () => {
        console.log('\n[🔌 DESCONECTADO] Conexión finalizada por el servidor.');
        rl.close();
        process.exit(0);
    });

    client.on('error', (err) => {
        console.log(`\n❌ [ERROR DE CONEXIÓN]: ${err.message}`);
        rl.close();
        process.exit(1);
    });
}

/**
 * Pide al usuario un mensaje por la consola
 */
function promptMensaje() {
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
        const paquete = {
            HEADER: { 
                TIPO: "REQ", 
                SECUENCIA: seqNum++ 
            },
            PAYLOAD: input
        };

        const jsonString = JSON.stringify(paquete) + "\n";
        console.log(`📤 [ENVIANDO]: ${jsonString.trim()}`);
        client.write(jsonString);
    });
}

// Permitir especificar puerto por argumento de terminal (ej: node cliente.js 8080)
const puertoArg = process.argv[2] ? parseInt(process.argv[2]) : PORT;
conectar(puertoArg);
