import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getAlphabet,
  getAttrLabel,
  getModePlural,
  getModeWord,
  getSortLabel,
  t,
  translationKeys,
} from '../src/i18n.ts';

describe('translations', () => {
  it('has the same keys in Russian and English', () => {
    const ru = new Set(translationKeys('ru'));
    const en = new Set(translationKeys('en'));
    const missingEn = [...ru].filter((key) => !en.has(key));
    const missingRu = [...en].filter((key) => !ru.has(key));
    assert.deepEqual(missingEn, []);
    assert.deepEqual(missingRu, []);
    assert.ok(ru.size > 50);
  });

  it('returns the key itself when a string is missing', () => {
    assert.equal(t('ru', 'no.such.key'), 'no.such.key');
  });

  it('switches alphabet, attributes, and mode words', () => {
    assert.equal(getAlphabet('ru')[0], 'А');
    assert.equal(getAlphabet('en')[0], 'A');
    assert.equal(getAlphabet('ru').includes('Ё'), false);
    assert.equal(getAttrLabel('ru', 'str'), 'СИЛА');
    assert.equal(getAttrLabel('en', 'agi'), 'AGILITY');
    assert.equal(getAttrLabel('ru', 'nope'), 'АТРИБУТ');
    assert.equal(getModeWord('ru', 'heroes', false), 'героем');
    assert.equal(getModeWord('ru', 'heroes', true), 'Героем');
    assert.notEqual(getModePlural('en', 'items'), getModePlural('ru', 'items'));
    assert.equal(getSortLabel('en', 'str', true), t('en', 'guesser.str'));
    assert.equal(getSortLabel('en', 'az', false), t('en', 'guesser.az'));
  });
});
