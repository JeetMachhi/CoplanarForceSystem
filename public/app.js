const $ = id => document.getElementById(id);
const forces = [];
let nextId = 1;
const palette = ["#7c6cff", "#159b8c", "#e48b34", "#df5b75", "#367bd4", "#a35cc4", "#70a33a", "#d15eab", "#607d8b", "#b38a24"];
let lastOutput = "";

$("forceForm").addEventListener("submit", e => {
  e.preventDefault();
  const magnitude = Number($("magnitude").value);
  const angle = Number($("angle").value);
  if ($("magnitude").value.trim() === "" || $("angle").value.trim() === "" ||
      !Number.isFinite(magnitude) || !Number.isFinite(angle) || magnitude < 0) {
    alert("Enter a valid non-negative magnitude and a valid angle.");
    return;
  }
  forces.push({ id: nextId++, magnitude, angle: ((angle % 360) + 360) % 360 });
  $("magnitude").value = "";
  $("angle").value = "";
  render();
});
document.querySelectorAll("[data-angle]").forEach(btn => btn.addEventListener("click", () => {
  $("angle").value = btn.dataset.angle;
  $("magnitude").focus();
}));
$("clear").addEventListener("click", () => { forces.length = 0; render(); });
$("example").addEventListener("click", () => {
  forces.length = 0; nextId = 1;
  [{magnitude:25,angle:0},{magnitude:40,angle:30},{magnitude:15,angle:270}].forEach(f => forces.push({...f,id:nextId++}));
  render();
});
$("copy").addEventListener("click", async () => {
  if (!lastOutput) return;
  try {
    await navigator.clipboard.writeText(lastOutput);
    $("copy").textContent = "Copied ✓";
    setTimeout(() => $("copy").textContent = "Copy results", 1300);
  } catch { alert(lastOutput); }
});
$("print").addEventListener("click", () => window.print());
window.addEventListener("resize", drawDiagram);

function fmt(n, digits=2) {
  if (Math.abs(n) < 1e-9) n = 0;
  return n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}
function components(f) {
  const rad = f.angle * Math.PI / 180;
  return { fx: f.magnitude * Math.cos(rad), fy: f.magnitude * Math.sin(rad) };
}
function render() {
  const list = $("forceList");
  list.innerHTML = "";
  if (!forces.length) {
    list.innerHTML = '<div class="empty">No forces added yet. Enter a magnitude and angle above.</div>';
  } else {
    forces.forEach((f, i) => {
      const el = document.createElement("div");
      el.className = "force-item";
      const swatch = document.createElement("span");
      swatch.className = "force-swatch";
      swatch.style.background = palette[i % palette.length];
      const text = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `F${f.id} · ${fmt(f.magnitude)} units`;
      const detail = document.createElement("small");
      detail.textContent = `${fmt(f.angle)}° from +X`;
      text.append(title, detail);
      const del = document.createElement("button");
      del.className = "delete"; del.type = "button"; del.textContent = "×"; del.title = "Remove force";
      del.addEventListener("click", () => { forces.splice(forces.findIndex(x => x.id === f.id), 1); render(); });
      el.append(swatch, text, del); list.append(el);
    });
  }
  updateResults();
  drawDiagram();
}
function updateResults() {
  const values = forces.map(components);
  const sx = values.reduce((s,v) => s+v.fx, 0);
  const sy = values.reduce((s,v) => s+v.fy, 0);
  const r = Math.hypot(sx,sy);
  const angle = r > 1e-9 ? (Math.atan2(sy,sx)*180/Math.PI+360)%360 : null;
  $("resultant").textContent = forces.length ? `${fmt(r)} units` : "—";
  $("direction").textContent = !forces.length ? "—" : angle === null ? "Undefined" : `${fmt(angle)}°`;
  $("sumX").textContent = forces.length ? fmt(sx) : "—";
  $("sumY").textContent = forces.length ? fmt(sy) : "—";
  const blocks = [];
  if (forces.length) {
    blocks.push(["1 · Resolve each force", forces.map((f,i) => {
      const c = values[i];
      return `F${f.id}x = ${fmt(f.magnitude)} cos(${fmt(f.angle)}°) = ${fmt(c.fx)}\nF${f.id}y = ${fmt(f.magnitude)} sin(${fmt(f.angle)}°) = ${fmt(c.fy)}`;
    }).join("\n\n")]);
    blocks.push(["2 · Sum the components", `ΣFx = ${values.map(v=>fmt(v.fx)).join(" + ")} = ${fmt(sx)}\nΣFy = ${values.map(v=>fmt(v.fy)).join(" + ")} = ${fmt(sy)}`]);
    blocks.push(["3 · Resultant magnitude", `R = √[(ΣFx)² + (ΣFy)²]\nR = √[(${fmt(sx)})² + (${fmt(sy)})²] = ${fmt(r)}`]);
    blocks.push(["4 · Resultant direction", angle === null ? "The resultant is zero, so its direction is undefined." : `θ = atan2(ΣFy, ΣFx) = ${fmt(angle)}° counterclockwise from +X`]);
  }
  $("working").innerHTML = blocks.length ? blocks.map(([title,body]) => {
    const block = document.createElement("div"); block.className = "work-block";
    const b = document.createElement("b"); b.textContent = title;
    const pre = document.createElement("pre"); pre.textContent = body;
    block.append(b,pre); return block.outerHTML;
  }).join("") : "<p>Add a force to see the calculation steps.</p>";
  lastOutput = forces.length
    ? `COPLANAR FORCE SYSTEM\n${blocks.map(([a,b])=>a+"\n"+b).join("\n\n")}`
    : "";
}
function drawDiagram() {
  const canvas = $("diagram");
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(300, rect.width);
  const height = Math.max(260, rect.height);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width*dpr);
  canvas.height = Math.round(height*dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle = "#fbfcff"; ctx.fillRect(0,0,width,height);
  const vals = forces.map(components);
  const sx = vals.reduce((s,v)=>s+v.fx,0), sy = vals.reduce((s,v)=>s+v.fy,0);
  const r = Math.hypot(sx,sy);
  const maxVal = Math.max(1, ...forces.map(f=>f.magnitude), Math.abs(sx), Math.abs(sy));
  const pad = {l:42,r:30,t:35,b:37};
  const cx = width/2, cy = height/2 + 3;
  const scale = Math.min((width-pad.l-pad.r)/2, (height-pad.t-pad.b)/2) / (maxVal*1.27);
  const X = x => cx+x*scale, Y = y => cy-y*scale;

  // Background grid and axes
  ctx.strokeStyle = "#e5eaf2"; ctx.lineWidth = 1;
  const gridStep = Math.max(1, Math.pow(10, Math.floor(Math.log10(maxVal/3))));
  for (let v=-Math.ceil(maxVal/gridStep); v<=Math.ceil(maxVal/gridStep); v++) {
    if (v===0) continue;
    const px=X(v*gridStep), py=Y(v*gridStep);
    if(px>pad.l && px<width-pad.r){ctx.beginPath();ctx.moveTo(px,pad.t);ctx.lineTo(px,height-pad.b);ctx.stroke();}
    if(py>pad.t && py<height-pad.b){ctx.beginPath();ctx.moveTo(pad.l,py);ctx.lineTo(width-pad.r,py);ctx.stroke();}
  }
  ctx.strokeStyle="#7d8ba2";ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(pad.l,cy);ctx.lineTo(width-pad.r,cy);ctx.moveTo(cx,height-pad.b);ctx.lineTo(cx,pad.t);ctx.stroke();
  arrowHead(ctx,width-pad.r,cy,0,"#718098");
  arrowHead(ctx,cx,pad.t,-Math.PI/2,"#718098");
  ctx.fillStyle="#56657c";ctx.font="11px Segoe UI,Arial";ctx.fillText("+X",width-pad.r-20,cy-9);ctx.fillText("+Y",cx+8,pad.t+11);
  ctx.fillStyle="#68758b";ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill();

  forces.forEach((f,i)=>{
    const c=vals[i], color=palette[i%palette.length];
    const ex=X(c.fx), ey=Y(c.fy);
    drawArrow(ctx,cx,cy,ex,ey,color,2.5);
    const rad=f.angle*Math.PI/180;
    const labelX=ex+Math.cos(rad)*8;
    const labelY=ey-Math.sin(rad)*8;
    ctx.font="bold 11px Segoe UI,Arial";ctx.fillStyle=color;
    ctx.textAlign=labelX>width-105?"right":"left";
    ctx.fillText(`F${f.id} ${fmt(f.magnitude)} @ ${fmt(f.angle)}°`,labelX,labelY-4);
    ctx.textAlign="left";
    // Dashed component projections
    ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle=color+"99";ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(ex,cy);ctx.lineTo(cx,cy);ctx.stroke();
    ctx.restore();
  });
  if(forces.length && r>1e-8){
    drawArrow(ctx,cx,cy,X(sx),Y(sy),"#111827",3.5);
    ctx.fillStyle="#111827";ctx.font="bold 12px Segoe UI,Arial";
    ctx.textAlign=sx>maxVal*.55?"right":"left";
    ctx.fillText(`R = ${fmt(r)}`,X(sx)+(sx>0?-8:8),Y(sy)-10);
    ctx.textAlign="left";
  }
  if(!forces.length){
    ctx.fillStyle="#7a879b";ctx.textAlign="center";ctx.font="13px Segoe UI,Arial";
    ctx.fillText("Add forces to draw your diagram",cx,cy-18);ctx.textAlign="left";
  }
  ctx.fillStyle="#718098";ctx.font="10px Segoe UI,Arial";
  ctx.fillText("Schematic vector diagram • angles from +X",12,height-10);
}
function arrowHead(ctx,x,y,angle,color){
  const len=8,spread=.45;
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y);
  ctx.lineTo(x-len*Math.cos(angle-spread),y-len*Math.sin(angle-spread));
  ctx.lineTo(x-len*Math.cos(angle+spread),y-len*Math.sin(angle+spread));
  ctx.closePath();ctx.fill();
}
function drawArrow(ctx,x1,y1,x2,y2,color,width){
  if(Math.hypot(x2-x1,y2-y1)<1) return;
  const a=Math.atan2(y2-y1,x2-x1),head=10;
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x2,y2);
  ctx.lineTo(x2-head*Math.cos(a-.48),y2-head*Math.sin(a-.48));
  ctx.lineTo(x2-head*Math.cos(a+.48),y2-head*Math.sin(a+.48));
  ctx.closePath();ctx.fill();
}
render();
