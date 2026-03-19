import test from 'node:test';
import assert from 'node:assert/strict';

import QuestPackService from '../../dist/systems/quest/QuestPackService.js';
import { createFetchStub, ScriptedQuestRandom } from '../helpers/questTestDoubles.js';

const FILES = {
  adjectives: 'ashen broken crimson',
  nouns: 'causeway orchard chapel',
  prepositions: 'beyond under within',
  weapons: 'blade spear torch',
  given: 'lena orik tala',
  family: 'vale thorn dusk',
  trader_roles: 'broker courier healer',
  species: 'wyrm ghast fiend',
};

function createFileReader() {
  return async (path) => {
    const key = Object.keys(FILES).find(name => path.includes(name));
    return FILES[key];
  };
}

test('QuestPackService falls back to local and echo sources when remote APIs are unavailable', async () => {
  const random = new ScriptedQuestRandom({ ints: [3], picks: ['local-pattern', ['ADJECTIVE', 'NOUN', 'PREPOSITION'], 'ashen', 'causeway', 'beyond'] });
  const fetchImpl = createFetchStub({
    'restcountries.com': new Error('offline'),
    'randomuser.me': new Error('offline'),
  });
  const service = new QuestPackService({ fetchImpl, random, fileReader: createFileReader() });

  const result = await service.generateName('location', 4);

  assert.equal(result.text.split(' ').length, 3);
  assert.equal(result.sourceTypes.every(type => type === 'local-pattern'), true);
  assert.equal(result.text.includes('Causeway'), true);
});

test('QuestPackService uses remote location packs only after successful availability checks', async () => {
  const random = new ScriptedQuestRandom({
    ints: [2],
    picks: [
      { common: 'glass harbor' },
      'glass harbor',
      'remote-location',
      { common: 'glass harbor' },
      'glass harbor',
    ],
  });
  const fetchImpl = createFetchStub({
    'restcountries.com': [{ name: { common: 'glass harbor' }, capital: ['mist bay'], region: 'north reach', subregion: 'inner rim' }],
    'randomuser.me': new Error('offline'),
  });
  const service = new QuestPackService({ fetchImpl, random, fileReader: createFileReader() });

  const result = await service.generateName('location', 3);

  assert.equal(result.text, 'Glass Harbor');
  assert.deepEqual(result.sourceTypes, ['remote-location']);
});

test('QuestPackService can use the remote name source for character packs', async () => {
  const random = new ScriptedQuestRandom({ ints: [2], picks: ['remote-name'] });
  const fetchImpl = createFetchStub({
    'restcountries.com': new Error('offline'),
    'randomuser.me': { results: [{ name: { first: 'Mira', last: 'Stone' } }] },
  });
  const service = new QuestPackService({ fetchImpl, random, fileReader: createFileReader() });

  const result = await service.generateName('character', 3);

  assert.equal(result.text, 'Mira Stone');
  assert.deepEqual(result.sourceTypes, ['remote-name']);
});
