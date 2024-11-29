module.exports = async (msg, sock, args, isOwner) => {
  console.log("Comando 'fechar' chamado.");

  // Verifica se a pessoa que executou o comando é o dono
  if (!isOwner) {
    await sock.sendMessage(msg.key.remoteJid, {
      text: "*Você não tem permissão para usar este comando.*\n\n" + getMessageEnd(),
    });
    return;
  }

  // Verifica se o bot é administrador do grupo
  const botAdmin = await isBotAdmin(msg.key.remoteJid, sock);
  if (!botAdmin) {
    console.log("O bot não é administrador, não pode fechar o grupo.");
    await sendErrorMessage(sock, msg, "*Não posso fechar o grupo porque não sou administrador.*");
    return;
  }

  // Tenta fechar o grupo
  try {
    console.log("Tentando fechar o grupo...");
    await sock.groupSettingUpdate(msg.key.remoteJid, "announcement");
    await sock.sendMessage(msg.key.remoteJid, {
      text: "*O grupo foi fechado!* 🔒\n\n" + getMessageEnd(),
    });
  } catch (error) {
    console.error("Erro ao tentar fechar o grupo:", error);
    await sendErrorMessage(sock, msg, "*Ocorreu um erro ao tentar fechar o grupo.*");
  }
}

// Função para verificar se o bot é administrador
async function isBotAdmin(groupId, sock) {
  try {
    const groupMetadata = await sock.groupMetadata(groupId);
    const botId = sock.user.id || sock.info.me.id;

    const botPhoneNumber = botId.split(":")[0];
    console.log("ID do bot:", botPhoneNumber);

    return groupMetadata.participants.some(participant => {
      const adminStatus = (participant.admin || '').trim();
      const participantId = participant.id.split(":")[0];

      console.log("Verificando participante:", participantId);
      console.log("Admin Status:", adminStatus);

      return participantId === botPhoneNumber && adminStatus === 'admin';
    });
  } catch (error) {
    console.error("Erro ao verificar se o bot é administrador:", error);
    return false;
  }
}

// Função de envio de mensagem de erro
async function sendErrorMessage(sock, msg, message) {
  await sock.sendMessage(msg.key.remoteJid, {
    text: message + "\n\n" + getMessageEnd(),
  });
  await sock.sendMessage(msg.key.remoteJid, {
    react: { text: "❌", key: msg.key },
  });
}

function getMessageEnd() {
  return "Se precisar de ajuda, fale com o administrador!";
}
