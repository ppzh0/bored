const canvas = document.getElementById('textCanvas');
const ctx = canvas.getContext('2d');

// Default options (controlled from UI)
let options = {
    fontSize: 48, // px
    lineHeightMultiplier: 1.3,
    fontFamily: 'Alsina, Comic Sans MS, sans-serif',
    paddingY: 96, // will be scaled with fontSize on generate
    paddingX: 42,
    canvasCssWidth: 600, // constant CSS width for canvas across devices
    bgColor: '#ffffff',
    textColor: '#000000'
};

// Helper: ensure webfont is loaded before measuring/drawing
async function loadFont(fontFamilyName = 'Alsina') {
    // try CSS Font Loading API
    if (document.fonts && document.fonts.load) {
        try {
            // load one representative weight/size
            await document.fonts.load(`16px "${fontFamilyName}"`);
            return true;
        } catch (e) {
            console.warn('Font load failed (document.fonts):', e);
        }
    }

    // fallback: wait briefly to allow browser to apply @font-face
    return new Promise((res) => setTimeout(() => res(true), 150));
}

function getContainerCssWidth() {
    // Return a fixed CSS width so the canvas appears the same across devices
    return options.canvasCssWidth;
}

function setCanvasDimensions(cssWidth, cssHeight) {
    const dpr = window.devicePixelRatio || 1;
    // Keep the internal pixel buffer sized for crisp rendering
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    // Let the CSS control displayed size: make canvas fill its wrapper responsively
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    // Map drawing coordinates to CSS pixels (so we can draw using CSS px units)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function segmentText(raw) {
    // Use Intl.Segmenter where available for languages without spaces
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        try {
            const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
            return Array.from(seg.segment(raw), s => s.segment);
        } catch (e) {
            // fall through
        }
    }
    // fallback: split into chars
    return Array.from(raw);
}

function wrapTextLines(text, maxWidth, ctx) {
    const rawLines = text.split('\n');
    const wrapped = [];

    for (let raw of rawLines) {
        if (raw.trim() === '') {
            wrapped.push('');
            continue;
        }

        // If the line contains spaces, prefer word-based wrapping
        if (raw.includes(' ')) {
            const words = raw.split(/(\s+)/).filter(Boolean); // keep spaces tokens
            let line = '';
            for (let token of words) {
                const test = line + token;
                const width = ctx.measureText(test).width;
                if (width <= maxWidth || line === '') {
                    line = test;
                } else {
                    wrapped.push(line.trimEnd());
                    line = token.trimStart();
                }
            }
            if (line !== '') wrapped.push(line);
        } else {
            // languages without spaces: use grapheme segmentation for safer wrapping
            let line = '';
            const segments = segmentText(raw);
            for (let seg of segments) {
                const test = line + seg;
                const width = ctx.measureText(test).width;
                if (width <= maxWidth || line === '') {
                    line = test;
                } else {
                    wrapped.push(line);
                    line = seg;
                }
            }
            if (line !== '') wrapped.push(line);
        }
    }

    return wrapped;
}

async function generatePreview() {
    // Read UI-controlled options
    const text = document.getElementById('userText').value || '';
    options.fontSize = Number(document.getElementById('fontSize').value) || options.fontSize;
    options.lineHeightMultiplier = Number(document.getElementById('lineHeight').value) || options.lineHeightMultiplier;
    options.textColor = document.getElementById('textColor').value || options.textColor;
    options.bgColor = document.getElementById('bgColor').value || options.bgColor;

    // Ensure font is available
    await loadFont('Alsina');

    // Prepare canvas metrics
    const cssWidth = getContainerCssWidth();
    const paddingY = options.fontSize * 2; // scale padding with font size
    const paddingX = Math.max(16, options.paddingX);

    // Temporarily set context font for measurements (in CSS pixels)
    ctx.font = `${options.fontSize}px ${options.fontFamily}`;

    const maxTextWidth = cssWidth - paddingX * 2;
    const wrapped = wrapTextLines(text, maxTextWidth, ctx);

    const lineHeight = options.fontSize * options.lineHeightMultiplier;
    const totalTextHeight = Math.max(lineHeight, wrapped.length * lineHeight);
    const cssHeight = totalTextHeight + paddingY * 2;

    // Set proper pixel dimensions for crisp rendering
    setCanvasDimensions(cssWidth, cssHeight);

    // Clear & paint background
    ctx.fillStyle = options.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Prepare text drawing properties (drawing in CSS px because of setTransform)
    ctx.fillStyle = options.textColor;
    ctx.font = `${options.fontSize}px ${options.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const startY = paddingY;

    wrapped.forEach((line, i) => {
        ctx.fillText(line, paddingX, startY + i * lineHeight);
    });

    document.getElementById('downloadBtn').style.display = 'inline-block';
    document.getElementById('copyBtn').style.display = 'inline-block';
}

async function downloadImage() {
    // Refresh options from the UI to ensure export uses current settings
    options.fontSize = Number(document.getElementById('fontSize').value) || options.fontSize;
    options.lineHeightMultiplier = Number(document.getElementById('lineHeight').value) || options.lineHeightMultiplier;
    options.textColor = document.getElementById('textColor').value || options.textColor;
    options.bgColor = document.getElementById('bgColor').value || options.bgColor;

    const filenameInput = document.getElementById('filename');
    let filename = (filenameInput && filenameInput.value.trim()) || '';
    if (!filename) {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        filename = `text-image-${stamp}`;
    }
    filename = filename.endsWith('.png') ? filename : `${filename}.png`;

    // Read requested export scale (1, 2, 3, ...)
    const exportScale = Number(document.getElementById('exportScale')?.value) || 1;

    // Ensure font is loaded at the requested size before measuring/drawing
    await loadFont('Alsina');
    if (document.fonts && document.fonts.load) {
        try {
            await document.fonts.load(`${options.fontSize}px "Alsina"`);
        } catch (e) {
            // ignore and continue
        }
    }

    // Prepare metrics (use a measurement context so wrapping is consistent)
    const cssWidth = options.canvasCssWidth;
    const paddingX = Math.max(16, options.paddingX);
    const paddingY = options.fontSize * 2;

    const measureCanvas = document.createElement('canvas');
    const mctx = measureCanvas.getContext('2d');
    // Use same font string as drawing so measurements match
    mctx.font = `${options.fontSize}px ${options.fontFamily}`;

    const maxTextWidth = cssWidth - paddingX * 2;
    const text = document.getElementById('userText').value || '';
    const wrapped = wrapTextLines(text, maxTextWidth, mctx);

    const lineHeight = options.fontSize * options.lineHeightMultiplier;
    const totalTextHeight = Math.max(lineHeight, wrapped.length * lineHeight);
    const cssHeight = totalTextHeight + paddingY * 2;

    const dpr = window.devicePixelRatio || 1;
    const pixelW = Math.round(cssWidth * dpr * exportScale);
    const pixelH = Math.round(cssHeight * dpr * exportScale);

    // Create a high-res offscreen canvas for export
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = pixelW;
    tempCanvas.height = pixelH;
    // Keep CSS dimensions so drawing coordinates are in CSS pixels
    tempCanvas.style.width = `${cssWidth}px`;
    tempCanvas.style.height = `${cssHeight}px`;

    const tctx = tempCanvas.getContext('2d');
    // scale so that drawing coordinates are in CSS px but map to (dpr * exportScale) device pixels
    tctx.setTransform(dpr * exportScale, 0, 0, dpr * exportScale, 0, 0);

    // paint background
    tctx.fillStyle = options.bgColor;
    tctx.fillRect(0, 0, cssWidth, cssHeight);

    // paint text
    tctx.fillStyle = options.textColor;
    tctx.font = `${options.fontSize}px ${options.fontFamily}`;
    tctx.textAlign = 'left';
    tctx.textBaseline = 'top';

    const startY = paddingY;
    wrapped.forEach((line, i) => {
        tctx.fillText(line, paddingX, startY + i * lineHeight);
    });

    // Export the high-res canvas as PNG blob
    tempCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }, 'image/png');
}

async function copyImageToClipboard() {
    if (!navigator.clipboard) {
        alert('Clipboard API not available in this browser.');
        return;
    }
    return new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
            try {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                resolve(true);
            } catch (e) {
                reject(e);
            }
        });
    });
}

// Auto-preview support and input wiring
(function initControls() {
    const userText = document.getElementById('userText');
    const previewBtn = document.getElementById('previewBtn');
    const autoPreview = document.getElementById('autoPreview');

    previewBtn.addEventListener('click', generatePreview);

    // auto preview on input
    userText.addEventListener('input', () => {
        if (autoPreview.checked) generatePreview();
    });

    // other control changes
    ['fontSize', 'lineHeight', 'textColor', 'bgColor'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            if (autoPreview.checked) generatePreview();
        });
    });

    document.getElementById('downloadBtn').addEventListener('click', downloadImage);
    document.getElementById('copyBtn').addEventListener('click', async () => {
        try {
            await copyImageToClipboard();
            // small visual feedback
            const btn = document.getElementById('copyBtn');
            const prev = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = prev, 1200);
        } catch (e) {
            alert('Failed to copy image: ' + (e && e.message ? e.message : e));
        }
    });

    // initial preview
    setTimeout(generatePreview, 200);
})();