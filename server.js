
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3000 });
let placar = {};

wss.on('connection', function connection(ws) {
    ws.send(JSON.stringify({ tipo: "ranking", placar }));

    ws.on('message', function incoming(message) {
        const dados = JSON.parse(message);

        if (dados.tipo === "pontuar") {
            placar[dados.nome] = dados.pontos;
        }

        broadcast();
    });
});

function broadcast() {
    const data = JSON.stringify({ tipo: "ranking", placar });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

console.log("Servidor rodando na porta 3000");
