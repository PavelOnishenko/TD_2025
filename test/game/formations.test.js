import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFormationText, createFormationManager } from '../../js/core/game/formations.js';

const sampleDefinitions = `
# Alpha Sweep | difficulty=2 | probability=2
swarm @0 y=600 color=red
swarm @0.5 y=640 color=blue
---
# Beta Strike | difficulty=1 | probability=5
 tank @0 y=580 color=blue
`;

test('parseFormationText builds formation descriptors', () => {
    const formations = parseFormationText(sampleDefinitions);
    assert.equal(formations.length, 2);
    const alpha = formations[0];
    assert.equal(alpha.difficulty, 2);
    assert.equal(alpha.ships.length, 2);
    assert.equal(alpha.ships[0].type, 'swarm');
    assert.equal(alpha.ships[1].color, 'blue');
});

test('createFormationManager plans wave respecting difficulty budget', () => {
    const manager = createFormationManager({
        definitions: sampleDefinitions,
        defaults: { formationGap: 0.4 },
    }, [{ difficulty: 3 }]);
    assert.ok(manager);
    let calls = 0;
    const plan = manager.planWave(1, {
        random: () => {
            calls += 1;
            return calls === 1 ? 0.95 : 0.2;
        },
    });
    assert.ok(plan);
    assert.equal(plan.totalEnemies, 3);
    assert.equal(plan.totalDifficulty, 3);
    assert.equal(plan.events.length, 3);
    assert.ok(plan.events.every(event => event.time >= 0));
    // Ensure timeline orders Beta (tank) before Alpha (swarm events)
    assert.equal(plan.events[0].type, 'tank');
    assert.equal(plan.events[1].type, 'swarm');
});

test('formations honor minimum wave thresholds', () => {
    const manager = createFormationManager({
        definitions: `
# Early Push | difficulty=2 | probability=5 | minWave=1
swarm @0 y=600 color=red
---
# Late Push | difficulty=2 | probability=5 | minWave=3
swarm @0 y=620 color=blue
---
`,
    }, [
        { difficulty: 2 },
        { difficulty: 2 },
        { difficulty: 2 },
    ]);
    assert.ok(manager);
    const earlyPlan = manager.planWave(1, { random: () => 0.1 });
    assert.ok(earlyPlan);
    assert.equal(earlyPlan.selections.length, 1);
    assert.ok(earlyPlan.selections.every(selection => selection.label.startsWith('Early')));
    assert.ok(earlyPlan.events.every(event => event.color === 'red'));

    const latePlan = manager.planWave(3, { random: () => 0.9 });
    assert.ok(latePlan);
    assert.equal(latePlan.selections.length, 1);
    assert.ok(latePlan.selections[0].label.startsWith('Late'));
    assert.ok(latePlan.events.every(event => event.color === 'blue'));
});

test('difficulty multiplier scales scheduled and endless waves', () => {
    const manager = createFormationManager({
        formations: [
            {
                id: 'simple',
                label: 'Simple Squad',
                difficulty: 1,
                probability: '1',
                ships: [{ type: 'swarm' }],
            },
        ],
        difficultyMultiplier: 3,
        endlessDifficulty: { startWave: 2, base: 2, growth: 1 },
    }, [
        { difficulty: 2 },
    ]);

    assert.ok(manager);
    const scheduledPlan = manager.planWave(1);
    assert.ok(scheduledPlan);
    assert.equal(scheduledPlan.totalDifficulty, 6);
    assert.equal(scheduledPlan.totalEnemies, 6);

    const endlessPlan = manager.planWave(3);
    assert.ok(endlessPlan);
    assert.equal(endlessPlan.totalDifficulty, 9);
    assert.equal(endlessPlan.totalEnemies, 9);
});
