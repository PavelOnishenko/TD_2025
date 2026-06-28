import { registerTutorialTarget } from '../tutorialTargets.js';

const getElement = (id) => document.getElementById(id);

const bindHudPanels = (game) => {
    game.livesEl = getElement('lives');
    game.energyEl = getElement('energy');
    game.scorePanelEl = getElement('scorePanel');
    game.scoreEl = getElement('score');
    game.bestScoreEl = getElement('bestScore');
    game.wavePanelEl = getElement('wavePanel');
    game.waveEl = getElement('wave');
    game.wavePhaseEl = getElement('wavePhase');
    game.endlessIndicatorEl = getElement('endlessIndicator');
    game.statusEl = getElement('status');
    game.waveClearBannerEl = getElement('waveClearBanner');
};

const bindHudButtons = (game) => {
    game.nextWaveBtn = getElement('nextWave');
    game.restartBtn = getElement('restart');
    game.settingsBtn = getElement('settings');
    game.speedUpBtn = getElement('speedUpBattle');
    game.muteBtn = getElement('muteToggle');
    game.musicBtn = getElement('musicToggle');
    game.mergeBtn = getElement('mergeTowers');
    game.upgradeBtn = getElement('upgradeTowers');
    game.pauseBtn = getElement('pause');
    game.startBtn = getElement('startGame');
    game.endRestartBtn = getElement('endRestart');
    game.resumeBtn = getElement('resumeGame');
    game.pauseMuteBtn = getElement('pauseSoundToggle');
    game.pauseMusicBtn = getElement('pauseMusicToggle');
    game.leaderboardToggleBtn = getElement('leaderboardToggle');
    game.leaderboardRetryBtn = getElement('leaderboardRetry');
};

const bindHudOverlays = (game) => {
    game.startOverlay = getElement('startOverlay');
    game.endOverlay = getElement('endOverlay');
    game.endMenu = getElement('endMenu');
    game.endMessageEl = getElement('endMessage');
    game.endDetailEl = getElement('endDetail');
    game.endScoreEl = getElement('endScore');
    game.endBestScoreEl = getElement('endBestScore');
    game.pauseOverlay = getElement('pauseOverlay');
    game.pauseMessageEl = getElement('pauseMessage');
    game.pauseLanguageSelect = getElement('pauseLanguageSelect');
};

const bindLeaderboardElements = (game) => {
    game.leaderboardPanel = getElement('leaderboardPanel');
    game.leaderboardListEl = getElement('leaderboardList');
    game.leaderboardLoadingEl = getElement('leaderboardLoading');
    game.leaderboardErrorEl = getElement('leaderboardError');
    game.leaderboardEmptyEl = getElement('leaderboardEmpty');
};

const bindSaveAndDiagnosticsElements = (game) => {
    game.diagnosticsOverlay = getElement('diagnosticsOverlay');
    game.saveControlsEl = getElement('saveControls');
    game.saveBtn = getElement('saveGame');
    game.loadBtn = getElement('loadGame');
    game.deleteSaveBtn = getElement('deleteSave');
};

const registerTargetIfPresent = (cleanups, id, elementResolver) => {
    if (elementResolver()) {
        cleanups.push(registerTutorialTarget(id, elementResolver));
    }
};

const bindTutorialTargets = (game) => {
    const cleanups = [];
    registerTargetIfPresent(cleanups, 'nextWaveButton', () => game.nextWaveBtn);
    registerTargetIfPresent(cleanups, 'mergeButton', () => game.mergeBtn);
    registerTargetIfPresent(cleanups, 'energyPanel', () => game.energyEl);
    registerTargetIfPresent(cleanups, 'scorePanel', () => game.scorePanelEl);
    registerTargetIfPresent(cleanups, 'pauseButton', () => game.pauseBtn);
    game.releaseTutorialTargets = () => {
        while (cleanups.length > 0) {
            const cleanup = cleanups.pop();
            try {
                cleanup?.();
            } catch (error) {
                console.warn('Failed to release tutorial target', error);
            }
        }
    };
};

export function bindHUD(game) {
    bindHudPanels(game);
    bindHudButtons(game);
    bindHudOverlays(game);
    bindLeaderboardElements(game);
    bindSaveAndDiagnosticsElements(game);
    bindTutorialTargets(game);
}
