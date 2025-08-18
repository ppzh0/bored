# bored

> some "thing" with big vision, but no ability

A tiny web app that renders user text onto a canvas using the "Alsina" font (Vsauce-inspired) and allows downloading or copying the result as an image.

Features added:
- High-DPI aware canvas rendering (uses devicePixelRatio for crisp output)
- Reliable font loading via the Font Loading API fallback
- Word and grapheme-aware wrapping (Intl.Segmenter when available)
- Controls for font size, line height, text/background color, filename, and auto-preview
- Copy image to clipboard support and better download handling

How to use
1. Open index.html in a browser (no server needed for local testing, but Chrome/Edge are recommended for clipboard support).
2. Edit the text, adjust font size / line height / colors, and click Preview (or enable Auto-preview).
3. Download or copy the generated PNG.

Notes
- Some languages without spaces (CJK, Burmese, Thai, etc.) may wrap better using the browser's Intl.Segmenter if available.
- If the embedded font doesn't load in some browsers, try serving the files from a local server (e.g. `python -m http.server`) to avoid cross-origin font restrictions.

License
MIT (see LICENSE file)
