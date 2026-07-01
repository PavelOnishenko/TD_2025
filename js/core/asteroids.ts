export const ASTEROID_IMAGE_DIR = 'assets/images/asteroids';

export const ASTEROID_ASSET_PATHS = Object.freeze({
    asteroid_01: `${ASTEROID_IMAGE_DIR}/asteroid-01-large-crater.png`,
    asteroid_02: `${ASTEROID_IMAGE_DIR}/asteroid-02-wide-crater.png`,
    asteroid_03: `${ASTEROID_IMAGE_DIR}/asteroid-03-left-cluster.png`,
    asteroid_04: `${ASTEROID_IMAGE_DIR}/asteroid-04-right-cluster.png`,
    asteroid_05: `${ASTEROID_IMAGE_DIR}/asteroid-05-massive-crater.png`,
    asteroid_06: `${ASTEROID_IMAGE_DIR}/asteroid-06-small-crater.png`,
    asteroid_07: `${ASTEROID_IMAGE_DIR}/asteroid-07-pebble.png`,
    asteroid_10: `${ASTEROID_IMAGE_DIR}/asteroid-10-small-pebble.png`,
    asteroid_12: `${ASTEROID_IMAGE_DIR}/asteroid-12-tall-shard.png`,
});

const ASTEROID_LAYOUT = Object.freeze([
    { assetKey: 'asteroid_01', x: 340, y: 210, scale: 0.68 },
    { assetKey: 'asteroid_06', x: 740, y: 235, scale: 0.68 },
    { assetKey: 'asteroid_05', x: 910, y: 260, scale: 0.68 },
    { assetKey: 'asteroid_10', x: 925, y: 340, scale: 0.68 },
    { assetKey: 'asteroid_07', x: 165, y: 365, scale: 0.68 },
    { assetKey: 'asteroid_03', x: -330, y: 455, scale: 0.64 },
    { assetKey: 'asteroid_04', x: 980, y: 435, scale: 0.62 },
    { assetKey: 'asteroid_02', x: 970, y: 565, scale: 0.72 },
    { assetKey: 'asteroid_12', x: 945, y: 760, scale: 0.66 },
]);

function canDrawImage(image: any): image is CanvasImageSource & { width: number; height: number } {
    return image && Number.isFinite(image.width) && Number.isFinite(image.height);
}

export function drawSpaceAsteroids(game: any): void {
    const ctx = game?.ctx;
    const assets = game?.assets;

    if (!ctx || !assets) {
        return;
    }

    ctx.save();
    for (const asteroid of ASTEROID_LAYOUT) {
        const image = assets[asteroid.assetKey];
        if (!canDrawImage(image)) {
            continue;
        }

        const width = image.width * asteroid.scale;
        const height = image.height * asteroid.scale;
        ctx.drawImage(
            image,
            asteroid.x - width / 2,
            asteroid.y - height / 2,
            width,
            height,
        );
    }
    ctx.restore();
}
