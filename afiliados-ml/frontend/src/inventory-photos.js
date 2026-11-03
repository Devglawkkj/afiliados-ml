/** Prepara fotos locais; nenhum arquivo é enviado a servidor. */
export async function preparePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    throw new Error('Cada foto deve ser JPG, PNG ou WebP e ter no máximo 5 MB.');
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.width * image.height > 40000000 || !image.width || !image.height) throw Error();
    const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/webp', .75);
    if (data.length > 360000) throw new Error('A foto continua grande após o ajuste. Use uma imagem menor.');
    return data;
  } catch (error) {
    throw new Error(error.message?.startsWith('A foto') ? error.message : 'Não foi possível preparar esta foto. Escolha outra imagem.');
  } finally { URL.revokeObjectURL(url); }
}
