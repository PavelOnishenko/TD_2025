import type { CombatMove } from '../../combat/DirectionalCombat.js';

export class BattleUiModel {
    public sidebar!: HTMLElement;
    public enemyName!: HTMLElement;
    public enemyHp!: HTMLElement;
    public enemyMaxHp!: HTMLElement;
    public attackBtn!: HTMLButtonElement;
    public directionalButtons!: Record<CombatMove, HTMLButtonElement>;
    public fleeBtn!: HTMLButtonElement;
    public waitBtn!: HTMLButtonElement;
    public usePotionBtn!: HTMLButtonElement;
    public useManaPotionBtn!: HTMLButtonElement;
    public spellFireballBtn!: HTMLButtonElement;
    public spellCurseBtn!: HTMLButtonElement;
    public spellSlowBtn!: HTMLButtonElement;
    public spellRageBtn!: HTMLButtonElement;
    public spellArcaneLanceBtn!: HTMLButtonElement;
    public attackRangeText!: HTMLElement;
}

export type BattleUI = BattleUiModel;

export class WorldUiModel {
    public sidebar!: HTMLElement;
    public usePotionBtn!: HTMLButtonElement;
    public enterVillageBtn!: HTMLButtonElement;
    public campSleepBtn!: HTMLButtonElement;
    public centerOnCharacterBtn!: HTMLButtonElement;
    public villageEntryPopup!: HTMLElement;
    public villageEntryTitle!: HTMLElement;
    public villageEntryEnterBtn!: HTMLButtonElement;
    public villageEntryPassBtn!: HTMLButtonElement;
    public ferryPopup!: HTMLElement;
    public ferryTitle!: HTMLElement;
    public ferryRouteSelect!: HTMLSelectElement;
    public ferryPrice!: HTMLElement;
    public ferryConfirmBtn!: HTMLButtonElement;
    public ferryCancelBtn!: HTMLButtonElement;
}

export type WorldUI = WorldUiModel;

export class VillageUiModel {
    public sidebar!: HTMLElement;
    public title!: HTMLElement;
    public prompt!: HTMLElement;
    public actions!: HTMLElement;
    public openDialogueBtn!: HTMLButtonElement;
    public sleepRoomBtn!: HTMLButtonElement;
    public dialogueModal!: HTMLElement;
    public dialogueCloseBtn!: HTMLButtonElement;
    public dialogueSelectedNpc!: HTMLElement;
    public dialogueLog!: HTMLElement;
    public enterBtn!: HTMLButtonElement;
    public skipBtn!: HTMLButtonElement;
    public waitBtn!: HTMLButtonElement;
    public buyOffer1Btn!: HTMLButtonElement;
    public buyOffer2Btn!: HTMLButtonElement;
    public buyOffer3Btn!: HTMLButtonElement;
    public buyOffer4Btn!: HTMLButtonElement;
    public sellSelect!: HTMLSelectElement;
    public sellSelectedBtn!: HTMLButtonElement;
    public npcList!: HTMLElement;
    public npcTitle!: HTMLElement;
    public askVillageInput!: HTMLInputElement;
    public askVillageBtn!: HTMLButtonElement;
    public askPersonInput!: HTMLInputElement;
    public askPersonBtn!: HTMLButtonElement;
    public askBarterBtn!: HTMLButtonElement;
    public barterNowBtn!: HTMLButtonElement;
    public recruitEscortBtn!: HTMLButtonElement;
    public leaveBtn!: HTMLButtonElement;
}

export type VillageUI = VillageUiModel;
