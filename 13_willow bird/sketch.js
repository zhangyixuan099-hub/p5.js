// ==========================================
// 核心视觉参数 (Core Visual Parameters)
// ==========================================
const PARAMS = {
  // 1. 生成与布局
  density: 11,              // 采样密度：树枝上每隔多少像素垂下一根丝线
  minSegs: 60,              // 丝线最短节数
  maxSegs: 120,              // 丝线最长节数
  segLength: 5,             // 每一节的物理长度
  
  // 2. 动画时间轴 (以帧数为单位，60帧约1秒)
  growthSpeed: 0.8,         // 丝线下落速度
  leafGrowthSpeed: 0.03,    // 叶片长大速度
  birdTriggerFrame: 360,    // 鸟儿起飞的帧数
  
  // 3. 物理与交互
  gravity: 2.5,             // 垂坠重力
  birdSpeed: 4.5,             // 鸟的飞行速度
  birdY: 700,               // 鸟飞行的水平高度
  repelRadius: 50          // 鸟飞过时的排斥半径
};

let treeImg; // 树枝遮罩图（用来判定生成位置）
let bgImg;   // 你的自定义背景图
let weeds = [];
let rootNoise;
let bird;

function preload() {
  // 确保项目中上传了这两张图片
  treeImg = loadImage('tree.png');
  bgImg = loadImage('bg.png'); // <-- 在这里加载你的背景图
}

function setup() {
  createCanvas(810, 1080);
  
  // 调整图像尺寸以适应画布
  treeImg.resize(width, height);
  bgImg.resize(width, height);
  
  // 读取树枝图的像素数据用于生成丝线
  treeImg.loadPixels();
  
  rootNoise = createVector(random(123456), random(123456));
  bird = new Bird();

  // 遍历树枝图片像素，在有颜色的地方生成丝线
  for (let x = 0; x < width; x += PARAMS.density) {
    for (let y = 0; y < height * 0.7; y += PARAMS.density) { 
      let index = (x + y * treeImg.width) * 4;
      let alpha = treeImg.pixels[index + 3]; 
      
      if (alpha > 100) {
        let numSegments = floor(random(PARAMS.minSegs, PARAMS.maxSegs));
        weeds.push(new WillowThread(x, y, numSegments));
      }
    }
  }
}

function draw() {
  // 1. 绘制你的自定义背景图，替代原本的 background() 纯色
  image(bgImg, 0, 0, width, height);
  
  // 2. 绘制树枝前景层 (如果你的背景图里已经画了树枝，你可以把这一行注释掉，只保留丝线)
  image(treeImg, 0, 0);
  
  rootNoise.add(createVector(0.01, 0.01));

  // 3. 更新并绘制所有垂柳丝线
  for (let i = 0; i < weeds.length; i++) {
    weeds[i].update();
    weeds[i].display();
  }
  
  // 4. 飞鸟逻辑控制
  if (frameCount > PARAMS.birdTriggerFrame) {
    bird.active = true;
  }
  bird.update();
  bird.display();
}

// ==========================================
// 垂柳丝线类
// ==========================================
class WillowThread {
  constructor(x, y, maxSegments) {
    this.x = x;
    this.y = y;
    this.maxSegments = maxSegments;
    
    this.currentSegs = 1;      
    this.leafScale = 0;        
    
    this.pos = [];
    for (let i = 0; i < this.maxSegments; i++) {
      this.pos[i] = createVector(this.x, this.y);
    }
  }

  update() {
    if (this.currentSegs < this.maxSegments) {
      this.currentSegs += PARAMS.growthSpeed;
    } else if (this.leafScale < 1) {
      this.leafScale += PARAMS.leafGrowthSpeed;
    }

    let activeSegs = floor(this.currentSegs);
    this.pos[0] = createVector(this.x, this.y);
    
    for (let i = 1; i < activeSegs; i++) {
      let n = noise(rootNoise.x + 0.002 * this.pos[i].x, rootNoise.y + 0.002 * this.pos[i].y);
      let noiseForce = (0.4 - n) * 3; 
      this.pos[i].x += noiseForce;
      this.pos[i].y += PARAMS.gravity;

      if (bird.active) {
        let d = p5.Vector.dist(bird.pos, this.pos[i]);
        if (d < PARAMS.repelRadius) {
          let pushVec = p5.Vector.sub(this.pos[i], bird.pos); 
          pushVec.normalize();
          pushVec.mult(PARAMS.repelRadius); 
          this.pos[i] = p5.Vector.add(bird.pos, pushVec);
        }
      }

      let tmp = p5.Vector.sub(this.pos[i-1], this.pos[i]);
      tmp.normalize();
      tmp.mult(PARAMS.segLength);
      this.pos[i] = p5.Vector.sub(this.pos[i-1], tmp);
    }
  }

  display() {
    let activeSegs = floor(this.currentSegs);
    if (activeSegs < 2) return;

    noFill();
    stroke(120, 140, 100, 150); 
    strokeWeight(1.2);
    beginShape();
    for (let i = 0; i < activeSegs; i++) {
      vertex(this.pos[i].x, this.pos[i].y);
    }
    endShape();

    if (this.leafScale > 0) {
      fill(130, 180, 110, 200); 
      noStroke();
      for (let i = 2; i < activeSegs; i += 3) {
        let dir = p5.Vector.sub(this.pos[i], this.pos[i-1]);
        let angle = dir.heading();
        
        push();
        translate(this.pos[i].x, this.pos[i].y);
        rotate(angle);
        ellipse(0, 0, 10 * this.leafScale, 3 * this.leafScale);
        pop();
      }
    }
  }
}

// ==========================================
// 飞鸟类
// ==========================================
class Bird {
  constructor() {
    this.pos = createVector(width + 100, PARAMS.birdY);
    this.active = false;
  }

  update() {
    if (!this.active) return;
    this.pos.x -= PARAMS.birdSpeed; 
  }

  display() {
    if (!this.active) return;
    
    push();
    translate(this.pos.x, this.pos.y);
    stroke(80, 100, 120);
    strokeWeight(3);
    noFill();
    
    let wingY = sin(frameCount * 0.25) * 12;
    
    beginShape();
    vertex(12, wingY - 5);
    vertex(0, 0);
    vertex(-15, wingY - 10);
    endShape();
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