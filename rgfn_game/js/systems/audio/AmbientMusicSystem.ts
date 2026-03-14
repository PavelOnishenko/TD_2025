import { MODES } from '../game/runtime/GameModeStateMachine.js';

type AmbientMode = typeof MODES.WORLD_MAP | typeof MODES.VILLAGE | typeof MODES.BATTLE;

/**
 * Procedurally generates ambient music using the Web Audio API.
 * No external audio assets are required.
 */
export default class AmbientMusicSystem {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private droneGain: GainNode | null = null;
    private pulseGain: GainNode | null = null;
    private textureGain: GainNode | null = null;
    private textureFilter: BiquadFilterNode | null = null;
    private started = false;
    private unlockBound = false;

    public attachAutoStart(): void {
        if (this.unlockBound) return;

        const startFromInteraction = (): void => {
            this.start().catch((error: unknown) => {
                console.warn('Ambient music could not start:', error);
            });
        };

        window.addEventListener('pointerdown', startFromInteraction, { once: true });
        window.addEventListener('keydown', startFromInteraction, { once: true });
        this.unlockBound = true;
    }

    public async start(): Promise<void> {
        if (this.started) {
            await this.resume();
            return;
        }

        const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) {
            console.warn('Web Audio API is not supported in this browser.');
            return;
        }

        this.audioContext = new AudioCtx();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.0001;
        this.masterGain.connect(this.audioContext.destination);

        this.createDroneLayer();
        this.createPulseLayer();
        this.createTextureLayer();

        this.fadeTo(0.15, 4);
        this.setMode(MODES.WORLD_MAP);

        this.started = true;
        await this.resume();
    }

    public async resume(): Promise<void> {
        if (!this.audioContext) return;
        if (this.audioContext.state === 'suspended') await this.audioContext.resume();
    }

    public setMode(mode: AmbientMode): void {
        if (!this.audioContext || !this.started || !this.masterGain || !this.droneGain || !this.pulseGain || !this.textureGain || !this.textureFilter) return;

        const now = this.audioContext.currentTime;
        if (mode === MODES.BATTLE) {
            this.droneGain.gain.setTargetAtTime(0.055, now, 2.2);
            this.pulseGain.gain.setTargetAtTime(0.045, now, 1.4);
            this.textureGain.gain.setTargetAtTime(0.018, now, 1.7);
            this.textureFilter.frequency.setTargetAtTime(1200, now, 1.8);
            this.fadeTo(0.24, 2.5);
            return;
        }

        if (mode === MODES.VILLAGE) {
            this.droneGain.gain.setTargetAtTime(0.045, now, 2.5);
            this.pulseGain.gain.setTargetAtTime(0.025, now, 1.8);
            this.textureGain.gain.setTargetAtTime(0.012, now, 2.2);
            this.textureFilter.frequency.setTargetAtTime(820, now, 2.5);
            this.fadeTo(0.17, 2.8);
            return;
        }

        this.droneGain.gain.setTargetAtTime(0.05, now, 2.5);
        this.pulseGain.gain.setTargetAtTime(0.032, now, 1.8);
        this.textureGain.gain.setTargetAtTime(0.016, now, 2.2);
        this.textureFilter.frequency.setTargetAtTime(950, now, 2.2);
        this.fadeTo(0.19, 2.8);
    }

    public stop(): void {
        if (!this.masterGain || !this.audioContext) return;
        this.fadeTo(0.0001, 1.5);
    }

    private createDroneLayer(): void {
        if (!this.audioContext || !this.masterGain) return;

        const lowDrone = this.audioContext.createOscillator();
        lowDrone.type = 'triangle';
        lowDrone.frequency.value = 82.41;

        const highDrone = this.audioContext.createOscillator();
        highDrone.type = 'sine';
        highDrone.frequency.value = 123.47;

        const droneFilter = this.audioContext.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = 600;
        droneFilter.Q.value = 0.6;

        this.droneGain = this.audioContext.createGain();
        this.droneGain.gain.value = 0.048;

        lowDrone.connect(this.droneGain);
        highDrone.connect(this.droneGain);
        this.droneGain.connect(droneFilter);
        droneFilter.connect(this.masterGain);

        lowDrone.start();
        highDrone.start();
    }

    private createPulseLayer(): void {
        if (!this.audioContext || !this.masterGain) return;

        const pulse = this.audioContext.createOscillator();
        pulse.type = 'sine';
        pulse.frequency.value = 246.94;

        const pulseTremolo = this.audioContext.createOscillator();
        pulseTremolo.type = 'sine';
        pulseTremolo.frequency.value = 0.11;

        const tremoloDepth = this.audioContext.createGain();
        tremoloDepth.gain.value = 0.35;

        this.pulseGain = this.audioContext.createGain();
        this.pulseGain.gain.value = 0.03;

        pulseTremolo.connect(tremoloDepth);
        tremoloDepth.connect(this.pulseGain.gain);

        const pulseFilter = this.audioContext.createBiquadFilter();
        pulseFilter.type = 'bandpass';
        pulseFilter.frequency.value = 420;
        pulseFilter.Q.value = 0.7;

        pulse.connect(this.pulseGain);
        this.pulseGain.connect(pulseFilter);
        pulseFilter.connect(this.masterGain);

        pulse.start();
        pulseTremolo.start();
    }

    private createTextureLayer(): void {
        if (!this.audioContext || !this.masterGain) return;

        const noiseBuffer = this.audioContext.createBuffer(1, this.audioContext.sampleRate * 2, this.audioContext.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i += 1) noiseData[i] = (Math.random() * 2 - 1) * 0.5;

        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        this.textureFilter = this.audioContext.createBiquadFilter();
        this.textureFilter.type = 'lowpass';
        this.textureFilter.frequency.value = 960;
        this.textureFilter.Q.value = 0.8;

        const filterLfo = this.audioContext.createOscillator();
        filterLfo.type = 'sine';
        filterLfo.frequency.value = 0.07;
        const filterLfoDepth = this.audioContext.createGain();
        filterLfoDepth.gain.value = 260;
        filterLfo.connect(filterLfoDepth);
        filterLfoDepth.connect(this.textureFilter.frequency);

        this.textureGain = this.audioContext.createGain();
        this.textureGain.gain.value = 0.014;

        noiseSource.connect(this.textureFilter);
        this.textureFilter.connect(this.textureGain);
        this.textureGain.connect(this.masterGain);

        noiseSource.start();
        filterLfo.start();
    }

    private fadeTo(targetVolume: number, fadeSeconds: number): void {
        if (!this.masterGain || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(targetVolume, now, Math.max(0.001, fadeSeconds / 4));
    }
}
