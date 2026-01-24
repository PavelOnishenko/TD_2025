/**
 * ScoreManager - Generic score tracking and management system
 *
 * Provides score tracking, validation, best score management, and callbacks
 * for score changes. Can be used by any game that needs scoring functionality.
 *
 * @example
 * const scoreManager = new ScoreManager({
 *     onBestScoreChanged: (newBest) => saveToLocalStorage(newBest),
 *     onScoreChanged: (newScore, delta) => updateUI(newScore)
 * });
 *
 * scoreManager.addScore(10); // Add points
 * const current = scoreManager.getCurrentScore();
 * scoreManager.reset(); // Reset to zero
 */
export default class ScoreManager {
    constructor(options = {}) {
        this.score = 0;
        this.bestScore = 0;

        // Optional callbacks
        this.onBestScoreChanged = options.onBestScoreChanged || null;
        this.onScoreChanged = options.onScoreChanged || null;
    }

    /**
     * Get the current score with validation
     * @returns {number} Current score (always >= 0 and finite)
     */
    getCurrentScore() {
        const current = Number.isFinite(this.score) ? this.score : 0;
        if (current < 0) {
            this.score = 0;
            return 0;
        }
        return current;
    }

    /**
     * Get the best score achieved
     * @returns {number} Best score (always >= 0 and finite)
     */
    getBestScore() {
        return Number.isFinite(this.bestScore) ? this.bestScore : 0;
    }

    /**
     * Add points to the current score
     * @param {number} amount - Amount to add (can be negative for penalties)
     * @returns {number} New score after change
     */
    addScore(amount) {
        return this.changeScore(amount);
    }

    /**
     * Change the score by a delta amount
     * @param {number} delta - Amount to change (positive or negative)
     * @returns {number} New score after change
     */
    changeScore(delta) {
        const amount = Number.isFinite(delta) ? delta : 0;
        if (!Number.isFinite(amount) || amount === 0) {
            return this.getCurrentScore();
        }

        const current = this.getCurrentScore();
        const next = Math.max(0, Math.floor(current + amount));
        this.score = next;

        // Update best score if needed
        const best = this.getBestScore();
        if (next > best) {
            this.bestScore = next;
            if (typeof this.onBestScoreChanged === 'function') {
                try {
                    this.onBestScoreChanged(next);
                } catch (error) {
                    console.warn('ScoreManager: Best score callback failed', error);
                }
            }
        }

        // Notify score changed
        if (typeof this.onScoreChanged === 'function') {
            try {
                this.onScoreChanged(next, { delta: amount });
            } catch (error) {
                console.warn('ScoreManager: Score change callback failed', error);
            }
        }

        return next;
    }

    /**
     * Set the score to a specific value
     * @param {number} value - New score value
     * @returns {number} The validated score that was set
     */
    setScore(value) {
        const validated = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
        const current = this.getCurrentScore();
        const delta = validated - current;
        this.score = validated;

        // Check best score
        const best = this.getBestScore();
        if (validated > best) {
            this.bestScore = validated;
            if (typeof this.onBestScoreChanged === 'function') {
                try {
                    this.onBestScoreChanged(validated);
                } catch (error) {
                    console.warn('ScoreManager: Best score callback failed', error);
                }
            }
        }

        // Notify score changed
        if (typeof this.onScoreChanged === 'function' && delta !== 0) {
            try {
                this.onScoreChanged(validated, { delta });
            } catch (error) {
                console.warn('ScoreManager: Score change callback failed', error);
            }
        }

        return validated;
    }

    /**
     * Set the best score (useful for loading saved best scores)
     * @param {number} value - Best score value to set
     */
    setBestScore(value) {
        const validated = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
        this.bestScore = validated;
    }

    /**
     * Reset score to zero (does not reset best score)
     */
    reset() {
        this.score = 0;
    }

    /**
     * Reset both current and best scores to zero
     */
    resetAll() {
        this.score = 0;
        this.bestScore = 0;
    }
}
