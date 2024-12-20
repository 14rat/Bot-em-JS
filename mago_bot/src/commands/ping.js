const fs = require('fs');
const path = require('path');

module.exports = async function handlePing(msg, sock) {
  const start = Date.now();

  // Envia a mensagem de "Pong"
  await sock.sendMessage(msg.key.remoteJid, {
    text: "🏓 Pong! Calculando o tempo de resposta...\n",
  });

  const end = Date.now();
  const ping = end - start;

  // Interpolação correta da string
  const responseText = `📶 Tempo de Resposta: ${ping}ms\n`;

  // Chama a função para enviar a mensagem com a reação
  await sendMessageWithReaction(msg, sock, responseText, "🏓");

  // Caminho do arquivo de áudio (ajustado para o diretório correto)
  const audioPath = path.join(__dirname, '../output.mp4');  // Usando mp4 como formato de áudio para o WhatsApp

  // Envia o áudio como arquivo
  await enviarAudioGravacao(msg, audioPath, sock);
};

async function sendMessageWithReaction(msg, sock, text, emoji) {
  // Envia a mensagem de texto
  await sock.sendMessage(msg.key.remoteJid, { text: `${text}\n` });

  // Envia a reação
  await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
}

// Função para enviar áudio
const enviarAudioGravacao = async (message, arquivo, sock) => {
  try {
    await sock.sendMessage(message.key.remoteJid, {
      audio: fs.readFileSync(arquivo),
      mimetype: "audio/mp4",  
      ptt: true,             
    }, { quoted: message });
    console.log('Áudio enviado com sucesso!');
  } catch (error) {
    console.error('Erro ao enviar áudio:', error);
  }
};
