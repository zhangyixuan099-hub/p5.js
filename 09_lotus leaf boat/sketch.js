// 存储所有元素的数组与变量
let leaves = [];
let ripples = [];   // 存储雨滴/涟漪
let fireflies = []; // 存储萤火虫
let boat;
let state = 'GROWING'; // 'GROWING' (生长中), 'SAILING' (行驶中)
let boatImg; 
let globalMaxDelay = 0; // 记录最晚生长的荷叶延迟时间，用于控制小船出场时机

function preload() {
  boatImg = loadImage('boat.png'); 
}

// ==========================================
// 🎨 视觉与交互参数区 (随心调节)
// ==========================================
const PARAMS = {
  // --- 荷叶分布与大小 ---
  cellSize: 120,        
  overlapJitter: 35,    
  minRadius: 80,        
  maxRadius: 100,       
  
  animationSpeed: 0.08, 
  waveDelayFactor: 0.12,
  edgeNoiseAmount: 12,  
  veinCount: 28,        
  
  // --- 船与水面相关 ---
  boatSpeed: 3.5,       
  boatWidth: 300,       
  boatHeight: 220,      
  clearRadius: 100,     
  waterColor: '#1A3B5C',
  
  // --- 💧 雨滴与涟漪细节调节参数 (✨ NEW) ---
  globalRainRate: 0.25,     // 【全局下雨概率】越大雨越密
  boatRippleRate: 0.05,    // 【船边水花概率】
  rippleMinR: 80,          // 【涟漪最小半径】
  rippleMaxR: 150,          // 【涟漪最大半径】
  
  maxOpacity: 150,         // 【⭐雨滴/涟漪最大不透明度】(0~255) 200大约就是80%的透明度。调小雨滴越淡，调大越白。
  rippleStrokeWeight: 1.0, // 【⭐雨滴/涟漪描边宽度】调小线条更细更精致（如0.8），调大线条变粗。
  rippleLifespanMin: 100,  // 【⭐雨滴生命周期-最小值】(帧数) 调大可以让雨滴落下/消失的速度变慢。
  rippleLifespanMax: 180,  // 【⭐雨滴生命周期-最大值】(帧数) 调大可以让雨滴落下/消失的速度变慢。
  
  // --- ✨ 萤火虫氛围参数 ---
  fireflyRate: 0.4,      
  fireflyColor: '#E6FF00'
};
// ==========================================

function setup() {
  createCanvas(1080, 1440);
  imageMode(CENTER); 
  
  // 布置荷叶
  for (let x = -PARAMS.cellSize; x < width + PARAMS.cellSize; x += PARAMS.cellSize) {
    for (let y = -PARAMS.cellSize; y < height + PARAMS.cellSize; y += PARAMS.cellSize) {
      let finalX = x + random(-PARAMS.overlapJitter, PARAMS.overlapJitter);
      let finalY = y + random(-PARAMS.overlapJitter, PARAMS.overlapJitter);
      let d = dist(finalX, finalY, 0, height);
      let delay = d * PARAMS.waveDelayFactor; 
      
      if (delay > globalMaxDelay) {
        globalMaxDelay = delay;
      }
      
      leaves.push(new Leaf(finalX, finalY, delay));
    }
  }
  leaves.sort((a, b) => a.y - b.y);

  // 初始化小船
  let startX = width + 80;
  let startY = -80;
  let targetX = -100;
  let targetY = height + 100;
  boat = new Boat(startX, startY, targetX, targetY);
}

function draw() {
  // 【图层 1】最底层的湖水
  background(PARAMS.waterColor);

  // 全局随机下雨
  if (random() < PARAMS.globalRainRate) {
    ripples.push(new Ripple(random(width), random(height)));
  }

  // 【图层 2】渲染雨滴与涟漪
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].update();
    ripples[i].display();
    if (ripples[i].isDead) ripples.splice(i, 1);
  }

  // 无缝衔接出船逻辑
  if (state === 'GROWING' && frameCount > globalMaxDelay + 10) {
    state = 'SAILING';
  }

  // 【图层 3】渲染小船
  if (state === 'SAILING') {
    boat.update();
    boat.display();
  }

  // 【图层 4】渲染荷叶
  for (let leaf of leaves) {
    leaf.update(boat.x, boat.y, state === 'SAILING');
    leaf.display();
  }

  // 【图层 5】渲染萤火虫
  for (let i = fireflies.length - 1; i >= 0; i--) {
    fireflies[i].update();
    fireflies[i].display();
    if (fireflies[i].isDead) fireflies.splice(i, 1);
  }
}

// ==========================================
// 💧 雨滴涟漪类 (优化了速度、描边粗细与不透明度)
// ==========================================
class Ripple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.maxR = random(PARAMS.rippleMinR, PARAMS.rippleMaxR);
    // ✨ 使用全新的可调生命周期参数，数值越大，动画越慢
    this.lifespan = random(PARAMS.rippleLifespanMin, PARAMS.rippleLifespanMax); 
    this.age = 0;
    this.isDead = false;
  }

  update() {
    this.age++;
    if (this.age >= this.lifespan) {
      this.isDead = true;
    }
  }

  display() {
    let progress = this.age / this.lifespan; 
    let currentR, opac;

    if (progress < 0.5) {
      let p = progress / 0.5; 
      currentR = p * this.maxR;
      opac = p * PARAMS.maxOpacity; // ✨ 最高不透明度受 maxOpacity 控制
    } else {
      let p = (progress - 0.5) / 0.5; 
      currentR = (1 - p) * this.maxR;
      opac = (1 - p) * PARAMS.maxOpacity; // ✨ 缩小阶段平滑隐去
    }

    push();
    translate(this.x, this.y);
    noFill(); 
    strokeWeight(PARAMS.rippleStrokeWeight); // ✨ 使用参数控制描边粗细
    stroke(255, 255, 255, opac);
    circle(0, 0, currentR);
    pop();
  }
}

// ==========================================
// ✨ 萤火虫类
// ==========================================
class Firefly {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = random(-1.5, 1.5);
    this.vy = random(-1.5, 1.5);
    this.lifespan = random(60, 150);
    this.age = 0;
    this.r = random(2, 5); 
    this.isDead = false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.age++;
    if (this.age >= this.lifespan) {
      this.isDead = true;
    }
  }

  display() {
    let progress = this.age / this.lifespan;
    let curve = sin(progress * PI); 
    let opac = curve * 255; 

    push();
    translate(this.x, this.y);
    noStroke();
    let c = color(PARAMS.fireflyColor);
    c.setAlpha(opac * 0.3);
    fill(c);
    circle(0, 0, this.r * 4);
    c.setAlpha(opac);
    fill(c);
    circle(0, 0, this.r);
    pop();
  }
}

// ==========================================
// 🍃 荷叶类 
// ==========================================
class Leaf {
  constructor(x, y, delay) {
    this.x = x;
    this.y = y;
    this.targetR = random(PARAMS.minRadius, PARAMS.maxRadius); 
    this.r = 0.0; 
    this.startDelay = delay; 
    this.isFullyGrown = false;
    this.noiseSeedValue = random(1000); 
    let g = random(120, 180);
    this.col = color(random(30, 60), g, random(40, 80));
    this.veinCol = color(random(20, 40), g - 40, random(20, 40), 180); 
  }

  update(bx, by, isSailing) {
    let desiredR = this.targetR; 
    if (frameCount < this.startDelay && !isSailing) {
      desiredR = 0;
    } else if (isSailing) {
      let d = dist(this.x, this.y, bx, by);
      if (d < PARAMS.clearRadius + this.targetR) {
        desiredR = 0; 
      }
    }
    this.r = lerp(this.r, desiredR, PARAMS.animationSpeed);
    if (this.r >= this.targetR * 0.95 && frameCount >= this.startDelay) {
      this.isFullyGrown = true;
    }
  }

  display() {
    if (this.r <= 1) return; 
    push();
    translate(this.x, this.y);
    fill(this.col);
    stroke(this.veinCol);
    strokeWeight(1.5);
    beginShape();
    let veinStep = TWO_PI / PARAMS.veinCount;
    for (let a = 0; a < TWO_PI; a += 0.1) {
      let xoff = map(cos(a), -1, 1, 0, 1);
      let yoff = map(sin(a), -1, 1, 0, 1);
      let offset = map(noise(xoff + this.noiseSeedValue, yoff + this.noiseSeedValue), 0, 1, -PARAMS.edgeNoiseAmount, PARAMS.edgeNoiseAmount);
      let currentOffset = offset * (this.r / this.targetR); 
      let radius = max(this.r + currentOffset, 0.1); 
      vertex(radius * cos(a), radius * sin(a));
    }
    endShape(CLOSE);

    stroke(this.veinCol);
    for (let a = 0; a < TWO_PI; a += veinStep) {
      let xoff = map(cos(a), -1, 1, 0, 1);
      let yoff = map(sin(a), -1, 1, 0, 1);
      let offset = map(noise(xoff + this.noiseSeedValue, yoff + this.noiseSeedValue), 0, 1, -PARAMS.edgeNoiseAmount, PARAMS.edgeNoiseAmount);
      let currentOffset = offset * (this.r / this.targetR);
      let radius = max(this.r + currentOffset, 0.1);
      line(0, 0, radius * cos(a), radius * sin(a));
    }
    fill(this.veinCol);
    noStroke();
    circle(0, 0, this.r * 0.12); 
    pop();
  }
}

// ==========================================
// 🛶 小船类
// ==========================================
class Boat {
  constructor(x1, y1, x2, y2) {
    this.x = x1;
    this.y = y1;
    this.angle = atan2(y2 - y1, x2 - x1);
  }

  update() {
    this.x += cos(this.angle) * PARAMS.boatSpeed;
    this.y += sin(this.angle) * PARAMS.boatSpeed;

    if (random() < PARAMS.boatRippleRate) {
      let rx = this.x + random(-PARAMS.boatWidth * 0.6, PARAMS.boatWidth * 0.6);
      let ry = this.y + random(-PARAMS.boatHeight * 0.6, PARAMS.boatHeight * 0.6);
      ripples.push(new Ripple(rx, ry));
    }

    if (random() < PARAMS.fireflyRate) {
      let fx = this.x + random(-PARAMS.boatWidth * 0.8, PARAMS.boatWidth * 0.8);
      let fy = this.y + random(-PARAMS.boatHeight * 0.8, PARAMS.boatHeight * 0.8);
      fireflies.push(new Firefly(fx, fy));
    }
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(this.angle + PI/2); 
    
    if (boatImg && boatImg.width > 0) {
      image(boatImg, 0, 0, PARAMS.boatWidth, PARAMS.boatHeight); 
    } else {
      fill(230);
      stroke(180);
      strokeWeight(2);
      ellipse(0, 0, PARAMS.boatWidth, PARAMS.boatHeight); 
      fill(255);
      noStroke();
      circle(0, -10, 14); 
    }
    pop();
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