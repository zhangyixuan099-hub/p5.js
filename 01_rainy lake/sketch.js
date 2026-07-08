let bg;
let chimianMask;
let dingForeground;

let drops = [];
let ripples = [];
let bounces = [];

function preload() {
  // 确保这三张图已经上传，且尺寸与 bg.jpg 完全一致
  bg = loadImage('bg.jpg'); 
  chimianMask = loadImage('chimian.png');
  dingForeground = loadImage('ding.png');
}

function setup() {
  createCanvas(bg.width, bg.height);
  noFill();
  
  // 提前加载遮罩的像素数据，以备极速读取
  chimianMask.loadPixels();
}

function draw() {
  // --------------------------------------------------
  // 核心！绘制顺序决定了遮挡关系 (Z-index)
  // --------------------------------------------------
  
  // 第 1 层：最底层的背景图
  image(bg, 0, 0);

  // 第 2 层：更新并绘制涟漪 (会被后面的 ding 遮盖)
  for (let i = ripples.length - 1; i >= 0; i--) {
    let r = ripples[i];
    r.update();
    r.display();
    if (r.isDone()) {
      ripples.splice(i, 1);
    }
  }

  // 第 3 层：画前景遮挡图 ding.png！(完美盖住底下的涟漪)
  image(dingForeground, 0, 0);

  // 第 4 层：下落的雨线 (在 ding 的上方)
  for (let i = drops.length - 1; i >= 0; i--) {
    let d = drops[i];
    d.update();
    d.display();
    
    // 如果雨滴底部到达了专属的落水点
    if (d.isDone()) {
      // 在落水点产生涟漪和溅起水花
      createRipple(d.x, d.stopY); 
      
      if (random() < 0.7) { 
        let numBounces = floor(random(2, 6)); 
        for (let j = 0; j < numBounces; j++) {
          createBounce(d.x, d.stopY, d.col);
        }
      }
      drops.splice(i, 1);
    }
  }
  
  // 第 5 层：溅起的小圆点 (在 ding 的上方)
  for (let i = bounces.length - 1; i >= 0; i--) {
    let b = bounces[i];
    b.update();
    b.display();
    if (b.isDone()) {
      bounces.splice(i, 1);
    }
  }

  // --------------------------------------------------
  // 持续随机添加新雨滴
  if (random() < 0.15) {
    addDrop();
  }
}

// 核心功能：在 chimian.png 的白色区域内，随机寻找一个合法的落点
function getValidLandingPoint() {
  // 每次最多尝试 50 次，防止极端情况卡死
  for (let i = 0; i < 50; i++) { 
    let rx = floor(random(chimianMask.width));
    let ry = floor(random(chimianMask.height));
    
    // 高速读取像素数组的红色通道 (R)
    // 公式：(x + y * width) * 4 (因为每个像素有 R,G,B,A 4个值)
    let index = (rx + ry * chimianMask.width) * 4;
    let rValue = chimianMask.pixels[index]; 
    
    // 如果红色通道大于 128 (认为是白色/水面区域)
    if (rValue > 128) {
      return { x: rx, y: ry };
    }
  }
  return null; // 如果运气太差没找到，就返回空
}

function addDrop() {
  // 获取一个合法的、落在白色区域内的随机坐标
  let pt = getValidLandingPoint();
  if (!pt) return; // 没找到合适的点，跳过这次生成

  let x = pt.x;
  let stopY = pt.y; // 这滴雨的精准落水高度

  // 雨滴的初始高度在落水点上方很远的地方产生
  let y = random(-200, stopY - 150); 
  let col = random() < 0.6 ? color(200, 255, 0) : color(255);
  
  drops.push(new Drop(x, y, col, stopY));
}

function createRipple(x, y) {
  ripples.push(new Ripple(x, y));
}

function createBounce(x, y, col) {
  bounces.push(new Bounce(x, y, col));
}

// --- 粒子类定义 ---

class Drop {
  constructor(x, y, col, stopY) {
    this.x = x;
    this.y = y;
    this.speed = random(3, 7);
    
    // 【这里调长度】想更长可以把数值改大，比如 random(100, 400)
    this.len = random(10, 150); 
    
    this.col = col;
    this.stopY = stopY; 
    // 删除了 numSegments，不再分段
  }

  update() {
    this.y += this.speed;
  }

  display() {
    stroke(this.col, 180);
    strokeWeight(1);
    // 【这里画实线】从起点 (x, y) 一直画到终点 (x, y + len)
    line(this.x, this.y, this.x, this.y + this.len);
  }

  isDone() {
    return (this.y + this.len) >= this.stopY;
  }
}

class Ripple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseR = 0; 
    this.numRings = floor(random(5, 11)); 
    this.ringSpacing = random(8, 15); 
    this.maxR = random(150, 400); 
    this.opacity = 200;
  }

  update() {
    this.baseR += 0.6; 
    this.opacity -= 1.2; 
  }

  display() {
    noFill();
    for (let i = 0; i < this.numRings; i++) {
      let ringR = this.baseR - i * this.ringSpacing; 
      if (ringR > 0 && ringR < this.maxR) {
        let sw = map(ringR, 0, this.maxR, 2.5, 0.2);
        strokeWeight(max(0.1, sw)); 

        let ringAlpha = map(ringR, this.maxR * 0.5, this.maxR, this.opacity, 0);
        stroke(255, constrain(ringAlpha, 0, 255));

        push();
        translate(this.x, this.y);
        beginShape();
        for (let angle = 0; angle < TWO_PI; angle += 0.2) {
          let noiseVal = noise(cos(angle) + this.baseR * 0.01, sin(angle), i * 0.1);
          let rOffset = map(noiseVal, 0, 1, -3, 3);
          let rx = ringR + rOffset;
          let ry = (ringR + rOffset) * 0.3; 
          vertex(rx * cos(angle), ry * sin(angle));
        }
        endShape(CLOSE);
        pop();
      }
    }
  }

  isDone() {
    return this.opacity <= 0 || (this.baseR - (this.numRings - 1) * this.ringSpacing > this.maxR);
  }
}

class Bounce {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    this.col = col;
    this.yVel = -random(0.2, 1.0); 
    this.xVel = random(-0.3, 0.3); 
    this.opacity = 255;
    this.size = random(3.5, 7); 
  }

  update() {
    this.y += this.yVel;
    this.xVel += random(-0.1, 0.1);
    this.xVel *= 0.95;
    this.x += this.xVel;
    this.opacity -= 1.5; 
  }

  display() {
    noStroke();
    fill(this.col, this.opacity);
    ellipse(this.x, this.y, this.size, this.size);
  }

  isDone() {
    return this.opacity <= 0 || this.y < (this.y - 100);
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