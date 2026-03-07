import StickFigure from '../utils/StickFigure.js';
import type { ImportedAnimationAsset, ImportedAnimationMeta, ImportedAnimationParams, ImportedKeyframe } from '../animations/types.js';
import { IDLE_KEYFRAMES, IDLE_META } from '../animations/imported/idleImported.js';
import { WALK_KEYFRAMES, WALK_META } from '../animations/imported/walkImported.js';
import { PUNCH_KEYFRAMES, PUNCH_META } from '../animations/imported/punchImported.js';
import { PUNCH2_KEYFRAMES, PUNCH2_META } from '../animations/imported/punch2Imported.js';
import { STRONG_PUNCH_KEYFRAMES, STRONG_PUNCH_META } from '../animations/imported/strongPunchImported.js';
import { KICK_KEYFRAMES, KICK_META } from '../animations/imported/kickImported.js';
import { JUMP_KEYFRAMES, JUMP_META } from '../animations/imported/jumpImported.js';
import { FLY_KEYFRAMES, FLY_META } from '../animations/imported/flyImported.js';
import { LAND_KEYFRAMES, LAND_META } from '../animations/imported/landImported.js';
import { HURT_KEYFRAMES, HURT_META } from '../animations/imported/hurtImported.js';
import { DEATH_KEYFRAMES, DEATH_META } from '../animations/imported/deathImported.js';
import { TAUNT_KEYFRAMES, TAUNT_META } from '../animations/imported/tauntImported.js';

const ANIMATION_ASSETS: ImportedAnimationAsset[] = [
    { keyframes: IDLE_KEYFRAMES, meta: IDLE_META },
    { keyframes: WALK_KEYFRAMES, meta: WALK_META },
    { keyframes: PUNCH_KEYFRAMES, meta: PUNCH_META },
    { keyframes: PUNCH2_KEYFRAMES, meta: PUNCH2_META },
    { keyframes: STRONG_PUNCH_KEYFRAMES, meta: STRONG_PUNCH_META },
    { keyframes: KICK_KEYFRAMES, meta: KICK_META },
    { keyframes: JUMP_KEYFRAMES, meta: JUMP_META },
    { keyframes: FLY_KEYFRAMES, meta: FLY_META },
    { keyframes: LAND_KEYFRAMES, meta: LAND_META },
    { keyframes: HURT_KEYFRAMES, meta: HURT_META },
    { keyframes: DEATH_KEYFRAMES, meta: DEATH_META },
    { keyframes: TAUNT_KEYFRAMES, meta: TAUNT_META }
];

export default class AnimationDebugPlayer {
    private root: HTMLDivElement;
    private select: HTMLSelectElement;
    private playButton: HTMLButtonElement;
    private stopButton: HTMLButtonElement;
    private timeline: HTMLInputElement;
    private timelineLabel: HTMLSpanElement;
    private keyframeSelect: HTMLSelectElement;
    private paramsPre: HTMLPreElement;
    private previewCanvas: HTMLCanvasElement;
    private previewCtx: CanvasRenderingContext2D;

    private currentAsset: ImportedAnimationAsset;
    private currentTime: number = 0;
    private isVisible: boolean = false;
    private isPlaying: boolean = false;
    private rafId: number | null = null;
    private lastFrameTime: number = 0;
    private onVisibilityChange?: (isVisible: boolean) => void;

    constructor(container: HTMLElement, onVisibilityChange?: (isVisible: boolean) => void) {
        this.currentAsset = ANIMATION_ASSETS[0];
        this.onVisibilityChange = onVisibilityChange;

        this.root = document.createElement('div');
        this.root.id = 'animation-debug-player';
        this.root.classList.add('hidden');

        this.previewCanvas = document.createElement('canvas');
        this.previewCanvas.width = 340;
        this.previewCanvas.height = 340;

        const previewCtx = this.previewCanvas.getContext('2d');
        if (!previewCtx) {
            throw new Error('Unable to create debug preview context');
        }
        this.previewCtx = previewCtx;

        const title = document.createElement('h3');
        title.textContent = 'Animation Debug Player';

        this.select = document.createElement('select');
        this.select.className = 'animation-debug-select';
        ANIMATION_ASSETS.forEach((asset, index) => {
            const option = document.createElement('option');
            option.value = String(index);
            option.textContent = asset.meta.name;
            this.select.appendChild(option);
        });

        const controls = document.createElement('div');
        controls.className = 'animation-debug-controls';
        this.playButton = document.createElement('button');
        this.playButton.textContent = 'Play';
        this.stopButton = document.createElement('button');
        this.stopButton.textContent = 'Stop';
        controls.append(this.playButton, this.stopButton);

        this.timeline = document.createElement('input');
        this.timeline.className = 'animation-debug-timeline';
        this.timeline.type = 'range';
        this.timeline.min = '0';
        this.timeline.step = '0.01';

        this.timelineLabel = document.createElement('span');

        this.keyframeSelect = document.createElement('select');
        this.keyframeSelect.className = 'animation-debug-select';

        this.paramsPre = document.createElement('pre');
        this.paramsPre.className = 'animation-debug-params';

        const tip = document.createElement('p');
        tip.className = 'animation-debug-tip';
        tip.textContent = 'Press ~ to toggle';

        const body = document.createElement('div');
        body.className = 'animation-debug-body';
        body.append(this.previewCanvas, this.paramsPre);

        this.root.append(title, this.select, controls, this.timeline, this.timelineLabel, this.keyframeSelect, body, tip);
        container.appendChild(this.root);

        this.attachEvents();
        this.applyAsset(0);
    }

    public toggle(): void {
        this.isVisible = !this.isVisible;
        this.root.classList.toggle('hidden', !this.isVisible);
        if (!this.isVisible) {
            this.isPlaying = false;
            this.playButton.textContent = 'Play';
        }
        this.onVisibilityChange?.(this.isVisible);
        this.draw();
    }

    public isOpen(): boolean {
        return this.isVisible;
    }

    private attachEvents(): void {
        this.select.addEventListener('change', () => {
            const index = Number(this.select.value);
            this.applyAsset(index);
        });

        this.playButton.addEventListener('click', () => {
            this.isPlaying = !this.isPlaying;
            this.playButton.textContent = this.isPlaying ? 'Pause' : 'Play';
            if (this.isPlaying) {
                this.lastFrameTime = performance.now();
                this.startLoop();
            }
        });

        this.stopButton.addEventListener('click', () => {
            this.isPlaying = false;
            this.playButton.textContent = 'Play';
            this.currentTime = 0;
            this.syncUI();
        });

        this.timeline.addEventListener('input', () => {
            this.currentTime = Number(this.timeline.value);
            this.isPlaying = false;
            this.playButton.textContent = 'Play';
            this.syncUI();
        });

        this.keyframeSelect.addEventListener('change', () => {
            const selectedTime = Number(this.keyframeSelect.value);
            this.currentTime = selectedTime;
            this.syncUI();
        });
    }

    private applyAsset(index: number): void {
        this.currentAsset = ANIMATION_ASSETS[index] ?? ANIMATION_ASSETS[0];
        this.currentTime = 0;
        this.timeline.max = String(this.currentAsset.meta.duration);

        this.keyframeSelect.innerHTML = '';
        this.currentAsset.keyframes.forEach((frame, frameIndex) => {
            const option = document.createElement('option');
            option.value = String(frame.time);
            option.textContent = `Keyframe ${frameIndex + 1} @ ${frame.time.toFixed(2)}s`;
            this.keyframeSelect.appendChild(option);
        });

        this.syncUI();
    }

    private startLoop(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
        }

        const update = (now: number): void => {
            if (this.isPlaying) {
                const dtSeconds = (now - this.lastFrameTime) / 1000;
                this.lastFrameTime = now;
                const duration = Math.max(0.001, this.currentAsset.meta.duration);
                this.currentTime += dtSeconds;

                if (this.currentAsset.meta.loop) {
                    this.currentTime = this.currentTime % duration;
                } else if (this.currentTime >= duration) {
                    this.currentTime = duration;
                    this.isPlaying = false;
                    this.playButton.textContent = 'Play';
                }

                this.syncUI();
                this.rafId = requestAnimationFrame(update);
            }
        };

        this.rafId = requestAnimationFrame(update);
    }

    private syncUI(): void {
        const duration = this.currentAsset.meta.duration;
        this.timeline.value = String(this.currentTime);
        this.timelineLabel.textContent = `Time: ${this.currentTime.toFixed(2)}s / ${duration.toFixed(2)}s`;

        const closestFrame = this.findClosestKeyframe(this.currentAsset.keyframes, this.currentTime);
        this.keyframeSelect.value = String(closestFrame.time);

        const normalized = duration > 0 ? this.currentTime / duration : 0;
        const pose = StickFigure.getPoseFromImportedAnimation(this.currentAsset.keyframes, this.currentAsset.meta, normalized);
        const params = this.interpolateImportedParams(this.currentAsset.keyframes, this.currentAsset.meta, this.currentTime);

        this.paramsPre.textContent = this.formatParams(params, this.currentAsset.meta);
        this.drawPreview(pose);
    }

    private draw(): void {
        if (!this.isVisible) {
            return;
        }
        this.syncUI();
    }

    private drawPreview(pose: ReturnType<typeof StickFigure.getPoseFromImportedAnimation>): void {
        this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
        this.previewCtx.fillStyle = '#101521';
        this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);

        StickFigure.draw(
            this.previewCtx,
            this.previewCanvas.width / 2,
            this.previewCanvas.height / 2 + 40,
            pose,
            '#7ce3ff',
            true,
            1.8
        );
    }

    private findClosestKeyframe(keyframes: ImportedKeyframe[], time: number): ImportedKeyframe {
        let closest = keyframes[0];
        let minDistance = Math.abs(keyframes[0].time - time);

        for (let i = 1; i < keyframes.length; i++) {
            const dist = Math.abs(keyframes[i].time - time);
            if (dist < minDistance) {
                minDistance = dist;
                closest = keyframes[i];
            }
        }

        return closest;
    }

    private interpolateImportedParams(
        keyframes: ImportedKeyframe[],
        meta: ImportedAnimationMeta,
        time: number
    ): ImportedAnimationParams {
        if (keyframes.length <= 1) {
            return keyframes[0].params;
        }

        const sorted = [...keyframes].sort((a, b) => a.time - b.time);
        const duration = Math.max(0.001, meta.duration);
        const wrappedTime = meta.loop ? ((time % duration) + duration) % duration : Math.max(0, Math.min(duration, time));

        let previous = sorted[0];
        let next = sorted[sorted.length - 1];

        for (let i = 0; i < sorted.length - 1; i++) {
            if (wrappedTime >= sorted[i].time && wrappedTime <= sorted[i + 1].time) {
                previous = sorted[i];
                next = sorted[i + 1];
                break;
            }
        }

        if (previous.time === next.time) {
            return previous.params;
        }

        const t = (wrappedTime - previous.time) / (next.time - previous.time);
        return this.lerpImportedParams(previous.params, next.params, t);
    }

    private lerpImportedParams(a: ImportedAnimationParams, b: ImportedAnimationParams, t: number): ImportedAnimationParams {
        const lerp = (start: number, end: number): number => start + (end - start) * t;
        return {
            x: lerp(a.x, b.x),
            y: lerp(a.y, b.y),
            headTilt: lerp(a.headTilt, b.headTilt),
            torsoAngle: lerp(a.torsoAngle, b.torsoAngle),
            torsoLength: lerp(a.torsoLength, b.torsoLength),
            leftUpperArmLength: lerp(a.leftUpperArmLength, b.leftUpperArmLength),
            leftForearmLength: lerp(a.leftForearmLength, b.leftForearmLength),
            rightUpperArmLength: lerp(a.rightUpperArmLength, b.rightUpperArmLength),
            rightForearmLength: lerp(a.rightForearmLength, b.rightForearmLength),
            leftThighLength: lerp(a.leftThighLength, b.leftThighLength),
            leftCalfLength: lerp(a.leftCalfLength, b.leftCalfLength),
            rightThighLength: lerp(a.rightThighLength, b.rightThighLength),
            rightCalfLength: lerp(a.rightCalfLength, b.rightCalfLength),
            hipLength: lerp(a.hipLength, b.hipLength),
            shoulderLength: lerp(a.shoulderLength, b.shoulderLength),
            leftShoulderAngle: lerp(a.leftShoulderAngle, b.leftShoulderAngle),
            leftElbowAngle: lerp(a.leftElbowAngle, b.leftElbowAngle),
            rightShoulderAngle: lerp(a.rightShoulderAngle, b.rightShoulderAngle),
            rightElbowAngle: lerp(a.rightElbowAngle, b.rightElbowAngle),
            leftHipAngle: lerp(a.leftHipAngle, b.leftHipAngle),
            leftKneeAngle: lerp(a.leftKneeAngle, b.leftKneeAngle),
            rightHipAngle: lerp(a.rightHipAngle, b.rightHipAngle),
            rightKneeAngle: lerp(a.rightKneeAngle, b.rightKneeAngle)
        };
    }

    private formatParams(params: ImportedAnimationParams, meta: ImportedAnimationMeta): string {
        const header = `${meta.name} (${meta.loop ? 'loop' : 'once'})`;
        const lines = Object.entries(params).map(([key, value]) => `${key}: ${value.toFixed(3)}`);
        return `${header}\n${lines.join('\n')}`;
    }
}
