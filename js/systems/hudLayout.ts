const DEBUG_PIN_OUTLINES = false;

const HUD_BASE_PROFILE = {
    crazyUserScale: 1,
    waveLabelScale: 1,
    buttonsHeightScale: 1,
    hudGapScale: 1,
    hudFontScale: 1,
    rightSideButtonsExtraScale: 1,
    pinToEdges: false,
    iconButtons: false,
};

const HUD_MILESTONES = [
    {
        width: 800,
        height: 450,
        profile: {
            crazyUserScale: 0.8,
            waveLabelScale: 0.8,
            buttonsHeightScale: 0.6,
            hudGapScale: 0.65,
            hudFontScale: 1.1,
            pinToEdges: true,
            iconButtons: true,
        },
    },
    {
        width: 821,
        height: 462,
        profile: {
            crazyUserScale: 0.8,
            waveLabelScale: 0.8,
            buttonsHeightScale: 0.7,
            hudGapScale: 0.65,
            hudFontScale: 1.1,
            pinToEdges: true,
            iconButtons: true,
        },
    },
    {
        width: 907,
        height: 510,
        profile: {
            crazyUserScale: 0.9,
            waveLabelScale: 0.8,
            buttonsHeightScale: 0.7,
            hudGapScale: 0.65,
            hudFontScale: 1.1,
            pinToEdges: true,
            iconButtons: true,
        },
    },
    {
        width: 1050,
        height: 591,
        profile: {
            crazyUserScale: 0.8,
            waveLabelScale: 0.8,
            buttonsHeightScale: 0.8,
            hudGapScale: 0.75,
            hudFontScale: 1,
            pinToEdges: true,
            iconButtons: false,
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
            pinToEdges: true,
            iconButtons: false,
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
            pinToEdges: true,
            iconButtons: false,
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
            pinToEdges: true,
            iconButtons: false,
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
            hudGapScale: 0.95,
            hudFontScale: 1.1,
            pinToEdges: true,
            iconButtons: false,
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
            hudGapScale: 1.55,
            hudFontScale: 1.3,
            pinToEdges: false,
            iconButtons: false,
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
        const lowerValue = lowerProfile[key];
        const upperValue = upperProfile[key];

        if (typeof lowerValue === 'number' && typeof upperValue === 'number') {
            interpolated[key] = interpolateValue(lowerValue, upperValue, t);
            continue;
        }

        if (typeof lowerValue === 'boolean' && typeof upperValue === 'boolean') {
            interpolated[key] = t < 0.5 ? lowerValue : upperValue;
            continue;
        }

        if (upperValue !== undefined) {
            interpolated[key] = upperValue;
        } else if (lowerValue !== undefined) {
            interpolated[key] = lowerValue;
        }
    }
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
    const hudFontScale = Number.isFinite(effectiveProfile.hudFontScale)
        ? effectiveProfile.hudFontScale
        : HUD_BASE_PROFILE.hudFontScale;
    const buttonScale = Number.isFinite(effectiveProfile.buttonsHeightScale)
        ? effectiveProfile.buttonsHeightScale * hudFontScale
        : hudFontScale;

    hudElement.style.setProperty('--crazy-user-scale', String(effectiveProfile.crazyUserScale));
    hudElement.style.setProperty('--wave-label-scale', String(effectiveProfile.waveLabelScale));
    hudElement.style.setProperty('--btn-scale', String(buttonScale));
    hudElement.style.setProperty('--right-btn-scale', String(effectiveProfile.rightSideButtonsExtraScale));
    hudElement.style.setProperty('--hud-font-scale', String(hudFontScale));
    hudElement.style.setProperty('--hud-scale', String(hudFontScale));

    const gap = Math.max(8, Math.round(BASE_HUD_GAP * effectiveProfile.hudGapScale));
    hudElement.style.setProperty('--hud-gap', `${gap}px`);

    hudElement.classList.toggle('hud--pin-tight', Boolean(effectiveProfile.pinToEdges));
    hudElement.classList.toggle('hud--icon-buttons', Boolean(effectiveProfile.iconButtons));

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
            profile.hudFontScale,
            profile.iconButtons,
        ]
            .map((value) => (typeof value === 'number' ? value.toFixed(3) : String(value)))
            .join('|')}`;
        if (signature !== lastSignature) {
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
