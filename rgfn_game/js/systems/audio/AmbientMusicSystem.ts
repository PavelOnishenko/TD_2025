import { MODES } from '../game/runtime/GameModeStateMachine.js';

type AmbientMode = typeof MODES.WORLD_MAP | typeof MODES.VILLAGE | typeof MODES.BATTLE;

type MedievalPreset = {
    tempo: number;
    masterVolume: number;
    leadChance: number;
    percussionChance: number;
    bassOctave: number;
    droneChance: number;
    countermelodyChance: number;
    ornamentChance: number;
};

type BarPalette = {
    rootMidi: number;
    scale: number[];
    cadence: number[];
    beatSeconds: number;
    swing: number;
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
    private readonly phrygianScale = [0, 1, 3, 5, 7, 8, 10];
    private readonly harmonicMinorScale = [0, 2, 3, 5, 7, 8, 11];
    private readonly mixolydianScale = [0, 2, 4, 5, 7, 9, 10];
    private readonly cadences = [
        [0, 3, 4],
        [5, 3, 4],
        [0, 6, 4],
        [0, 5, 4],
        [0, 5, 3, 4],
        [0, 4, 6, 3],
        [5, 1, 6, 4],
        [0, 2, 5, 4],
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
        const palette = this.buildBarPalette(preset);
        const barLength = palette.beatSeconds * 4;
        const startTime = this.audioContext.currentTime + 0.03;

        this.playBackgroundDrone(palette, startTime, barLength, preset);

        for (let beat = 0; beat < 4; beat += 1) {
            const beatOffset = beat + ((beat % 2 === 1 ? palette.swing : 0) * 0.16);
            const beatTime = startTime + beatOffset * palette.beatSeconds;
            const chordDegree = palette.cadence[Math.min(palette.cadence.length - 1, Math.floor((beat / 4) * palette.cadence.length))];
            const chordRoot = palette.rootMidi + palette.scale[chordDegree];
            const beatDuration = palette.beatSeconds * (beat % 2 === 0 ? 0.94 : 0.88);

            this.playLuteChord(chordRoot, beatTime, beatDuration, palette);
            this.playBassNote(chordRoot - 12 + preset.bassOctave * 12, beatTime, beatDuration * 0.95);

            if (this.random() > 0.58) {
                this.playHammeredDulcimer(chordRoot + (this.random() > 0.5 ? 12 : 0), beatTime + palette.beatSeconds * 0.12, palette.beatSeconds * 0.4, 0.028 + this.random() * 0.018);
            }

            if (this.random() < preset.countermelodyChance) {
                const upperDegree = palette.scale[(chordDegree + 4 + Math.floor(this.random() * 3)) % palette.scale.length];
                this.playReedCounterMelody(palette.rootMidi + 12 + upperDegree, beatTime + palette.beatSeconds * 0.2, palette.beatSeconds * 0.65);
            }

            if (this.random() < preset.leadChance) {
                const embellishDegree = palette.scale[(chordDegree + 1 + Math.floor(this.random() * 5)) % palette.scale.length];
                const leadMidi = palette.rootMidi + 12 + embellishDegree;
                this.playFluteNote(leadMidi, beatTime + palette.beatSeconds * 0.26, palette.beatSeconds * (0.45 + this.random() * 0.22));
            }

            if (this.random() < preset.ornamentChance) {
                this.playOrnamentRun(palette, chordRoot, beatTime + palette.beatSeconds * 0.58, palette.beatSeconds * 0.3);
            }

            if (this.random() < preset.percussionChance) {
                this.playFrameDrum(beatTime + palette.beatSeconds * 0.02, palette.beatSeconds * 0.22, beat === 0 || beat === 2 ? 0.35 : 0.2);
                if (this.random() > 0.45) {
                    this.playTambourineTick(beatTime + palette.beatSeconds * 0.38, palette.beatSeconds * 0.13, 0.09 + this.random() * 0.07);
                }
                if (this.random() > 0.7) {
                    this.playShaker(beatTime + palette.beatSeconds * 0.72, palette.beatSeconds * 0.2, 0.05 + this.random() * 0.05);
                }
            }
        }

        if (this.mode !== MODES.BATTLE && this.random() > 0.35) {
            const ending = palette.rootMidi + 12 + palette.scale[(this.barCursor + 4 + Math.floor(this.random() * 3)) % palette.scale.length];
            this.playFluteNote(ending, startTime + barLength - palette.beatSeconds * 0.42, palette.beatSeconds * 0.4);
        }

        if (this.random() > 0.42) {
            this.playStringPad(palette.rootMidi + 7, startTime, barLength * (0.8 + this.random() * 0.3), this.mode === MODES.BATTLE ? 0.028 : 0.045);
        }

        this.barCursor += 1;
    }

    private buildBarPalette(preset: MedievalPreset): BarPalette {
        const modeScales = this.mode === MODES.BATTLE
            ? [this.dorianScale, this.phrygianScale, this.harmonicMinorScale]
            : this.mode === MODES.VILLAGE
                ? [this.mixolydianScale, this.dorianScale, this.naturalMinorScale]
                : [this.naturalMinorScale, this.dorianScale, this.harmonicMinorScale];

        const scale = modeScales[Math.floor(this.random() * modeScales.length)];
        const cadence = this.cadences[(this.barCursor + Math.floor(this.random() * this.cadences.length)) % this.cadences.length];
        const rootMidi = 47 + Math.floor(this.random() * 7) + ((this.barCursor % 2) * 2);
        const beatSeconds = 60 / (preset.tempo + (this.random() * 8 - 4));
        const swing = 0.45 + this.random() * 0.2;

        return { rootMidi, scale, cadence, beatSeconds, swing };
    }

    private getPresetForMode(mode: AmbientMode): MedievalPreset {
        if (mode === MODES.BATTLE) {
            return {
                tempo: 118,
                masterVolume: 0.2,
                leadChance: 0.35,
                percussionChance: 0.9,
                bassOctave: -1,
                droneChance: 0.75,
                countermelodyChance: 0.45,
                ornamentChance: 0.45,
            };
        }

        if (mode === MODES.VILLAGE) {
            return {
                tempo: 94,
                masterVolume: 0.14,
                leadChance: 0.55,
                percussionChance: 0.3,
                bassOctave: -1,
                droneChance: 0.55,
                countermelodyChance: 0.42,
                ornamentChance: 0.58,
            };
        }

        return {
            tempo: 102,
            masterVolume: 0.17,
            leadChance: 0.45,
            percussionChance: 0.55,
            bassOctave: -1,
            droneChance: 0.62,
            countermelodyChance: 0.36,
            ornamentChance: 0.5,
        };
    }

    private playLuteChord(rootMidi: number, time: number, duration: number, palette: BarPalette): void {
        const isMinorThird = palette.scale.includes(3);
        const intervals = isMinorThird ? [0, 3, 7, 10] : [0, 4, 7, 9];
        intervals.forEach((semitones, index) => {
            const detune = (index - 1.4) * (3 + this.random() * 3);
            this.playPluckedVoice(rootMidi + semitones, time + index * 0.009, duration * (0.92 - index * 0.06), 0.06 + this.random() * 0.03, 'triangle', detune);
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

    private playReedCounterMelody(midi: number, time: number, duration: number): void {
        if (!this.audioContext || !this.masterGain) return;

        const frequency = this.midiToFrequency(midi);
        const oscillator = this.audioContext.createOscillator();
        oscillator.type = 'square';
        oscillator.frequency.value = frequency;

        const pulseBlend = this.audioContext.createGain();
        pulseBlend.gain.value = 0.6;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1400 + this.random() * 500;
        filter.Q.value = 1.4;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.016 + this.random() * 0.012, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        oscillator.connect(pulseBlend);
        pulseBlend.connect(filter);
        filter.connect(gain);
        this.routeToMasterAndReverb(gain, 0.33);

        oscillator.start(time);
        oscillator.stop(time + duration + 0.04);
    }

    private playStringPad(midi: number, time: number, duration: number, level: number): void {
        if (!this.audioContext || !this.masterGain) return;

        const baseFreq = this.midiToFrequency(midi);
        const waveTypes: OscillatorType[] = ['sawtooth', 'triangle'];
        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(level, time + 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900 + this.random() * 600;
        filter.Q.value = 0.5;

        gain.connect(filter);
        this.routeToMasterAndReverb(filter, 0.55);

        waveTypes.forEach((type, index) => {
            const osc = this.audioContext!.createOscillator();
            osc.type = type;
            osc.frequency.value = baseFreq * (index === 0 ? 1 : 2);
            osc.detune.value = (index === 0 ? -7 : 5) + this.random() * 4;
            osc.connect(gain);
            osc.start(time);
            osc.stop(time + duration + 0.06);
        });
    }

    private playBackgroundDrone(palette: BarPalette, startTime: number, barLength: number, preset: MedievalPreset): void {
        if (this.random() > preset.droneChance) return;
        const droneMidi = palette.rootMidi - 12 + (this.random() > 0.6 ? 7 : 0);
        this.playStringPad(droneMidi, startTime, barLength * 1.1, this.mode === MODES.BATTLE ? 0.02 : 0.032);
    }

    private playHammeredDulcimer(midi: number, time: number, duration: number, level: number): void {
        this.playPluckedVoice(midi, time, duration, level, 'square', this.random() * 10 - 5);
        if (this.random() > 0.4) {
            this.playPluckedVoice(midi + 12, time + 0.02, duration * 0.7, level * 0.5, 'triangle', this.random() * 8 - 4);
        }
    }

    private playOrnamentRun(palette: BarPalette, nearMidi: number, start: number, stepLength: number): void {
        const noteCount = 2 + Math.floor(this.random() * 3);
        for (let i = 0; i < noteCount; i += 1) {
            const step = Math.floor(this.random() * palette.scale.length);
            const midi = nearMidi + palette.scale[step] + (this.random() > 0.6 ? 12 : 0);
            this.playHammeredDulcimer(midi, start + i * stepLength * 0.45, stepLength * 0.55, 0.02 + this.random() * 0.016);
        }
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

    private playTambourineTick(time: number, duration: number, level: number): void {
        if (!this.audioContext || !this.masterGain) return;

        const noiseBuffer = this.audioContext.createBuffer(1, Math.floor(this.audioContext.sampleRate * duration), this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) {
            data[i] = (this.random() * 2 - 1) * (1 - i / data.length) * (i % 3 === 0 ? 1 : 0.5);
        }

        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 4800;
        filter.Q.value = 0.4;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(level, time + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        noiseSource.connect(filter);
        filter.connect(gain);
        this.routeToMasterAndReverb(gain, 0.16);

        noiseSource.start(time);
    }

    private playShaker(time: number, duration: number, level: number): void {
        if (!this.audioContext || !this.masterGain) return;

        const noiseBuffer = this.audioContext.createBuffer(1, Math.floor(this.audioContext.sampleRate * duration), this.audioContext.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i += 1) {
            const gate = i % 8 < 4 ? 1 : 0.25;
            data[i] = (this.random() * 2 - 1) * gate * (1 - i / data.length);
        }

        const noiseSource = this.audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;

        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 6200;
        filter.Q.value = 0.7;

        const gain = this.audioContext.createGain();
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(level, time + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        noiseSource.connect(filter);
        filter.connect(gain);
        this.routeToMasterAndReverb(gain, 0.09);

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
