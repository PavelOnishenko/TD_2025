import { theme } from '../config/ThemeConfig.js';

/**
 * BattleSplash - Displays themed splash screens for battle start and end events
 * Fully themable using the game's theme system
 */
export class BattleSplash {
    private overlay: HTMLElement | null = null;
    private modal: HTMLElement | null = null;
    private title: HTMLElement | null = null;
    private subtitle: HTMLElement | null = null;
    private decorativeBorder: HTMLElement | null = null;

    constructor() {
        this.createUI();
    }

    /**
     * Creates the overlay UI structure
     * All colors are applied dynamically from the theme
     */
    private createUI(): void {
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.className = 'battle-splash-overlay';
        overlay.style.display = 'none';

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'battle-splash-modal';

        // Decorative border element
        const decorativeBorder = document.createElement('div');
        decorativeBorder.className = 'battle-splash-border';

        // Title element
        const title = document.createElement('h1');
        title.className = 'battle-splash-title';

        // Subtitle element
        const subtitle = document.createElement('p');
        subtitle.className = 'battle-splash-subtitle';

        // Assemble structure
        modal.appendChild(decorativeBorder);
        modal.appendChild(title);
        modal.appendChild(subtitle);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Store references
        this.overlay = overlay;
        this.modal = modal;
        this.title = title;
        this.subtitle = subtitle;
        this.decorativeBorder = decorativeBorder;
    }

    /**
     * Shows battle start splash screen
     * @param enemyCount - Number of enemies in the battle
     * @param callback - Function to call when splash is done
     */
    showBattleStart(enemyCount: number, callback: () => void): void {
        if (!this.overlay || !this.title || !this.subtitle) return;

        // Set content
        this.title.textContent = 'BATTLE START!';
        this.subtitle.textContent = `Prepare to face ${enemyCount} ${enemyCount === 1 ? 'enemy' : 'enemies'}!`;

        // Apply themed colors
        this.applyThemeColors('battle-start');

        // Show with animation
        this.show(() => {
            // Hide after duration and call callback
            setTimeout(() => {
                this.hide(callback);
            }, 2000); // 2 seconds display time
        });
    }

    /**
     * Shows battle end splash screen
     * @param result - Battle result ('victory' or 'defeat')
     * @param callback - Function to call when splash is done
     */
    showBattleEnd(result: 'victory' | 'defeat', callback: () => void): void {
        if (!this.overlay || !this.title || !this.subtitle) return;

        // Set content based on result
        if (result === 'victory') {
            this.title.textContent = '⚔️ VICTORY! ⚔️';
            this.subtitle.textContent = 'The battle has been won!';
            this.applyThemeColors('victory');
        } else {
            this.title.textContent = '💀 DEFEAT 💀';
            this.subtitle.textContent = 'You have been vanquished...';
            this.applyThemeColors('defeat');
        }

        // Show with animation
        this.show(() => {
            // Hide after duration and call callback
            setTimeout(() => {
                this.hide(callback);
            }, 2500); // 2.5 seconds display time for end screens
        });
    }

    /**
     * Applies theme colors to splash screen elements
     * @param type - Type of splash screen for color selection
     */
    private applyThemeColors(type: 'battle-start' | 'victory' | 'defeat'): void {
        if (!this.modal || !this.title || !this.subtitle || !this.decorativeBorder) return;

        // Base styling - always use theme colors
        this.modal.style.backgroundColor = theme.ui.primaryBg;
        this.modal.style.borderColor = theme.ui.primaryAccent;
        this.decorativeBorder.style.borderColor = theme.ui.secondaryAccent;
        this.subtitle.style.color = theme.ui.primaryAccent;

        // Type-specific colors
        switch (type) {
            case 'battle-start':
                this.title.style.color = theme.ui.primaryAccent;
                this.modal.style.boxShadow = `0 0 40px ${theme.ui.primaryAccent}40`;
                break;
            case 'victory':
                this.title.style.color = theme.ui.primaryAccent;
                this.modal.style.boxShadow = `0 0 50px ${theme.ui.primaryAccent}60`;
                break;
            case 'defeat':
                this.title.style.color = theme.ui.enemyColor;
                this.modal.style.boxShadow = `0 0 50px ${theme.ui.enemyColor}40`;
                this.decorativeBorder.style.borderColor = theme.ui.enemyColor;
                break;
        }
    }

    /**
     * Shows the splash screen with animation
     */
    private show(callback: () => void): void {
        if (!this.overlay || !this.modal) return;

        // Reset animation
        this.modal.style.animation = 'none';
        void this.modal.offsetHeight; // Trigger reflow

        // Show overlay
        this.overlay.style.display = 'flex';

        // Start animation
        this.modal.style.animation = 'battle-splash-enter 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';

        // Call callback after animation
        setTimeout(callback, 500);
    }

    /**
     * Hides the splash screen with animation
     */
    private hide(callback: () => void): void {
        if (!this.overlay || !this.modal) return;

        // Exit animation
        this.modal.style.animation = 'battle-splash-exit 0.4s ease-in';

        // Hide after animation and call callback
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.display = 'none';
            }
            callback();
        }, 400);
    }

    /**
     * Updates theme colors when theme changes
     * Call this when the user switches themes
     */
    updateTheme(): void {
        // Theme colors will be applied next time splash is shown
        // No need to update if splash is not visible
    }
}
