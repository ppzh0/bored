const canvas = document.getElementById('textCanvas');
const ctx = canvas.getContext('2d');

const fontSize = 3 * 16; // 2.6rem
const lineHeight = fontSize * 1.3;
const fontFamily = "Alsina, Comic Sans MS, sans-serif";
const paddingY = fontSize * 2;
const paddingX = 42;
const canvasWidth = 600;

function generatePreview() {
    const text = document.getElementById('userText').value;
    const rawLines = text.split('\n');

    ctx.font = `${fontSize}px ${fontFamily}`;
    const wrappedLines = [];

    for (let raw of rawLines) {
        if (raw.trim() === "") {
            wrappedLines.push("");
            continue;
        }

        if (raw.includes(" ")) {
            const words = raw.split(" ");
            let line = words[0] || "";

            for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const testLine = line + " " + word;
                const width = ctx.measureText(testLine).width;
                if (width < canvasWidth - paddingX * 2) {
                    line = testLine;
                } else {
                    wrappedLines.push(line);
                    line = word;
                }
            }
            wrappedLines.push(line);
        } else {
            let line = "";
            for (let char of raw) {
                const testLine = line + char;
                const width = ctx.measureText(testLine).width;
                if (width < canvasWidth - paddingX * 2) {
                    line = testLine;
                } else {
                    wrappedLines.push(line);
                    line = char;
                }
            }
            wrappedLines.push(line);
        }
    }

    const totalTextHeight = wrappedLines.length * lineHeight;
    const canvasHeight = totalTextHeight + paddingY * 2;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#000000";
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const startY = (canvas.height - totalTextHeight) / 2;

    wrappedLines.forEach((line, index) => {
        ctx.fillText(line, paddingX, startY + index * lineHeight);
    });

    document.getElementById("downloadBtn").style.display = "inline-block";
}

function downloadImage() {
    const link = document.createElement('a');
    link.download = 'text-image.png';
    link.href = canvas.toDataURL();
    link.click();
}