/** Exibe centavos como moeda brasileira; valores ausentes têm estado explícito. */
export function money(cents, currency = 'BRL') {
  return cents == null ? 'Sem preço' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100);
}

/** Converte texto externo em conteúdo seguro para templates HTML. */
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export const categoryNames = { audio: 'Áudio', casa: 'Casa & conforto', informatica: 'Informática', acessorios: 'Acessórios' };
export function categoryName(value) { return categoryNames[value] || value || 'Sem categoria'; }
export function sourceName(value) { return ({ demo: 'Demonstração', manual: 'Cadastro manual', mercadolivre: 'Mercado Livre' })[value] || 'Origem desconhecida'; }
export function dateLabel(value) { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(new Date(value)); }
