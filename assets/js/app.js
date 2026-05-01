/**
 * SPARKY.FPV — GIF to C/C++ Converter
 * assets/js/app.js
 *
 * All conversion, preview, and UI logic.
 * Functionality is identical to the original.
 */

'use strict';

// ── Global State ──────────────────────────────────────────────
let gifFrames      = [];
let currentFrameIndex = 0;
let isPlaying      = false;
let playInterval   = null;
let frameDelays    = [];
let gifPlayer      = null;

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

    // Core controls
    document.getElementById('gifUpload')    .addEventListener('change',  handleGifUpload);
    document.getElementById('convertButton').addEventListener('click',   convertGifToCode);
    document.getElementById('prevFrame')    .addEventListener('click',   showPreviousFrame);
    document.getElementById('nextFrame')    .addEventListener('click',   showNextFrame);
    document.getElementById('playPause')    .addEventListener('click',   togglePlayPause);
    document.getElementById('loadUrlBtn')   .addEventListener('click',   loadFromUrl);

    // Live preview update on setting change
    document.querySelectorAll('#threshold, #invertColors, #canvasWidth, #canvasHeight, #drawMode')
        .forEach(el => el.addEventListener('change', updatePreview));

    // Scale mode toggle
    document.getElementById('scaleMode').addEventListener('change', e => {
        document.getElementById('customScaleDiv').classList.toggle('d-none', e.target.value !== 'custom');
        updatePreview();
    });

    // Transform controls
    document.querySelectorAll('#flipHorizontal, #flipVertical, #rotation, #customScale')
        .forEach(el => el.addEventListener('change', updatePreview));

    // Threshold live label
    document.getElementById('threshold').addEventListener('input', function () {
        document.getElementById('thresholdValue').textContent = this.value;
        updatePreview();
    });

    // URL load on Enter key
    document.getElementById('gifUrlInput').addEventListener('keypress', e => {
        if (e.key === 'Enter') loadFromUrl();
    });

    // Stats update on dimension change
    document.getElementById('canvasWidth') .addEventListener('change', updateStats);
    document.getElementById('canvasHeight').addEventListener('change', updateStats);

    // YouTube button hover text swap
    const ytBtn = document.querySelector('.social-btn.youtube');
    if (ytBtn) {
        const original = ytBtn.innerHTML;
        ytBtn.addEventListener('mouseenter', () => {
            ytBtn.innerHTML = '<i class="bi bi-youtube"></i> @sparky.390';
        });
        ytBtn.addEventListener('mouseleave', () => {
            ytBtn.innerHTML = original;
        });
    }
});

// ── Stats ─────────────────────────────────────────────────────
function updateStats() {
    const w = parseInt(document.getElementById('canvasWidth').value)  || 128;
    const h = parseInt(document.getElementById('canvasHeight').value) || 64;
    document.getElementById('resolution').textContent = `${w}×${h}`;
}

// ── Presets ───────────────────────────────────────────────────
function applyPreset(type) {
    if (type === 'oled') {
        document.getElementById('canvasWidth').value   = 128;
        document.getElementById('canvasHeight').value  = 64;
        document.getElementById('drawMode').value      = 'horizontal';
        document.getElementById('invertColors').checked = true;
    } else if (type === 'tft') {
        document.getElementById('canvasWidth').value   = 240;
        document.getElementById('canvasHeight').value  = 320;
        document.getElementById('drawMode').value      = 'horizontal_bytes';
        document.getElementById('invertColors').checked = false;
    }
    updateStats();
    updatePreview();
}

// ── File Sanitisation ─────────────────────────────────────────
function sanitizeFileName(fileName) {
    fileName = fileName.replace(/\.gif$/i, '');
    fileName = fileName.replace(/[^a-zA-Z0-9_]/g, '_');
    if (/^\d/.test(fileName)) fileName = '_' + fileName;
    return fileName;
}

// ── GIF Upload ────────────────────────────────────────────────
function handleGifUpload(event) {
    const file = event.target.files[0];
    if (!file || !file.type.includes('gif')) {
        alert('Please select a GIF file!');
        return;
    }

    resetPreview();
    document.getElementById('variableName').value = sanitizeFileName(file.name);

    const previewSection = document.getElementById('previewSection');
    if (previewSection) previewSection.style.display = 'block';

    const fileURL = URL.createObjectURL(file);
    showSpinner('framesPreview');

    // Remove any stale hidden GIF element
    const existing = document.getElementById('hiddenGifForLib');
    if (existing) existing.remove();

    const hiddenGif = createHiddenImg(fileURL);

    try {
        gifPlayer = new SuperGif({ gif: hiddenGif, auto_play: false });

        gifPlayer.load(() => {
            URL.revokeObjectURL(fileURL);
            const numFrames = gifPlayer.get_length();

            if (numFrames === 0) {
                alert('Cannot read frames from this GIF file.');
                resetPreview();
                return;
            }

            extractFrames(numFrames);

            // Update stats
            document.getElementById('frameCount').textContent = numFrames;
            document.getElementById('fileSize').textContent   = `${(file.size / 1024).toFixed(1)} KB`;

            enablePlaybackControls(numFrames);
        });
    } catch (err) {
        console.error('Error processing GIF:', err);
        alert('Cannot process GIF file. Please try another file.');
        URL.revokeObjectURL(fileURL);
        resetPreview();
    } finally {
        event.target.value = null;
    }
}

// ── Load from URL ─────────────────────────────────────────────
function loadFromUrl() {
    const url = document.getElementById('gifUrlInput').value.trim();
    if (!url) { alert('Please enter a GIF URL'); return; }

    resetPreview();

    const previewSection    = document.getElementById('previewSection');
    const framesPreviewDiv  = document.getElementById('framesPreview');
    if (previewSection)   previewSection.style.display = 'block';
    if (framesPreviewDiv) showSpinner('framesPreview');

    const urlParts = url.split('/');
    const rawName  = urlParts[urlParts.length - 1].replace(/\.gif$/i, '');
    document.getElementById('variableName').value = sanitizeFileName(rawName);

    const existing = document.getElementById('hiddenGifForLib');
    if (existing) existing.remove();

    const hiddenGif = createHiddenImg(url);

    try {
        gifPlayer = new SuperGif({ gif: hiddenGif, auto_play: false });

        gifPlayer.load(() => {
            const numFrames = gifPlayer.get_length();
            if (numFrames === 0) throw new Error('No frames found in GIF');

            extractFrames(numFrames);
            document.getElementById('frameCount').textContent = numFrames;
            enablePlaybackControls(numFrames);
        });
    } catch (err) {
        console.error('Error loading GIF:', err);
        alert('Cannot load GIF from URL: ' + err.message);
        if (framesPreviewDiv) {
            framesPreviewDiv.innerHTML = '<p style="color:var(--danger)">Error loading GIF</p>';
        }
        document.getElementById('convertButton').disabled = true;
    }
}

// ── Helpers ───────────────────────────────────────────────────
function createHiddenImg(src) {
    const img = document.createElement('img');
    img.id = 'hiddenGifForLib';
    img.style.cssText = 'position:absolute;left:-9999px;';
    img.setAttribute('rel:animated_src', src);
    img.setAttribute('rel:auto_play', '0');
    document.body.appendChild(img);
    return img;
}

function showSpinner(containerId) {
    const el = document.getElementById(containerId);
    if (el) {
        el.innerHTML = '<div class="spinner-border" role="status"><span class="visually-hidden">Loading…</span></div>';
    }
}

function extractFrames(numFrames) {
    gifFrames   = [];
    frameDelays = [];

    for (let i = 0; i < numFrames; i++) {
        gifPlayer.move_to(i);
        const src     = gifPlayer.get_canvas();
        const copy    = document.createElement('canvas');
        copy.width    = src.width;
        copy.height   = src.height;
        copy.getContext('2d').drawImage(src, 0, 0);
        gifFrames.push(copy);
        frameDelays.push(100);
    }

    currentFrameIndex = 0;
    updateFrameCounter();
    updatePreview();
}

function enablePlaybackControls(numFrames) {
    const multi = numFrames > 1;
    setDisabled('prevFrame',  !multi);
    setDisabled('nextFrame',  !multi);
    setDisabled('playPause',  !multi);
    setDisabled('convertButton', false);

    const pp = document.getElementById('playPause');
    if (pp) pp.innerHTML = '<i class="bi bi-play-fill"></i> Play';
}

function setDisabled(id, state) {
    const el = document.getElementById(id);
    if (el) el.disabled = state;
}

// ── Frame Counter ─────────────────────────────────────────────
function updateFrameCounter() {
    const counter = document.getElementById('frameCounter');
    if (counter) counter.textContent = `Frame: ${currentFrameIndex + 1} / ${gifFrames.length}`;
}

// ── Playback ──────────────────────────────────────────────────
function showPreviousFrame() {
    if (!gifFrames.length) return;
    currentFrameIndex = (currentFrameIndex - 1 + gifFrames.length) % gifFrames.length;
    updateFrameCounter();
    updatePreview();
}

function showNextFrame() {
    if (!gifFrames.length) return;
    currentFrameIndex = (currentFrameIndex + 1) % gifFrames.length;
    updateFrameCounter();
    updatePreview();
}

function togglePlayPause() {
    if (!gifFrames.length) return;
    isPlaying = !isPlaying;
    const btn = document.getElementById('playPause');
    if (isPlaying) {
        btn.innerHTML = '<i class="bi bi-pause-fill"></i> Pause';
        playGif();
    } else {
        btn.innerHTML = '<i class="bi bi-play-fill"></i> Play';
        clearTimeout(playInterval);
    }
}

function playGif() {
    clearTimeout(playInterval);
    function tick() {
        showNextFrame();
        playInterval = setTimeout(tick, frameDelays[currentFrameIndex] || 100);
    }
    tick();
}

// ── Preview Rendering ─────────────────────────────────────────
function updatePreview() {
    if (!gifFrames.length || !document.getElementById('previewEnabled').checked) return;

    const { canvas, ctx } = getProcessedFrameCanvas(currentFrameIndex);

    const container = document.getElementById('framesPreview');
    container.innerHTML = '';

    canvas.style.borderRadius = '8px';
    canvas.style.boxShadow    = '0 4px 24px rgba(255,107,0,0.15)';
    canvas.style.maxWidth     = '100%';

    const wrap = document.createElement('div');
    wrap.appendChild(canvas);
    container.appendChild(wrap);
}

// ── Frame Processing (shared logic) ──────────────────────────
function getProcessedFrameCanvas(frameIndex) {
    const width    = parseInt(document.getElementById('canvasWidth').value)  || 128;
    const height   = parseInt(document.getElementById('canvasHeight').value) || 64;
    const threshold  = parseInt(document.getElementById('threshold').value)  || 128;
    const invertColors = document.getElementById('invertColors').checked;
    const scaleMode  = document.getElementById('scaleMode').value;
    const customScale = parseFloat(document.getElementById('customScale').value) || 1;
    const flipH    = document.getElementById('flipHorizontal').checked;
    const flipV    = document.getElementById('flipVertical').checked;
    const rotation = parseInt(document.getElementById('rotation').value) || 0;

    const frame  = gifFrames[frameIndex];
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    canvas.width  = width;
    canvas.height = height;

    let scale   = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (scaleMode === 'fit') {
        scale = Math.min(width / frame.width, height / frame.height);
    } else if (scaleMode === 'fit_width') {
        scale = width / frame.width;
    } else if (scaleMode === 'fit_height') {
        scale = height / frame.height;
    } else if (scaleMode === 'custom') {
        scale = customScale;
    }

    const sw = frame.width  * scale;
    const sh = frame.height * scale;
    offsetX = (width  - sw) / 2;
    offsetY = (height - sh) / 2;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    if (rotation) ctx.rotate(rotation * Math.PI / 180);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);
    ctx.translate(-width / 2, -height / 2);
    ctx.drawImage(frame, 0, 0, frame.width, frame.height, offsetX, offsetY, sw, sh);
    ctx.restore();

    // Threshold → B/W
    const imgData = ctx.getImageData(0, 0, width, height);
    const d       = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
        const lum   = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        let   val   = lum >= threshold ? 255 : 0;
        if (invertColors) val = 255 - val;
        d[i] = d[i + 1] = d[i + 2] = val;
        d[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    return { canvas, ctx };
}

// ── Reset ─────────────────────────────────────────────────────
function resetPreview() {
    clearTimeout(playInterval);
    playInterval = null;
    isPlaying    = false;

    const pp = document.getElementById('playPause');
    if (pp) { pp.innerHTML = '<i class="bi bi-play-fill"></i> Play'; pp.disabled = true; }

    const fp = document.getElementById('framesPreview');
    if (fp) fp.innerHTML = '';

    gifFrames         = [];
    frameDelays       = [];
    currentFrameIndex = 0;
    updateFrameCounter();

    document.getElementById('frameCount').textContent = '0';
    document.getElementById('fileSize').textContent   = '0 KB';

    setDisabled('prevFrame',  true);
    setDisabled('nextFrame',  true);
    setDisabled('convertButton', true);

    const co = document.getElementById('codeOutput');
    if (co) co.textContent = '// Upload or select a GIF and click "Convert GIF" to see the result\n\n// Example output will appear here in C/C++ array format\n// Perfect for Arduino, ESP32, STM32, and other microcontrollers';

    const ps = document.getElementById('previewSection');
    if (ps) ps.style.display = 'none';

    gifPlayer = null;
}

// ── Bitmap Processing ─────────────────────────────────────────
function processFrameArrays(frames, width, height, drawMode, threshold, invertColors) {
    return frames.map((_, i) => {
        const { ctx } = getProcessedFrameCanvas(i);
        const imgData  = ctx.getImageData(0, 0, width, height);
        const d        = imgData.data;
        const bitmap   = [];

        if (drawMode === 'horizontal') {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < Math.ceil(width / 8); x++) {
                    let byte = 0;
                    for (let bit = 0; bit < 8; bit++) {
                        const px = x * 8 + bit;
                        if (px >= width) continue;
                        const pi  = (y * width + px) * 4;
                        const lum = 0.299 * d[pi] + 0.587 * d[pi + 1] + 0.114 * d[pi + 2];
                        let   on  = lum >= threshold;
                        if (invertColors) on = !on;
                        if (on) byte |= 1 << (7 - bit);
                    }
                    bitmap.push(byte);
                }
            }
        } else if (drawMode === 'vertical') {
            for (let y = 0; y < Math.ceil(height / 8); y++) {
                for (let x = 0; x < width; x++) {
                    let byte = 0;
                    for (let bit = 0; bit < 8; bit++) {
                        const py = y * 8 + bit;
                        if (py >= height) continue;
                        const pi  = (py * width + x) * 4;
                        const lum = 0.299 * d[pi] + 0.587 * d[pi + 1] + 0.114 * d[pi + 2];
                        let   on  = lum >= threshold;
                        if (invertColors) on = !on;
                        if (on) byte |= 1 << bit;
                    }
                    bitmap.push(byte);
                }
            }
        } else if (drawMode === 'horizontal_bytes') {
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const pi  = (y * width + x) * 4;
                    const lum = 0.299 * d[pi] + 0.587 * d[pi + 1] + 0.114 * d[pi + 2];
                    let   on  = lum >= threshold;
                    if (invertColors) on = !on;
                    bitmap.push(on ? 1 : 0);
                }
            }
        }

        return bitmap;
    });
}

// ── Code Generation ───────────────────────────────────────────
function convertGifToCode() {
    if (!gifFrames.length) { alert('Please upload a GIF first!'); return; }

    const width        = parseInt(document.getElementById('canvasWidth').value)  || 128;
    const height       = parseInt(document.getElementById('canvasHeight').value) || 64;
    const drawMode     = document.getElementById('drawMode').value;
    const variableName = document.getElementById('variableName').value || 'myGif';
    const outputFormat = document.getElementById('outputFormat').value;
    const threshold    = parseInt(document.getElementById('threshold').value) || 128;
    const invertColors = document.getElementById('invertColors').checked;

    const frameArrays = processFrameArrays(gifFrames, width, height, drawMode, threshold, invertColors);

    let code = '';
    code += '// SPARKY.FPV — GIF to C/C++ Array Output\n';
    code += '// ============================================\n';
    code += '// github.com/sparky390 | instagram.com/sparky.fpv\n';
    code += `// Frame count : ${gifFrames.length}\n`;
    code += `// Size        : ${width}x${height} pixels\n`;
    code += `// Draw mode   : ${drawMode}\n`;
    code += `// Threshold   : ${threshold}\n`;
    code += `// Invert      : ${invertColors ? 'Yes' : 'No'}\n`;
    code += `// Generated   : ${new Date().toLocaleString()}\n`;
    code += '// ============================================\n\n';

    code += `#define ${variableName.toUpperCase()}_FRAME_COUNT ${gifFrames.length}\n`;
    code += `#define ${variableName.toUpperCase()}_WIDTH       ${width}\n`;
    code += `#define ${variableName.toUpperCase()}_HEIGHT      ${height}\n\n`;

    code += `// Frame display delays (milliseconds)\n`;
    code += `const uint16_t ${variableName}_delays[${variableName.toUpperCase()}_FRAME_COUNT] = {`;
    for (let i = 0; i < frameDelays.length; i++) {
        if (i > 0) code += ', ';
        code += (frameDelays[i] || 100);
    }
    code += '};\n\n';

    let frameSizeBytes;
    if      (drawMode === 'horizontal')    frameSizeBytes = Math.ceil(width / 8) * height;
    else if (drawMode === 'vertical')      frameSizeBytes = width * Math.ceil(height / 8);
    else                                   frameSizeBytes = Math.ceil((width * height) / 8);

    code += `// Image data — ${frameSizeBytes} bytes per frame\n`;

    if      (outputFormat === 'arduino') code += `PROGMEM const uint8_t ${variableName}[${gifFrames.length}][${frameSizeBytes}] = {\n`;
    else if (outputFormat === 'plain')   code += `const uint8_t ${variableName}[${gifFrames.length}][${frameSizeBytes}] = {\n`;
    else if (outputFormat === 'esp8266') code += `const uint8_t ${variableName}[${gifFrames.length}][${frameSizeBytes}] ICACHE_RODATA_ATTR = {\n`;

    for (let i = 0; i < frameArrays.length; i++) {
        const fd = frameArrays[i];
        code += '  {';
        for (let j = 0; j < fd.length; j++) {
            if (j % 16 === 0) code += '\n    ';
            code += '0x' + fd[j].toString(16).padStart(2, '0');
            if (j < fd.length - 1) code += ', ';
        }
        code += '\n  }';
        if (i < frameArrays.length - 1) code += ',';
        code += '\n';
    }
    code += '};\n\n';

    code += '// ============================================\n';
    code += '// Usage Example (Arduino / ESP32)\n';
    code += '// ============================================\n';
    code += '/*\n';
    code += 'void displayGifFrame(uint8_t frameIndex) {\n';
    code += `  for (int y = 0; y < ${variableName.toUpperCase()}_HEIGHT; y++) {\n`;
    code += `    for (int x = 0; x < ${variableName.toUpperCase()}_WIDTH; x++) {\n`;
    code += '      // Your display logic here\n';
    code += `      // Use ${variableName}[frameIndex] data\n`;
    code += '    }\n';
    code += '  }\n';
    code += `  delay(${variableName}_delays[frameIndex]);\n`;
    code += '}\n';
    code += '*/\n';

    document.getElementById('codeOutput').textContent = code;
}

// ── Save as .h ────────────────────────────────────────────────
function saveAsHeader() {
    if (!gifFrames.length) { alert('Please upload a GIF first!'); return; }

    const width        = parseInt(document.getElementById('canvasWidth').value)  || 128;
    const height       = parseInt(document.getElementById('canvasHeight').value) || 64;
    const drawMode     = document.getElementById('drawMode').value;
    const variableName = document.getElementById('variableName').value || 'myGif';
    const threshold    = parseInt(document.getElementById('threshold').value) || 128;
    const invertColors = document.getElementById('invertColors').checked;

    const frameArrays = processFrameArrays(gifFrames, width, height, drawMode, threshold, invertColors);
    const frameBytes  = Math.ceil(width * height / 8);

    let h = '';
    h += `#ifndef ${variableName.toUpperCase()}_H\n`;
    h += `#define ${variableName.toUpperCase()}_H\n\n`;
    h += `#include <stdint.h>\n`;
    h += `#include <pgmspace.h>\n\n`;
    h += `// SPARKY.FPV — GIF to C/C++ Header Output\n`;
    h += `// ============================================\n`;
    h += `// Generated : ${new Date().toISOString().split('T')[0]}\n`;
    h += `// Frames    : ${gifFrames.length}\n`;
    h += `// Size      : ${width}x${height}\n`;
    h += `// Draw mode : ${drawMode}\n`;
    h += `// ============================================\n\n`;
    h += `#ifndef ANIMATED_GIF_DEFINED\n`;
    h += `#define ANIMATED_GIF_DEFINED\n`;
    h += `typedef struct {\n`;
    h += `    const uint8_t  frame_count;\n`;
    h += `    const uint16_t width;\n`;
    h += `    const uint16_t height;\n`;
    h += `    const uint16_t* delays;\n`;
    h += `    const uint8_t (* frames)[${frameBytes}];\n`;
    h += `} AnimatedGIF;\n`;
    h += `#endif\n\n`;
    h += `#define ${variableName.toUpperCase()}_FRAME_COUNT ${gifFrames.length}\n`;
    h += `#define ${variableName.toUpperCase()}_WIDTH       ${width}\n`;
    h += `#define ${variableName.toUpperCase()}_HEIGHT      ${height}\n\n`;
    h += `const uint16_t ${variableName}_delays[${variableName.toUpperCase()}_FRAME_COUNT] = {`;

    for (let i = 0; i < frameDelays.length; i++) {
        if (i > 0) h += ', ';
        h += (frameDelays[i] || 100);
    }
    h += '};\n\n';

    h += `PROGMEM const uint8_t ${variableName}_frames[${variableName.toUpperCase()}_FRAME_COUNT][${frameBytes}] = {\n`;

    for (let i = 0; i < frameArrays.length; i++) {
        const fd = frameArrays[i];
        h += '  {';
        for (let j = 0; j < fd.length; j++) {
            if (j % 16 === 0) h += '\n    ';
            h += '0x' + fd[j].toString(16).padStart(2, '0');
            if (j < fd.length - 1) h += ', ';
        }
        h += '\n  }';
        if (i < frameArrays.length - 1) h += ',';
        h += '\n';
    }

    h += `};\n\n`;
    h += `const AnimatedGIF ${variableName}_gif = {\n`;
    h += `    .frame_count = ${variableName.toUpperCase()}_FRAME_COUNT,\n`;
    h += `    .width       = ${variableName.toUpperCase()}_WIDTH,\n`;
    h += `    .height      = ${variableName.toUpperCase()}_HEIGHT,\n`;
    h += `    .delays      = ${variableName}_delays,\n`;
    h += `    .frames      = ${variableName}_frames\n`;
    h += `};\n\n`;
    h += `#endif // ${variableName.toUpperCase()}_H\n`;

    downloadBlob(h, `${variableName}.h`, 'text/plain');
}

// ── Copy & Clear ──────────────────────────────────────────────
function copyCode() {
    const output = document.getElementById('codeOutput');
    navigator.clipboard.writeText(output.textContent)
        .then(() => {
            const btn = document.querySelector('[onclick="copyCode()"]');
            if (!btn) return;
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-check-lg"></i> Copied!';
            btn.classList.add('btn-success');
            btn.classList.remove('btn-ghost');
            setTimeout(() => {
                btn.innerHTML = orig;
                btn.classList.remove('btn-success');
                btn.classList.add('btn-ghost');
            }, 2000);
        })
        .catch(err => alert('Copy error: ' + err));
}

function clearCode() {
    document.getElementById('codeOutput').textContent =
        '// Upload or select a GIF and click "Convert GIF" to see the result\n\n// Example output will appear here in C/C++ array format\n// Perfect for Arduino, ESP32, STM32, and other microcontrollers';
}

// ── Download Helper ───────────────────────────────────────────
function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
