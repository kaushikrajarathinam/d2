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

const sliders = document.createElement("div");
sliders.style.display = "inline-flex";
sliders.style.flexDirection = "column";
sliders.style.gap = "6px";
sliders.style.marginLeft = "12px";
toolbar.appendChild(sliders);

function makeSlider(
  labelText: string,
  min: string,
  max: string,
  value: string,
  step: string,
) {
  const wrap = document.createElement("label");
  wrap.style.display = "flex";
  wrap.style.alignItems = "center";
  wrap.style.gap = "8px";
  const title = document.createElement("span");
  title.textContent = labelText;
  const val = document.createElement("span");
  val.style.minWidth = "2ch";
  const input = document.createElement("input");
  input.type = "range";
  input.min = min;
  input.max = max;
  input.value = value;
  input.step = step;
  wrap.appendChild(title);
  wrap.appendChild(val);
  wrap.appendChild(input);
  sliders.appendChild(wrap);
  return { wrap, title, val, input };
}

const sizeUI = makeSlider("Size", "2", "36", "8", "1");
const hueUI = makeSlider("Hue", "0", "360", "210", "1");
const rotUI = makeSlider("Rotation", "0", "360", "0", "1");

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
ctx.strokeStyle = "#222";

type Point = { x: number; y: number };

interface Drawable {
  display(ctx: CanvasRenderingContext2D): void;
}

function hslColor(h: number) {
  return `hsl(${h}, 90%, 30%)`;
}
function deg2rad(d: number) {
  return d * Math.PI / 180;
}

class MarkerStroke implements Drawable {
  private points: Point[] = [];
  private width: number;
  private color: string;
  constructor(start: Point, width: number, color: string) {
    this.points.push(start);
    this.width = width;
    this.color = color;
  }
  drag(p: Point) {
    this.points.push(p);
  }
  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length === 0) return;
    const prevW = ctx.lineWidth;
    const prevS = ctx.strokeStyle;
    const prevF = ctx.fillStyle;
    ctx.lineWidth = this.width;
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    if (this.points.length === 1) {
      const p = this.points[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.closePath();
      ctx.lineWidth = prevW;
      ctx.strokeStyle = prevS;
      ctx.fillStyle = prevF;
      return;
    }
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();
    ctx.closePath();
    ctx.lineWidth = prevW;
    ctx.strokeStyle = prevS;
    ctx.fillStyle = prevF;
  }
}

class MarkerPreview implements Drawable {
  private p: Point | null = null;
  private width: number;
  private color: string;
  constructor(width: number, color: string) {
    this.width = width;
    this.color = color;
  }
  setPosition(p: Point | null) {
    this.p = p;
  }
  setWidth(w: number) {
    this.width = w;
  }
  setColor(c: string) {
    this.color = c;
  }
  display(ctx: CanvasRenderingContext2D) {
    if (!this.p) return;
    const prevW = ctx.lineWidth, prevS = ctx.strokeStyle;
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.p.x, this.p.y, this.width / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.closePath();
    ctx.lineWidth = prevW;
    ctx.strokeStyle = prevS;
  }
}

class Sticker implements Drawable {
  private p: Point;
  private emoji: string;
  private size: number;
  private rotationDeg: number;
  constructor(p: Point, emoji: string, size: number, rotationDeg: number) {
    this.p = p;
    this.emoji = emoji;
    this.size = size;
    this.rotationDeg = rotationDeg;
  }
  drag(p: Point) {
    this.p = p;
  }
  display(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.p.x, this.p.y);
    ctx.rotate(deg2rad(this.rotationDeg));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      `${this.size}px system-ui, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
    ctx.fillText(this.emoji, 0, 0);
    ctx.restore();
  }
}

class StickerPreview implements Drawable {
  private p: Point | null = null;
  private emoji: string;
  private size: number;
  private rotationDeg: number;
  constructor(emoji: string, size: number, rotationDeg: number) {
    this.emoji = emoji;
    this.size = size;
    this.rotationDeg = rotationDeg;
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
  setRotation(d: number) {
    this.rotationDeg = d;
  }
  display(ctx: CanvasRenderingContext2D) {
    if (!this.p) return;
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.translate(this.p.x, this.p.y);
    ctx.rotate(deg2rad(this.rotationDeg));
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font =
      `${this.size}px system-ui, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`;
    ctx.fillText(this.emoji, 0, 0);
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
let currentWidth = parseInt(sizeUI.input.value, 10);
let currentHue = parseInt(hueUI.input.value, 10);
let currentColor = hslColor(currentHue);
let currentRotation = parseInt(rotUI.input.value, 10);

let tool: "marker" | "sticker" = "marker";
let stickerChar = "✨";
let currentStroke: MarkerStroke | null = null;
let currentSticker: Sticker | null = null;
let preview: Drawable = new MarkerPreview(currentWidth, currentColor);

const STICKER_FACTOR = 3.5;
const stickers: string[] = ["✨", "🍀", "🎯", "💥"];

function createStickerButton(s: string) {
  const b = document.createElement("button");
  b.textContent = s;
  b.addEventListener("click", () => {
    tool = "sticker";
    stickerChar = s;
    preview = new StickerPreview(
      stickerChar,
      Math.round(currentWidth * STICKER_FACTOR),
      currentRotation,
    );
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
  preview = new StickerPreview(
    stickerChar,
    Math.round(currentWidth * STICKER_FACTOR),
    currentRotation,
  );
  canvas.dispatchEvent(new Event(TOOL_MOVED));
});

sizeUI.val.textContent = String(currentWidth);
hueUI.val.textContent = String(currentHue);
rotUI.val.textContent = String(currentRotation);

sizeUI.input.addEventListener("input", () => {
  currentWidth = parseInt(sizeUI.input.value, 10);
  sizeUI.val.textContent = String(currentWidth);
  if (tool === "marker" && preview instanceof MarkerPreview) {
    preview.setWidth(currentWidth);
  }
  if (tool === "sticker" && preview instanceof StickerPreview) {
    preview.setSize(Math.round(currentWidth * STICKER_FACTOR));
  }
  if (!drawing) canvas.dispatchEvent(new Event(TOOL_MOVED));
});

hueUI.input.addEventListener("input", () => {
  currentHue = parseInt(hueUI.input.value, 10);
  hueUI.val.textContent = String(currentHue);
  currentColor = hslColor(currentHue);
  if (preview instanceof MarkerPreview) preview.setColor(currentColor);
  if (!drawing) canvas.dispatchEvent(new Event(TOOL_MOVED));
});

rotUI.input.addEventListener("input", () => {
  currentRotation = parseInt(rotUI.input.value, 10);
  rotUI.val.textContent = String(currentRotation);
  if (preview instanceof StickerPreview) preview.setRotation(currentRotation);
  if (!drawing) canvas.dispatchEvent(new Event(TOOL_MOVED));
});

markerBtn.addEventListener("click", () => {
  tool = "marker";
  preview = new MarkerPreview(currentWidth, currentColor);
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
    currentStroke = new MarkerStroke(p, currentWidth, currentColor);
    displayList.push(currentStroke);
  } else {
    currentSticker = new Sticker(
      p,
      stickerChar,
      Math.round(currentWidth * STICKER_FACTOR),
      currentRotation,
    );
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
