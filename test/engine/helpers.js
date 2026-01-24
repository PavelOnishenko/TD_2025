export function makeFakeCanvas() {
    return {
        width: 800,
        height: 600,
        style: {},
        viewportTransform: null,
        getContext: () => makeFakeCtx(),
    };
}

export function makeFakeCtx() {
    const ops = [];
    const state = {
        fillStyle: null,
        strokeStyle: null,
        globalAlpha: 1,
        globalCompositeOperation: 'source-over',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'start',
        textBaseline: 'alphabetic',
    };

    return {
        ops,
        state,
        get fillStyle() {
            return state.fillStyle;
        },
        set fillStyle(v) {
            state.fillStyle = v;
            ops.push(['fillStyle', v]);
        },
        get strokeStyle() {
            return state.strokeStyle;
        },
        set strokeStyle(v) {
            state.strokeStyle = v;
            ops.push(['strokeStyle', v]);
        },
        get globalAlpha() {
            return state.globalAlpha;
        },
        set globalAlpha(v) {
            state.globalAlpha = v;
            ops.push(['globalAlpha', v]);
        },
        get globalCompositeOperation() {
            return state.globalCompositeOperation;
        },
        set globalCompositeOperation(v) {
            state.globalCompositeOperation = v;
            ops.push(['globalCompositeOperation', v]);
        },
        get lineWidth() {
            return state.lineWidth;
        },
        set lineWidth(v) {
            state.lineWidth = v;
            ops.push(['lineWidth', v]);
        },
        get font() {
            return state.font;
        },
        set font(v) {
            state.font = v;
            ops.push(['font', v]);
        },
        get textAlign() {
            return state.textAlign;
        },
        set textAlign(v) {
            state.textAlign = v;
            ops.push(['textAlign', v]);
        },
        get textBaseline() {
            return state.textBaseline;
        },
        set textBaseline(v) {
            state.textBaseline = v;
            ops.push(['textBaseline', v]);
        },
        fillRect(x, y, w, h) {
            ops.push(['fillRect', x, y, w, h]);
        },
        strokeRect(x, y, w, h) {
            ops.push(['strokeRect', x, y, w, h]);
        },
        clearRect(x, y, w, h) {
            ops.push(['clearRect', x, y, w, h]);
        },
        beginPath() {
            ops.push(['beginPath']);
        },
        arc(x, y, r, s, e) {
            ops.push(['arc', x, y, r, s, e]);
        },
        fill() {
            ops.push(['fill']);
        },
        stroke() {
            ops.push(['stroke']);
        },
        save() {
            ops.push(['save']);
        },
        restore() {
            ops.push(['restore']);
        },
        setTransform(a, b, c, d, e, f) {
            ops.push(['setTransform', a, b, c, d, e, f]);
        },
        fillText(text, x, y) {
            ops.push(['fillText', text, x, y]);
        },
        strokeText(text, x, y) {
            ops.push(['strokeText', text, x, y]);
        },
    };
}

export function makeFakeWindow(width = 1024, height = 768, dpr = 1) {
    return {
        innerWidth: width,
        innerHeight: height,
        devicePixelRatio: dpr,
    };
}
