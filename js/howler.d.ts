// Type declarations for Howler.js audio library

interface HowlOptions {
    src: string | string[];
    volume?: number;
    loop?: boolean;
    autoplay?: boolean;
    onload?: () => void;
    onloaderror?: (id: number, error: any) => void;
    onplay?: () => void;
    onend?: () => void;
    format?: string[];
    html5?: boolean;
    sprite?: Record<string, [number, number]>;
}

declare global {
    interface Howl {
        play(spriteOrId?: string | number): number;
        pause(id?: number): this;
        stop(id?: number): this;
        mute(muted: boolean, id?: number): this;
        volume(volume?: number, id?: number): number | this;
        fade(from: number, to: number, duration: number, id?: number): this;
        rate(rate?: number, id?: number): number | this;
        seek(seek?: number, id?: number): number | this;
        loop(loop?: boolean, id?: number): boolean | this;
        playing(id?: number): boolean;
        duration(id?: number): number;
        state(): 'unloaded' | 'loading' | 'loaded';
        load(): this;
        unload(): void;
        on(event: string, callback: Function, id?: number): this;
        once(event: string, callback: Function, id?: number): this;
        off(event?: string, callback?: Function, id?: number): this;
    }

    interface HowlConstructor {
        constructor(options: HowlOptions);
        new(options: HowlOptions): Howl;
    }

    interface HowlerGlobal {
        mute(muted: boolean): void;
        volume(volume?: number): number | void;
        codecs(ext: string): boolean;
        unload(): void;
        usingWebAudio: boolean;
        noAudio: boolean;
        autoSuspend: boolean;
        ctx: AudioContext | null;
        masterGain: GainNode | null;
    }

    interface Window {
        Howl: HowlConstructor;
        Howler: HowlerGlobal;
    }

    var Howl: HowlConstructor;
    var Howler: HowlerGlobal;
}

export {};
