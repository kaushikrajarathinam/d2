import "./style.css";

const app = document.querySelector<HTMLElement>("#app") ?? document.body;

const h1 = document.createElement("h1");
h1.textContent = "My D2 Project";
app.appendChild(h1);

const toolbar = document.createElement("div");
app.appendChild(toolbar);

const undoBtn = document.createElement("button");
undoBtn.textContent = "Undo";
toolbar.appendChild(undoBtn);

const redoBtn = document.createElement("button");
redoBtn.textContent = "Redo";
toolbar.appendChild(redoBtn);

const clearBtn = document.createElement("button");
clearBtn.textContent = "Clear";
toolbar.appendChild(clearBtn);

const sizeWrap = document.createElement("label");
sizeWrap.style.marginLeft = "8px";
sizeWrap.textContent = "Size:";
toolbar.appendChild(sizeWrap);

const sizeValue = document.createElement("span");
sizeValue.style.margin = "0 6px";
sizeWrap.appendChild(sizeValue);

const sizeSlider = document.createElement("input");
sizeSlider.type = "range";
sizeSlider.min = "1";
sizeSlider.max = "24";
sizeSlider.value = "6";
sizeSlider.step = "1";
sizeWrap.appendChild(sizeSlider);

const toolWrap = document.createElement("div");
toolWrap.style.display = "inline-flex";
toolWrap.style.gap = "6px";
toolWrap.style.marginLeft = "12px";
toolbar.appendChild(toolWrap);

const markerBtn = document.createElement("button");
markerBtn.textContent = "Marker";
toolWrap.appendChild(markerBtn);

const stickerWrap = document.createElement("div");
stickerWrap.style.display = "inline-flex";
stickerWrap.style.gap = "6px";
stickerWrap.style.marginLeft = "8px";
toolbar.appendChild(stickerWrap);

const addStickerBtn = document.createElement("button");
addStickerBtn.textContent = "+";
stickerWrap.appendChild(addStickerBtn);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.className = "app-canvas";
app.appendChild(canvas);

canvas.addEventListener("mouseenter", () => {
  canvas.style.cursor = "none";
});
canvas.addEventListener("mouseleave", () => {
  canvas.style.cursor = "";
});

const ctx = canvas.getContext("2d")!;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.strokeStyle = "#111";

type Point = { x: number; y: number };

interface Drawable {
  display(ctx: CanvasRenderingContext2D): void;
}

class MarkerStroke implements Drawable {
  private points: Point[] = [];
  private width: number;
  constructor(start: Point, width: number) {
    this.points.push(start);
    this.width = width;
  }
  drag(p: Point) {
    this.points.push(p);
  }
  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length === 0) return;
    const prev = ctx.lineWidth;
    ctx.lineWidth = this.width;
    if (this.points.length === 1) {
      const p = this.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle as string;
      ctx.fill();
      ctx.closePath();
      ctx.lineWidth = prev;
      return;
    }
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();
    ctx.closePath();
    ctx.lineWidth = prev;
  }
}

class MarkerPreview implements Drawable {
  private p: Point | null = null;
  private width: number;
  constructor(width: number) {
    this.width = width;
  }
  setPosition(p: Point | null) {
    this.p = p;
  }
  setWidth(w: number) {
    this.width = w;
  }
  display(ctx: CanvasRenderingContext2D) {
    if (!this.p) return;
    const prev = ctx.lineWidth;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.p.x, this.p.y, this.width / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();
    ctx.lineWidth = prev;
  }
}

class Sticker implements Drawable {
  private p: Point;
  private emoji: string;
  private size: number;
  constructor(p: Point, emoji: string, size: number) {
    this.p = p;
    this.emoji = emoji;
    this.size = size;
  }
  drag(p: Point) {
    this.p = p;
  }
  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      `${this.size}px system-ui, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
    ctx.fillText(this.emoji, this.p.x, this.p.y);
    ctx.restore();
  }
}

class StickerPreview implements Drawable {
  private p: Point | null = null;
  private emoji: string;
  private size: number;
  constructor(emoji: string, size: number) {
    this.emoji = emoji;
    this.size = size;
  }
  setPosition(p: Point | null) {
    this.p = p;
  }
  setEmoji(e: string) {
    this.emoji = e;
  }
  setSize(s: number) {
    this.size = s;
  }
  display(ctx: CanvasRenderingContext2D) {
    if (!this.p) return;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      `${this.size}px system-ui, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
    ctx.fillText(this.emoji, this.p.x, this.p.y);
    ctx.restore();
  }
}

const displayList: Drawable[] = [];
const redoStack: Drawable[] = [];

const DRAWING_CHANGED = "drawing-changed";
const TOOL_MOVED = "tool-moved";

function renderAll() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const item of displayList) item.display(ctx);
  if (!drawing && preview) preview.display(ctx);
}

canvas.addEventListener(DRAWING_CHANGED, renderAll);
canvas.addEventListener(TOOL_MOVED, renderAll);

let drawing = false;
let currentWidth = parseInt(sizeSlider.value, 10);
let tool: "marker" | "sticker" = "marker";
let stickerChar = "😀";
let currentStroke: MarkerStroke | null = null;
let currentSticker: Sticker | null = null;
let preview: Drawable = new MarkerPreview(currentWidth);

let stickers: string[] = ["😀", "⭐️", "🔥"];

function createStickerButton(s: string) {
  const b = document.createElement("button");
  b.textContent = s;
  b.addEventListener("click", () => {
    tool = "sticker";
    stickerChar = s;
    preview = new StickerPreview(stickerChar, currentWidth * 3);
    canvas.dispatchEvent(new Event(TOOL_MOVED));
  });
  stickerWrap.insertBefore(b, addStickerBtn);
}

stickers.forEach(createStickerButton);

addStickerBtn.addEventListener("click", () => {
  const t = prompt("Custom sticker text", "🧽");
  if (!t) return;
  stickers.push(t);
  createStickerButton(t);
  tool = "sticker";
  stickerChar = t;
  preview = new StickerPreview(stickerChar, currentWidth * 3);
  canvas.dispatchEvent(new Event(TOOL_MOVED));
});

sizeValue.textContent = String(currentWidth);
sizeSlider.addEventListener("input", () => {
  currentWidth = parseInt(sizeSlider.value, 10);
  if (tool === "marker" && preview instanceof MarkerPreview) {
    preview.setWidth(currentWidth);
  } else if (tool === "sticker" && preview instanceof StickerPreview) {
    preview.setSize(currentWidth * 3);
  }
  if (!drawing) canvas.dispatchEvent(new Event(TOOL_MOVED));
});

markerBtn.addEventListener("click", () => {
  tool = "marker";
  preview = new MarkerPreview(currentWidth);
  canvas.dispatchEvent(new Event(TOOL_MOVED));
});

function pos(e: MouseEvent): Point {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  const p = pos(e);
  if (tool === "marker") {
    currentStroke = new MarkerStroke(p, currentWidth);
    displayList.push(currentStroke);
  } else {
    currentSticker = new Sticker(p, stickerChar, currentWidth * 3);
    displayList.push(currentSticker);
  }
  redoStack.length = 0;
  canvas.dispatchEvent(new Event(DRAWING_CHANGED));
});

canvas.addEventListener("mousemove", (e) => {
  const p = pos(e);
  if (drawing) {
    if (tool === "marker" && currentStroke) {
      currentStroke.drag(p);
      canvas.dispatchEvent(new Event(DRAWING_CHANGED));
    } else if (tool === "sticker" && currentSticker) {
      currentSticker.drag(p);
      canvas.dispatchEvent(new Event(DRAWING_CHANGED));
    }
  } else {
    if (preview instanceof MarkerPreview || preview instanceof StickerPreview) {
      preview.setPosition(p);
    }
    canvas.dispatchEvent(new Event(TOOL_MOVED));
  }
});

function stop() {
  drawing = false;
  currentStroke = null;
  currentSticker = null;
}
canvas.addEventListener("mouseup", stop);
canvas.addEventListener("mouseleave", () => {
  stop();
  if (preview instanceof MarkerPreview) preview.setPosition(null);
  if (preview instanceof StickerPreview) preview.setPosition(null);
  canvas.dispatchEvent(new Event(TOOL_MOVED));
});

function undo() {
  if (displayList.length === 0) return;
  const s = displayList.pop()!;
  redoStack.push(s);
  canvas.dispatchEvent(new Event(DRAWING_CHANGED));
}

function redo() {
  if (redoStack.length === 0) return;
  const s = redoStack.pop()!;
  displayList.push(s);
  canvas.dispatchEvent(new Event(DRAWING_CHANGED));
}

function clearAll() {
  if (displayList.length === 0 && redoStack.length === 0) return;
  displayList.length = 0;
  redoStack.length = 0;
  canvas.dispatchEvent(new Event(DRAWING_CHANGED));
}

undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
clearBtn.addEventListener("click", clearAll);
