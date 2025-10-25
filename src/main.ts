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

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.className = "app-canvas";
app.appendChild(canvas);

const ctx = canvas.getContext("2d")!;
ctx.lineCap = "round";
ctx.lineJoin = "round";
ctx.lineWidth = 6;
ctx.strokeStyle = "#111";

type Point = { x: number; y: number };
type Stroke = Point[];

const displayList: Stroke[] = [];
const redoStack: Stroke[] = [];

const DRAWING_CHANGED = "drawing-changed";

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const stroke of displayList) {
    if (stroke.length === 0) continue;
    if (stroke.length === 1) {
      const p = stroke[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = ctx.strokeStyle as string;
      ctx.fill();
      ctx.closePath();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
    ctx.closePath();
  }
}

canvas.addEventListener(DRAWING_CHANGED, redraw);

let drawing = false;
let currentStroke: Stroke | null = null;

function pos(e: MouseEvent): Point {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  currentStroke = [];
  displayList.push(currentStroke);
  redoStack.length = 0;
  currentStroke.push(pos(e));
  canvas.dispatchEvent(new Event(DRAWING_CHANGED));
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing || !currentStroke) return;
  currentStroke.push(pos(e));
  canvas.dispatchEvent(new Event(DRAWING_CHANGED));
});

function stop() {
  drawing = false;
  currentStroke = null;
}
canvas.addEventListener("mouseup", stop);
canvas.addEventListener("mouseleave", stop);

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
