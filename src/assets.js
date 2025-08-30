// assets.js
export async function loadAssets() {
    console.log("Loading assets...");
    const bg = await loadImage('assets/bg.png');
    return { bg };
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
