/** Preferência visual isolada da autenticação e dos dados do catálogo. */
const KEY = 'garimpo.theme';
const choices = ['light', 'dark', 'system'];

/** Resolve uma preferência, incluindo valores antigos ou inválidos. */
export function resolveTheme(preference, systemDark) {
  return ['light', 'dark'].includes(preference) ? preference : systemDark ? 'dark' : 'light';
}

/** Lê somente a aparência; navegadores que bloqueiam storage usam o sistema. */
export function readPreference(storage) {
  try {
    const value = storage?.getItem(KEY);
    return choices.includes(value) ? value : 'system';
  } catch { return 'system'; }
}

/** Grava apenas a preferência visual; falhas não impedem a troca nesta aba. */
export function savePreference(storage, value) {
  if (!choices.includes(value)) return;
  try { storage?.setItem(KEY, value); } catch { /* Storage indisponível. */ }
}

/** Liga o seletor acessível ao tema e acompanha mudanças do sistema quando escolhido. */
export function initializeTheme() {
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  let preference = readPreference(storage);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const select = document.getElementById('theme-select');
  const apply = () => {
    const theme = resolveTheme(preference, media.matches);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#101714' : '#f5f6f0';
    select.value = preference;
  };
  select.addEventListener('change', () => { preference = select.value; savePreference(storage, preference); apply(); });
  media.addEventListener('change', apply);
  apply();
}
