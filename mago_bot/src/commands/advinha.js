let adivinhaState = {}; 

async function comandoAdivinha(msg, sock) {
  const userId = msg.key.remoteJid;
  const min = 1;
  const max = 100;

  // Verifica se já existe um jogo de adivinhação em andamento
  if (adivinhaState[userId]) {
    await sock.sendMessage(userId, { text: "Você já está jogando! Tente adivinhar o número." });
    return;
  }


  const guessedNumber = Math.floor(Math.random() * (max - min + 1)) + min;
  adivinhaState[userId] = {
    guessedNumber,
    attempts: 0,
  };


  await sock.sendMessage(userId, {
    text: `🤔 Estou pensando em um número entre ${min} e ${max}. Tente adivinhar!`,
  });
}

async function tentarAdivinhar(msg, sock, userGuess) {
  const userId = msg.key.remoteJid;  
  const state = adivinhaState[userId]; 

  // Verifica se o usuário está jogando
  if (!state) {
    return;  
  }

  const { guessedNumber, attempts } = state;
  state.attempts += 1; 

 
  if (userGuess < guessedNumber) {
    await sock.sendMessage(userId, { text: `O número é maior que ${userGuess}. Tente novamente!` });
  } else if (userGuess > guessedNumber) {
    await sock.sendMessage(userId, { text: `O número é menor que ${userGuess}. Tente novamente!` });
  } else {
    await sock.sendMessage(userId, {
      text: `🎉 Parabéns! Você acertou o número ${guessedNumber} em ${state.attempts} tentativas!`,
    });
    delete adivinhaState[userId];
  }
}

module.exports = {
  comandoAdivinha,
  tentarAdivinhar,
};
