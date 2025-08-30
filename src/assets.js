// assets.js
export async function loadAssets() {
    console.log("Loading assets...");
    const bg = await loadImage('assets/bg.png');
    const cell = await loadImage('assets/cell_cut.png');
    const road = await loadImage('assets/road.png');
    const tower_1r = await loadImage('assets/tower_1R.png');
    const tower_1b = await loadImage('assets/tower_!B.png');
    const tower_2r = await loadImage('assets/tower_2R.png');
    const tower_2b = await loadImage('assets/tower_2B.png');
    console.log("Finished loading assets.");
    return { bg, cell, road, tower_1r, tower_1b, tower_2r, tower_2b };
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        console.log(`Loading image from ${url}`);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}
