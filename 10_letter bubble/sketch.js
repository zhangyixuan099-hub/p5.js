// noprotect

/*
  p5.js sketch: Deep Blue 'O', Ghosting Water Wave, Light Blue Underwater
  (Performance Optimized to prevent CPU spikes and Editor crashes)
  Canvas Size: 810 x 1080
*/

const CONFIG = {
  // --- 环境颜色参数 ---
  airColor: [245, 245, 245],       
  waterColor: [210, 235, 245],     
  holeColor: [229, 240, 245],      // 经过透明度混合后，水下背景最终呈现的精准颜色

  // --- 糖果 (加粗字母 O) 视觉参数 ---
  candyColor: [15, 45, 100],       // 深蓝色
  candyStartSize: 150,             
  candySinkSpeed: 0.0015,          
  candySwayAmount: 0.15,           
  candyRotateSpeed: 0.005,         
  candyMeltRate: 0.0015,           
  meltStartYRatio: 0.33,           // 在画面 1/3 高度处开始融化

  // --- 气泡字母 视觉参数 ---
  bubbleColor: [15, 45, 100],      
  bubbleGhostDuration: 200,        
  bubbleGhostHistoryLen: 8,        // 稍微调低残影记录长度，平衡性能与视觉
  survivorProb: 0.25,              
  survivorSizeMin: 18,             
  survivorSizeMax: 26,             
  
  // --- 水面与爆炸飞沫 视觉参数 ---
  waterLineRatio: 0.25,            
  floatDurationMin: 60,            
  floatDurationMax: 150,           
  bobAmplitude: 3,                 
  explodeDotCount: 4,              
};

let font;
let allLetters = "abcdefghijklmnopqrstuvwxyz".split(""); 

let sugarO;
let letters = []; 
let explosionDots = []; 
let waterLine; 
let meltStartLine; 

function preload() {
  font = 'Times New Roman'; 
}

function setup() {
  createCanvas(810, 1080);
  textFont(font);
  
  waterLine = height * CONFIG.waterLineRatio; 
  meltStartLine = height * CONFIG.meltStartYRatio; 
  
  sugarO = new CandyO(width / 2, waterLine, CONFIG.candyStartSize);
}

function draw() {
  // 1. 绘制空气层
  noStroke();
  fill(CONFIG.airColor[0], CONFIG.airColor[1], CONFIG.airColor[2], 80);
  rect(0, 0, width, height);

  // 2. 绘制浅蓝色的水下区域
  fill(CONFIG.waterColor[0], CONFIG.waterColor[1], CONFIG.waterColor[2], 80);
  beginShape();
  vertex(width, height);
  vertex(0, height);
  for (let x = 0; x <= width; x += 10) {
    let waveOffset = sin(x * 0.015 + frameCount * 0.02) * 4 + sin(x * 0.03 + frameCount * 0.03) * 2;
    vertex(x, waterLine + waveOffset);
  }
  endShape(CLOSE);

  // 3. 绘制带有“残影”效果的波浪线
  drawWaterWave();

  // 4. 糖果逻辑
  sugarO.update();
  sugarO.display();

  // 5. 字母气泡系统 (性能优化版：使用最原始的 for 循环，绝对安全)
  let nextLetters = [];
  for (let i = 0; i < letters.length; i++) {
    let l = letters[i];
    l.update();
    l.display();
    if (!l.isDead) {
      nextLetters.push(l);
    }
  }
  letters = nextLetters;

  // 6. 爆炸飞沫系统 (性能优化版)
  let nextDots = [];
  for (let i = 0; i < explosionDots.length; i++) {
    let d = explosionDots[i];
    d.update();
    d.display();
    if (!d.isDead) {
      nextDots.push(d);
    }
  }
  explosionDots = nextDots;
}

// 绘制起伏的水面残影波浪线
function drawWaterWave() {
  push();
  noFill();
  
  // 使用正向循环避免 p5 编辑器倒序解析的潜在 bug
  let layers = [2, 1, 0];
  for (let k = 0; k < layers.length; k++) {
    let i = layers[k];
    let alpha = map(i, 0, 2, 120, 20); 
    let weight = map(i, 0, 2, 1.2, 0.3); 
    let frameOffset = i * 12; 

    stroke(CONFIG.bubbleColor[0], CONFIG.bubbleColor[1], CONFIG.bubbleColor[2], alpha); 
    strokeWeight(weight);
    
    beginShape();
    for (let x = 0; x <= width; x += 10) {
      let waveOffset = sin(x * 0.015 + (frameCount - frameOffset) * 0.02) * 4 + sin(x * 0.03 + (frameCount - frameOffset) * 0.03) * 2;
      vertex(x, waterLine + waveOffset);
    }
    endShape();
  }
  pop();
}

// --- 糖果类 ---
class CandyO {
  constructor(x, y, initialSize) {
    this.basePos = createVector(x, y);
    this.pos = createVector(x, y);
    this.initialSize = initialSize;
    this.angle = 0; 
    
    this.meltProgress = 0; 
    this.hasHitBottom = false; 
    
    this.erosionHoles = [];
    for (let k = 0; k < 30; k++) { 
      this.erosionHoles.push({
        x: random(-initialSize * 0.4, initialSize * 0.4),
        y: random(-initialSize * 0.4, initialSize * 0.4),
        maxR: random(initialSize * 0.2, initialSize * 0.7), 
        delay: random(0, 0.6) 
      });
    }
  }

  update() {
    let bottomLimit = height - this.initialSize / 2 - 20;

    if (!this.hasHitBottom) {
      this.basePos.y += height * CONFIG.candySinkSpeed;
      this.angle += CONFIG.candyRotateSpeed;
      
      let sway = sin(frameCount * 0.02) * (width * CONFIG.candySwayAmount);
      this.pos.x = this.basePos.x + sway;
      this.pos.y = this.basePos.y;

      if (this.pos.y >= bottomLimit) {
        this.hasHitBottom = true;
        this.pos.y = bottomLimit;
      }
    }

    if (this.pos.y >= meltStartLine && this.meltProgress < 1.0) {
      this.meltProgress += CONFIG.candyMeltRate;
      
      let releaseRate = map(this.meltProgress, 0, 1, 1.2, 0.05); 
      let spawns = floor(releaseRate) + (random() < (releaseRate % 1) ? 1 : 0);
      spawns = constrain(spawns, 0, 2); 
      
      for (let s = 0; s < spawns; s++) {
        let rAngle = random(TWO_PI);
        let rRadius = random(0, this.initialSize * 0.4);
        let spawnX = this.pos.x + cos(rAngle) * rRadius;
        let spawnY = this.pos.y + sin(rAngle) * rRadius;

        // 性能保护：全局最多允许存在 80 个气泡字母，防止文字渲染过多卡死
        if (letters.length < 80) {
          letters.push(new FloatingLetter(spawnX, spawnY, this.initialSize));
        }
      }
    }
  }

  display() {
    if (this.meltProgress < 1.0) {
      push();
      translate(this.pos.x, this.pos.y);
      rotate(this.angle); 
      
      fill(CONFIG.candyColor);
      noStroke();
      textAlign(CENTER, CENTER);
      textStyle(BOLD);
      textSize(this.initialSize);
      text("O", 0, -this.initialSize * 0.05); 
      
      if (this.meltProgress > 0) {
        fill(CONFIG.holeColor); 
        noStroke();
        
        for (let i = 0; i < this.erosionHoles.length; i++) {
          let hole = this.erosionHoles[i];
          let p = map(this.meltProgress, hole.delay, 1.0, 0, 1, true);
          if (p > 0) {
            ellipse(hole.x, hole.y, hole.maxR * p);
          }
        }
        
        let finalP = map(this.meltProgress, 0.8, 1.0, 0, 1, true);
        if (finalP > 0) {
          ellipse(0, 0, this.initialSize * 1.5 * finalP);
        }
      }
      
      pop();
    }
  }
}

// --- 字母气泡类 ---
class FloatingLetter {
  constructor(x, y, parentSize) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, random(-1.5, -3.5)); 
    this.displayChar = allLetters[Math.floor(random(allLetters.length))];
    
    this.isSurvivor = random() < CONFIG.survivorProb;
    this.baseAlpha = random(100, 255); 
    
    if (this.isSurvivor) {
      this.size = random(CONFIG.survivorSizeMin, CONFIG.survivorSizeMax);
      this.shrinkRate = 1.0; 
      this.alphaFade = 0.0;
    } else {
      this.size = random(parentSize * 0.1, parentSize * 0.2);
      this.shrinkRate = 0.985;
      this.alphaFade = random(2.0, 4.0); 
    }
    
    this.alpha = this.baseAlpha;
    this.isDead = false;
    this.history = [];
    this.age = 0;

    this.state = 0; 
    this.floatTimer = 0;
    this.maxFloatDuration = random(CONFIG.floatDurationMin, CONFIG.floatDurationMax);
    this.bobAngle = random(TWO_PI);
    this.floatBaseX = this.pos.x;
  }

  update() {
    this.age++;

    if (this.state === 0) {
      this.pos.add(this.vel);
      this.size *= this.shrinkRate;
      this.alpha -= this.alphaFade;

      if (this.age < CONFIG.bubbleGhostDuration) {
        this.history.push(this.pos.copy());
        if (this.history.length > CONFIG.bubbleGhostHistoryLen) {
          this.history.shift();
        }
      } else {
        if (this.history.length > 0) {
          this.history.shift();
        }
      }

      if (this.pos.y <= waterLine) {
        if (this.isSurvivor) {
          this.state = 1;
          this.pos.y = waterLine; 
          this.floatBaseX = this.pos.x; 
          this.history = []; 
        } else {
          this.isDead = true;
        }
      }

    } else if (this.state === 1) {
      this.floatTimer++;
      this.bobAngle += 0.08;
      
      let waveOffset = sin(this.pos.x * 0.015 + frameCount * 0.02) * 4 + sin(this.pos.x * 0.03 + frameCount * 0.03) * 2;
      this.pos.y = waterLine + waveOffset + sin(this.bobAngle) * CONFIG.bobAmplitude;
      this.pos.x = this.floatBaseX + cos(this.bobAngle * 0.7) * 1.5;

      if (this.floatTimer >= this.maxFloatDuration) {
        this.explode();
      }
    }

    if (this.alpha <= 0 || this.size < 2) {
      this.alpha = 0;
      this.isDead = true;
    }
  }

  explode() {
    for (let c = 0; c < CONFIG.explodeDotCount; c++) {
      if (explosionDots.length < 150) {
        explosionDots.push(new ExplosionDot(this.pos.x, this.pos.y, this.size, this.alpha));
      }
    }
    this.isDead = true; 
  }

  drawGhost() {
    if (this.history.length > 1) {
      push();
      textAlign(CENTER, CENTER);
      noStroke();
      textStyle(NORMAL);
      
      let len = this.history.length;
      // 性能优化：通过 i += 2 跳帧渲染残影，将底层文字渲染负担降低 50%
      for (let i = 0; i < len; i += 2) {
        let pt = this.history[i];
        let ghostAlpha = map(i, 0, len, 0, this.alpha * 0.4); 
        let ghostSize = this.size * map(i, 0, len, 0.6, 0.9);
        
        textSize(ghostSize);
        fill(CONFIG.bubbleColor[0], CONFIG.bubbleColor[1], CONFIG.bubbleColor[2], ghostAlpha);
        text(this.displayChar, pt.x, pt.y);
      }
      pop();
    }
  }

  display() {
    if (this.state === 0) {
      this.drawGhost();
    }
    
    push();
    textAlign(CENTER, CENTER);
    noStroke();
    textStyle(NORMAL);
    textSize(this.size);
    fill(CONFIG.bubbleColor[0], CONFIG.bubbleColor[1], CONFIG.bubbleColor[2], this.alpha); 
    text(this.displayChar, this.pos.x, this.pos.y);
    pop();
  }
}

// --- 炸开飞沫类 ---
class ExplosionDot {
  constructor(x, y, baseSize, startAlpha) {
    this.pos = createVector(x, y);
    let angle = random(TWO_PI);
    let burstSpeed = random(0.5, 2.0); 
    this.vel = createVector(cos(angle) * burstSpeed, sin(angle) * burstSpeed);
    
    this.size = random(baseSize * 0.05, baseSize * 0.12);
    this.alpha = startAlpha; 
    this.drag = 0.88; 
    this.isDead = false;
  }

  update() {
    this.vel.mult(this.drag);
    this.vel.y -= 0.15; 
    this.vel.x += random(-0.02, 0.02);

    this.pos.add(this.vel);
    
    this.alpha -= 6.0; 
    if (this.alpha <= 0) {
      this.isDead = true;
    }
  }

  display() {
    push();
    noStroke();
    fill(CONFIG.bubbleColor[0], CONFIG.bubbleColor[1], CONFIG.bubbleColor[2], this.alpha);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
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