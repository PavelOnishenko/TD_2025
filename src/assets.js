// assets.js
export async function loadAssets() {
    const bg = await loadImage('assets/bg_plats.png');
    const cell = await loadImage('assets/cell_cut.png');
    const tower_1r = await loadImage('assets/tower_1R.png');
    const tower_1b = await loadImage('assets/tower_1B.png');
    const tower_2r = await loadImage('assets/tower_2R.png');
    const tower_2b = await loadImage('assets/tower_2B.png');
    return {bg, cell, tower_1r, tower_1b, tower_2r, tower_2b 
    };
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}
