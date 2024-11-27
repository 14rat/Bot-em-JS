module.exports = async function handleImagem(msg, sock, args, buscarImagem) {
  const keyword = args.join(" ").trim();
  if (!keyword) {
    await sendMessageWithReaction(msg, sock, "*Por favor, forneça uma palavra-chave para a busca de imagem.*", "❌");
    return;
  }

  try {
    const imageBuffer = await buscarImagem(keyword);
    const tempFilePath = `./temp_image_${Date.now()}.jpg`;
    const fs = require("fs");
    fs.writeFileSync(tempFilePath, imageBuffer);

    await sock.sendMessage(msg.key.remoteJid, {
      image: { url: tempFilePath },
      caption: `Imagem relacionada a "${keyword}"\n\n`,
    });

    fs.unlinkSync(tempFilePath);
    await sendMessageWithReaction(msg, sock, "", "🖼️");
  } catch (error) {
    await sendMessageWithReaction(msg, sock, `*Erro ao buscar a imagem:* ${error.message}`, "❌");
  }
};

async function sendMessageWithReaction(msg, sock, text, emoji) {
  await sock.sendMessage(msg.key.remoteJid, { text: `${text}\n\n` });
  await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
}
