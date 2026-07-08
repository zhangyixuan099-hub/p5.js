p5.disableFriendlyErrors = true;

/**
 * Ginkgo Healing Scene
 * 适配当前 p5 Web Editor：使用 async setup() + await loadImage()
 *
 * 需要文件：
 * - brunch.png   树干 / 树枝范围（透明底 + 白色区域）
 * - leaf.png     树冠范围（透明底 + 白色区域）
 * - under.png    地面落叶范围（透明底 + 白色区域）
 * - cat.png      小猫图（建议是整张透明画布，猫已放在正确位置）
 */

let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

const RECORD_CONFIG = {
  fps: 30,
  autoStopSeconds: 12, // 录制多少秒；可以改成 6、10、15
  fileName: "ginkgo-healing-scene.webm",
};

let branchMaskImg;
let leafMaskImg;
let underMaskImg;
let catImg;

let branchData;
let leafData;
let underData;

let bgLayer;
let groundLayer;
let canopyLayer;
let branchLayer;

let treePivot;
let fallingLeaves = [];
let bursts = [];

const CONFIG = {
  // 画布大小
  canvasW: 773,
  canvasH: 960,

  seed: 20260705,
  pixelDensityValue: 1,

  // 是否显示调试 mask
  debugMasks: false,

  // mask 采样精度
  // 越小越精细，但越慢
  maskSampleGap: 4,

  // -------------------------
  // 静态层密度
  // -------------------------
  canopyLeafCount: 5600,   // 树上静态叶子数量：越大树冠越密
  groundLeafCount: 2000,   // 地上静态叶子数量：越大地面越厚
  barkDotCount: 4200,      // 树干颗粒数量：越大树干越厚实
  barkLineCount: 1200,     // 树皮线条数量：越大纹理越明显

  // -------------------------
  // 树干摇晃
  // -------------------------
  treeSwayDeg: 0.65,       // 越大左右摇晃越明显
  treeSwaySpeed: 0.018,    // 越大摇晃越快
  treeMicroSwayDeg: 0.12,  // 细小不规则晃动幅度
  canopyFollow: 0.45,      // 树冠跟随树干摇晃比例

  // -------------------------
  // 飘落叶
  // -------------------------
  fallingLeafCount: 65,    // 越大飘落叶越多
  fallingSizeMin: 5,
  fallingSizeMax: 12,
  fallingSpeedMin: 0.22,   // 越小越慢，更安静
  fallingSpeedMax: 0.82,   // 越大越快
  fallingWind: 0.42,       // 左右摆动幅度
  fallingNoiseWind: 0.48,  // 噪声风大小
  fallingFlutter: 0.48,    // 叶片抖动幅度
  fallingAlpha: 210,

  // -------------------------
  // 地面碎裂成圆点
  // -------------------------
  burstEveryFrames: 55,    // 越小越频繁
  burstProbability: 0.65,
  maxBursts: 12,
  burstScatterSpeed: 0.9,  // 越大散得越开
  burstLifeMin: 45,
  burstLifeMax: 95,

  // -------------------------
  // 小猫
  // -------------------------
  catBreathePx: 0.8,       // 设为 0 则完全静止
  catBreatheSpeed: 0.035,
};

const COLORS = {
  bgTop: [218, 203, 118],
  bgMid: [226, 212, 151],
  bgBottom: [236, 211, 42],

  leaves: [
    [255, 225, 18],
    [255, 210, 0],
    [248, 236, 78],
    [239, 190, 15],
    [255, 244, 118],
    [212, 182, 26],
  ],

  leafDark: [
    [158, 137, 24],
    [136, 118, 31],
    [181, 150, 18],
  ],

  bark: [
    [94, 69, 31],
    [122, 88, 35],
    [82, 62, 33],
    [154, 116, 42],
    [188, 148, 58],
  ],

  grass: [
    [132, 153, 48],
    [106, 134, 45],
    [166, 158, 45],
  ],
};

async function setup() {
  createCanvas(CONFIG.canvasW, CONFIG.canvasH);
  pixelDensity(CONFIG.pixelDensityValue);

  randomSeed(CONFIG.seed);
  noiseSeed(CONFIG.seed);

  // 关键：当前环境要这样加载图片
  branchMaskImg = await loadImage("brunch.png");
  leafMaskImg = await loadImage("leaf.png");
  underMaskImg = await loadImage("under.png");
  catImg = await loadImage("cat.png");

  console.log("branchMaskImg", branchMaskImg.width, branchMaskImg.height);
  console.log("leafMaskImg", leafMaskImg.width, leafMaskImg.height);
  console.log("underMaskImg", underMaskImg.width, underMaskImg.height);
  console.log("catImg", catImg.width, catImg.height);

  resizeAllImagesToCanvas();

  branchData = buildMaskData(branchMaskImg, "branch");
  leafData = buildMaskData(leafMaskImg, "leaf");
  underData = buildMaskData(underMaskImg, "under");

  treePivot = getTreePivot(branchData);

  // 预渲染静态层
  bgLayer = makeBackgroundLayer();
  groundLayer = makeGroundLayer();
  canopyLayer = makeCanopyLayer();
  branchLayer = makeBranchLayer();

  // 初始化飘落叶
  for (let i = 0; i < CONFIG.fallingLeafCount; i++) {
    fallingLeaves.push(new FallingLeaf(true));
  }
}

function draw() {
  if (!bgLayer) return; // 避免图片尚未准备好时 draw 抢跑

  image(bgLayer, 0, 0);
  image(groundLayer, 0, 0);

  const sway =
    radians(CONFIG.treeSwayDeg) * sin(frameCount * CONFIG.treeSwaySpeed) +
    radians(CONFIG.treeMicroSwayDeg) *
      map(noise(frameCount * 0.01), 0, 1, -1, 1);

  // 树冠轻微跟随树干晃动
  drawSwayedLayer(canopyLayer, sway * CONFIG.canopyFollow);

  // 飘落叶
  for (const leaf of fallingLeaves) {
    leaf.update();
    leaf.draw();
  }

  // 树干画在上层，保留枝干穿插感
  drawSwayedLayer(branchLayer, sway);

  // 地面碎裂圆点
  updateBursts();

  // 小猫
  drawCat();

  if (CONFIG.debugMasks) {
    drawDebugMasks();
  }
}

/* --------------------------------------------------
   图片处理
-------------------------------------------------- */

function resizeAllImagesToCanvas() {
  const imgs = [branchMaskImg, leafMaskImg, underMaskImg, catImg];
  for (const img of imgs) {
    if (img.width !== width || img.height !== height) {
      img.resize(width, height);
    }
  }
}

function buildMaskData(img, name) {
  img.loadPixels();

  const sampleGap = CONFIG.maskSampleGap;
  const points = [];

  const bbox = {
    minX: width,
    minY: height,
    maxX: 0,
    maxY: 0,
  };

  for (let y = 0; y < img.height; y += sampleGap) {
    for (let x = 0; x < img.width; x += sampleGap) {
      const idx = 4 * (y * img.width + x);

      const alphaValue = img.pixels[idx + 3];

      // 这里按 alpha 判断
      // 因为你的 mask 是透明底 + 白色区域
      if (alphaValue > 10) {
        points.push({ x, y });

        bbox.minX = min(bbox.minX, x);
        bbox.minY = min(bbox.minY, y);
        bbox.maxX = max(bbox.maxX, x);
        bbox.maxY = max(bbox.maxY, y);
      }
    }
  }

  if (points.length === 0) {
    console.warn(name + " mask 没采样到有效区域");
    points.push({ x: width / 2, y: height / 2 });
    bbox.minX = 0;
    bbox.minY = 0;
    bbox.maxX = width;
    bbox.maxY = height;
  }

  return {
    points,
    bbox,
    sampleGap,
  };
}

function pickPoint(data) {
  if (!data || !data.points || data.points.length === 0) {
    return { x: random(width), y: random(height) };
  }

  const p = random(data.points);
  const gap = data.sampleGap || 4;

  return {
    x: constrain(p.x + random(-gap, gap), 0, width),
    y: constrain(p.y + random(-gap, gap), 0, height),
  };
}

function getTreePivot(data) {
  const b = data.bbox;
  return {
    x: (b.minX + b.maxX) * 0.5,
    y: b.maxY - 6,
  };
}

/* --------------------------------------------------
   预渲染图层
-------------------------------------------------- */

function makeBackgroundLayer() {
  const g = createGraphics(width, height);
  g.pixelDensity(1);

  const topC = color(...COLORS.bgTop);
  const midC = color(...COLORS.bgMid);
  const bottomC = color(...COLORS.bgBottom);

  for (let y = 0; y < height; y++) {
    const t = y / height;
    let c;

    if (t < 0.52) {
      c = lerpColor(topC, midC, t / 0.52);
    } else {
      c = lerpColor(midC, bottomC, (t - 0.52) / 0.48);
    }

    g.stroke(c);
    g.line(0, y, width, y);
  }

  // 远处柔雾 / 地平线气氛
  g.noFill();
  for (let i = 0; i < 90; i++) {
    const y = random(height * 0.38, height * 0.68);
    const x = random(-width * 0.1, width * 0.95);
    const len = random(width * 0.18, width * 0.75);

    g.stroke(255, 244, 200, random(8, 25));
    g.strokeWeight(random(0.5, 2.0));
    g.line(x, y, x + len, y + random(-1, 1));
  }

  // 轻微颗粒
  g.noStroke();
  for (let i = 0; i < 1000; i++) {
    g.fill(255, 250, 190, random(2, 10));
    g.circle(random(width), random(height), random(0.4, 1.5));
  }

  return g;
}

function makeCanopyLayer() {
  const g = createGraphics(width, height);
  g.pixelDensity(1);
  g.clear();

  for (let i = 0; i < CONFIG.canopyLeafCount; i++) {
    const p = pickPoint(leafData);
    const col = random(COLORS.leaves);

    let size = random(4.0, 9.0);

    const yRatio = map(
      p.y,
      leafData.bbox.minY,
      leafData.bbox.maxY,
      0,
      1,
      true
    );

    // 下方叶子略大一点，增加层次
    size *= lerp(0.82, 1.25, yRatio);

    drawGinkgoLeaf(g, p.x, p.y, size, random(TWO_PI), col, random(175, 245));

    // 少量高光叶
    if (random() < 0.16) {
      drawGinkgoLeaf(
        g,
        p.x + random(-2, 2),
        p.y + random(-2, 2),
        size * random(0.55, 0.85),
        random(TWO_PI),
        [255, 252, 140],
        random(70, 140)
      );
    }
  }

  const img = g.get();
  img.mask(leafMaskImg);
  return img;
}

function makeGroundLayer() {
  const g = createGraphics(width, height);
  g.pixelDensity(1);
  g.clear();

  // 地面主要落叶
  for (let i = 0; i < CONFIG.groundLeafCount; i++) {
    const p = pickPoint(underData);
    const col = random(COLORS.leaves);

    drawGinkgoLeaf(
      g,
      p.x,
      p.y,
      random(3.0, 9.5),
      random(TWO_PI),
      col,
      random(135, 225)
    );
  }

  // 深色叶片 / 压暗层次
  for (let i = 0; i < 600; i++) {
    const p = pickPoint(underData);
    const col = random(COLORS.leafDark);

    drawGinkgoLeaf(
      g,
      p.x,
      p.y,
      random(2.5, 8),
      random(TWO_PI),
      col,
      random(45, 110)
    );
  }

  // 少量草纹理
  g.noFill();
  for (let i = 0; i < 360; i++) {
    const p = pickPoint(underData);
    const col = random(COLORS.grass);

    g.stroke(col[0], col[1], col[2], random(35, 85));
    g.strokeWeight(random(0.4, 1.0));
    g.arc(
      p.x,
      p.y,
      random(8, 22),
      random(3, 8),
      random(PI),
      random(PI, TWO_PI)
    );
  }

  const img = g.get();
  img.mask(underMaskImg);
  return img;
}

function makeBranchLayer() {
  const g = createGraphics(width, height);
  g.pixelDensity(1);
  g.clear();

  g.noStroke();

  // 树干颗粒底色
  for (let i = 0; i < CONFIG.barkDotCount; i++) {
    const p = pickPoint(branchData);
    const col = random(COLORS.bark);
    const s = random(1.0, 4.8);

    g.fill(
      col[0] + random(-10, 10),
      col[1] + random(-10, 10),
      col[2] + random(-8, 8),
      random(75, 180)
    );

    g.ellipse(p.x, p.y, s * random(0.7, 1.6), s);
  }

  // 树皮线条
  for (let i = 0; i < CONFIG.barkLineCount; i++) {
    const p = pickPoint(branchData);
    const col = random(COLORS.bark);
    const len = random(4, 24);
    const lean = random(-3.5, 3.5);

    g.stroke(col[0], col[1], col[2], random(80, 185));
    g.strokeWeight(random(0.35, 1.6));
    g.line(p.x, p.y - len * 0.5, p.x + lean, p.y + len * 0.5);
  }

  // 少量亮边高光
  for (let i = 0; i < 500; i++) {
    const p = pickPoint(branchData);

    g.stroke(223, 185, 74, random(40, 85));
    g.strokeWeight(random(0.25, 0.8));
    g.line(p.x, p.y, p.x + random(-1, 2), p.y + random(3, 14));
  }

  const img = g.get();
  img.mask(branchMaskImg);
  return img;
}

/* --------------------------------------------------
   动画层
-------------------------------------------------- */

function drawSwayedLayer(img, angle) {
  push();
  translate(treePivot.x, treePivot.y);
  rotate(angle);
  image(img, -treePivot.x, -treePivot.y, width, height);
  pop();
}

class FallingLeaf {
  constructor(initial) {
    this.reset(initial);
  }

  reset(initial) {
    const p = pickPoint(leafData);

    this.x = p.x + random(-15, 15);
    this.y = initial
      ? p.y + random(-80, 120)
      : random(leafData.bbox.minY, leafData.bbox.maxY * 0.72);

    this.size = random(CONFIG.fallingSizeMin, CONFIG.fallingSizeMax);
    this.vy = random(CONFIG.fallingSpeedMin, CONFIG.fallingSpeedMax);
    this.rot = random(TWO_PI);
    this.spin = random(-0.018, 0.018);
    this.phase = random(TWO_PI);
    this.noiseSeed = random(1000);
    this.flutterSpeed = random(0.015, 0.045);
    this.depth = random(0.7, 1.25);
    this.col = random(COLORS.leaves);
  }

  update() {
    const n = noise(this.noiseSeed, frameCount * 0.006);
    const noiseWind = map(
      n,
      0,
      1,
      -CONFIG.fallingNoiseWind,
      CONFIG.fallingNoiseWind
    );

    const waveWind =
      sin(frameCount * 0.018 + this.phase) * CONFIG.fallingWind;

    const flutter =
      sin(frameCount * this.flutterSpeed + this.phase) * CONFIG.fallingFlutter;

    this.x += (noiseWind + waveWind + flutter) * this.depth;
    this.y += this.vy * this.depth;
    this.rot += this.spin + waveWind * 0.005;

    if (this.y > height + 30 || this.x < -50 || this.x > width + 50) {
      this.reset(false);
    }
  }

  draw() {
    drawGinkgoLeaf(
      null,
      this.x,
      this.y,
      this.size,
      this.rot,
      this.col,
      CONFIG.fallingAlpha
    );
  }
}

function updateBursts() {
  if (
    frameCount % CONFIG.burstEveryFrames === 0 &&
    random() < CONFIG.burstProbability &&
    bursts.length < CONFIG.maxBursts
  ) {
    bursts.push(new LeafBurst());
  }

  for (let i = bursts.length - 1; i >= 0; i--) {
    bursts[i].update();
    bursts[i].draw();

    if (bursts[i].dead) {
      bursts.splice(i, 1);
    }
  }
}

class LeafBurst {
  constructor() {
    const p = pickPoint(underData);

    this.x = p.x;
    this.y = p.y;
    this.life = 0;
    this.maxLife = random(CONFIG.burstLifeMin, CONFIG.burstLifeMax);
    this.baseCol = random(COLORS.leaves);
    this.dead = false;
    this.dots = [];

    const count = floor(random(8, 18));

    for (let i = 0; i < count; i++) {
      const angle = random(TWO_PI);
      const speed = random(0.15, CONFIG.burstScatterSpeed);

      this.dots.push({
        x: random(-4, 4),
        y: random(-3, 3),
        vx: cos(angle) * speed + random(-0.18, 0.18),
        vy: sin(angle) * speed - random(0.08, 0.35),
        r: random(1.3, 4.2),
        phase: random(TWO_PI),
      });
    }
  }

  update() {
    this.life++;

    for (const d of this.dots) {
      d.vx *= 0.975;
      d.vy = d.vy * 0.975 + 0.018;
      d.x += d.vx;
      d.y += d.vy;
    }

    this.dead = this.life > this.maxLife;
  }

  draw() {
    const t = this.life / this.maxLife;
    const alphaValue = 220 * (1 - t);

    // 刚开始短暂保留叶子形状
    if (this.life < 12) {
      drawGinkgoLeaf(
        null,
        this.x,
        this.y,
        7.5,
        sin(this.life * 0.2) * 0.25,
        this.baseCol,
        map(this.life, 0, 12, 150, 0)
      );
    }

    noStroke();

    for (const d of this.dots) {
      const flicker = map(
        sin(frameCount * 0.12 + d.phase),
        -1,
        1,
        0.75,
        1.15
      );

      fill(
        this.baseCol[0],
        this.baseCol[1],
        this.baseCol[2],
        alphaValue * flicker
      );

      circle(this.x + d.x, this.y + d.y, d.r * (1 + t * 0.2));
    }
  }
}

function drawCat() {
  const breathe =
    CONFIG.catBreathePx * sin(frameCount * CONFIG.catBreatheSpeed);

  image(catImg, 0, breathe, width, height);
}

/* --------------------------------------------------
   银杏叶绘制
   用 Canvas Path，避免 beginShape / endShape 兼容问题
-------------------------------------------------- */

function drawGinkgoLeaf(pg, x, y, s, rot, col, alphaValue) {
  const ctx = pg ? pg.drawingContext : drawingContext;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);

  ctx.beginPath();
  ctx.moveTo(0, 0.22);
  ctx.bezierCurveTo(-0.58, 0.12, -0.86, -0.52, -0.28, -0.94);
  ctx.bezierCurveTo(-0.13, -0.8, -0.04, -0.74, 0, -0.83);
  ctx.bezierCurveTo(0.04, -0.74, 0.13, -0.8, 0.28, -0.94);
  ctx.bezierCurveTo(0.86, -0.52, 0.58, 0.12, 0, 0.22);
  ctx.closePath();

  ctx.fillStyle = rgbaString(col[0], col[1], col[2], alphaValue);
  ctx.fill();

  ctx.lineCap = "round";

  // 叶脉
  ctx.strokeStyle = rgbaString(
    max(0, col[0] - 50),
    max(0, col[1] - 55),
    max(0, col[2] - 25),
    alphaValue * 0.28
  );
  ctx.lineWidth = 0.045;

  for (let a = -0.55; a <= 0.55; a += 0.22) {
    ctx.beginPath();
    ctx.moveTo(0, 0.16);
    ctx.lineTo(Math.sin(a) * 0.48, -0.72 + Math.abs(a) * 0.12);
    ctx.stroke();
  }

  // 叶柄
  ctx.strokeStyle = rgbaString(
    max(0, col[0] - 70),
    max(0, col[1] - 75),
    max(0, col[2] - 40),
    alphaValue * 0.38
  );
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.moveTo(0, 0.16);
  ctx.lineTo(0, 0.48);
  ctx.stroke();

  ctx.restore();
}

function rgbaString(r, g, b, a) {
  return (
    "rgba(" +
    floor(r) +
    "," +
    floor(g) +
    "," +
    floor(b) +
    "," +
    constrain(a / 255, 0, 1) +
    ")"
  );
}

/* --------------------------------------------------
   调试
-------------------------------------------------- */

function drawDebugMasks() {
  push();
  tint(255, 70);
  image(leafMaskImg, 0, 0, width, height);
  image(branchMaskImg, 0, 0, width, height);
  image(underMaskImg, 0, 0, width, height);
  noTint();

  noStroke();
  fill(255, 0, 0);
  circle(treePivot.x, treePivot.y, 8);
  pop();
}

function keyPressed() {
  // 按 R 开始 / 停止录制
  if (key === "r" || key === "R") {
    if (!isRecording) {
      startCanvasRecording();
    } else {
      stopCanvasRecording();
    }
  }
}

function startCanvasRecording() {
  const canvas = document.querySelector("canvas");

  if (!canvas) {
    console.error("没有找到 canvas，无法录制。");
    return;
  }

  recordedChunks = [];

  const stream = canvas.captureStream(RECORD_CONFIG.fps);

  let options = {};

  if (MediaRecorder.isTypeSupported("video/webm; codecs=vp9")) {
    options.mimeType = "video/webm; codecs=vp9";
  } else if (MediaRecorder.isTypeSupported("video/webm")) {
    options.mimeType = "video/webm";
  }

  mediaRecorder = new MediaRecorder(stream, options);

  mediaRecorder.ondataavailable = function (event) {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = function () {
    saveRecordedVideo();
  };

  mediaRecorder.start();

  isRecording = true;
  console.log("开始录制");

  // 自动停止
  setTimeout(() => {
    if (isRecording) {
      stopCanvasRecording();
    }
  }, RECORD_CONFIG.autoStopSeconds * 1000);
}

function stopCanvasRecording() {
  if (!mediaRecorder || !isRecording) return;

  mediaRecorder.stop();
  isRecording = false;
  console.log("停止录制");
}

function saveRecordedVideo() {
  const blob = new Blob(recordedChunks, {
    type: "video/webm",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = RECORD_CONFIG.fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);

  console.log("视频已保存");
}