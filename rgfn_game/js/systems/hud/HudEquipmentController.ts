import Player from '../../entities/player/Player.js';
import Item from '../../entities/Item.js';
import { BattleEquipmentActionHandler, HudElements } from './HudTypes.js';

type EquipmentSlot = 'main' | 'offhand' | 'armor';

type InventoryItemProvider = () => { item: Item | null; index: number | null };
type HudRefreshHandler = () => void;
type LogHandler = (message: string) => void;

export default class HudEquipmentController {
    private readonly player: Player;
    private readonly hudElements: HudElements;
    private readonly onBattleEquipmentAction: BattleEquipmentActionHandler | null;
    private readonly getDraggedInventoryItem: InventoryItemProvider;
    private readonly refreshHud: HudRefreshHandler;
    private readonly addLog: LogHandler;
    private readonly clearDraggedInventoryIndex: () => void;

    constructor(
        player: Player,
        hudElements: HudElements,
        onBattleEquipmentAction: BattleEquipmentActionHandler | null,
        getDraggedInventoryItem: InventoryItemProvider,
        clearDraggedInventoryIndex: () => void,
        refreshHud: HudRefreshHandler,
        addLog: LogHandler,
    ) {
        this.player = player;
        this.hudElements = hudElements;
        this.onBattleEquipmentAction = onBattleEquipmentAction;
        this.getDraggedInventoryItem = getDraggedInventoryItem;
        this.clearDraggedInventoryIndex = clearDraggedInventoryIndex;
        this.refreshHud = refreshHud;
        this.addLog = addLog;
    }

    public bindEquipmentSlotEvents(): void {
        this.bindWeaponSlot('main', this.hudElements.weaponSlotMain);
        this.bindWeaponSlot('offhand', this.hudElements.weaponSlotOff);
        this.bindArmorSlot();
    }

    public renderEquipmentSlots(): void {
        const mainWeapon = this.player.equippedMainWeapon;
        const offhandWeapon = this.player.equippedOffhandWeapon;
        const armor = this.player.equippedArmor;

        this.hudElements.weaponSlotMain.classList.remove('equipment-slot-main-equipped', 'equipment-slot-off-equipped');
        this.hudElements.weaponSlotOff.classList.remove('equipment-slot-main-equipped', 'equipment-slot-off-equipped');

        if (!mainWeapon && !offhandWeapon) {
            this.renderEquipmentSlotContent(this.hudElements.weaponSlotMain, 'Main Hand', 'Fist');
            this.renderEquipmentSlotContent(this.hudElements.weaponSlotOff, 'Off Hand', 'Fist');
        } else if (mainWeapon?.handsRequired === 2) {
            this.renderEquipmentSlotContent(this.hudElements.weaponSlotMain, 'Main Hand', mainWeapon.name, mainWeapon.spriteClass);
            this.renderEquipmentSlotContent(this.hudElements.weaponSlotOff, 'Off Hand', mainWeapon.name, mainWeapon.spriteClass);
            this.hudElements.weaponSlotMain.classList.add('equipment-slot-main-equipped');
            this.hudElements.weaponSlotOff.classList.add('equipment-slot-main-equipped');
        } else {
            this.renderEquipmentSlotContent(this.hudElements.weaponSlotMain, 'Main Hand', mainWeapon ? mainWeapon.name : 'Fist', mainWeapon?.spriteClass);
            this.renderEquipmentSlotContent(this.hudElements.weaponSlotOff, 'Off Hand', offhandWeapon ? offhandWeapon.name : 'Fist', offhandWeapon?.spriteClass);
            if (mainWeapon) {
                this.hudElements.weaponSlotMain.classList.add('equipment-slot-main-equipped');
            }
            if (offhandWeapon) {
                this.hudElements.weaponSlotOff.classList.add('equipment-slot-off-equipped');
            }
        }

        this.renderEquipmentSlotContent(this.hudElements.armorSlot, 'Armor', armor ? armor.name : 'Empty', armor?.spriteClass);
    }

    public handleEquipFromInventory(item: Item): void {
        if (!this.player.canEquipItem(item)) {
            return;
        }

        if (!this.requestBattleEquipmentAction(`You begin equipping ${item.name}.`)) {
            return;
        }

        if (item.type === 'weapon') {
            this.player.equippedWeapon = item;
        } else if (item.type === 'armor') {
            this.player.equippedArmor = item;
        }

        this.refreshHud();
    }

    private bindWeaponSlot(slot: 'main' | 'offhand', element: HTMLButtonElement): void {
        element.addEventListener('click', () => this.handleWeaponSlotClick(slot));
        element.addEventListener('dragover', (event) => event.preventDefault());
        element.addEventListener('drop', (event) => {
            event.preventDefault();
            this.handleDropOnEquipmentSlot(slot);
        });
    }

    private bindArmorSlot(): void {
        this.hudElements.armorSlot.addEventListener('click', () => {
            if (!this.player.equippedArmor || !this.requestBattleEquipmentAction(`You start removing ${this.player.equippedArmor.name}.`)) {
                return;
            }
            this.player.unequipArmor();
            this.refreshHud();
        });
        this.hudElements.armorSlot.addEventListener('dragover', (event) => event.preventDefault());
        this.hudElements.armorSlot.addEventListener('drop', (event) => {
            event.preventDefault();
            this.handleDropOnEquipmentSlot('armor');
        });
    }

    private handleWeaponSlotClick(slot: 'main' | 'offhand'): void {
        const equipped = slot === 'main' ? this.player.equippedWeapon : this.player.equippedOffhandWeapon;
        if (!equipped || !this.requestBattleEquipmentAction(`You start unequipping ${equipped.name}.`)) {
            return;
        }
        slot === 'main' ? this.player.unequipWeapon() : this.player.unequipOffhandWeapon();
        this.refreshHud();
    }

    private handleDropOnEquipmentSlot(slot: EquipmentSlot): void {
        const { item } = this.getDraggedInventoryItem();
        if (!item) {
            this.clearDraggedInventoryIndex();
            return;
        }

        if (!this.player.canEquipItem(item)) {
            this.addLog(`Cannot equip ${item.name}. Requirements are not met.`);
            this.clearDraggedInventoryIndex();
            return;
        }

        if (!this.requestBattleEquipmentAction(`You begin equipping ${item.name}.`)) {
            this.clearDraggedInventoryIndex();
            return;
        }

        if (slot === 'armor' && item.type === 'armor') {
            this.player.equippedArmor = item;
        } else if (slot !== 'armor' && item.type === 'weapon') {
            this.player.equipWeaponToSlot(item, slot);
        }

        this.clearDraggedInventoryIndex();
        this.refreshHud();
    }

    private requestBattleEquipmentAction(actionDescription: string): boolean {
        if (!this.onBattleEquipmentAction) {
            return true;
        }

        return this.onBattleEquipmentAction(actionDescription);
    }

    private renderEquipmentSlotContent(slot: HTMLButtonElement, label: string, value: string, spriteClass?: string): void {
        slot.innerHTML = '';
        if (spriteClass) {
            const sprite = document.createElement('span');
            sprite.className = `item-sprite equipment-item-sprite ${spriteClass}`;
            slot.appendChild(sprite);
        }
        const text = document.createElement('span');
        text.className = 'equipment-slot-label';
        text.textContent = `${label}: ${value}`;
        slot.appendChild(text);
    }
}
