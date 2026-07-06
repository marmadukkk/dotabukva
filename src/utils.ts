// Helper: get image url
export function getEntryImage(short: string, mode: string): string {
  if (mode === 'items') return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${short}_lg.png`;
  if (mode === 'abilities') return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${short}.png`;
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${short}_lg.png`;
}

export function getAttrColor(attr: string): string {
  const colors: Record<string, string> = {
    'str': '#f97316', 'agi': '#22c55e', 'int': '#a855f7', 'uni': '#eab308',
    'item': '#60a5fa', 'neutral': '#a78bfa', 'ability': '#67e8f9'
  };
  return colors[attr] || '#71717a';
}
