import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fetchLeaderboard, submitHighScore } from '../../engine/services/HighScoreService.js';

function createResponse({ ok = true, status = 200, statusText = 'OK', body = '' } = {}) {
    return {
        ok,
        status,
        statusText,
        async text() {
            return body;
        },
    };
}

function createAbortableFetch({ response, onAbort } = {}) {
    return (_, options = {}) => new Promise((resolve, reject) => {
        const signal = options.signal;
        if (signal) {
            if (signal.aborted) {
                onAbort?.(signal.reason);
                reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
                return;
            }
            signal.addEventListener('abort', () => {
                onAbort?.(signal.reason);
                reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
            }, { once: true });
        }
        if (response instanceof Error) {
            reject(response);
            return;
        }
        if (response === 'pending') {
            return;
        }
        resolve(response ?? createResponse());
    });
}

test('fetchLeaderboard returns sanitized top entries in score order', async () => {
    const payload = JSON.stringify([
        { name: ' Alice ', score: 3200 },
        { name: '', score: 5000 },
        { name: 'Bob', score: 6400.75 },
        { name: 'charlie', score: -5 },
        { name: 'Dana', score: 1200 },
        { name: 'Eve', score: 3100 },
        { name: 'Frank', score: 5200 },
        { name: 'Grace', score: 4800 },
        { name: 'Heidi', score: 4400 },
        { name: 'Ivan', score: 4300 },
        { name: 'Judy', score: 4200 },
        { name: 'Karl', score: 4100 },
    ]);
    const fetchCalls = [];
    const fetchStub = async (url, options) => {
        fetchCalls.push({ url, options });
        return createResponse({ body: payload });
    };
    const result = await fetchLeaderboard({ fetchImpl: fetchStub });
    assert.equal(result.success, true);
    assert.equal(result.entries.length, 10);
    assert.deepEqual(result.entries[0], { name: 'Bob', score: 6400 });
    assert.deepEqual(result.entries[1], { name: 'Frank', score: 5200 });
    assert.ok(result.entries.some(entry => entry.name === 'Neon Defender'));
    const aliceEntry = result.entries.find(entry => entry.name === 'Alice');
    assert.ok(aliceEntry);
    assert.equal(aliceEntry.score, 3200);
    assert.equal(fetchCalls.length, 1);
    assert.equal(fetchCalls[0].url, 'https://highscorewebservice.onrender.com/leaders');
});

test('fetchLeaderboard reports request failures with message', async () => {
    const fetchStub = async () => createResponse({ ok: false, status: 503, statusText: 'Service Unavailable' });
    const result = await fetchLeaderboard({ fetchImpl: fetchStub });
    assert.equal(result.success, false);
    assert.match(result.error, /503/);
});

test('fetchLeaderboard resolves timeout and aborts request', async () => {
    let abortReason = null;
    const fetchStub = createAbortableFetch({ response: 'pending', onAbort: (reason) => { abortReason = reason; } });
    const result = await fetchLeaderboard({ fetchImpl: fetchStub, timeout: 100 });
    assert.equal(result.success, false);
    assert.ok(abortReason instanceof Error);
    assert.match(result.error, /timed out/i);
});

test('submitHighScore posts sanitized payload', async () => {
    const calls = [];
    const fetchStub = async (url, options = {}) => {
        calls.push({ url, options });
        return createResponse({ body: JSON.stringify({ success: true }) });
    };
    const result = await submitHighScore({ name: ' Player One ', score: 9876.9 }, { fetchImpl: fetchStub });
    assert.equal(result.success, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://highscorewebservice.onrender.com/submit');
    assert.equal(calls[0].options.method, 'POST');
    const payload = JSON.parse(calls[0].options.body);
    assert.deepEqual(payload, { name: 'Player One', score: 9876 });
});

test('submitHighScore falls back to default name and handles errors', async () => {
    const fetchStub = async () => createResponse({ ok: false, status: 400, statusText: 'Bad Request' });
    const result = await submitHighScore({ name: '', score: 'oops' }, { fetchImpl: fetchStub });
    assert.equal(result.success, false);
    assert.match(result.error, /400/);
});

test('submitHighScore reports fetch rejection', async () => {
    const fetchStub = createAbortableFetch({ response: new Error('Network down') });
    const result = await submitHighScore({ name: 'Dana', score: 1234 }, { fetchImpl: fetchStub, timeout: 150 });
    assert.equal(result.success, false);
    assert.match(result.error, /Network down/);
});
