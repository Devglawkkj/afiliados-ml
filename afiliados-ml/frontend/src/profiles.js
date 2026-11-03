/** Navegação de protótipo: não autentica usuários nem concede permissões na API. */
export const profiles = {
  seller: {
    name: 'Vendedor', initial: 'V', path: 'vendedor', home: 'catalog',
    description: 'Catálogo e anúncios',
    pages: [{ id: 'catalog', label: 'Catálogo', icon: '▦' }, { id: 'overview', label: 'Meu espaço', icon: '◈' }],
  },
  supplier: {
    name: 'Fornecedor', initial: 'F', path: 'fornecedor', home: 'overview',
    description: 'Estoque e logística',
    pages: [{ id: 'overview', label: 'Visão geral', icon: '◈' }, { id: 'inventory', label: 'Meu estoque', icon: '▤' }],
  },
};

/** Resolve somente páginas pertencentes ao perfil escolhido; URL não escolhe perfil. */
export function resolvePage(role, hash) {
  const profile = Object.hasOwn(profiles, role) ? profiles[role] : null;
  if (!profile) return null;
  const match = /^#\/([^/]+)\/([^/]+)$/.exec(hash);
  if (!match || match[1] !== profile.path) return profile.home;
  return profile.pages.some(page => page.id === match[2]) ? match[2] : profile.home;
}

/** Controla a sessão visual em memória, com reset explícito ao trocar de perfil. */
export function createProfileSession(onReset = () => {}) {
  let current = null;
  return {
    get current() { return current; },
    enter(role) {
      if (!Object.hasOwn(profiles, role)) throw new Error('Perfil de demonstração inválido.');
      onReset();
      current = role;
      return profiles[role];
    },
    leave() { onReset(); current = null; },
  };
}
