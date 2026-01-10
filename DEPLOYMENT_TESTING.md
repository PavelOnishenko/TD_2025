# Deployment Testing Guide

This guide explains how to test the unified deployment mechanism for all three games (Neon Void, Eva Game, and RGFN) before and after deploying to GitHub Pages.

## Pre-Deployment Testing (Local)

### 1. Test TypeScript Build Process

First, ensure both TypeScript games compile successfully:

```bash
# Build Eva Game
npm run build:eva

# Build RGFN Game
npm run build:rgfn

# Check for build errors
echo $?  # Should output 0 (success)
```

**Expected Result**: No TypeScript compilation errors, `dist/` folders created in both game directories.

### 2. Verify Build Output

Check that the compiled files are generated correctly:

```bash
# Check Eva Game build
ls -la eva_game/dist/
ls -la eva_game/dist/entities/

# Check RGFN Game build
ls -la rgfn_game/dist/
ls -la rgfn_game/dist/systems/

# Verify imports reference engine correctly
grep -r "../../engine" eva_game/dist/ | head -3
grep -r "../../engine" rgfn_game/dist/ | head -3
```

**Expected Result**: All TypeScript files compiled to JavaScript, imports use relative paths to `../../engine/`.

### 3. Simulate Deployment Structure Locally

Create a local copy of the deployment structure:

```bash
# Create deployment directory
mkdir -p deploy-test/{neon-void,eva-game,rgfn-game}

# Copy files as the workflow would
cp -r js assets style.css deploy-test/neon-void/
cp index.html deploy-test/neon-void/

cp -r eva_game/dist eva_game/assets eva_game/style.css deploy-test/eva-game/
cp eva_game/index.html deploy-test/eva-game/

cp -r rgfn_game/dist rgfn_game/css rgfn_game/style.css deploy-test/rgfn-game/
cp rgfn_game/index.html deploy-test/rgfn-game/

# Copy shared engine
cp -r engine deploy-test/

# Create simple landing page
cat > deploy-test/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Game Collection Test</title>
</head>
<body style="font-family: Arial; padding: 40px;">
    <h1>TD 2025 Games - Local Test</h1>
    <ul style="font-size: 20px; line-height: 2;">
        <li><a href="neon-void/">Neon Void</a></li>
        <li><a href="eva-game/">Eva Game</a></li>
        <li><a href="rgfn-game/">RGFN Game</a></li>
    </ul>
</body>
</html>
EOF

echo "✓ Deployment structure created in deploy-test/"
```

### 4. Test with Local Web Server

You need a local web server to test (file:// protocol won't work with ES modules):

#### Option A: Using Python (most common)

```bash
cd deploy-test

# Python 3
python3 -m http.server 8000

# Or Python 2
python -m SimpleHTTPServer 8000
```

#### Option B: Using Node.js (if you have it)

```bash
# Install http-server globally (one time)
npm install -g http-server

# Run server
cd deploy-test
http-server -p 8000
```

#### Option C: Using PHP

```bash
cd deploy-test
php -S localhost:8000
```

### 5. Manual Testing Checklist

Open your browser and navigate to `http://localhost:8000`

**Landing Page Tests:**
- [ ] Landing page loads correctly
- [ ] All three game links are visible
- [ ] Clicking each link navigates to the correct game
- [ ] Page is responsive (try resizing browser)

**Neon Void Tests:**
- [ ] Navigate to `http://localhost:8000/neon-void/`
- [ ] Game loads without console errors (F12 → Console)
- [ ] Game canvas renders
- [ ] Click to start game
- [ ] Towers can be placed
- [ ] Enemies spawn and move
- [ ] Game mechanics work (shooting, waves, etc.)

**Eva Game Tests:**
- [ ] Navigate to `http://localhost:8000/eva-game/`
- [ ] Check browser console for errors (should be none)
- [ ] Start overlay displays
- [ ] Click "Start Game"
- [ ] Player character visible and can move (arrow keys/WASD)
- [ ] Enemies spawn with different colors
- [ ] Combat works (attack enemies)
- [ ] Game over screen appears when player dies

**RGFN Game Tests:**
- [ ] Navigate to `http://localhost:8000/rgfn-game/`
- [ ] Check browser console for errors (should be none)
- [ ] Game canvas and HUD load
- [ ] Player can move (arrow keys/WASD)
- [ ] Battle system works (engage enemy)
- [ ] Turn-based combat functions
- [ ] UI updates correctly (HP, XP, stats)

**Critical Checks for All Games:**
- [ ] No 404 errors in Network tab (F12 → Network)
- [ ] No JavaScript errors in Console (F12 → Console)
- [ ] All assets load (images, audio if any)
- [ ] Engine imports resolve correctly (Eva & RGFN)

---

## Post-Deployment Testing (GitHub Pages)

### 1. Trigger Deployment

After merging to main/master, the deployment should trigger automatically. Alternatively:

```bash
# Via GitHub UI:
# 1. Go to Actions tab
# 2. Select "Deploy All Games to GitHub Pages"
# 3. Click "Run workflow" → "Run workflow"

# Or via gh CLI:
gh workflow run deploy-all-games.yml
```

### 2. Monitor Deployment

```bash
# Watch workflow status
gh run watch

# Or check manually:
gh run list --workflow=deploy-all-games.yml
```

**Expected**: Workflow completes successfully in ~2-3 minutes.

### 3. Find Your GitHub Pages URL

```bash
# Get repository info
gh repo view --json homepageUrl

# Typical format:
# https://<username>.github.io/<repo-name>/
```

Example: `https://pavelonishenko.github.io/TD_2025/`

### 4. Production Testing Checklist

Once deployed, test the same checklist as local testing:

**URLs to test:**
```
https://<username>.github.io/<repo-name>/
https://<username>.github.io/<repo-name>/neon-void/
https://<username>.github.io/<repo-name>/eva-game/
https://<username>.github.io/<repo-name>/rgfn-game/
```

**Additional Production Checks:**
- [ ] HTTPS works (no mixed content warnings)
- [ ] All static assets load from correct paths
- [ ] Games work on mobile devices (if applicable)
- [ ] Performance is acceptable (no slow loading)
- [ ] Share links work correctly

### 5. Debugging Failed Deployment

If deployment fails:

```bash
# Check workflow logs
gh run view --log

# Common issues:
# 1. TypeScript compilation errors → Check build step logs
# 2. Missing directories → Verify all paths exist
# 3. Pages not enabled → Check repo Settings → Pages
# 4. Permission errors → Check workflow permissions
```

**Check GitHub Pages Settings:**
1. Go to repository Settings → Pages
2. Source should be: "GitHub Actions"
3. If it says "Branch", change it to "GitHub Actions"

### 6. Cache Busting

If you see old content after deployment:

```bash
# Force refresh in browser
# Windows/Linux: Ctrl + Shift + R
# Mac: Cmd + Shift + R

# Or clear browser cache completely
```

---

## Troubleshooting Common Issues

### Issue: "Failed to load module" errors

**Cause**: Relative paths incorrect or engine not copied
**Solution**:
```bash
# Verify engine directory in deployment
# It should be at the root of deploy folder
ls -la deploy-test/engine/
```

### Issue: 404 errors for assets

**Cause**: Assets not copied or wrong paths
**Solution**:
```bash
# Check assets exist
ls -la deploy-test/neon-void/assets/
ls -la deploy-test/eva-game/assets/

# Verify paths in HTML are relative (no leading /)
grep 'src=' deploy-test/*/index.html
```

### Issue: TypeScript compilation fails

**Cause**: Type errors in code
**Solution**:
```bash
# Run build with verbose errors
npm run build:eva 2>&1 | tee eva-build.log
npm run build:rgfn 2>&1 | tee rgfn-build.log

# Fix type errors shown in logs
```

### Issue: Games work locally but not on GitHub Pages

**Cause**: Usually absolute vs relative paths
**Solution**:
- Check that all paths in HTML/JS are relative
- Verify no hardcoded `localhost` URLs
- Ensure module imports use relative paths

### Issue: Workflow runs but no deployment happens

**Cause**: GitHub Pages not configured correctly
**Solution**:
1. Go to Settings → Pages
2. Change Source to "GitHub Actions"
3. Save and re-run workflow

---

## Performance Testing

### Measure Load Times

```bash
# Using curl to check response times
curl -w "@-" -o /dev/null -s https://<your-pages-url>/ <<'EOF'
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
EOF
```

**Expected**: Total load time < 2 seconds

### Check Bundle Sizes

```bash
# Check deployment size
du -sh deploy-test/neon-void/
du -sh deploy-test/eva-game/
du -sh deploy-test/rgfn-game/
du -sh deploy-test/engine/

# Total deployment size
du -sh deploy-test/
```

**Ideal**: Total size < 10MB for fast loading

---

## Automated Testing Script

Save this as `test-deployment.sh`:

```bash
#!/bin/bash
set -e

echo "🧪 Testing TD 2025 Deployment"
echo "=============================="

# Test builds
echo "1. Building TypeScript games..."
npm run build:eva
npm run build:rgfn
echo "✓ Builds successful"

# Create test deployment
echo "2. Creating test deployment structure..."
rm -rf deploy-test
mkdir -p deploy-test/{neon-void,eva-game,rgfn-game}

cp -r js assets style.css deploy-test/neon-void/
cp index.html deploy-test/neon-void/

cp -r eva_game/dist eva_game/assets eva_game/style.css deploy-test/eva-game/
cp eva_game/index.html deploy-test/eva-game/

cp -r rgfn_game/dist rgfn_game/css rgfn_game/style.css deploy-test/rgfn-game/
cp rgfn_game/index.html deploy-test/rgfn-game/

cp -r engine deploy-test/
echo "✓ Deployment structure created"

# Verify critical files
echo "3. Verifying file structure..."
test -f deploy-test/neon-void/index.html || (echo "✗ Neon Void missing" && exit 1)
test -f deploy-test/eva-game/index.html || (echo "✗ Eva Game missing" && exit 1)
test -f deploy-test/rgfn-game/index.html || (echo "✗ RGFN missing" && exit 1)
test -d deploy-test/engine || (echo "✗ Engine missing" && exit 1)
echo "✓ All files present"

# Check sizes
echo "4. Checking deployment sizes..."
du -sh deploy-test/*/
echo "Total: $(du -sh deploy-test/ | cut -f1)"

echo ""
echo "✅ All tests passed!"
echo ""
echo "Next steps:"
echo "  cd deploy-test"
echo "  python3 -m http.server 8000"
echo "  # Open http://localhost:8000 in browser"
```

Make it executable and run:
```bash
chmod +x test-deployment.sh
./test-deployment.sh
```

---

## Quick Reference

**Local Testing:**
```bash
npm run build:eva && npm run build:rgfn
./test-deployment.sh  # If you created the script
cd deploy-test && python3 -m http.server 8000
```

**Production Deployment:**
```bash
git push origin main  # Triggers auto-deployment
gh run watch          # Watch deployment progress
```

**URLs:**
- Landing: `https://<username>.github.io/<repo>/`
- Neon Void: `https://<username>.github.io/<repo>/neon-void/`
- Eva Game: `https://<username>.github.io/<repo>/eva-game/`
- RGFN: `https://<username>.github.io/<repo>/rgfn-game/`
