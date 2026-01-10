// Cyberpunk Alley Background System
// Adapted from Neon Void starfield and RGFN decoration patterns
// Built in eva_game folder following prototyping process

interface Star {
    x: number;
    y: number;
    baseSize: number;
    sizeJitter: number;
    baseAlpha: number;
    twinkleSpeed: number;
    twinklePhase: number;
    twinkleAmplitude: number;
    glitterSpeed: number;
    glitterPhase: number;
    highlight: boolean;
    color: string;
    sparkleColor: string;
    alpha: number;
    size: number;
}

interface Starfield {
    width: number;
    height: number;
    stars: Star[];
    time: number;
    config: StarfieldConfig;
}

interface StarfieldConfig {
    density: number;
    minSize: number;
    maxSize: number;
    minAlpha: number;
    maxAlpha: number;
}

interface NeonSign {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    color: string;
    glowColor: string;
    flickerSpeed: number;
    flickerPhase: number;
    baseAlpha: number;
}

interface Building {
    x: number;
    y: number;
    width: number;
    height: number;
    windows: Window[];
    antennaCount: number;
}

interface Window {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    flickerSpeed: number;
    flickerPhase: number;
    on: boolean;
}

const STARFIELD_DEFAULTS: StarfieldConfig = {
    density: 0.0003, // Less dense for cyberpunk feel
    minSize: 0.5,
    maxSize: 1.5,
    minAlpha: 0.3,
    maxAlpha: 0.85,
};

// Neon colors for cyberpunk theme
const NEON_COLORS = {
    cyan: '#00ffff',
    magenta: '#ff00ff',
    purple: '#9d00ff',
    pink: '#ff69b4',
    blue: '#4169ff',
    green: '#00ff88',
    orange: '#ff8800',
};

const NEON_SIGN_TEXTS = [
    '霓虹',  // Neon in Chinese
    'BAR',
    'CYBER',
    '24/7',
    'RAMEN',
    '酒',    // Sake in Japanese
];

function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function randomBetween(min: number, max: number): number {
    return min + (max - min) * Math.random();
}

// Starfield functions (adapted from Neon Void)
function createStar(): Star {
    const depth = Math.random();
    const highlight = Math.random() < 0.15; // Less highlights for darker feel

    // Neon colors instead of white
    const neonColorKeys = Object.keys(NEON_COLORS) as (keyof typeof NEON_COLORS)[];
    const randomColorKey = neonColorKeys[Math.floor(Math.random() * neonColorKeys.length)];
    const color = NEON_COLORS[randomColorKey];

    return {
        x: Math.random(),
        y: Math.random(),
        baseSize: randomBetween(STARFIELD_DEFAULTS.minSize, STARFIELD_DEFAULTS.maxSize) * (0.6 + depth * 0.8),
        sizeJitter: randomBetween(0.1, 0.45),
        baseAlpha: randomBetween(STARFIELD_DEFAULTS.minAlpha, STARFIELD_DEFAULTS.maxAlpha) * (0.7 + depth * 0.3),
        twinkleSpeed: randomBetween(0.5, 1.8),
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleAmplitude: randomBetween(0.18, 0.42),
        glitterSpeed: randomBetween(0.35, 1.1),
        glitterPhase: Math.random() * Math.PI * 2,
        highlight,
        color,
        sparkleColor: highlight ? `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.85)` : color,
        alpha: 1,
        size: 1,
    };
}

function createStarfield(width: number, height: number): Starfield {
    const area = Math.max(1, width * height);
    const starsCount = Math.round(area * STARFIELD_DEFAULTS.density);
    const safeCount = Math.max(30, Math.min(200, starsCount));
    const stars = Array.from({ length: safeCount }, () => createStar());
    return { width, height, stars, time: 0, config: STARFIELD_DEFAULTS };
}

function updateStarfield(starfield: Starfield, dt: number): void {
    const time = starfield.time + dt;
    starfield.time = time;

    for (const star of starfield.stars) {
        const twinkle = Math.sin(time * star.twinkleSpeed + star.twinklePhase);
        const glitter = (Math.sin(time * star.glitterSpeed + star.glitterPhase) + 1) * 0.5;
        const amplitude = star.twinkleAmplitude * (0.6 + glitter * 0.8);
        star.alpha = clamp01(star.baseAlpha + amplitude * twinkle);
        star.size = Math.max(0.2, star.baseSize + star.sizeJitter * (glitter - 0.5));
    }
}

function renderStar(ctx: CanvasRenderingContext2D, star: Star, width: number, height: number): void {
    const alpha = clamp01(star.alpha);
    if (alpha <= 0.01) return;

    const radius = Math.max(0.2, star.size);
    const x = clamp01(star.x) * width;
    const y = clamp01(star.y) * height;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = star.color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Glow effect
    ctx.globalAlpha = alpha * 0.4;
    ctx.beginPath();
    ctx.arc(x, y, radius * 3, 0, Math.PI * 2);
    ctx.fill();

    // Highlight cross for special stars
    if (star.highlight) {
        ctx.globalAlpha = alpha * 0.6;
        ctx.strokeStyle = star.sparkleColor;
        ctx.lineWidth = Math.max(0.4, radius * 0.6);
        ctx.lineCap = 'round';
        ctx.beginPath();
        const cross = radius * 3;
        ctx.moveTo(x - cross, y);
        ctx.lineTo(x + cross, y);
        ctx.moveTo(x, y - cross);
        ctx.lineTo(x, y + cross);
        ctx.stroke();
    }

    ctx.globalAlpha = 1;
}

// Building generation
function createBuildings(width: number, height: number): Building[] {
    const buildings: Building[] = [];

    // Left side buildings
    const leftBuildingCount = 2 + Math.floor(Math.random() * 2);
    let leftY = 0;
    for (let i = 0; i < leftBuildingCount; i++) {
        const buildingWidth = 60 + Math.random() * 40;
        const buildingHeight = 80 + Math.random() * 120;
        const building: Building = {
            x: -10,
            y: leftY,
            width: buildingWidth,
            height: buildingHeight,
            windows: [],
            antennaCount: Math.floor(Math.random() * 3),
        };

        // Add windows
        const windowRows = Math.floor(buildingHeight / 20);
        const windowCols = Math.floor(buildingWidth / 15);
        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                if (Math.random() > 0.3) { // 70% chance of window
                    const neonColorKeys = Object.keys(NEON_COLORS) as (keyof typeof NEON_COLORS)[];
                    const randomColorKey = neonColorKeys[Math.floor(Math.random() * neonColorKeys.length)];
                    building.windows.push({
                        x: 10 + col * 15,
                        y: 10 + row * 20,
                        width: 8,
                        height: 12,
                        color: Math.random() > 0.6 ? NEON_COLORS[randomColorKey] : '#ffaa44',
                        flickerSpeed: randomBetween(0.5, 2),
                        flickerPhase: Math.random() * Math.PI * 2,
                        on: Math.random() > 0.2, // 80% of windows are on
                    });
                }
            }
        }

        buildings.push(building);
        leftY += buildingHeight;
        if (leftY >= height) break;
    }

    // Right side buildings
    const rightBuildingCount = 2 + Math.floor(Math.random() * 2);
    let rightY = 0;
    for (let i = 0; i < rightBuildingCount; i++) {
        const buildingWidth = 60 + Math.random() * 40;
        const buildingHeight = 80 + Math.random() * 120;
        const building: Building = {
            x: width - buildingWidth + 10,
            y: rightY,
            width: buildingWidth,
            height: buildingHeight,
            windows: [],
            antennaCount: Math.floor(Math.random() * 3),
        };

        // Add windows
        const windowRows = Math.floor(buildingHeight / 20);
        const windowCols = Math.floor(buildingWidth / 15);
        for (let row = 0; row < windowRows; row++) {
            for (let col = 0; col < windowCols; col++) {
                if (Math.random() > 0.3) {
                    const neonColorKeys = Object.keys(NEON_COLORS) as (keyof typeof NEON_COLORS)[];
                    const randomColorKey = neonColorKeys[Math.floor(Math.random() * neonColorKeys.length)];
                    building.windows.push({
                        x: 10 + col * 15,
                        y: 10 + row * 20,
                        width: 8,
                        height: 12,
                        color: Math.random() > 0.6 ? NEON_COLORS[randomColorKey] : '#ffaa44',
                        flickerSpeed: randomBetween(0.5, 2),
                        flickerPhase: Math.random() * Math.PI * 2,
                        on: Math.random() > 0.2,
                    });
                }
            }
        }

        buildings.push(building);
        rightY += buildingHeight;
        if (rightY >= height) break;
    }

    return buildings;
}

// Neon sign generation
function createNeonSigns(width: number, height: number): NeonSign[] {
    const signs: NeonSign[] = [];
    const signCount = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < signCount; i++) {
        const isLeft = Math.random() > 0.5;
        const text = NEON_SIGN_TEXTS[Math.floor(Math.random() * NEON_SIGN_TEXTS.length)];
        const neonColorKeys = Object.keys(NEON_COLORS) as (keyof typeof NEON_COLORS)[];
        const randomColorKey = neonColorKeys[Math.floor(Math.random() * neonColorKeys.length)];
        const color = NEON_COLORS[randomColorKey];

        signs.push({
            x: isLeft ? 20 + Math.random() * 60 : width - 120 - Math.random() * 60,
            y: 40 + i * (height / signCount),
            width: 80,
            height: 30,
            text,
            color,
            glowColor: color,
            flickerSpeed: randomBetween(0.3, 1.5),
            flickerPhase: Math.random() * Math.PI * 2,
            baseAlpha: randomBetween(0.7, 1.0),
        });
    }

    return signs;
}

export class CyberpunkBackground {
    private starfield: Starfield;
    private buildings: Building[];
    private neonSigns: NeonSign[];
    private width: number;
    private height: number;
    private time: number = 0;

    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.starfield = createStarfield(width, height);
        this.buildings = createBuildings(width, height);
        this.neonSigns = createNeonSigns(width, height);
    }

    update(dt: number): void {
        this.time += dt;
        updateStarfield(this.starfield, dt);
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        // 1. Draw dark sky with gradient
        const skyGradient = ctx.createLinearGradient(0, 0, 0, this.height);
        skyGradient.addColorStop(0, '#0a0a1a');
        skyGradient.addColorStop(0.5, '#1a0a2e');
        skyGradient.addColorStop(1, '#16213e');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // 2. Draw starfield
        for (const star of this.starfield.stars) {
            renderStar(ctx, star, this.width, this.height);
        }

        // 3. Draw buildings (dark silhouettes)
        for (const building of this.buildings) {
            // Building body
            ctx.fillStyle = '#0f0f1f';
            ctx.fillRect(building.x, building.y, building.width, building.height);

            // Building outline
            ctx.strokeStyle = '#1a1a2e';
            ctx.lineWidth = 2;
            ctx.strokeRect(building.x, building.y, building.width, building.height);

            // Draw windows
            for (const window of building.windows) {
                if (window.on) {
                    const flicker = Math.sin(this.time * window.flickerSpeed + window.flickerPhase);
                    const alpha = 0.7 + flicker * 0.3;

                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = window.color;
                    ctx.fillRect(
                        building.x + window.x,
                        building.y + window.y,
                        window.width,
                        window.height
                    );

                    // Window glow
                    ctx.globalAlpha = alpha * 0.3;
                    ctx.fillRect(
                        building.x + window.x - 1,
                        building.y + window.y - 1,
                        window.width + 2,
                        window.height + 2
                    );
                }
            }
            ctx.globalAlpha = 1;

            // Antennas on top
            for (let i = 0; i < building.antennaCount; i++) {
                const antennaX = building.x + (i + 1) * (building.width / (building.antennaCount + 1));
                const antennaHeight = 10 + Math.random() * 15;
                ctx.strokeStyle = '#444466';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(antennaX, building.y);
                ctx.lineTo(antennaX, building.y - antennaHeight);
                ctx.stroke();

                // Blinking antenna light
                if (Math.sin(this.time * 2 + i) > 0) {
                    ctx.fillStyle = '#ff0000';
                    ctx.beginPath();
                    ctx.arc(antennaX, building.y - antennaHeight, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // 4. Draw neon signs
        for (const sign of this.neonSigns) {
            const flicker = Math.sin(this.time * sign.flickerSpeed + sign.flickerPhase);
            const alpha = sign.baseAlpha + flicker * 0.2;

            // Sign background (dark)
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(sign.x - 5, sign.y - 5, sign.width + 10, sign.height + 10);

            // Neon glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = sign.glowColor;
            ctx.globalAlpha = alpha;

            // Neon text
            ctx.fillStyle = sign.color;
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sign.text, sign.x + sign.width / 2, sign.y + sign.height / 2);

            // Extra glow
            ctx.globalAlpha = alpha * 0.5;
            ctx.fillText(sign.text, sign.x + sign.width / 2, sign.y + sign.height / 2);

            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }

        // 5. Draw ground/road
        const groundY = this.height * 0.75;

        // Ground gradient
        const groundGradient = ctx.createLinearGradient(0, groundY, 0, this.height);
        groundGradient.addColorStop(0, '#1a1a2e');
        groundGradient.addColorStop(1, '#0f0f1f');
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, groundY, this.width, this.height - groundY);

        // Road markings (cyberpunk grid)
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
        ctx.lineWidth = 1;

        // Horizontal lines
        for (let y = groundY; y < this.height; y += 30) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // Vertical perspective lines
        const centerX = this.width / 2;
        const vanishingY = groundY - 50;
        for (let i = -5; i <= 5; i++) {
            const x = centerX + i * 60;
            ctx.beginPath();
            ctx.moveTo(x, this.height);
            ctx.lineTo(centerX + i * 20, vanishingY);
            ctx.stroke();
        }

        // Neon grid lines (brighter)
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        const pulse = Math.sin(this.time * 0.5) * 0.5 + 0.5;
        ctx.globalAlpha = 0.3 + pulse * 0.2;

        // Center road lines
        ctx.beginPath();
        ctx.moveTo(centerX - 40, this.height);
        ctx.lineTo(centerX - 15, vanishingY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(centerX + 40, this.height);
        ctx.lineTo(centerX + 15, vanishingY);
        ctx.stroke();

        ctx.globalAlpha = 1;

        // 6. Scanline effect (subtle)
        ctx.globalAlpha = 0.03;
        ctx.fillStyle = '#000000';
        for (let y = 0; y < this.height; y += 2) {
            ctx.fillRect(0, y, this.width, 1);
        }
        ctx.globalAlpha = 1;

        // 7. Atmospheric fog/haze at bottom
        const fogGradient = ctx.createLinearGradient(0, groundY, 0, groundY + 80);
        fogGradient.addColorStop(0, 'rgba(138, 43, 226, 0)');
        fogGradient.addColorStop(1, 'rgba(138, 43, 226, 0.08)');
        ctx.fillStyle = fogGradient;
        ctx.fillRect(0, groundY, this.width, 80);

        ctx.restore();
    }
}
