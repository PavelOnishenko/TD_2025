import { MODES } from '../game/runtime/GameModeStateMachine.js';

type AmbientMode = typeof MODES.WORLD_MAP | typeof MODES.VILLAGE | typeof MODES.BATTLE;

type MedievalPreset = {
    tempo: number;
    masterVolume: number;
    leadChance: number;
    percussionChance: number;
    bassOctave: number;
};

/**
 * Generates algorithmic medieval-inspired music with no external assets.
 * The arrangement is regenerated every bar so the tune keeps evolving.
 */
export default class AmbientMusicSystem {
    private audioContext: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    private hallReverbGain: GainNode | null = null;
    private hallConvolver: ConvolverNode | null = null;
    private started = false;
    private unlockBound = false;

    private mode: AmbientMode = MODES.WORLD_MAP;
    private musicTimer: number | null = null;
    private barCursor = 0;
    private readonly random = Math.random;

    private readonly naturalMinorScale = [0, 2, 3, 5, 7, 8, 10];
    private readonly dorianScale = [0, 2, 3, 5, 7, 9, 10];
    private readonly cadences = [
        [0, 3, 4],
        [5, 3, 4],
        [0, 6, 4],
        [0, 5, 4],
    ];

    public attachAutoStart(): void {
        if (this.unlockBound) return;

        const startFromInteraction = (): void => {
            this.start().catch((error: unknown) => {
                console.warn('Medieval music could not start:', error);
            });
        };

        window.addEventListener('pointerdown', startFromInteraction, { once: true });
        window.addEventListener('keydown', startFromInteraction, { once: true });
        this.unlockBound = true;
    }

    public async start(): Promise<void> {
        if (this.started) {
            await this.resume();
            this.restartScheduler();
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

        this.buildHallReverb();

        this.fadeTo(0.12, 4);
        this.started = true;

        await this.resume();
        this.restartScheduler();
        this.setMode(MODES.WORLD_MAP);
    }

    public async resume(): Promise<void> {
        if (!this.audioContext) return;
        if (this.audioContext.state === 'suspended') await this.audioContext.resume();
    }

    public setMode(mode: AmbientMode): void {
        this.mode = mode;
        if (!this.audioContext || !this.started) return;

        const preset = this.getPresetForMode(mode);
        this.fadeTo(preset.masterVolume, 2.2);

        if (this.hallReverbGain) {
            const now = this.audioContext.currentTime;
            const reverbTarget = mode === MODES.BATTLE ? 0.22 : mode === MODES.VILLAGE ? 0.3 : 0.35;
            this.hallReverbGain.gain.setTargetAtTime(reverbTarget, now, 0.9);
        }
    }

    public stop(): void {
        if (!this.masterGain) return;
        this.fadeTo(0.0001, 1.5);

        if (this.musicTimer !== null) {
            window.clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }
    }

    private restartScheduler(): void {
        if (!this.audioContext) return;

        if (this.musicTimer !== null) {
            window.clearTimeout(this.musicTimer);
            this.musicTimer = null;
        }

        this.barCursor = 0;

        const scheduleNextBar = (): void => {
            if (!this.audioContext || this.audioContext.state !== 'running') return;

            const preset = this.getPresetForMode(this.mode);
            this.playGeneratedBar();

            const nextBarMs = Math.max(1400, (60 / preset.tempo) * 4 * 1000);
            this.musicTimer = window.setTimeout(scheduleNextBar, nextBarMs);
        };

        scheduleNextBar();
    }

    private playGeneratedBar(): void {
        if (!this.audioContext || !this.masterGain) return;

        const preset = this.getPresetForMode(this.mode);
        const beatSeconds = 60 / preset.tempo;
        const barLength = beatSeconds * 4;
        const startTime = this.audioContext.currentTime + 0.03;

        const rootMidi = 50 + ((this.barCursor % 2) * 2);
        const cadence = this.cadences[this.barCursor % this.cadences.length];
        const scale = this.mode === MODES.BATTLE ? this.dorianScale : this.naturalMinorScale;

        for (let beat = 0; beat < 4; beat += 1) {
            const beatTime = startTime + beat * beatSeconds;
            const chordDegree = cadence[Math.min(cadence.length - 1, Math.floor(beat / 1.5))];
            const chordRoot = rootMidi + scale[chordDegree];

            this.playLuteChord(chordRoot, beatTime, beatSeconds * 0.94);
            this.playBassNote(chordRoot - 12 + preset.bassOctave * 12, beatTime, beatSeconds * 0.9);

            if (this.random() < preset.leadChance) {
                const embellishDegree = scale[(chordDegree + 2 + Math.floor(this.random() * 3)) % scale.length];
                const leadMidi = rootMidi + 12 + embellishDegree;
                this.playFluteNote(leadMidi, beatTime + beatSeconds * 0.3, beatSeconds * 0.55);
            }

            if (this.random() < preset.percussionChance) {
                this.playFrameDrum(beatTime + beatSeconds * 0.02, beatSeconds * 0.22, beat === 0 || beat === 2 ? 0.35 : 0.2);
            }
        }

        if (this.mode !== MODES.BATTLE && this.random() > 0.55) {
            const ending = rootMidi + 12 + scale[(this.barCursor + 4) % scale.length];
            this.playFluteNote(ending, startTime + barLength - beatSeconds * 0.42, beatSeconds * 0.4);
        }

        this.barCursor += 1;
    }

    private getPresetForMode(mode: AmbientMode): MedievalPreset {
        if (mode === MODES.BATTLE) {
            return {
                tempo: 118,
                masterVolume: 0.2,
                leadChance: 0.35,
                percussionChance: 0.9,
                bassOctave: -1,
            };
        }

        if (mode === MODES.VILLAGE) {
            return {
                tempo: 94,
                masterVolume: 0.14,
                leadChance: 0.55,
                percussionChance: 0.3,
                bassOctave: -1,
            };
        }

        return {
            tempo: 102,
            masterVolume: 0.17,
            leadChance: 0.45,
            percussionChance: 0.55,
            bassOctave: -1,
        };
    }

    private playLuteChord(rootMidi: number, time: number, duration: number): void {
        const intervals = [0, 3, 7];
        intervals.forEach((semitones, index) => {
            const detune = (index - 1) * 4;
            this.playPluckedVoice(rootMidi + semitones, time + index * 0.01, duration * (0.9 - index * 0.07), 0.08, 'triangle', detune);
        });
    }

    private playBassNote(midi: number, time: number, duration: number): void {
        this.playPluckedVoice(midi, time, duration, 0.09, 'sawtooth', -3);
    }

    private playFluteNote(midi: number, time: number, duration: number): void {
        if (!this.audioContext || !this.masterGain) return;

        const frequency = this.midiToFrequency(midi);
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;

        const vibratoLfo = this.audioContext.createOscillator();
        vibratoLfo.type = 'sine';
        vibratoLfo.frequency.value = 5.4 + this.random() * 0.8;
        const vibratoDepth = this.audioContext.createGain();
        vibratoDepth.gain.value = 2.4;
        vibratoLfo.connect(vibratoDepth);
        vibratoDepth.connect(oscillator.frequency);

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.03, time + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.002, time + duration);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2200;
        filter.Q.value = 0.7;

        oscillator.connect(filter);
        filter.connect(gain);
        this.routeToMasterAndReverb(gain, 0.5);

        oscillator.start(time);
        vibratoLfo.start(time);
        oscillator.stop(time + duration + 0.04);
        vibratoLfo.stop(time + duration + 0.04);
    }

    private playPluckedVoice(midi: number, time: number, duration: number, level: number, type: OscillatorType, detuneCents: number): void {
        if (!this.audioContext || !this.masterGain) return;

        const oscillator = this.audioContext.createOscillator();
        oscillator.type = type;
        oscillator.frequency.value = this.midiToFrequency(midi);
        oscillator.detune.value = detuneCents;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(level, time + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1650;
        filter.Q.value = 0.9;

        oscillator.connect(filter);
        filter.connect(gain);
        this.routeToMasterAndReverb(gain, 0.25);

        oscillator.start(time);
        oscillator.stop(time + duration + 0.03);
    }

    private playFrameDrum(time: number, duration: number, level: number): void {
        if (!this.audioContext || !this.masterGain) return;

        const noiseBuffer = this.audioContext.createBuffer(1, Math.floor(this.audioContext.sampleRate * duration), this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) {
            data[i] = (this.random() * 2 - 1) * (1 - i / data.length);
        }

        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        const noiseFilter = this.audioContext.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 240;
        noiseFilter.Q.value = 0.8;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(level, time + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        noiseSource.connect(noiseFilter);
        noiseFilter.connect(gain);
        this.routeToMasterAndReverb(gain, 0.12);

        noiseSource.start(time);
    }

    private routeToMasterAndReverb(source: AudioNode, reverbAmount: number): void {
        if (!this.masterGain) return;
        source.connect(this.masterGain);

        if (this.hallReverbGain) {
            const send = this.audioContext?.createGain();
            if (send) {
                send.gain.value = reverbAmount;
                source.connect(send);
                send.connect(this.hallReverbGain);
            }
        }
    }

    private buildHallReverb(): void {
        if (!this.audioContext || !this.masterGain) return;

        this.hallConvolver = this.audioContext.createConvolver();
        const impulseLengthSeconds = 2.6;
        const impulse = this.audioContext.createBuffer(2, this.audioContext.sampleRate * impulseLengthSeconds, this.audioContext.sampleRate);

        for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
            const data = impulse.getChannelData(channel);
            for (let i = 0; i < data.length; i += 1) {
                const decay = Math.pow(1 - i / data.length, 2.4);
                data[i] = (this.random() * 2 - 1) * decay;
            }
        }

        this.hallConvolver.buffer = impulse;

        this.hallReverbGain = this.audioContext.createGain();
        this.hallReverbGain.gain.value = 0.35;

        this.hallReverbGain.connect(this.hallConvolver);
        this.hallConvolver.connect(this.masterGain);
    }

    private midiToFrequency(midi: number): number {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    private fadeTo(targetVolume: number, fadeSeconds: number): void {
        if (!this.masterGain || !this.audioContext) return;

        const now = this.audioContext.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(targetVolume, now, Math.max(0.001, fadeSeconds / 4));
    }
}
