import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

interface HeroFile {
  heroes: { en: string; ru: string; short: string; attr: string }[];
}

describe('bundled hero list', () => {
  it('has a unique short name and a known attribute for every hero', () => {
    const file = JSON.parse(
      readFileSync(new URL('../public/data/heroes.json', import.meta.url), 'utf8'),
    ) as HeroFile;
    const shorts = new Set<string>();
    const attrs = new Set(['str', 'agi', 'int', 'uni']);
    assert.ok(file.heroes.length > 100);
    for (const hero of file.heroes) {
      assert.ok(hero.en.trim(), hero.short);
      assert.ok(hero.ru.trim(), hero.short);
      assert.equal(shorts.has(hero.short), false, hero.short);
      shorts.add(hero.short);
      assert.equal(attrs.has(hero.attr), true, `${hero.short} ${hero.attr}`);
    }
  });
});
