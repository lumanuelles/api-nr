import { put, del } from '@vercel/blob';

/**
 * Faz upload de um buffer de imagem para o Vercel Blob Storage
 * @param {string} _bucket - Parâmetro ignorado (mantido para compatibilidade)
 * @param {string} path - Caminho/nome do arquivo no storage
 * @param {Buffer} buffer - Buffer com os dados da imagem
 * @param {string} contentType - MIME type da imagem (ex: 'image/jpeg', 'image/png')
 * @returns {Promise<string>} URL pública da imagem
 */
export async function uploadImageBuffer(_bucket, path, buffer, contentType = 'image/jpeg') {
  try {
    const blob = await put(path, buffer, {
      access: 'public',
      contentType,
      addRandomSuffix: false, // Usamos nosso próprio sistema de nomes únicos
    });

    return blob.url;
  } catch (error) {
    console.error('Erro ao fazer upload da imagem:', error);
    throw new Error(`Falha no upload da imagem: ${error.message}`);
  }
}

/**
 * Remove uma imagem do Vercel Blob Storage
 * @param {string} _bucket - Parâmetro ignorado (mantido para compatibilidade)
 * @param {string} urlOrPath - URL completa ou caminho da imagem
 * @returns {Promise<void>}
 */
export async function removeImage(_bucket, urlOrPath) {
  try {
    // Se for uma URL completa, usa diretamente
    // Se for apenas um path, tenta deletar mesmo assim
    await del(urlOrPath);
  } catch (error) {
    console.error('Erro ao remover imagem:', error);
    // Não lança erro para não interromper operações críticas
    // Log de warning já é suficiente
  }
}

/**
 * Extrai o caminho/URL de uma URL pública do Vercel Blob
 * Para Vercel Blob, retornamos a URL completa para usar no del()
 * @param {string} url - URL pública da imagem
 * @param {string} _bucket - Parâmetro ignorado (mantido para compatibilidade)
 * @returns {string} URL completa para deleção
 */
export function extractPathFromPublicUrl(url, _bucket) {
  // Vercel Blob usa URLs completas para deleção
  // Retornamos a URL original
  return url;
}