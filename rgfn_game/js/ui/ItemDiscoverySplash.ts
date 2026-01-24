import { theme } from '../config/ThemeConfig.js';
import Item from '../entities/Item.js';

/**
 * ItemDiscoverySplash - Displays splash screen when player discovers an item
 */
export class ItemDiscoverySplash {
    private overlay: HTMLElement | null = null;
    private modal: HTMLElement | null = null;
    private title: HTMLElement | null = null;
    private itemName: HTMLElement | null = null;
    private itemDescription: HTMLElement | null = null;
    private decorativeBorder: HTMLElement | null = null;

    constructor() {
        this.createUI();
    }

    /**
     * Creates the overlay UI structure
     */
    private createUI(): void {
        // Create overlay container
        const overlay = document.createElement('div');
        overlay.className = 'item-discovery-overlay';
        overlay.style.display = 'none';

        // Create modal content
        const modal = document.createElement('div');
        modal.className = 'item-discovery-modal';

        // Decorative border element
        const decorativeBorder = document.createElement('div');
        decorativeBorder.className = 'item-discovery-border';

        // Title element
        const title = document.createElement('h1');
        title.className = 'item-discovery-title';
        title.textContent = '🎁 ITEM DISCOVERED! 🎁';

        // Item name element
        const itemName = document.createElement('h2');
        itemName.className = 'item-discovery-name';

        // Item description element
        const itemDescription = document.createElement('p');
        itemDescription.className = 'item-discovery-description';

        // Assemble structure
        modal.appendChild(decorativeBorder);
        modal.appendChild(title);
        modal.appendChild(itemName);
        modal.appendChild(itemDescription);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // Store references
        this.overlay = overlay;
        this.modal = modal;
        this.title = title;
        this.itemName = itemName;
        this.itemDescription = itemDescription;
        this.decorativeBorder = decorativeBorder;
    }

    /**
     * Shows item discovery splash screen
     * @param item - The discovered item
     * @param callback - Function to call when splash is done
     */
    showItemDiscovery(item: Item, callback: () => void): void {
        if (!this.overlay || !this.title || !this.itemName || !this.itemDescription) return;

        // Set content
        this.itemName.textContent = item.name;
        this.itemDescription.textContent = item.description;

        // Apply themed colors
        this.applyThemeColors();

        // Show with animation
        this.show(() => {
            // Hide after duration and call callback
            setTimeout(() => {
                this.hide(callback);
            }, 3000); // 3 seconds display time
        });
    }

    /**
     * Applies theme colors to splash screen elements
     */
    private applyThemeColors(): void {
        if (!this.modal || !this.title || !this.itemName || !this.itemDescription || !this.decorativeBorder) return;

        // Base styling - use theme colors
        this.modal.style.backgroundColor = theme.ui.primaryBg;
        this.modal.style.borderColor = theme.ui.primaryAccent;
        this.decorativeBorder.style.borderColor = theme.ui.secondaryAccent;

        // Item discovery specific colors
        this.title.style.color = '#FFD700'; // Gold color for item discovery
        this.itemName.style.color = theme.ui.primaryAccent;
        this.itemDescription.style.color = theme.ui.systemMessageColor;
        this.modal.style.boxShadow = `0 0 50px rgba(255, 215, 0, 0.6)`; // Gold glow
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
        this.modal.style.animation = 'item-discovery-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';

        // Call callback after animation
        setTimeout(callback, 600);
    }

    /**
     * Hides the splash screen with animation
     */
    private hide(callback: () => void): void {
        if (!this.overlay || !this.modal) return;

        // Exit animation
        this.modal.style.animation = 'item-discovery-exit 0.5s ease-in';

        // Hide after animation and call callback
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.display = 'none';
            }
            callback();
        }, 500);
    }
}
