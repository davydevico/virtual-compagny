/**
 * Avatars réalistes via randomuser.me — portraits photo pros, genre exact.
 * Chaque agent a un numéro fixe → toujours le même visage.
 */

const AGENT_AVATARS: Record<string, { gender: 'men' | 'women'; n: number }> = {
  // Tech
  Marcus:  { gender: 'men',   n: 75 },  // CTO — quadra, look sérieux
  Léa:     { gender: 'women', n: 44 },  // Frontend — jeune femme dynamique
  Omar:    { gender: 'men',   n: 32 },  // Backend
  Samy:    { gender: 'men',   n: 22 },  // DevOps
  Nina:    { gender: 'women', n: 65 },  // QA
  // Finance
  Rachel:  { gender: 'women', n: 91 },  // CFO — executive
  Pierre:  { gender: 'men',   n: 51 },  // Comptable
  Julie:   { gender: 'women', n: 33 },  // Analyste
  // Marketing
  Sophie:  { gender: 'women', n: 62 },  // CMO
  Tom:     { gender: 'men',   n: 28 },  // SEO
  // Design
  Inès:    { gender: 'women', n: 50 },  // Designer
  // Opérations
  David:   { gender: 'men',   n: 69 },  // COO
  Camille: { gender: 'women', n: 15 },  // Customer Success
  Alex:    { gender: 'men',   n: 19 },  // PM
};

export function avatarUrl(name: string, _size = 80): string {
  const cfg = AGENT_AVATARS[name];
  if (!cfg) {
    // fallback générique par initiale
    const n = name.charCodeAt(0) % 50;
    return `https://randomuser.me/api/portraits/men/${n}.jpg`;
  }
  return `https://randomuser.me/api/portraits/${cfg.gender}/${cfg.n}.jpg`;
}
