const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const { PREFIX, OWNER_PHONE_NUMBER } = require('./config');
const { comandoAdivinha, tentarAdivinhar } = require('./commands/advinha');
const comandoInfo = require('./commands/info');
const comandoVoz = require('./commands/voz');
const { createStickerCommand } = require('./commands/sticker');
const { downloadYouTubeVideo } = require('./commands/youtube');
const { checkUrlCommand } = require('./commands/checkurl');
const { getSimSimiResponse } = require('./utils/simi-api');

let botStartTime = Date.now();
let aguardandoAudio = new Set();
let stickerMode = false;
let simiAtivo = false;

async function startBot() {
  console.log("Iniciando o bot...");

  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  console.log("Estado de autenticação carregado");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Desativa o QR Code no terminal
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (update) => handleConnectionUpdate(update, sock));

  // Adiciona o ouvinte para 'messages.upsert', que será chamado toda vez que uma nova mensagem chegar
  sock.ev.on('messages.upsert', async (m) => {
    // Chama handleMessage para processar as mensagens recebidas
    await handleMessage(m, sock);
  });
}

// Função para tratar eventos de conexão
function handleConnectionUpdate(update, sock) {
  console.log("Conexão atualizada:", update);

  const { connection, qr, lastDisconnect } = update;

  if (connection === 'open') {
    console.log("Conexão aberta com sucesso!");
  }

  // Gerar o QR Code se ele for recebido
  if (qr) {
    console.log('QR Code Recebido!');
    generateQRCode(qr); // Chama a função para gerar o QR Code
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
}

// Função para gerar o QR Code e salvar como imagem
function generateQRCode(qr) {
  const qrImagePath = path.join(__dirname, 'QRCODE', 'qr-code.png');  // Caminho para salvar o QR Code
  const qrDir = path.dirname(qrImagePath);

  // Verifica se o diretório existe, se não, cria
  if (!fs.existsSync(qrDir)) {
    console.log(`Criando diretório: ${qrDir}`);
    fs.mkdirSync(qrDir, { recursive: true });
  }

  // Gera o QR Code e salva como imagem PNG
  qrcode.toFile(qrImagePath, qr, { type: 'png' }, (err) => {
    if (err) {
      console.error("Erro ao gerar o QR Code:", err);
    } else {
      console.log(`QR Code salvo em ${qrImagePath}.`);
    }
  });
}

async function handleMessage({ messages }, sock) {
  const msg = messages[0];
  console.log("Mensagem processada:", msg);

  if (!msg.message || msg.key.fromMe) return;

  if (msg.message.audioMessage) {
    console.log("Mensagem de áudio detectada!");
    return await handleVoiceMessage(msg, sock); 
  }

  const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

  if (text && text.startsWith(PREFIX)) {
    const commandText = text.slice(PREFIX.length).trim();
    const [command, ...args] = commandText.split(" ");
    const isOwner = msg.key.remoteJid === OWNER_PHONE_NUMBER;

    console.log("Comando identificado:", command);
    
    // Processando os comandos para ativar/desativar o SimSimi
    if (command === 'simi' && args[0] !== 'desativar') {
      simiAtivo = true;  // Ativando o SimSimi
      await sendMessageWithReaction(msg, sock, "*SimSimi ativado. Agora, pode enviar mensagens para o SimSimi responder!*", "✅");
      return;
    }

    if (command === 'simi' && args[0] === 'desativar') {
      simiAtivo = false;  // Desativando o SimSimi
      await sendMessageWithReaction(msg, sock, "*SimSimi desativado. O bot não vai mais responder às suas mensagens.*", "❌");
      return;
    }

    // Se o SimSimi estiver ativado, responder automaticamente com as mensagens subsequentes
    if (simiAtivo && text) {
      const simiResponse = await getSimSimiResponse(text);  // Chama a função que processa a resposta do SimSimi
      await sendMessageWithReaction(msg, sock, simiResponse, "🐥");  // Envia a resposta com reação
      return;
    }


    if (command === 'sticker') {
      stickerMode = true;
      await sendMessageWithReaction(msg, sock, "*Modo de figurinha ativado. Envie uma mídia para criar uma figurinha.*", "✅");
      return;
    }

    if (command === 'checkurl') {
      console.log('Comando !checkurl detectado');
      await checkUrlCommand(msg, sock, args);
      return;
    }

    if (command === 'youtube') {
      await downloadYouTubeVideo(msg, sock, args);
      return;
    }

    if (command === 'encurtaurl') {
      console.log('Comando !encurtaurl detectado');
      const url = args.join(" ").trim();
      console.log("URL a ser encurtada:", url);
      const urlEncurtada = await require('./commands/encurtaurl')(msg, sock, url);
      return;
    }

    const commandHandlers = getCommandHandlers();
    if (commandHandlers[command]) {
      console.log("Comando encontrado no manipulador:", command);
      await commandHandlers[command](msg, sock, args, isOwner); 
    } else {
      console.log(`Comando não encontrado: ${command}`);
      await sendMessageWithReaction(msg, sock, "*Comando não encontrado. Tente novamente.*", "❌");
    }
  }

  if (stickerMode && (msg.message.imageMessage || msg.message.videoMessage || msg.message.gifMessage)) {
    console.log("Mídia recebida para sticker:", msg.message);
    try {
      await createStickerCommand(msg, sock);
      stickerMode = false; 
    } catch (error) {
      console.error('Erro ao processar a figurinha:', error);
      await sock.sendMessage(msg.key.remoteJid, { text: 'Houve um erro ao criar a figurinha. Tente novamente mais tarde.' });
    }
  }
}

async function sendMessageWithReaction(msg, sock, text, emoji) {
  await sock.sendMessage(msg.key.remoteJid, { text: `${text}\n\n` });
  await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
}

function getCommandHandlers() {
  return {
    ping: require('./commands/ping'),
    calcular: require('./commands/calcular'),
    criador: require('./commands/criador'),
    menu: require('./commands/menu'),
    dono: require('./commands/dono'),
    gpt: require('./commands/gpt'),
    simi: require('./commands/simi'),
    imagem: require('./commands/imagem'),
    adivinha: comandoAdivinha,
    moeda: require('./commands/moeda'),
    dado: require('./commands/dado'),
    uptime: require('./commands/uptime'),
    fechar: require('./commands/fechar'),
    info: require('./commands/info'),
    noticias: require('./commands/noticias'),
  };
}

async function handleVoiceMessage(msg, sock) {
  console.log("Entrou na função handleVoiceMessage!");

  if (aguardandoAudio.has(msg.key.remoteJid)) {
    console.log('Áudio recebido! Processando...');
    const audioUrl = msg.message.audioMessage.url;
    console.log("URL do áudio:", audioUrl);

    await comandoVoz(msg, sock, audioUrl); 
    aguardandoAudio.delete(msg.key.remoteJid);
  } else {
    console.log("Áudio recebido, mas não estava aguardando áudio.");
    await sendMessageWithReaction(msg, sock, "Envie o comando !áudio primeiro para começar a captura.", "❌");
  }
}

startBot();
