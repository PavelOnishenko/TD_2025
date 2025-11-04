const DEBUG_PIN_OUTLINES = false;

const HUD_BASE_PROFILE = {
    crazyUserScale: 1,
    waveLabelScale: 1,
    buttonsHeightScale: 1,
    hudGapScale: 1,
    hudFontScale: 1,
    rightSideButtonsExtraScale: 1,
    pinToEdges: true,
};

const HUD_MILESTONES = [
    {
        width: 800,
        height: 450,
        profile: {
            crazyUserScale: 0.5,
            waveLabelScale: 0.5,
            buttonsHeightScale: 0.6,
            hudGapScale: 0.55,
            hudFontScale: 0.9,
        },
    },
    {
        width: 821,
        height: 462,
        profile: {
            crazyUserScale: 0.7,
            waveLabelScale: 0.8,
            buttonsHeightScale: 0.7,
            hudGapScale: 0.6,
            hudFontScale: 0.95,
        },
    },
    {
        width: 907,
        height: 510,
        profile: {
            crazyUserScale: 0.7,
            waveLabelScale: 0.8,
            buttonsHeightScale: 0.7,
            hudGapScale: 0.65,
            hudFontScale: 0.95,
        },
    },
    {
        width: 1077,
        height: 606,
        profile: {
            crazyUserScale: 0.8,
            waveLabelScale: 0.8,
            buttonsHeightScale: 0.8,
            hudGapScale: 0.75,
            hudFontScale: 1,
        },
    },
    {
        width: 1080,
        height: 607,
        profile: {
            crazyUserScale: 0.8,
            waveLabelScale: 0.8,
            buttonsHeightScale: 0.8,
            hudGapScale: 0.75,
            hudFontScale: 1,
        },
    },
    {
        width: 1216,
        height: 684,
        profile: {
            crazyUserScale: 0.8,
            waveLabelScale: 0.8,
            buttonsHeightScale: 0.8,
            hudGapScale: 0.8,
            hudFontScale: 1,
        },
    },
    {
        width: 1280,
        height: 720,
        profile: {
            crazyUserScale: 0.8,
            waveLabelScale: 0.8,
            buttonsHeightScale: 0.8,
            hudGapScale: 0.82,
            hudFontScale: 1,
        },
    },
    {
        width: 1366,
        height: 768,
        profile: {
            crazyUserScale: 0.9,
            waveLabelScale: 0.9,
            buttonsHeightScale: 1,
            rightSideButtonsExtraScale: 0.8,
            hudGapScale: 0.88,
            hudFontScale: 1,
        },
    },
    {
        width: 1536,
        height: 864,
        profile: {
            crazyUserScale: 1,
            waveLabelScale: 1,
            buttonsHeightScale: 1,
            rightSideButtonsExtraScale: 1,
            hudGapScale: 1,
            hudFontScale: 1,
        },
    },
].map((entry) => ({
    ...entry,
    metric: entry.width * entry.height,
    profile: { ...HUD_BASE_PROFILE, ...entry.profile },
}));

const BASE_HUD_GAP = 18;

function interpolateValue(start, end, t) {
    return start + (end - start) * t;
}

function interpolateProfiles(lowerProfile, upperProfile, t) {
    if (!Number.isFinite(t) || t <= 0) {
        return { ...lowerProfile };
    }
    if (t >= 1) {
        return { ...upperProfile };
    }

    const interpolated = { ...HUD_BASE_PROFILE };
    for (const key of Object.keys(interpolated)) {
        const lowerValue = Number(lowerProfile[key]);
        const upperValue = Number(upperProfile[key]);
        if (Number.isFinite(lowerValue) && Number.isFinite(upperValue)) {
            interpolated[key] = interpolateValue(lowerValue, upperValue, t);
        } else {
            interpolated[key] = upperProfile[key] ?? lowerProfile[key];
        }
    }
    interpolated.pinToEdges = lowerProfile.pinToEdges || upperProfile.pinToEdges;
    return interpolated;
}

export function getHudProfileFor(width, height) {
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return { ...HUD_BASE_PROFILE };
    }

    const metric = width * height;
    const sorted = HUD_MILESTONES.slice().sort((a, b) => a.metric - b.metric);

    if (metric <= sorted[0].metric) {
        return { ...sorted[0].profile };
    }

    const last = sorted[sorted.length - 1];
    if (metric >= last.metric) {
        return { ...last.profile };
    }

    let lower = sorted[0];
    let upper = sorted[sorted.length - 1];

    for (let i = 0; i < sorted.length - 1; i += 1) {
        const current = sorted[i];
        const next = sorted[i + 1];
        if (metric === current.metric) {
            return { ...current.profile };
        }
        if (metric > current.metric && metric < next.metric) {
            lower = current;
            upper = next;
            break;
        }
        if (metric === next.metric) {
            return { ...next.profile };
        }
    }

    const range = upper.metric - lower.metric;
    const t = range > 0 ? (metric - lower.metric) / range : 0;
    return interpolateProfiles(lower.profile, upper.profile, t);
}

function applyHudProfile(hudElement, profile) {
    const effectiveProfile = { ...HUD_BASE_PROFILE, ...profile };
    hudElement.style.setProperty('--crazy-user-scale', String(effectiveProfile.crazyUserScale));
    hudElement.style.setProperty('--wave-label-scale', String(effectiveProfile.waveLabelScale));
    hudElement.style.setProperty('--btn-scale', String(effectiveProfile.buttonsHeightScale));
    hudElement.style.setProperty('--right-btn-scale', String(effectiveProfile.rightSideButtonsExtraScale));
    hudElement.style.setProperty('--hud-font-scale', String(effectiveProfile.hudFontScale));
    hudElement.style.setProperty('--hud-scale', String(effectiveProfile.hudFontScale));

    const gap = Math.max(8, Math.round(BASE_HUD_GAP * effectiveProfile.hudGapScale));
    hudElement.style.setProperty('--hud-gap', `${gap}px`);

    hudElement.classList.toggle('hud--pin-tight', Boolean(effectiveProfile.pinToEdges));

    if (DEBUG_PIN_OUTLINES) {
        hudElement.classList.add('hud--debug-outlines');
    } else {
        hudElement.classList.remove('hud--debug-outlines');
    }
}

export function initializeHudController(options = {}) {
    const { windowRef = window } = options;
    if (typeof document === 'undefined') {
        return null;
    }

    const hudElement = document.getElementById('hud');
    if (!hudElement || !windowRef) {
        return null;
    }

    let lastSignature = '';

    const update = () => {
        const width = windowRef.innerWidth;
        const height = windowRef.innerHeight;
        const profile = getHudProfileFor(width, height);
        applyHudProfile(hudElement, profile);
        const signature = `${width}x${height}:${[
            profile.crazyUserScale,
            profile.waveLabelScale,
            profile.buttonsHeightScale,
            profile.rightSideButtonsExtraScale,
            profile.hudGapScale,
        ]
            .map((value) => Number.parseFloat(value).toFixed(3))
            .join('|')}`;
        if (signature !== lastSignature) {
            console.log('[HUD] applying profile', {
                width,
                height,
                profile,
            });
            lastSignature = signature;
        }
    };

    update();
    windowRef.addEventListener('resize', update, { passive: true });
    windowRef.addEventListener('orientationchange', update, { passive: true });
    return {
        update,
    };
}

export { DEBUG_PIN_OUTLINES };
