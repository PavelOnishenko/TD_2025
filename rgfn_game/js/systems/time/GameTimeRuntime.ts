export type TimeActivity = 'travel' | 'combat' | 'village' | 'rest' | 'idle';

type CalendarMonth = { name: string; days: number };

type CalendarState = {
    startYear: number;
    months: CalendarMonth[];
    totalMinutes: number;
};

const MINUTES_PER_DAY = 24 * 60;

export default class GameTimeRuntime {
    private readonly state: CalendarState;

    public constructor(savedState?: Record<string, unknown> | null) {
        this.state = this.tryRestore(savedState) ?? this.createRandomCalendarState();
    }

    public advanceMinutes(minutes: number): void {
        if (!Number.isFinite(minutes) || minutes <= 0) {
            return;
        }
        this.state.totalMinutes += Math.max(1, Math.round(minutes));
    }

    public getDaylightFactor(): number {
        const hour = this.getHourOfDay();
        if (hour < 5 || hour >= 22) {return 0.46;}
        if (hour < 7) {return 0.58;}
        if (hour < 18) {return 1;}
        if (hour < 20) {return 0.72;}
        return 0.58;
    }

    public getHudClockText(): string {
        const hour = this.getHourOfDay().toString().padStart(2, '0');
        const minute = this.getMinuteOfHour().toString().padStart(2, '0');
        return `${hour}:${minute}`;
    }

    public getHudDateText(): string {
        const date = this.getCalendarDate();
        const month = this.state.months[date.monthIndex];
        return `Y${date.year} • ${month.name} ${date.day}`;
    }

    public getState(): Record<string, unknown> {
        return {
            startYear: this.state.startYear,
            months: this.state.months.map((month) => ({ ...month })),
            totalMinutes: this.state.totalMinutes,
        };
    }

    private getCalendarDate(): { year: number; monthIndex: number; day: number } {
        const daysPerYear = this.state.months.reduce((sum, month) => sum + month.days, 0);
        const elapsedDays = Math.floor(this.state.totalMinutes / MINUTES_PER_DAY);
        const yearOffset = daysPerYear > 0 ? Math.floor(elapsedDays / daysPerYear) : 0;
        let dayInYear = daysPerYear > 0 ? elapsedDays % daysPerYear : 0;

        for (let monthIndex = 0; monthIndex < this.state.months.length; monthIndex += 1) {
            const monthDays = this.state.months[monthIndex].days;
            if (dayInYear < monthDays) {
                return { year: this.state.startYear + yearOffset, monthIndex, day: dayInYear + 1 };
            }
            dayInYear -= monthDays;
        }

        return { year: this.state.startYear + yearOffset, monthIndex: 0, day: 1 };
    }

    private getMinuteOfDay(): number {
        const normalized = this.state.totalMinutes % MINUTES_PER_DAY;
        return normalized < 0 ? normalized + MINUTES_PER_DAY : normalized;
    }

    private getHourOfDay(): number {
        return Math.floor(this.getMinuteOfDay() / 60);
    }

    private getMinuteOfHour(): number {
        return this.getMinuteOfDay() % 60;
    }

    private createRandomCalendarState(): CalendarState {
        const startYear = this.sampleLogRange(0, 10000);
        const monthCount = this.sampleLogRange(1, 60);
        const styleRoll = Math.random();
        const baseDays = this.sampleLogRange(12, 55);
        const months: CalendarMonth[] = [];

        for (let index = 0; index < monthCount; index += 1) {
            let days = baseDays;
            if (styleRoll < 0.33) {
                days = baseDays;
            } else if (styleRoll < 0.66) {
                days = Math.max(8, baseDays + this.sampleInt(-2, 2));
            } else {
                days = this.sampleLogRange(6, 70);
            }
            months.push({ name: this.generateMonthName(index), days });
        }

        return { startYear, months, totalMinutes: this.sampleInt(0, MINUTES_PER_DAY - 1) };
    }

    private tryRestore(savedState?: Record<string, unknown> | null): CalendarState | null {
        if (!savedState) {return null;}
        const startYear = typeof savedState.startYear === 'number' ? Math.max(0, Math.floor(savedState.startYear)) : NaN;
        const totalMinutes = typeof savedState.totalMinutes === 'number' ? Math.max(0, Math.floor(savedState.totalMinutes)) : NaN;
        const rawMonths = Array.isArray(savedState.months) ? savedState.months : [];
        const months = rawMonths
            .filter((month): month is { name: string; days: number } => Boolean(month) && typeof (month as { name?: unknown }).name === 'string' && typeof (month as { days?: unknown }).days === 'number')
            .map((month) => ({
                name: month.name.trim() || 'Unnamed',
                days: Math.max(1, Math.floor(month.days)),
            }));

        if (!Number.isFinite(startYear) || !Number.isFinite(totalMinutes) || months.length === 0) {return null;}

        return { startYear, months, totalMinutes };
    }

    private sampleLogRange(min: number, max: number): number {
        if (min >= max) {return min;}
        const normalized = Math.log10(1 + Math.random() * 9);
        return Math.max(min, Math.min(max, Math.round(min + ((max - min) * normalized))));
    }

    private sampleInt(min: number, max: number): number {
        const lower = Math.min(min, max);
        const upper = Math.max(min, max);
        return lower + Math.floor(Math.random() * (upper - lower + 1));
    }

    private generateMonthName(index: number): string {
        const prefix = ['Aur', 'Vel', 'Nor', 'Tal', 'Mir', 'Sol', 'Dra', 'Fen', 'Kor', 'Lun'][index % 10];
        const suffixes = ['is', 'or', 'eth', 'un', 'ar', 'en', 'ium', 'al'];
        const suffix = suffixes[(index * 7 + this.statefulHash(index)) % suffixes.length];
        return `${prefix}${suffix}`;
    }

    private statefulHash(index: number): number {
        return Math.abs(((index + 1) * 1103515245 + 12345) % 2147483647);
    }
}
