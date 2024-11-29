const { MessageType } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { enviarAudioParaAPI } = require('../utils/voz-api'); 
const mime = require('mime');  
const crypto = require('crypto');

module.exports = async (msg, sock) => {
  const message = msg.message;

  console.log("Função de áudio (voz.js) chamada!"); 

  if (message && message.audioMessage) {
    console.log("Iniciando o processamento do áudio...");  
    const audioMessage = message.audioMessage;

    // Extraímos a URL do áudio
    const audioUrl = audioMessage.url;
    console.log('URL do áudio:', audioUrl); 

    if (audioUrl) {
      try {
        // Fazendo o download do áudio usando a URL
        const response = await downloadAudio(audioUrl);

        
        if (response) {
          const { filePath, data } = response;

          // Salva o áudio no diretório
          fs.writeFileSync(filePath, data);
          console.log(`Áudio salvo em ${filePath}`);

      
          await sock.sendMessage(msg.key.remoteJid, { text: `Mensagem de voz recebida e salva em ${filePath}` });
          const apiResponse = await enviarAudioParaAPI(filePath);

          console.log("Resposta da API:", apiResponse);
          
          if (apiResponse.audio) {
            console.log("Áudio gerado retornado pela API com sucesso.");

            await sock.sendMessage(msg.key.remoteJid, {
              audio: Buffer.from(apiResponse.audio, 'base64'),
              mimetype: 'audio/ogg',
              ptt: true
            });

          } else if (apiResponse.transcricao) {
            console.log("Transcrição retornada pela API:", apiResponse.transcricao);

            await sock.sendMessage(msg.key.remoteJid, {
              text: `Transcrição do áudio: ${apiResponse.transcricao}\nFiltrado: ${apiResponse.filtrado || "N/A"}`
            });

          } else if (apiResponse.resultados) {
            console.log("Resultados da pesquisa:", apiResponse.resultados);

            const resultadosFormatados = apiResponse.resultados.map(item => {
              return `**${item.titulo}**\n${item.link}\n${item.descricao}\n—`;
            }).join('\n');

            // Enviar os resultados formatados para o usuário
            await sock.sendMessage(msg.key.remoteJid, { text: resultadosFormatados });

          } else {
            console.error("A API não retornou áudio nem transcrição.");
            await sock.sendMessage(msg.key.remoteJid, { text: "Erro: A API não retornou áudio nem transcrição válidos." });
          }
        } else {
          throw new Error('Erro ao baixar o áudio.');
        }
      } catch (error) {
        console.error("Erro ao baixar ou processar o áudio:", error.message);
        await sock.sendMessage(msg.key.remoteJid, { text: "Houve um erro ao tentar baixar ou processar o áudio." });
      }
    } else {
      console.log("URL da mensagem de voz não encontrada.");
      await sock.sendMessage(msg.key.remoteJid, { text: "Não foi possível encontrar a URL do áudio enviado." });
    }
  } else {
    console.log("A mensagem não contém um áudio válido.");
    await sock.sendMessage(msg.key.remoteJid, { text: "Por favor, envie uma mensagem de áudio válida." });
  }
};

async function downloadAudio(url) {
  const retryAttempts = 3;  
  let attempts = 0;

  while (attempts < retryAttempts) {
    try {
      attempts++;
      console.log(`Tentando baixar o áudio... Tentativa ${attempts} de ${retryAttempts}`);

      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'arraybuffer',
      });

      console.log(`Resposta recebida com status: ${response.status}`);
      const mimeType = response.headers['content-type'];
      console.log('Tipo MIME do arquivo:', mimeType);

      if (mimeType && mimeType.startsWith('audio/')) {
        const fileExtension = mime.getExtension(mimeType);  
        const filePath = path.join(__dirname, 'audios', `${crypto.randomBytes(8).toString('hex')}.${fileExtension}`);

        return { filePath, data: response.data }; 
      }
      if (mimeType === 'application/octet-stream') {
        console.log("Tipo MIME genérico detectado, tratando como áudio...");
        const filePath = path.join(__dirname, 'audios', `${crypto.randomBytes(8).toString('hex')}.ogg`);
        return { filePath, data: response.data };  
      }

      throw new Error('O arquivo não é um áudio válido.');
    } catch (error) {
      console.error(`Erro ao baixar o áudio, tentativa falhou: ${error.message}`);
      if (attempts === retryAttempts) {
        console.error('Número de tentativas excedido. Não foi possível baixar o áudio.');
        return null;
      }
    }
  }
}
