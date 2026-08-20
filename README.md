# Parcial III: Comunicaciones II

## 📌 Roles del Equipo
* **Estudiante A**: Servidor en Python (`servidor.py`)
* **Estudiante B**: Cliente en Node.js (`cliente.js`)
* **Estudiante C**: Agente de Adversidad / Proxy Atacante (`proxy_atacante.py`)

---

## 🚀 Instrucciones de Ejecución (Fase 1)

### 1. Iniciar el Servidor (Estudiante A - Terminal 1)
```bash
python3 servidor.py
```
*Escucha en el puerto `65432`.*

### 2. Iniciar el Cliente (Estudiante B - Terminal 2)
```bash
node cliente.js
```
*Se conecta directamente al puerto `65432` del servidor.*

---

## 🛡️ Probar la Fase 2 (Con Proxy Atacante)

### 1. Iniciar Servidor (Terminal 1)
```bash
python3 servidor.py
```

### 2. Iniciar Proxy Atacante (Terminal 2)
```bash
python3 proxy_atacante.py
```
*Escucha en el puerto `8080` e intercepta el tráfico hacia el puerto `65432`.*

### 3. Iniciar Cliente apuntando al Proxy (Terminal 3)
```bash
node cliente.js 8080
```
