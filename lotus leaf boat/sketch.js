// 存储所有元素的数组与变量
let leaves = [];
let ripples = [];   
let fireflies = []; 
let boat;
let state = 'GROWING'; 
let boatImg; 
let globalMaxDelay = 0; 

// 🎥 录屏专属原生变量
let mediaRecorder;
let recordedChunks = [];
let recordingState = 'IDLE'; // 'IDLE' (未录制), 'RECORDING' (正在录制)

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
  boatSpeed: 5,       
  boatWidth: 300,       
  boatHeight: 220,      
  clearRadius: 100,     
  waterColor: '#1A3B5C',
  
  // --- 💧 雨滴与涟漪参数 ---
  globalRainRate: 0.50,     
  boatRippleRate: 0.05,    
  rippleMinR: 80,          
  rippleMaxR: 150,          
  maxOpacity: 150,         
  rippleStrokeWeight: 1.0, 
  rippleLifespanMin: 100,  
  rippleLifespanMax: 180,  
  
  // --- ✨ 萤火虫氛围参数 ---
  fireflyRate: 0.4,      
  fireflyColor: '#E6FF00'
};

function setup() {
  let cvs = createCanvas(1080, 1440);
  imageMode(CENTER); 
  
  // 🎥 【初始化录屏系统，等待按键唤醒】
  try {
    let stream = cvs.elt.captureStream(60); // 抓取 Canvas 的 60FPS 高清视频流
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = function(e) {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = function() {
      console.log("⏹️ 录制停止！正在打包生成视频...");
      let blob = new Blob(recordedChunks, { type: 'video/webm' });
      let url = URL.createObjectURL(blob);
      let a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = '荷叶小船_小红书精选录制.webm'; // 导出的文件名
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      console.log("✅ 视频下载成功！可以去剪辑发小红书啦！");
    };
  } catch (err) {
    console.error("录制系统初始化失败:", err);
  }

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
  
  console.log("💡 提示：在画面运行期间，随时按下键盘上的 'R' 键可以开始/停止录制视频。");
}

function draw() {
  background(PARAMS.waterColor);

  // 全局随机下雨
  if (random() < PARAMS.globalRainRate) {
    ripples.push(new Ripple(random(width), random(height)));
  }

  // 渲染雨滴与涟漪
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].update();
    ripples[i].display();
    if (ripples[i].isDead) ripples.splice(i, 1);
  }

  // 无缝衔接出船逻辑
  if (state === 'GROWING' && frameCount > globalMaxDelay + 10) {
    state = 'SAILING';
  }

  // 渲染小船
  if (state === 'SAILING') {
    boat.update();
    boat.display();
  }

  // 渲染荷叶
  for (let leaf of leaves) {
    leaf.update(boat.x, boat.y, state === 'SAILING');
    leaf.display();
  }

  // 渲染萤火虫
  for (let i = fireflies.length - 1; i >= 0; i--) {
    fireflies[i].update();
    fireflies[i].display();
    if (fireflies[i].isDead) fireflies.splice(i, 1);
  }
  
  // 🔴 录制状态视觉提示：如果在录制中，在屏幕左上角闪烁一个红点，方便你确认是否在录
  if (recordingState === 'RECORDING') {
    push();
    fill(255, 0, 0, sin(frameCount * 0.1) * 150 + 100);
    noStroke();
    circle(40, 40, 16);
    pop();
  }
}

// ==========================================
// ⌨️ 按键控制录制监听函数 (NEW)
// ==========================================
function keyPressed() {
  if (key === 'r' || key === 'R') {
    if (recordingState === 'IDLE') {
      // 切换状态，清空历史片段，开启录制
      recordingState = 'RECORDING';
      recordedChunks = []; 
      mediaRecorder.start();
      console.log("🔴 [REC] 开始录制... 画面左上角会出现红点提示。再次按下 'R' 停止。");
    } else if (recordingState === 'RECORDING') {
      // 切换状态，停止录制并自动下载
      recordingState = 'IDLE';
      mediaRecorder.stop();
    }
  }
}

// ==========================================
// 💧 雨滴涟漪类 
// ==========================================
class Ripple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.maxR = random(PARAMS.rippleMinR, PARAMS.rippleMaxR);
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
      opac = p * PARAMS.maxOpacity; 
    } else {
      let p = (progress - 0.5) / 0.5; 
      currentR = (1 - p) * this.maxR;
      opac = (1 - p) * PARAMS.maxOpacity; 
    }

    push();
    translate(this.x, this.y);
    noFill(); 
    strokeWeight(PARAMS.rippleStrokeWeight); 
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