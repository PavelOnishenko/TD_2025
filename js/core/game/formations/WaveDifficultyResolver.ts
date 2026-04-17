import { scaleDifficulty } from '../../../utils/difficultyScaling.js';
import { FormationManagerConfig, WaveScheduleEntry } from './FormationTypes.js';

export default class WaveDifficultyResolver {
    public resolveWaveDifficulty(config: FormationManagerConfig, waveSchedule: WaveScheduleEntry[], wave: number): number {
        const scheduled = this.getScheduledDifficulty(waveSchedule, Math.max(0, Math.floor(wave) - 1));
        if (Number.isFinite(scheduled)) {return scaleDifficulty(scheduled as number, config);}
        return scaleDifficulty(this.resolveEndlessDifficulty(config, waveSchedule, wave), config);
    }

    private resolveEndlessDifficulty(config: FormationManagerConfig, waveSchedule: WaveScheduleEntry[], wave: number): number {
        const endless = config.endlessDifficulty ?? {};
        const scheduledLength = Array.isArray(waveSchedule) ? waveSchedule.length : 0;
        const startWave = Number.isFinite(endless.startWave) ? (endless.startWave as number) : (scheduledLength > 0 ? scheduledLength + 1 : 1);
        if (wave < startWave) {
            const last = this.getScheduledDifficulty(waveSchedule, scheduledLength - 1);
            return Number.isFinite(last) ? (last as number) : 0;
        }
        return this.computeEndlessValue(endless, waveSchedule, startWave, wave);
    }

    private computeEndlessValue(endless: NonNullable<FormationManagerConfig['endlessDifficulty']>, waveSchedule: WaveScheduleEntry[], startWave: number, wave: number): number {
        const lastScheduled = this.getScheduledDifficulty(waveSchedule, waveSchedule.length - 1);
        const base = Number.isFinite(endless.base) ? (endless.base as number) : (Number.isFinite(lastScheduled) ? (lastScheduled as number) : 0);
        const growth = Number.isFinite(endless.growth) ? (endless.growth as number) : 0;
        const max = Number.isFinite(endless.max) ? (endless.max as number) : Infinity;
        const waveOffset = Math.max(0, wave - startWave);
        return Math.min(max, Math.max(0, Math.round(base + growth * waveOffset)));
    }

    private getScheduledDifficulty(waveSchedule: WaveScheduleEntry[] | WaveScheduleEntry[][], index: number): number | undefined {
        if (!Array.isArray(waveSchedule) || index < 0 || index >= waveSchedule.length) {return undefined;}
        const entry = waveSchedule[index] as WaveScheduleEntry | WaveScheduleEntry[];
        if (Number.isFinite((entry as WaveScheduleEntry)?.difficulty)) {return (entry as WaveScheduleEntry).difficulty;}
        return Array.isArray(entry) ? this.getScheduledDifficulty(entry, entry.length - 1) : undefined;
    }
}
