// Executa antes da primeira pintura para evitar clarão ao restaurar o tema.
(() => {
  let preference = 'system';
  try { preference = localStorage.getItem('garimpo.theme') || 'system'; } catch { /* Preferência continua disponível nesta aba. */ }
  const theme = ['light', 'dark'].includes(preference) ? preference : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();
