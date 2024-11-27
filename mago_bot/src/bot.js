const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { PREFIX, OWNER_PHONE_NUMBER } = require("./config");
const { comandoAdivinha, tentarAdivinhar } = require("./commands/advinha");
const comandoInfo = require("./commands/info");
const comandoVoz = require("./commands/voz"); 

let botStartTime = Date.now();
let adivinhaActive = false;
let secretNumber = null;
let gameChat = null;

async function startBot() {
  console.log("Iniciando o bot...");

  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  console.log("Estado de autenticação carregado");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (connection === 'open') {
      console.log("Conexão aberta com sucesso!");
    }

    if (qr) {
      console.log('QR Code Recebido!');
      const qrImagePath = path.join(__dirname, 'src', 'QRCODE', 'qr-code.png');
      const qrDir = path.dirname(qrImagePath);
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }

      qrcode.toFile(qrImagePath, qr, { type: 'png' }, (err) => {
        if (err) {
          console.error("Erro ao gerar o QR code: ", err);
        } else {
          console.log(`QR Code salvo em ${qrImagePath}.`);
        }
      });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        console.log("Reconectando...");
        startBot();
      } else {
        console.log("Bot foi desconectado permanentemente.");
      }
    }
  });

  sock.ev.on('messages.upsert', (message) => handleMessage(message, sock));
}

async function handleMessage({ messages }, sock) {
  const msg = messages[0];
  if (!msg.message || msg.key.fromMe) return;

  const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
  if (!text) return;

  if (!text.startsWith(PREFIX)) return;

  const commandText = text.slice(PREFIX.length).trim();
  const command = normalizeCommand(commandText.split(" ")[0]);
  const args = commandText.slice(command.length).trim();
  const argsArray = args ? [args] : [];

  const isOwner = msg.key.remoteJid === OWNER_PHONE_NUMBER;

  const commandHandlers = {
    ping: require("./commands/ping"),
    calcular: require("./commands/calcular"),
    criador: require("./commands/criador"),
    menu: require("./commands/menu"),
    dono: require("./commands/dono"),
    gpt: require("./commands/gpt"),
    simi: require("./commands/simi"),
    imagem: require("./commands/imagem"),
    adivinha: comandoAdivinha,
    moeda: require("./commands/moeda"),
    dado: require("./commands/dado"),
    uptime: require("./commands/uptime"),
    fechar: require("./commands/fechar"),
    audio: handleAudio,
    info: comandoInfo,  
  };

  if (commandHandlers[command]) {
    await commandHandlers[command](msg, sock, argsArray, isOwner);
  } else {
    await sendMessageWithReaction(msg, sock, "*Comando não encontrado. Tente novamente.*", "❌");
    console.log(`Comando não encontrado: ${command}`);
  }
}

async function handleAudio(msg, sock, args, isOwner, isAdmin) {
  const isVoiceMessage = msg.message.audioMessage;

  if (isVoiceMessage) {
    await comandoVoz(msg, sock);
  } else {
    await sendMessageWithReaction(msg, sock, "Por favor, envie um áudio após o comando !audio", "❌");
  }
}

async function sendMessageWithReaction(msg, sock, text, emoji) {
  await sock.sendMessage(msg.key.remoteJid, { text: `${text}\n\n` });
  await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
}

function normalizeCommand(command) {
  return command.trim().toLowerCase();
}

startBot();
