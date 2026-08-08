// ==========================================
// 关键视觉参数
// ==========================================

// 1. 环境与位置参数
let windowX = 620;        // 【修改】窗户左上角 X 坐标 (整体向右大幅移动，增强张力)
let windowY = 280;        // 窗户左上角 Y 坐标 
let windowW = 320;        // 窗户宽度 
let windowH = 440;        // 窗户高度 
let floorY = 720;         // 墙面和地板的分界线

// 2. 树的生长与摇晃参数
let globalGrowthRate = 0.015; 
let windSpeed = 0.15;         
let treeBaseLength = 85;      

// 3. 树影透视参数 
let shadowScaleX = 1.6;       
let shadowScaleY = -1.25;     
let shadowShearAngle = 30;    // 【修改】树影的倾斜角度变大，更明显地向左侧倾斜

// 4. 地面窗影外框参数 (配合向左倾斜的树影，大幅向左调整)
let shadowBottomLeftX = 50; // 【修改】窗影左下角 X 坐标 (大幅向左延伸，确保包容完整的树影)
let shadowBottomRightX = 750; // 【修改】窗影右下角 X 坐标 (向左侧收)
let shadowBottomY = 1200;     


// 内部变量
let tree;
let windAngle = 0;
let bgTexture; 
let lightTexture; 

function setup() {
  createCanvas(1080, 1440);
  randomSeed(12345); 
  
  createWatercolorTexture(); 
  createLightTexture();      

  tree = new Branch(null, 0, 0, PI, treeBaseLength);
}

function draw() {
  // 1. 绘制背景环境
  image(bgTexture, 0, 0);

  // 更新风力与树的生长计算
  windAngle += windSpeed;
  tree.update();

  let treeOriginX = windowX + windowW / 2;
  let treeOriginY = floorY; 

  // ==========================================
  // 绘制 2: 地面上的光影与树影
  // ==========================================
  push();
  noStroke(); 

  // 将画笔限制在光斑梯形范围内
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.moveTo(windowX, floorY);
  drawingContext.lineTo(windowX + windowW, floorY);
  drawingContext.lineTo(shadowBottomRightX, shadowBottomY);
  drawingContext.lineTo(shadowBottomLeftX, shadowBottomY);
  drawingContext.closePath();
  drawingContext.clip();

  // 铺设光斑底色
  fill(160, 190, 230, 90);      
  rect(0, 0, width, height); 
  
  // 叠加上亮色的水彩肌理 
  tint(255, 180); 
  image(lightTexture, 0, 0);
  noTint();

  // 透视矩阵变换 
  translate(treeOriginX, treeOriginY);
  scale(shadowScaleX, shadowScaleY);
  shearX(radians(shadowShearAngle));
  
  // 绘制倒影树和栏杆
  let shadowColor = color(40, 55, 90, 200); 
  tree.render(shadowColor);
  drawRailing(shadowColor, 7); 
  
  drawingContext.restore();
  pop();

  // ==========================================
  // 绘制 3: 墙上的窗户和窗外的树
  // ==========================================
  push();
  noStroke(); 

  // 将画笔限制在窗户框内
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.rect(windowX, windowY, windowW, windowH);
  drawingContext.clip();

  // 铺设窗户发光底色
  fill(195, 225, 245, 210); 
  rect(windowX, windowY, windowW, windowH);

  // 叠加上亮色的水彩肌理
  tint(255, 220); 
  image(lightTexture, 0, 0);
  noTint();

  // 回到窗户底部中心画树 
  translate(treeOriginX, treeOriginY);
  
  let treeColor = color(20, 30, 50); 
  tree.render(treeColor);
  drawRailing(treeColor, 8); 
  
  drawingContext.restore();
  pop();
}

// ==========================================
// 生成浅蓝色光影水彩肌理
// ==========================================
function createLightTexture() {
  lightTexture = createGraphics(1080, 1440);
  lightTexture.noStroke();
  
  for (let i = 0; i < 3000; i++) {
    let x = random(width);
    let y = random(height);
    let n = noise(x * 0.005, y * 0.005); 
    
    let r = 210 + n * 45;
    let g = 230 + n * 25;
    let b = 255;
    
    let size = random(30, 100); 
    lightTexture.fill(r, g, b, 12); 
    lightTexture.ellipse(x, y, size, size);
  }
}

// ==========================================
// 生成柔和水彩/雾气肌理背景 
// ==========================================
function createWatercolorTexture() {
  bgTexture = createGraphics(1080, 1440);
  bgTexture.noStroke();
  
  let wallBase = color(40, 60, 100);   
  let floorBase = color(30, 45, 85);   
  
  bgTexture.background(wallBase); 
  bgTexture.fill(floorBase); 
  bgTexture.rect(0, floorY, width, height - floorY);
  
  for (let i = 0; i < 4000; i++) {
    let x = random(width);
    let y = random(height);
    let n = noise(x * 0.003, y * 0.003); 
    
    let r = 25 + n * 30;
    let g = 40 + n * 35;
    let b = 80 + n * 40;
    
    if (y > floorY) {
      r -= 10; g -= 10; b -= 10;
    }
    
    let size = random(40, 180); 
    bgTexture.fill(r, g, b, 7); 
    bgTexture.ellipse(x, y, size, size);
  }
  
  for (let i = 0; i < 300; i++) {
    let x = random(width);
    let y = random(height);
    bgTexture.fill(90, 120, 180, 6); 
    bgTexture.ellipse(x, y, random(200, 500));
  }
}

// ==========================================
// 绘制阳台栏杆
// ==========================================
function drawRailing(col, weight) {
  stroke(col);
  strokeWeight(weight);
  let halfW = windowW / 2;
  let railH = -100; 
  
  line(-halfW, 0, halfW, 0);       
  line(-halfW, railH, halfW, railH); 
  
  for (let i = -halfW + 30; i < halfW; i += 45) {
    line(i, 0, i, railH);
  }
}

// ==========================================
// 树枝类 
// ==========================================
class Branch {
  constructor(parent, x, y, angleOffset, len) {
    this.parent = parent;
    this.x = x;
    this.y = y;
    this.angleOffset = angleOffset;
    this.len = len;
    this.growth = 0;
    this.windForce = 0;
    this.blastForce = 0;
    this.branchA = null;
    this.branchB = null;
    this.branchC = null; 

    if (parent != null) {
      this.angle = parent.angle + angleOffset;
    } else {
      this.angle = angleOffset;
      this.angleOffset = -0.2 + random(0.4);
    }

    let xB = this.x + sin(this.angle) * this.len;
    let yB = this.y + cos(this.angle) * this.len;

    if (this.len > 8) {
      if (this.len + random(this.len * 10) > 20) {
        this.branchA = new Branch(this, xB, yB, -0.15 - random(0.3) + ((this.angle % TWO_PI) > PI ? -1/this.len : 1/this.len), this.len * (0.65 + random(0.2)));
      }
      if (this.len + random(this.len * 10) > 20) {
        this.branchB = new Branch(this, xB, yB, 0.15 + random(0.3) + ((this.angle % TWO_PI) > PI ? -1/this.len : 1/this.len), this.len * (0.65 + random(0.2)));
      }
      
      if (this.len > 25 && random() < 0.1) {
        this.branchC = new Branch(this, xB, yB, random(-0.4, 0.4), this.len * (0.5 + random(0.2)));
      }
      
      if (this.branchB != null && this.branchA == null) {
        this.branchA = this.branchB;
        this.branchB = null;
      }
    }
  }

  update() {
    if (this.parent != null) {
      this.x = this.parent.x + sin(this.parent.angle) * this.parent.len * this.parent.growth;
      this.y = this.parent.y + cos(this.parent.angle) * this.parent.len * this.parent.growth;
      
      this.windForce = this.parent.windForce * (1.0 + 5.0 / this.len) + this.blastForce;
      this.blastForce = (this.blastForce + sin(this.x / 2 + windAngle) * 0.005 / this.len) * 0.98;
      this.angle = this.parent.angle + this.angleOffset + this.windForce + this.blastForce;
      
      this.growth = min(this.growth + 0.1 * this.parent.growth * (globalGrowthRate * 10), 1);
    } else {
      this.growth = min(this.growth + globalGrowthRate, 1); 
    }

    if (this.branchA != null) this.branchA.update();
    if (this.branchB != null) this.branchB.update();
    if (this.branchC != null) this.branchC.update(); 
  }

  render(col) {
    if (this.branchA != null && this.growth > 0) {
      let xB = this.x;
      let yB = this.y;
      
      if (this.parent != null) {
        xB += (this.x - this.parent.x) * 0.4;
        yB += (this.y - this.parent.y) * 0.4;
      } else {
        xB += sin(this.angle + this.angleOffset) * this.len * 0.3 * this.growth;
        yB += cos(this.angle + this.angleOffset) * this.len * 0.3 * this.growth;
      }

      stroke(col);
      strokeWeight(max(this.len / 5, 1)); 
      noFill();
      
      beginShape();
      vertex(this.x, this.y);
      bezierVertex(xB, yB, xB, yB, this.branchA.x, this.branchA.y);
      endShape();

      this.branchA.render(col);
      if (this.branchB != null) this.branchB.render(col);
      if (this.branchC != null) this.branchC.render(col);
    }
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