/*
 * ==============================================================================
 * 项目: 浪漫的千万花跌落湖面 (渐进式飘落 + 触底循环纯净版)
 * 特色: 开场无花 -> 逐朵从顶部下落 -> 逐渐铺满 -> 完整落到底部循环
 * ==============================================================================
 */

// ==============================================================================
// [第 1 部分: 视觉与排版参数]
// ==============================================================================

// -- 场景与排版参数 --
let canvasW = 720;
let canvasH = 960;             
let groundLevelPercent = 0.68; 

// -- 阶梯跌落(物理与分布)参数 --
let stepDensityX = 2;        
let stepDensityY = 40.0;       
let stepFriction = 1.5;        
let freeFallGravity = 0.2;     
let maxFallSpeed = 6;          

// -- 粒子(下落五瓣花)参数 --
let maxParticles = 300;        // 画面中累积的最大花朵总数
let petalBaseSize = 18;        // 初始最大尺寸
let petalShrinkRate = 0.999;   // 缓慢缩小速度

// -- 水面反光(闪烁四芒星)参数 --
let maxReflections = 50;       

// -- 视觉特效参数 --
let trailAlpha = 35;           
let bloomGlow = 1;             

// ==============================================================================
// [第 2 部分: 核心变量与初始化]
// ==============================================================================

let particles = [];
let reflections = [];          
let bgImg;                     
let horizonY;

function preload() {
  bgImg = loadImage('bg.png'); 
}

function setup() {
  createCanvas(canvasW, canvasH);
  colorMode(HSB, 360, 100, 100, 100); 
  horizonY = height * groundLevelPercent;
  
  image(bgImg, 0, 0, width, height);

  // 【关键修改 1】：particles 数组在此处留空！
  // 刚开场时没有花朵，只有纯净的背景

  // 初始化水面闪烁反光点
  for (let i = 0; i < maxReflections; i++) {
    reflections.push({
      x: random(width),
      y: random(horizonY, height),      
      maxSize: random(3, 10),           
      phase: random(TWO_PI),            
      pulseSpeed: random(0.02, 0.06)    
    });
  }
}

function getRandomColor() {
  let r = random();
  if (r < 0.6) {
    return { h: 0, s: 0, b: 100 };      // 60% 概率纯白
  } else {
    return { h: 50, s: 60, b: 100 };    // 40% 概率浅黄
  }
}

function draw() {
  // [第 3 部分: 绘制半透明背景图]
  push();
  colorMode(RGB, 255); 
  tint(255, map(trailAlpha, 0, 100, 0, 255));
  image(bgImg, 0, 0, width, height);
  pop();

  filter(BLUR, bloomGlow);

  // [第 4 部分: 绘制水面闪烁反光点]
  for (let i = 0; i < reflections.length; i++) {
    let r = reflections[i];
    let pulse = sin(frameCount * r.pulseSpeed + r.phase); 
    let currentAlpha = map(pulse, -1, 1, 0, 80);          
    let currentSize = map(pulse, -1, 1, r.maxSize * 0.1, r.maxSize); 
    
    if (currentAlpha > 5) {
      drawStar(r.x, r.y, currentSize, 0, {h: 0, s: 0, b: 100}, currentAlpha);
    }
  }

  // [第 5 部分: 渐进式生成新花朵]
  // ==============================================================================
  // 【关键修改 2】：如果当前花朵数量还没达到上限，每隔 2 帧从顶部生成 1 朵新花
  if (particles.length < maxParticles && frameCount % 2 === 0) {
    particles.push({
      x: random(width),
      y: random(-40, -10),             // 严格在顶部上方生成
      g: 0,
      s: random(8, petalBaseSize),
      a: random(80, 100),
      rot: random(TWO_PI),
      rotSpeed: random(-0.06, 0.06),
      colorInfo: getRandomColor()
    });
  }

  // [第 6 部分: 更新与绘制所有花朵]
  // ==============================================================================
  for (let idx = 0; idx < particles.length; idx++) {
    let p = particles[idx];

    let noiseVal = noise(p.x / width * stepDensityX, p.y / stepDensityY, frameCount / 300);

    // 阶梯跌落物理
    if (noiseVal > 0.42) {
      p.g += freeFallGravity; 
      p.y += p.g;
    } else {
      p.g = 0; 
      p.y += 1.5; 
      if (noiseVal % 0.1 > 0.05) p.x += stepFriction;
      else p.x -= stepFriction;
    }
    
    p.g = min(p.g, maxFallSpeed); 
    p.s = p.s * petalShrinkRate; 
    p.rot += p.rotSpeed; 
    
    // 【关键修改 3】：生命周期只在完全超越屏幕最下方 (y > height + 20) 时触发
    // 只有到了最底部的花，才会被重置回顶部，保证花朵必定落到底！
    if (p.y > height + 20) {
      p.y = random(-40, -10);          
      p.x = random(width);             
      p.g = 0;                         
      p.s = random(8, petalBaseSize);  
      p.rot = random(TWO_PI);          
      p.colorInfo = getRandomColor();  
    }

    drawFlower(p.x, p.y, p.s, p.rot, p.colorInfo, p.a);
  }
}

// ==============================================================================
// [附加部分: 五瓣花绘制函数]
// ==============================================================================
function drawFlower(x, y, radius, rotation, col, alpha) {
  push();
  translate(x, y);
  rotate(rotation);
  
  noStroke();
  fill(col.h, col.s, col.b, alpha);
  
  for (let i = 0; i < 5; i++) {
    push();
    rotate((TWO_PI * i) / 5); 
    ellipse(0, radius * 0.4, radius * 0.55, radius * 0.9);
    pop();
  }
  
  if (col.h === 0) {
    fill(50, 40, 100, alpha); 
  } else {
    fill(0, 0, 100, alpha);
  }
  ellipse(0, 0, radius * 0.4, radius * 0.4);
  
  pop();
}

// ==============================================================================
// [附加部分: 四芒星绘制函数 (水面反光专用)]
// ==============================================================================
function drawStar(x, y, radius, rotation, col, alpha) {
  push();
  translate(x, y);       
  rotate(rotation);      
  
  noStroke();
  fill(col.h, col.s, col.b, alpha); 
  
  let innerRadius = radius / 4.5; 
  beginShape();
  vertex(0, -radius);
  vertex(innerRadius, -innerRadius);
  vertex(radius, 0);
  vertex(innerRadius, innerRadius);
  vertex(0, radius);
  vertex(-innerRadius, innerRadius);
  vertex(-radius, 0);
  vertex(-innerRadius, -innerRadius);
  endShape(CLOSE);
  
  fill(0, 0, 100, alpha); 
  ellipse(0, 0, radius / 3, radius / 3);
  pop();
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