const { MessageType, downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); 

module.exports = async (msg, sock) => {
  const message = msg.message;

  // Verifica se a mensagem é uma mensagem de voz
  if (message && message.audioMessage) {
    const audioMessage = message.audioMessage;

   
    const audioUrl = audioMessage.url;

    if (audioUrl) {
      try {
        const response = await axios({
          method: 'get',
          url: audioUrl,
          responseType: 'arraybuffer', 
        });

        // Caminho para salvar o arquivo de áudio
        const filePath = path.join(__dirname, 'audios', `${msg.key.id}.ogg`);

       
        if (!fs.existsSync(path.dirname(filePath))) {
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
        }

        // Salva o áudio no diretório
        fs.writeFileSync(filePath, response.data);

        console.log(`Áudio salvo em ${filePath}`);

     
        await sock.sendMessage(msg.key.remoteJid, { text: `Mensagem de voz recebida e salva em ${filePath}` });

      } catch (error) {
        console.error("Erro ao baixar o áudio:", error);
        await sock.sendMessage(msg.key.remoteJid, { text: "Houve um erro ao tentar baixar a mensagem de voz." });
      }
    } else {
      console.log("URL da mensagem de voz não encontrada.");
    }
  } else {
    console.log("A mensagem não é uma mensagem de voz.");
  }
};
