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
    private melodyGain: GainNode | null = null;
    private reverbBus: GainNode | null = null;
    private delayBus: GainNode | null = null;
    private currentMode: AmbientMode = MODES.WORLD_MAP;
    private melodyPattern: number[] = [0, 2, 4, 7, 9, 7, 4, 2];
    private melodyTimerId: number | null = null;
    private melodyStep = 0;
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

        this.configureEffects();

        this.createDroneLayer();
        this.createPulseLayer();
        this.createTextureLayer();
        this.createMelodyLayer();

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
        this.currentMode = mode;

        if (mode === MODES.BATTLE) {
            this.droneGain.gain.setTargetAtTime(0.055, now, 2.2);
            this.pulseGain.gain.setTargetAtTime(0.045, now, 1.4);
            this.textureGain.gain.setTargetAtTime(0.018, now, 1.7);
            this.melodyGain.gain.setTargetAtTime(0.023, now, 1.5);
            this.textureFilter.frequency.setTargetAtTime(1200, now, 1.8);
            this.melodyPattern = [0, 3, 7, 10, 7, 3, 5, 8];
            this.fadeTo(0.24, 2.5);
            return;
        }

        if (mode === MODES.VILLAGE) {
            this.droneGain.gain.setTargetAtTime(0.045, now, 2.5);
            this.pulseGain.gain.setTargetAtTime(0.025, now, 1.8);
            this.textureGain.gain.setTargetAtTime(0.012, now, 2.2);
            this.melodyGain.gain.setTargetAtTime(0.014, now, 2.3);
            this.textureFilter.frequency.setTargetAtTime(820, now, 2.5);
            this.melodyPattern = [0, 2, 5, 7, 9, 7, 5, 2];
            this.fadeTo(0.17, 2.8);
            return;
        }

        this.droneGain.gain.setTargetAtTime(0.05, now, 2.5);
        this.pulseGain.gain.setTargetAtTime(0.032, now, 1.8);
        this.textureGain.gain.setTargetAtTime(0.016, now, 2.2);
        this.melodyGain.gain.setTargetAtTime(0.018, now, 2);
        this.textureFilter.frequency.setTargetAtTime(950, now, 2.2);
        this.melodyPattern = [0, 2, 4, 7, 9, 7, 4, 2];
        this.fadeTo(0.19, 2.8);
    }

    public stop(): void {
        if (!this.masterGain || !this.audioContext) return;
        this.fadeTo(0.0001, 1.5);

        if (this.melodyTimerId !== null) {
            window.clearInterval(this.melodyTimerId);
            this.melodyTimerId = null;
        }
    }

    private configureEffects(): void {
        if (!this.audioContext || !this.masterGain) return;

        this.reverbBus = this.audioContext.createGain();
        this.reverbBus.gain.value = 0.2;

        const convolver = this.audioContext.createConvolver();
        convolver.buffer = this.createImpulseResponse(2.8, 2.2);

        this.delayBus = this.audioContext.createGain();
        this.delayBus.gain.value = 0.09;

        const delayNode = this.audioContext.createDelay(2.5);
        delayNode.delayTime.value = 0.34;
        const delayFeedback = this.audioContext.createGain();
        delayFeedback.gain.value = 0.28;

        this.reverbBus.connect(convolver);
        convolver.connect(this.masterGain);

        this.delayBus.connect(delayNode);
        delayNode.connect(delayFeedback);
        delayFeedback.connect(delayNode);
        delayNode.connect(this.masterGain);
    }

    private createImpulseResponse(duration: number, decay: number): AudioBuffer | null {
        if (!this.audioContext) return null;

        const sampleRate = this.audioContext.sampleRate;
        const length = Math.floor(sampleRate * duration);
        const impulse = this.audioContext.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < length; i += 1) {
                const envelope = Math.pow(1 - (i / length), decay);
                data[i] = (Math.random() * 2 - 1) * envelope;
            }
        }

        return impulse;
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

    private createMelodyLayer(): void {
        if (!this.audioContext || !this.masterGain || !this.reverbBus || !this.delayBus) return;

        this.melodyGain = this.audioContext.createGain();
        this.melodyGain.gain.value = 0.018;
        this.melodyGain.connect(this.masterGain);
        this.melodyGain.connect(this.reverbBus);
        this.melodyGain.connect(this.delayBus);

        this.scheduleMelody();
    }

    private scheduleMelody(): void {
        if (!this.audioContext || !this.melodyGain) return;

        this.playMelodyNote();
        if (this.melodyTimerId !== null) window.clearInterval(this.melodyTimerId);

        this.melodyTimerId = window.setInterval(() => {
            this.playMelodyNote();
        }, 900);
    }

    private playMelodyNote(): void {
        if (!this.audioContext || !this.melodyGain || !this.reverbBus || !this.delayBus) return;

        const root = this.currentMode === MODES.BATTLE ? 146.83 : this.currentMode === MODES.VILLAGE ? 130.81 : 110;
        const interval = this.melodyPattern[this.melodyStep % this.melodyPattern.length] ?? 0;
        this.melodyStep += 1;
        const frequency = root * Math.pow(2, interval / 12);
        const now = this.audioContext.currentTime;
        const noteLength = this.currentMode === MODES.BATTLE ? 0.5 : 0.7;

        const note = this.audioContext.createOscillator();
        note.type = this.currentMode === MODES.BATTLE ? 'triangle' : 'sine';
        note.frequency.setValueAtTime(frequency, now);

        const noteGain = this.audioContext.createGain();
        noteGain.gain.setValueAtTime(0.0001, now);
        noteGain.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + noteLength);

        const noteFilter = this.audioContext.createBiquadFilter();
        noteFilter.type = 'lowpass';
        noteFilter.frequency.value = this.currentMode === MODES.BATTLE ? 1800 : 1400;
        noteFilter.Q.value = 0.9;

        note.connect(noteFilter);
        noteFilter.connect(noteGain);
        noteGain.connect(this.melodyGain);
        noteGain.connect(this.reverbBus);
        noteGain.connect(this.delayBus);

        note.start(now);
        note.stop(now + noteLength + 0.05);
    }

    private fadeTo(targetVolume: number, fadeSeconds: number): void {
        if (!this.masterGain || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(targetVolume, now, Math.max(0.001, fadeSeconds / 4));
    }
}
