p5.disableFriendlyErrors = true;

let bg;
let lianyiMask;
let girlMask;
let pathOverlay;

let drops = [];
let ripples = [];
let bounces = [];
let girlParticles = [];

let girlCenter = { x: 0, y: 0 };
let girlBounds = {
  minX: 0,
  minY: 0,
  maxX: 0,
  maxY: 0
};

let DEBUG_MASK = false;

// ------------------------------
// 可调参数
// ------------------------------

let RAIN_DENSITY = 1;
let RAIN_CHANCE = 0.5;

// 雨线左右均匀分区
let RAIN_LANES = 16;
let rainLaneIndex = 0;

let FREE_SPLASH_CHANCE = 0.42;
let FREE_SPLASH_COUNT_MIN = 2;
let FREE_SPLASH_COUNT_MAX = 6;

let GIRL_PARTICLE_SPACING = 4;
let MAX_GIRL_PARTICLES = 2800;

let REFLECTION_SCALE_Y = 0.58;
let REFLECTION_ALPHA = 0.22;

function preload() {
  bg = loadImage('bg.jpg');
  lianyiMask = loadImage('lianyi.png');
  girlMask = loadImage('girl.png');
  pathOverlay = loadImage('path.png');
}

function setup() {
  createCanvas(bg.width, bg.height);
  pixelDensity(1);
  frameRate(60);
  noFill();

  if (lianyiMask.width !== width || lianyiMask.height !== height) {
    lianyiMask.resize(width, height);
  }

  if (girlMask.width !== width || girlMask.height !== height) {
    girlMask.resize(width, height);
  }

  if (pathOverlay.width !== width || pathOverlay.height !== height) {
    pathOverlay.resize(width, height);
  }

  lianyiMask.loadPixels();
  girlMask.loadPixels();

  createGirlParticles();

  console.log("人物中心:", girlCenter);
  console.log("人物粒子数量:", girlParticles.length);
}

function draw() {
  image(bg, 0, 0, width, height);

  if (DEBUG_MASK) {
    tint(255, 90);
    image(lianyiMask, 0, 0, width, height);
    noTint();
  }

  // 均匀生成雨线
  for (let i = 0; i < RAIN_DENSITY; i++) {
    if (random() < RAIN_CHANCE) {
      addDrop();
    }
  }

  // 下方 1/3 独立生成溅起雨点
  addFreeBottomSplashes();

  // 先画涟漪
  for (let i = ripples.length - 1; i >= 0; i--) {
    let r = ripples[i];
    r.update();
    r.display();

    if (r.isDone()) {
      ripples.splice(i, 1);
    }
  }

  // path.png 盖住涟漪，但不盖住后面的雨线、人物、溅起雨点
  image(pathOverlay, 0, 0, width, height);

  // 更新人物粒子
  triggerRandomGirlBursts();

  for (let p of girlParticles) {
    p.update();
  }

  // 人物倒影
  drawGirlReflection();

  // 雨线
  for (let i = drops.length - 1; i >= 0; i--) {
    let d = drops[i];
    d.update();
    d.display();

    if (d.isDone()) {
if (d.canRipple && random() < 0.38) {
  createRipple(d.x, d.stopY, d.col);
}

      if (d.stopY > height * 2 / 3) {
        let count = floor(random(4, 10));
        for (let j = 0; j < count; j++) {
          createBounce(d.x, d.stopY, d.col);
        }
      }

      drops.splice(i, 1);
    }
  }

  // 溅起的小雨点
  for (let i = bounces.length - 1; i >= 0; i--) {
    let b = bounces[i];
    b.update();
    b.display();

    if (b.isDone()) {
      bounces.splice(i, 1);
    }
  }

  // 人物本体
  for (let p of girlParticles) {
    p.display();
  }
}

function keyPressed() {
  if (key === 'd' || key === 'D') {
    DEBUG_MASK = !DEBUG_MASK;
  }
}

// ======================================================
// 通用工具
// ======================================================

function isMaskArea(img, x, y) {
  x = constrain(floor(x), 0, img.width - 1);
  y = constrain(floor(y), 0, img.height - 1);

  let index = (x + y * img.width) * 4;

  let r = img.pixels[index];
  let g = img.pixels[index + 1];
  let b = img.pixels[index + 2];
  let a = img.pixels[index + 3];

  let brightnessValue = (r + g + b) / 3;

  return a > 10 && brightnessValue > 70;
}

function getEffectColor() {
  return random() < 0.72 ? color(255, 255, 255) : color(220, 255, 0);
}

function applyStroke(col, alphaValue) {
  stroke(red(col), green(col), blue(col), constrain(alphaValue, 0, 255));
}

function applyFill(col, alphaValue) {
  fill(red(col), green(col), blue(col), constrain(alphaValue, 0, 255));
}

// ======================================================
// 雨线左右均匀生成
// ======================================================

function getBalancedRainX() {
  let laneW = width / RAIN_LANES;
  let lane = rainLaneIndex;

  rainLaneIndex++;
  if (rainLaneIndex >= RAIN_LANES) {
    rainLaneIndex = 0;
  }

  // 偶尔打乱一点，避免机械排队
  if (random() < 0.18) {
    lane = floor(random(RAIN_LANES));
  }

  let x1 = lane * laneW;
  let x2 = (lane + 1) * laneW;

  return random(x1, x2);
}

function getLandingPointForX(x) {
  // 优先在当前 x 附近寻找 lianyi.png 的有效区域
  for (let i = 0; i < 80; i++) {
    let searchX = x + random(-width * 0.035, width * 0.035);
    let searchY = random(height);

    searchX = constrain(searchX, 0, width - 1);

    if (isMaskArea(lianyiMask, searchX, searchY)) {
      return {
        x: x,
        y: searchY,
        canRipple: true
      };
    }
  }

  // 如果这个 x 附近没有涟漪区域，雨仍然均匀下落，只是不触发涟漪
  return {
    x: x,
    y: random(height * 2 / 3, height * 0.98),
    canRipple: false
  };
}

// ======================================================
// 雨线
// ======================================================

function addDrop() {
  let x = getBalancedRainX();
  let pt = getLandingPointForX(x);

  let col = getEffectColor();
  let startY = random(-height * 0.65, -30);

  drops.push(new Drop(pt.x, startY, pt.y, col, pt.canRipple));
}

class Drop {
  constructor(x, y, stopY, col, canRipple) {
    this.x = x;
    this.y = y;
    this.stopY = stopY;
    this.col = col;
    this.canRipple = canRipple;

    this.speed = random(10, 20);
    this.len = random(150, 360);
    this.alpha = random(120, 235);

    this.segmentCount = random() < 0.82 ? 1 : 2;
    this.slant = random(-1.4, 1.4);
  }

  update() {
    this.y += this.speed;
  }

  display() {
    applyStroke(this.col, this.alpha);
    strokeWeight(random(0.75, 1.5));

    for (let i = 0; i < this.segmentCount; i++) {
      let sy = this.y + i * this.len / this.segmentCount;
      let ey = sy + random(this.len * 0.42, this.len * 0.9);

      line(
        this.x,
        sy,
        this.x + this.slant,
        min(ey, this.y + this.len)
      );
    }
  }

  isDone() {
    return this.y + this.len >= this.stopY;
  }
}

// ======================================================
// 涟漪
// ======================================================

function createRipple(x, y, col) {
  ripples.push(new Ripple(x, y, col));
}

class Ripple {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    this.col = col;

    this.r = 0;
    this.maxR = random(45, 130);
    this.opacity = 210;

    this.ringCount = floor(random(4, 9));
    this.ringGap = random(6, 13);
    this.speed = random(0.8, 1.6);
    this.yScale = random(0.38, 0.58);
  }

  update() {
    this.r += this.speed;
    this.opacity -= 1.2;
  }

  display() {
    noFill();

    for (let i = 0; i < this.ringCount; i++) {
      let rr = this.r - i * this.ringGap;

      if (rr > 0 && rr < this.maxR) {
        let a = map(rr, 0, this.maxR, this.opacity, 0);
        let sw = map(rr, 0, this.maxR, 2.2, 0.2);

        strokeWeight(max(0.15, sw));

        if (random() < 0.96) {
          applyStroke(this.col, a);
        } else {
          stroke(220, 255, 0, a);
        }

        push();
        translate(this.x, this.y);

        beginShape();

        for (let angle = 0; angle < TWO_PI; angle += 0.18) {
          let n = noise(
            cos(angle) * 0.8 + this.r * 0.02,
            sin(angle) * 0.8 + i * 0.3
          );

          let offset = map(n, 0, 1, -2.8, 2.8);
          let rx = rr + offset;
          let ry = (rr + offset) * this.yScale;

          vertex(rx * cos(angle), ry * sin(angle)*0.5);
        }

        endShape(CLOSE);
        pop();
      }
    }
  }

  isDone() {
    return this.opacity <= 0 || this.r > this.maxR + this.ringCount * this.ringGap;
  }
}

// ======================================================
// 溅起雨点
// ======================================================

function addFreeBottomSplashes() {
  if (random() > FREE_SPLASH_CHANCE) return;

  let splashX = random(width);
  let splashY = random(height * 2 / 3, height * 0.98);
  let col = getEffectColor();

  let count = floor(random(FREE_SPLASH_COUNT_MIN, FREE_SPLASH_COUNT_MAX));

  for (let i = 0; i < count; i++) {
    createBounce(splashX, splashY, col);
  }
}

function createBounce(x, y, col) {
  bounces.push(new Bounce(x, y, col));
}

class Bounce {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    this.startY = y;
    this.col = col;

    this.xVel = random(-2.3, 2.3);
    this.yVel = random(-4.6, -1.2);
    this.gravity = random(0.06, 0.13);

    this.size = random(1.4, 4.6);
    this.opacity = random(170, 235);
  }

  update() {
    this.x += this.xVel;
    this.y += this.yVel;

    this.yVel += this.gravity;
    this.xVel *= 0.97;

    this.opacity -= 5;
  }

  display() {
    noStroke();
    applyFill(this.col, this.opacity);
    circle(this.x, this.y, this.size);
  }

  isDone() {
    return this.opacity <= 0 || this.y > this.startY + 48;
  }
}

// ======================================================
// 人物粒子生成
// ======================================================

function createGirlParticles() {
  girlParticles = [];

  let pts = [];

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += GIRL_PARTICLE_SPACING) {
    for (let x = 0; x < width; x += GIRL_PARTICLE_SPACING) {
      if (isMaskArea(girlMask, x, y)) {
        if (random() < 0.86) {
          pts.push({ x, y });

          minX = min(minX, x);
          minY = min(minY, y);
          maxX = max(maxX, x);
          maxY = max(maxY, y);
        }
      }
    }
  }

  if (pts.length === 0) {
    girlCenter.x = width * 0.5;
    girlCenter.y = height * 0.5;

    girlBounds.minX = girlCenter.x;
    girlBounds.maxX = girlCenter.x;
    girlBounds.minY = girlCenter.y;
    girlBounds.maxY = girlCenter.y;

    return;
  }

  if (pts.length > MAX_GIRL_PARTICLES) {
    pts.sort(function () {
      return random(-1, 1);
    });
    pts = pts.slice(0, MAX_GIRL_PARTICLES);
  }

  let sumX = 0;
  let sumY = 0;

  for (let p of pts) {
    sumX += p.x;
    sumY += p.y;
  }

  girlCenter.x = sumX / pts.length;
  girlCenter.y = sumY / pts.length;

  girlBounds.minX = minX;
  girlBounds.minY = minY;
  girlBounds.maxX = maxX;
  girlBounds.maxY = maxY;

  let maxDistFromCenter = 1;

  for (let p of pts) {
    let d = dist(p.x, p.y, girlCenter.x, girlCenter.y);
    maxDistFromCenter = max(maxDistFromCenter, d);
  }

  for (let p of pts) {
    let edge = getEdgeAmount(p.x, p.y);
    girlParticles.push(
      new GirlParticle(
        p.x,
        p.y,
        edge,
        girlCenter,
        maxDistFromCenter
      )
    );
  }
}

function getEdgeAmount(x, y) {
  let d = 11;
  let outside = 0;
  let total = 0;

  let dirs = [
    [d, 0],
    [-d, 0],
    [0, d],
    [0, -d],
    [d, d],
    [-d, d],
    [d, -d],
    [-d, -d]
  ];

  for (let dir of dirs) {
    total++;

    let nx = x + dir[0];
    let ny = y + dir[1];

    if (
      nx < 0 ||
      nx >= width ||
      ny < 0 ||
      ny >= height ||
      !isMaskArea(girlMask, nx, ny)
    ) {
      outside++;
    }
  }

  return outside / total;
}

// ======================================================
// 人物随机四散
// ======================================================

function triggerRandomGirlBursts() {
  if (girlParticles.length === 0) return;

  // 减少触发频率，但每次飞得更远、更慢
  for (let i = 0; i < 2; i++) {
    if (random() < 0.16) {
      let p = pickBurstParticle();

      if (p) {
        p.triggerBurst();
      }
    }
  }
}

function pickBurstParticle() {
  // 优先选择外缘粒子
  for (let i = 0; i < 22; i++) {
    let p = random(girlParticles);

    if (p && (p.looseAmount > 0.45 || random() < 0.1)) {
      return p;
    }
  }

  return random(girlParticles);
}

// ======================================================
// 人物倒影
// ======================================================

function drawGirlReflection() {
  if (girlParticles.length === 0) return;

  let baseY = girlBounds.maxY + 5;

  for (let p of girlParticles) {
    p.displayReflection(baseY);
  }
}

// ======================================================
// 人物粒子类
// ======================================================

class GirlParticle {
  constructor(x, y, edge, center, maxDistFromCenter) {
    this.homeX = x;
    this.homeY = y;

    this.x = x;
    this.y = y;

    this.edge = edge;

    let dx = x - center.x;
    let dy = y - center.y;
    let mag = sqrt(dx * dx + dy * dy);

    if (mag < 0.0001) {
      let ang = random(TWO_PI);
      this.dirX = cos(ang);
      this.dirY = sin(ang);
    } else {
      this.dirX = dx / mag;
      this.dirY = dy / mag;
    }

    let centerWeight = 1 - constrain(
      dist(x, y, center.x, center.y) / maxDistFromCenter,
      0,
      1
    );

    this.coreAmount = constrain((1 - edge) * 0.72 + centerWeight * 0.28, 0, 1);
    this.looseAmount = 1 - this.coreAmount;

    // 中心大，边缘小
    this.size = lerp(
      random(0.65, 1.8),
      random(5.2, 7.2),
      this.coreAmount
    );

    // 中心更实，边缘更虚
    this.alphaBase = lerp(58, 245, this.coreAmount);

    // 运动速度整体放慢
    // 边缘仍然比中心快，但不会那么急
    this.motionSpeed = lerp(0.018, 0.0038, this.coreAmount);

    // 运动轨迹变大
    this.floatRange = lerp(11.5, 0.45, this.coreAmount);

    // 边缘向外弥散距离加大
    this.spreadRange = lerp(44.0, 0.4, this.coreAmount);

    // 抖动放慢后保留一点随机感
    this.jitterRange = lerp(1.4, 0.04, this.coreAmount);

    this.seedX = random(10000);
    this.seedY = random(10000);
    this.phase = random(TWO_PI);
    this.scatterPower = random(0.85, 1.45);

    this.burstActive = false;
    this.burstTime = 0;
    this.burstDuration = 1;
    this.burstDirX = 0;
    this.burstDirY = 0;
    this.burstDistance = 0;
  }

  update() {
    let t = frameCount * this.motionSpeed;

    let floatX = map(
      noise(this.seedX + t),
      0,
      1,
      -this.floatRange,
      this.floatRange
    );

    let floatY = map(
      noise(this.seedY + t),
      0,
      1,
      -this.floatRange,
      this.floatRange
    );

    // 边缘慢速、大范围向外呼吸
    let breathe = (sin(frameCount * this.motionSpeed * 4.2 + this.phase) + 1) * 0.5;
    let spread = pow(breathe, 1.15) * this.spreadRange * this.scatterPower;

    let spreadX = this.dirX * spread;
    let spreadY = this.dirY * spread;

    let jitterX = random(-this.jitterRange, this.jitterRange);
    let jitterY = random(-this.jitterRange, this.jitterRange);

    let burstX = 0;
    let burstY = 0;

    if (this.burstActive) {
      this.burstTime++;

      let progress = this.burstTime / this.burstDuration;
      progress = constrain(progress, 0, 1);

      // 慢慢飞出去，再慢慢回到原位
      let strength = sin(progress * PI);

      burstX = this.burstDirX * this.burstDistance * strength;
      burstY = this.burstDirY * this.burstDistance * strength;

      if (progress >= 1) {
        this.burstActive = false;
      }
    }

    this.x = this.homeX + floatX + spreadX + jitterX + burstX;
    this.y = this.homeY + floatY + spreadY + jitterY + burstY;
  }

  triggerBurst() {
    if (this.burstActive) return;

    this.burstActive = true;
    this.burstTime = 0;

    // 飞散时间更长，所以运动更慢
    this.burstDuration = floor(random(130, 260));

    let baseAngle = atan2(this.dirY, this.dirX);

    // 部分粒子随机向环境四周散，不完全沿人物轮廓方向
    if (random() < 0.38) {
      baseAngle = random(TWO_PI);
    } else {
      baseAngle += random(-1.1, 1.1);
    }

    this.burstDirX = cos(baseAngle);
    this.burstDirY = sin(baseAngle);

    // 飞散距离大幅增加，边缘粒子可以散到周围环境里
    this.burstDistance = random(48, 150) * lerp(0.35, 1.75, this.looseAmount);
  }

  display() {
    noStroke();

    let flicker = sin(frameCount * this.motionSpeed * 7 + this.phase) * 14;
    let a = constrain(this.alphaBase + flicker, 18, 255);

    fill(255, a);
    circle(this.x, this.y, this.size);
  }

  displayReflection(baseY) {
    let reflectedY = baseY + (baseY - this.y) * REFLECTION_SCALE_Y;

    if (reflectedY < baseY || reflectedY > height) return;

    let waveX =
      sin(frameCount * 0.028 + this.seedX) * 1.4 +
      map(noise(this.seedY + frameCount * 0.008), 0, 1, -1.8, 1.8);

    let reflectedX = this.x + waveX + this.dirX * 2.5;

    let fadeByDistance = map(reflectedY, baseY, height, 1.0, 0.12);
    fadeByDistance = constrain(fadeByDistance, 0.05, 1.0);

    let a = this.alphaBase * REFLECTION_ALPHA * fadeByDistance;

    noStroke();
    fill(255, a);

    circle(
      reflectedX,
      reflectedY,
      this.size * random(0.55, 0.9)
    );
  }
}
// --- 视频录制代码 ---
let recording = false;
let recorder;
let chunks = [];

function setupRecorder() {
  // 获取 p5.js 生成的 canvas 元素，设置帧率为 30 fps
  let stream = document.querySelector('canvas').captureStream(30); 
  recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  
  recorder.ondataavailable = e => {
    if (e.data.size) {
      chunks.push(e.data);
    }
  };
  
  recorder.onstop = exportVideo;
}

function exportVideo() {
  let blob = new Blob(chunks, { type: 'video/webm' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  document.body.appendChild(a);
  a.style = 'display: none';
  a.href = url;
  a.download = 'my_rain_animation.webm'; // 导出的文件名
  a.click();
  window.URL.revokeObjectURL(url);
}

// 监听键盘按键
function keyPressed() {
  if (key === 'r' || key === 'R') {
    if (!recording) {
      if (!recorder) setupRecorder();
      chunks.length = 0;
      recorder.start();
      recording = true;
      console.log('⏺ 录制开始...');
    } else {
      recorder.stop();
      recording = false;
      console.log('⏹ 录制结束，正在下载视频！');
    }
  }
}