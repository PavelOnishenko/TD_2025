#!/bin/bash
set -e

echo "🧪 Testing TD 2025 Deployment"
echo "=============================="
echo ""

# Test builds
echo "📦 Step 1: Building TypeScript games..."
npm run build:eva
npm run build:rgfn
echo "✓ Builds successful"
echo ""

# Create test deployment
echo "📁 Step 2: Creating test deployment structure..."
rm -rf deploy-test
mkdir -p deploy-test/{neon-void,eva-game,rgfn-game}

cp -r js assets style.css deploy-test/neon-void/
cp index.html deploy-test/neon-void/

cp -r eva_game/dist eva_game/assets eva_game/style.css deploy-test/eva-game/
cp eva_game/index.html deploy-test/eva-game/

cp -r rgfn_game/dist rgfn_game/css rgfn_game/style.css deploy-test/rgfn-game/
cp rgfn_game/index.html deploy-test/rgfn-game/

cp -r engine deploy-test/

# Create landing page
cat > deploy-test/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TD 2025 - Game Collection [LOCAL TEST]</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            width: 100%;
        }
        .test-banner {
            background: #ff6b6b;
            color: white;
            padding: 10px 20px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 20px;
            font-weight: bold;
        }
        h1 {
            text-align: center;
            color: white;
            font-size: 3rem;
            margin-bottom: 2rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .games-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            padding: 2rem;
        }
        .game-card {
            background: white;
            border-radius: 15px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            text-decoration: none;
            color: inherit;
            display: block;
        }
        .game-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 15px 40px rgba(0,0,0,0.4);
        }
        .game-card h2 {
            color: #667eea;
            margin-bottom: 1rem;
            font-size: 2rem;
        }
        .game-card p {
            color: #666;
            line-height: 1.6;
            margin-bottom: 1rem;
        }
        .game-card .play-button {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 0.75rem 2rem;
            border-radius: 25px;
            font-weight: bold;
            margin-top: 1rem;
            transition: opacity 0.3s ease;
        }
        .game-card:hover .play-button {
            opacity: 0.9;
        }
        @media (max-width: 768px) {
            h1 {
                font-size: 2rem;
            }
            .games-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="test-banner">
            🧪 LOCAL TEST BUILD - This is not the production deployment
        </div>
        <h1>TD 2025 Game Collection</h1>
        <div class="games-grid">
            <a href="./neon-void/" class="game-card">
                <h2>Neon Void</h2>
                <p>A fast-paced tower defense game with neon graphics. Build towers, upgrade your defenses, and survive waves of enemies in this strategic challenge.</p>
                <span class="play-button">Play Now →</span>
            </a>
            <a href="./eva-game/" class="game-card">
                <h2>Eva Game</h2>
                <p>An action-packed beat'em up prototype. Fight through waves of enemies with fluid combat mechanics and responsive controls.</p>
                <span class="play-button">Play Now →</span>
            </a>
            <a href="./rgfn-game/" class="game-card">
                <h2>RGFN</h2>
                <p>A turn-based RPG experience. Engage in strategic battles, manage resources, and explore a rich game world.</p>
                <span class="play-button">Play Now →</span>
            </a>
        </div>
    </div>
</body>
</html>
EOF

echo "✓ Deployment structure created"
echo ""

# Verify critical files
echo "🔍 Step 3: Verifying file structure..."
test -f deploy-test/neon-void/index.html || (echo "✗ Neon Void missing" && exit 1)
test -f deploy-test/eva-game/index.html || (echo "✗ Eva Game missing" && exit 1)
test -f deploy-test/rgfn-game/index.html || (echo "✗ RGFN missing" && exit 1)
test -d deploy-test/engine || (echo "✗ Engine missing" && exit 1)
test -d deploy-test/neon-void/js || (echo "✗ Neon Void JS missing" && exit 1)
test -d deploy-test/eva-game/dist || (echo "✗ Eva Game dist missing" && exit 1)
test -d deploy-test/rgfn-game/dist || (echo "✗ RGFN dist missing" && exit 1)
echo "✓ All critical files present"
echo ""

# Check sizes
echo "📊 Step 4: Checking deployment sizes..."
echo "  Neon Void: $(du -sh deploy-test/neon-void/ | cut -f1)"
echo "  Eva Game:  $(du -sh deploy-test/eva-game/ | cut -f1)"
echo "  RGFN Game: $(du -sh deploy-test/rgfn-game/ | cut -f1)"
echo "  Engine:    $(du -sh deploy-test/engine/ | cut -f1)"
echo "  ─────────────────────"
echo "  Total:     $(du -sh deploy-test/ | cut -f1)"
echo ""

# Check for engine imports
echo "🔗 Step 5: Verifying engine imports..."
if grep -q "../../engine" deploy-test/eva-game/dist/main.js; then
    echo "✓ Eva Game imports engine correctly"
else
    echo "✗ Eva Game engine imports not found"
    exit 1
fi

if grep -q "../../engine" deploy-test/rgfn-game/dist/Game.js; then
    echo "✓ RGFN Game imports engine correctly"
else
    echo "✗ RGFN Game engine imports not found"
    exit 1
fi
echo ""

echo "✅ All tests passed!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Next steps to test in browser:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  1. Start local web server:"
echo "     cd deploy-test"
echo "     python3 -m http.server 8000"
echo ""
echo "  2. Open in browser:"
echo "     http://localhost:8000"
echo ""
echo "  3. Test all three games:"
echo "     - Landing page loads"
echo "     - Each game link works"
echo "     - No console errors (F12)"
echo "     - Games are playable"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
