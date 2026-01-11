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
    class Howl {
        constructor(options: HowlOptions);

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

    class Howler {
        static mute(muted: boolean): void;
        static volume(volume?: number): number | void;
        static codecs(ext: string): boolean;
        static unload(): void;
        static usingWebAudio: boolean;
        static noAudio: boolean;
        static autoSuspend: boolean;
        static ctx: AudioContext | null;
        static masterGain: GainNode | null;
    }

    interface Window {
        Howl: typeof Howl;
        Howler: typeof Howler;
    }
}

export {};
