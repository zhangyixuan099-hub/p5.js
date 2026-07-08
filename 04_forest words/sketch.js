// ================= 核心视觉参数 =================

// 【排版与下落参数】
let colCount = 30;          // 画面中同时存在的文字列数（稍微调小一点，给视觉留白）
let fontSize = 13;          // 字体大小
let speedMin = 2.0;         // 最慢下落速度
let speedMax = 5.0;         // 最快下落速度
let waitTimeMax = 100;      // 完整字列在顶部悬挂停留的最长时间
let trailLength = 6;        // 单个字下落时的虚影长度

// 【碰撞雾气参数】（字碰到地面碎裂的雾气）
let mistCount = 5;          // 单个字碎裂产生的雾气粒子数
let mistSizeBase = 3;       // 雾气基础大小
let mistLifespan = 130;     // 雾气存活时间
let mistFloatSpeed = 0.2;   // 雾气向上漂浮速度
let mistSpread = 1.6;       // 雾气四周扩散范围

// 【全局环境氤氲圆点参数】（全图游走的星点/微尘）
let ambientDotCount = 300;  // 环境圆点的数量（越大画面越梦幻）
let ambientDotSizeMin = 2;  // 环境圆点最小尺寸
let ambientDotSizeMax = 5;  // 环境圆点最大尺寸
let ambientDotSpeed = 0.5;  // 环境圆点游走的速度（柏林噪声驱动）

// =================================================================

let bgImg;
let underMask;
let columns = [];
let mists = [];
let ambientDots = [];

const phrases = [
  "万物生生不息", "林间轻雾弥漫", "听风穿过松林", "感受大地的呼吸",
  "落叶无声", "生命在静谧中重塑", "树冠遮蔽天空", "雨滴汇聚成溪",
  "青苔", "幽暗的深处", "光影在枝桠间交错", "深林人不知", 
  "空山新雨后", "松间沙路净", "清泉石上流", "自然之理"
];

function preload() {
  bgImg = loadImage('bg.jpg');
  underMask = loadImage('under.png');
}

function setup() {
  createCanvas(bgImg.width, bgImg.height);
  textFont('sans-serif');
  textSize(fontSize);
  textAlign(CENTER, CENTER);
  
  underMask.loadPixels();

  // 初始化文字列
  for (let i = 0; i < colCount; i++) {
    spawnColumn();
  }

  // 初始化全局环境氤氲圆点
  for (let i = 0; i < ambientDotCount; i++) {
    ambientDots.push(new AmbientDot());
  }
}

function draw() {
  image(bgImg, 0, 0, width, height);

  // 1. 更新并绘制全局环境圆点（放在最底层）
  noStroke();
  for (let dot of ambientDots) {
    dot.update();
    dot.display();
  }

  // 2. 更新并绘制文字列
  for (let i = columns.length - 1; i >= 0; i--) {
    let col = columns[i];
    col.update();
    col.display();
    
    // 如果这一列的所有字都碎裂了，就重新在顶部生成新的一列
    if (col.isAllShattered()) {
      columns.splice(i, 1);
      spawnColumn();
    }
  }

  // 3. 更新并绘制碰撞产生的碎裂雾气（放在上层）
  noStroke();
  for (let i = mists.length - 1; i >= 0; i--) {
    let mist = mists[i];
    mist.update();
    mist.display();
    if (mist.isDead()) {
      mists.splice(i, 1);
    }
  }
}

function spawnColumn() {
  let x = random(width * 0.1, width * 0.9);
  let phrase = random(phrases);
  columns.push(new WordColumn(x, phrase));
}

// ================= 类定义 =================

// 竖排文字列类（逐字下落版）
class WordColumn {
  constructor(x, textStr) {
    this.x = x;
    this.baseY = random(30, 100); // 整体悬挂的初始基准高度
    this.speed = random(speedMin, speedMax);
    this.waitTimer = int(random(30, waitTimeMax)); // 整体悬挂等待时间
    
    this.chars = [];
    // 初始化每个字的状态
    for (let i = 0; i < textStr.length; i++) {
      let originY = this.baseY + i * fontSize * 1.3;
      this.chars.push({
        char: textStr[i],
        originY: originY,      // 初始悬挂位置
        currentY: originY,     // 运动时的当前位置
        state: 'waiting'       // 状态：waiting(等待), falling(下落中), shattered(已碎裂)
      });
    }
    
    // 从最底下的一个字开始下落
    this.fallingIndex = this.chars.length - 1; 
  }

  update() {
    // 整体悬挂倒计时
    if (this.waitTimer > 0) {
      this.waitTimer--;
      return;
    }

    // 处理当前正在下落的字
    if (this.fallingIndex >= 0) {
      let c = this.chars[this.fallingIndex];
      c.state = 'falling';
      c.currentY += this.speed;

      // 碰撞检测
      let pxX = floor(this.x);
      let pxY = floor(c.currentY);

      if (pxY > 0 && pxY < height && pxX > 0 && pxX < width) {
        let index = (pxX + pxY * width) * 4 + 3;
        let alphaVal = underMask.pixels[index];

        // 如果碰到了不透明遮罩，或掉到底部
        if (alphaVal > 50 || c.currentY > height - 10) {
          c.state = 'shattered'; // 标记该字碎裂
          
          // 只有碰到遮罩才生成雾气
          if (alphaVal > 50) {
            for (let m = 0; m < mistCount; m++) {
              mists.push(new MistParticle(this.x, c.currentY));
            }
          }
          
          // 当前字碎裂后，索引减 1，让它上面的字在下一帧开始下落
          this.fallingIndex--;
        }
      }
    }
  }

  display() {
    for (let i = 0; i < this.chars.length; i++) {
      let c = this.chars[i];
      
      if (c.state === 'waiting') {
        // 还没轮到它下落，安静地挂在上方
        fill(255, 255, 255, 220);
        text(c.char, this.x, c.originY);
      } 
      else if (c.state === 'falling') {
        // 正在下落，绘制虚影和本体
        for (let t = 1; t <= trailLength; t++) {
          fill(255, 255, 255, 120 / t);
          text(c.char, this.x, c.currentY - (this.speed * t * 2));
        }
        fill(255, 255, 255, 220);
        text(c.char, this.x, c.currentY);
      }
      // 如果 state 是 'shattered'，则什么都不画，它已经变成雾气了
    }
  }

  isAllShattered() {
    return this.fallingIndex < 0; // 索引小于 0 说明所有的字都掉完了
  }
}

// 全局环境圆点类（氤氲效果）
class AmbientDot {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.noiseOffsetX = random(1000);
    this.noiseOffsetY = random(1000);
    this.size = random(ambientDotSizeMin, ambientDotSizeMax);
    this.baseAlpha = random(30, 120); // 圆点基础透明度
    this.pulseOffset = random(TWO_PI); // 闪烁相位的偏移
  }

  update() {
    // 柏林噪声驱动圆点在全图缓慢游走
    let vx = map(noise(this.noiseOffsetX), 0, 1, -ambientDotSpeed, ambientDotSpeed);
    let vy = map(noise(this.noiseOffsetY), 0, 1, -ambientDotSpeed, ambientDotSpeed);
    
    this.x += vx;
    this.y += vy;
    
    this.noiseOffsetX += 0.005; // 变化极慢，让运动轨迹圆润
    this.noiseOffsetY += 0.005;

    // 边缘环绕：如果飘出屏幕，从另一边出来，保证数量恒定
    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;
  }

  display() {
    // 利用正弦波让圆点产生轻微的呼吸闪烁感
    let currentAlpha = this.baseAlpha + sin(frameCount * 0.02 + this.pulseOffset) * 30;
    fill(255, 255, 255, currentAlpha);
    ellipse(this.x, this.y, this.size, this.size);
  }
}

// 雾气粒子类
class MistParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.life = mistLifespan;
    this.size = random(mistSizeBase, mistSizeBase * 2);
    this.noiseOffsetX = random(1000);
    this.noiseOffsetY = random(1000);
  }

  update() {
    let vx = map(noise(this.noiseOffsetX), 0, 1, -mistSpread, mistSpread);
    let vy = map(noise(this.noiseOffsetY), 0, 1, -mistFloatSpeed - 1, -mistFloatSpeed + 0.2);
    
    this.x += vx;
    this.y += vy;
    
    this.noiseOffsetX += 0.03;
    this.noiseOffsetY += 0.03;
    this.life -= 1; 
  }

  display() {
    let alpha = map(this.life, 0, mistLifespan, 0, 60);
    let currentSize = map(this.life, 0, mistLifespan, this.size * 4, this.size);
    
    fill(255, 255, 255, alpha * 0.4);
    ellipse(this.x, this.y, currentSize * 1.5, currentSize * 1.5);
    
    fill(255, 255, 255, alpha);
    ellipse(this.x, this.y, currentSize, currentSize);
  }

  isDead() {
    return this.life <= 0;
  }
}