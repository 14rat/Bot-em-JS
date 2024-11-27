const axios = require('axios');
const API_KEY = 'SUA_CHAVE_DE_API';  

async function buscarImagem(keyword) {
  try {
    // FAZENDO REQUEST
    const response = await axios.get(`https://api.unsplash.com/search/photos`, {
      params: {
        query: keyword,
        client_id: API_KEY,
      },
    });

    if (response.data.results.length > 0) {
      // RETORNA URL
      return response.data.results[0].urls.full;
    } else {
      throw new Error('Nenhuma imagem encontrada.');
    }
  } catch (error) {
    console.error('Erro ao buscar imagem:', error);
    throw new Error('Erro ao buscar imagem.');
  }
}

module.exports = { buscarImagem };
