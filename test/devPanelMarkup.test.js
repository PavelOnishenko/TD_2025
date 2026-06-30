import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('style.css', 'utf8');
const layoutEditorSource = readFileSync('js/systems/layoutEditor.ts', 'utf8');

test('developer diagnostics panel includes Layout editor launcher and modal shell', () => {
    assert.ok(html.includes('id="openLayoutEditor"'));
    assert.ok(html.includes('>Layout editor<'));
    assert.ok(html.includes('id="layoutEditor"'));
    assert.ok(html.includes('id="layoutEditorValues"'));
    assert.ok(html.includes('layout-editor-modal'));
    assert.equal(html.includes('id="layoutScaleControls"'), false);
    assert.equal(html.includes('Platform scale controls'), false);
});

test('layout editor panel does not dim or block the playable field', () => {
    const layoutEditorModalStart = css.indexOf('.layout-editor-modal');
    const layoutEditorValuesStart = css.indexOf('.layout-editor__values');
    const layoutEditorModalCss = css.slice(layoutEditorModalStart, layoutEditorValuesStart);

    assert.ok(layoutEditorModalCss.includes('inset: auto'));
    assert.ok(layoutEditorModalCss.includes('pointer-events: none'));
    assert.ok(layoutEditorModalCss.includes('display: block'));

    const layoutEditorBackdropStart = css.indexOf('.layout-editor-modal .dev-modal__backdrop');
    const layoutEditorPanelStart = css.indexOf('.layout-editor-modal .dev-modal__panel');
    const layoutEditorBackdropCss = css.slice(layoutEditorBackdropStart, layoutEditorPanelStart);

    assert.ok(layoutEditorBackdropCss.includes('display: none'));
    assert.ok(layoutEditorBackdropCss.includes('background: transparent'));
    assert.ok(layoutEditorBackdropCss.includes('backdrop-filter: none'));

    const layoutEditorHandlesStart = css.indexOf('.layout-editor-handles');
    const layoutEditorHandleGroupStart = css.indexOf('.layout-editor-handle-group');
    const layoutEditorHandlesCss = css.slice(layoutEditorHandlesStart, layoutEditorHandleGroupStart);

    assert.ok(layoutEditorHandlesCss.includes('z-index: 25'));
});

test('layout editor uses the shared engine floating panel mode', () => {
    assert.ok(layoutEditorSource.includes("from '../../engine/systems/FloatingPanel.js'"));
    assert.ok(layoutEditorSource.includes('enableFloatingPanel(elements.panel'));
    assert.ok(layoutEditorSource.includes("document.querySelector('#layoutEditor .dev-modal__header > div')"));
    assert.ok(layoutEditorSource.includes('dragHandle: elements.header'));
    assert.ok(layoutEditorSource.includes('minWidth: 360'));
    assert.ok(layoutEditorSource.includes('borderDrag: true'));
});

test('engine floating panel handle styles expose draggable affordance', () => {
    assert.ok(css.includes('.engine-floating-panel__drag-handle'));
    assert.ok(css.includes('cursor: grab'));
    assert.ok(css.includes('.engine-floating-panel--dragging .engine-floating-panel__drag-handle'));
    assert.ok(css.includes('cursor: grabbing'));
});
