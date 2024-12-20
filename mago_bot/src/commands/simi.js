const { getSimSimiResponse } = require("../utils/simi-api");

module.exports = async function handleSimi(msg, sock, args) {
  // Verifica se a variável simiAtivo está ativa. Isso pode ser feito diretamente do bot.js, já que é o que controla isso.
  // Se não estiver ativo, não responde.
  const question = msg.message ? msg.message.text.trim() : '';  // Obtém o texto da mensagem do usuário

  if (simiAtivo && question) {
    try {
      const response = await getSimSimiResponse(question);  // Envia a mensagem para a API SimSimi
      await sendMessageWithReaction(msg, sock, response + `\n\n`, "🐥");  // Responde com a mensagem da API SimSimi
    } catch (error) {
      await sendMessageWithReaction(msg, sock, `*Erro ao se comunicar com a API SimSimi:* ${error.message}\n\n`, "❌");
    }
  }
};

// Função para enviar a mensagem com reação
async function sendMessageWithReaction(msg, sock, text, emoji) {
  await sock.sendMessage(msg.key.remoteJid, { text: `${text}\n\n` });  // Envia a mensagem para o chat
  await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });  // Reage à mensagem
}
