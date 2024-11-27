module.exports = async function handleGpt(msg, sock, args, getGeminiResponse) {
  const question = args.join(" ");
  if (!question) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "*Por favor, forneça uma pergunta para a IA.*\n\n",
    });
    return;
  }

  try {
    const response = await getGeminiResponse(question);
    await sock.sendMessage(msg.key.remoteJid, {
      text: response + `\n\n`,
    });
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: "🤖", key: msg.key },
    });
  } catch (error) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: `*Erro ao acessar o GPT:* ${error.message}\n\n`,
    });
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key },
    });
  }
};
