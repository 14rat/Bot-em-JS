module.exports = async function handleFechar(msg, sock, isOwner) {
  if (!isOwner) {
    await sendMessageWithReaction(msg, sock, "*Você não tem permissão para usar este comando.*", "❌");
    return;
  }

  const botAdmin = await isBotAdmin(msg.key.remoteJid, sock);
  if (!botAdmin) {
    await sendMessageWithReaction(msg, sock, "*Não posso fechar o grupo porque não sou administrador.*", "❌");
    return;
  }

  await sock.groupSettingUpdate(msg.key.remoteJid, "announcement");
  await sendMessageWithReaction(msg, sock, "*O grupo foi fechado!* 🔒", "✅");
};

// Função para verificar se o bot é administrador
async function isBotAdmin(groupId, sock) {
  try {
    const groupMetadata = await sock.groupMetadata(groupId);
    const botId = sock.user.id || sock.info.me.id;

    const botAdmin = groupMetadata.participants.find(participant => participant.id === botId && participant.admin);
    return botAdmin ? true : false;
  } catch (error) {
    console.error("Erro ao verificar se o bot é administrador:", error);
    return false;
  }
}

async function sendMessageWithReaction(msg, sock, text, emoji) {
  await sock.sendMessage(msg.key.remoteJid, { text: `${text}\n\n` });
  await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
}
