import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildRoomWsUrl } from '../src/multiplayer/config.ts';
import { getAttrColor, getEntryImage } from '../src/utils.ts';
import { NEWS_ITEMS } from '../src/constants/news.ts';
import { clampMusicTrackIndex, MUSIC_TRACKS, readStoredMusicTrack } from '../src/constants/music.ts';
import { installMemoryStorage } from './storage.ts';

describe('room urls', () => {
  it('builds a LAN socket url and skips local sessions', () => {
    assert.equal(
      buildRoomWsUrl({
        code: 'ab12cd',
        role: 'leader',
        transport: 'lan',
        host: '10.0.0.8',
        port: 17432,
      }),
      'ws://10.0.0.8:17432/ws?role=leader&room=AB12CD',
    );
    assert.equal(buildRoomWsUrl({ code: 'AB12CD', role: 'guesser', transport: 'local' }), null);
    assert.equal(buildRoomWsUrl({ code: 'AB12CD', role: 'guesser', transport: 'none' }), null);
  });
});

describe('entry images and attribute colors', () => {
  it('picks the steam path for the mode', () => {
    assert.match(getEntryImage('pudge', 'heroes'), /heroes\/pudge_lg\.png$/);
    assert.match(getEntryImage('blink', 'items'), /items\/blink_lg\.png$/);
    assert.match(getEntryImage('pudge_meat_hook', 'abilities'), /abilities\/pudge_meat_hook\.png$/);
  });

  it('has a color for each attribute and a fallback', () => {
    for (const attr of ['str', 'agi', 'int', 'uni', 'item', 'neutral', 'ability']) {
      assert.match(getAttrColor(attr), /^#[0-9a-f]{6}$/);
    }
    assert.equal(getAttrColor('nope'), '#71717a');
  });
});

describe('news and music', () => {
  it('publishes every news item in both languages', () => {
    assert.ok(NEWS_ITEMS.length > 0);
    for (const item of NEWS_ITEMS) {
      assert.ok(item.title.ru && item.title.en);
      assert.ok(item.body.ru && item.body.en);
      assert.match(item.date, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('wraps the soundtrack index', () => {
    installMemoryStorage();
    assert.equal(clampMusicTrackIndex(0), 0);
    assert.equal(clampMusicTrackIndex(MUSIC_TRACKS.length), 0);
    assert.equal(clampMusicTrackIndex(-1), MUSIC_TRACKS.length - 1);
    localStorage.setItem('dota_bukva_music_track', '5');
    assert.equal(readStoredMusicTrack(), 5 % MUSIC_TRACKS.length);
  });
});
