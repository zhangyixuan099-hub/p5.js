// 全局视觉参数
let chars = "终于夏日陨落波浪交融星辰闪烁光影交错水波荡漾"; 
let charW = 26;             // [修改点]：稍微加大横向间距，大幅减少单帧计算量
let charH = 36;             // [修改点]：稍微加大纵向行距，彻底解决死循环报错
let textScrollSpeed = 0.8;  // 文字向左流动的流速
let waveSpeed = 0.006;      // 噪声(透明度显现)翻滚速度

let noiseScaleX = 0.006;    // 噪声横向缩放
let noiseScaleY = 0.04;     // 噪声纵向缩放

// 六芒星参数
let numSparks = 70;         
let sparkSizeRange = [2, 7];
let diagonalSpread = 120;   

let zOff = 0; 
let sparks = [];

function setup() {
  p5.disableFriendlyErrors = true; // 提升运行性能
  
  createCanvas(1080, 1440);
  textFont('sans-serif'); 
  textAlign(CENTER, CENTER);
  
  initSparks();
}

function initSparks() {
  sparks = [];
  let startX = width * 0.90;
  let startY = height * 0.05;
  let endX = width * 0.10;
  let endY = height * 0.95;
  
  let dx = endX - startX;
  let dy = endY - startY;
  let len = dist(startX, startY, endX, endY);
  let perpX = -dy / len; 
  let perpY = dx / len;
  
  for (let i = 0; i < numSparks; i++) {
    let t = random(1);
    let baseX = lerp(startX, endX, t);
    let baseY = lerp(startY, endY, t);
    let spread = randomGaussian(0, diagonalSpread); 
    
    sparks.push({
      x: baseX + perpX * spread,
      y: baseY + perpY * spread,
      baseSize: random(sparkSizeRange[0], sparkSizeRange[1]),
      phase: random(TWO_PI)
    });
  }
}

function draw() {
  background('#3DAFD9'); // 治愈系蓝背景
  zOff += waveSpeed;
  
  let scrollAmt = frameCount * textScrollSpeed;
  
  noStroke();
  
  // ==========================================
  // 1. 绘制文字波浪 (物理起伏 + 显现掩码)
  // ==========================================
  
  for (let y = 0; y < height; y += charH) {
    // noprotect
    
    // 上面稀疏，下面密集的显示阈值
    let currentThreshold = map(y, 0, height, 0.65, 0.35);
    
    // 每行的基础流速错开，形成水流层次感
    let rowScrollSpeed = scrollAmt * map(noise(y * 0.05), 0, 1, 0.6, 1.4);
    let startX = -(rowScrollSpeed % charW) - charW; 
    let rowCharOffset = floor(y * 0.3) % chars.length;
    
    for (let x = startX; x < width + charW; x += charW) {
      // noprotect
      
      let absoluteX = x + rowScrollSpeed;
      let n = noise(absoluteX * noiseScaleX, y * noiseScaleY, zOff);
      
      // 只有高于波浪阈值时才计算并绘制文字，极大节省性能
      if (n > currentThreshold) {
        
        // --- 真实的物理波浪荡漾 ---
        let physicalWaveY = sin(absoluteX * 0.012 + frameCount * 0.04 + y * 0.1) * 25;
        physicalWaveY += cos(absoluteX * 0.007 + frameCount * 0.02) * 15;
        
        let peakLift = map(n, currentThreshold, 0.8, 0, -8);
        let finalY = y + physicalWaveY + peakLift;
        
        // 边缘淡入淡出
        let textAlpha = map(n, currentThreshold, currentThreshold + 0.15, 0, 255);
        textAlpha = constrain(textAlpha, 0, 255);
        
        // 波浪顶端的字微微变大 (补偿了行距增大后的视觉空隙)
        let tSize = map(n, currentThreshold, 0.8, 14, 22);
        
        // 提取字符
        let charIndex = floor(absoluteX / charW) + rowCharOffset;
        charIndex = ((charIndex % chars.length) + chars.length) % chars.length;
        
        textSize(tSize);
        fill(255, 255, 255, textAlpha);
        
        text(chars[charIndex], x, finalY);
      }
    }
  }
  
  // ==========================================
  // 2. 绘制位于斜线区域的六芒星
  // ==========================================
  for (let sp of sparks) {
    // noprotect
    let flicker = sin(frameCount * 0.05 + sp.phase);
    let alphaVal = map(flicker, -1, 1, 50, 255);
    let size = sp.baseSize * map(flicker, -1, 1, 0.8, 1.2);
    
    let n = noise(sp.x * 0.01, sp.y * 0.01, zOff);
    let floatY = map(n, 0, 1, -2, 2);
    
    push();
    translate(sp.x, sp.y + floatY);
    noStroke();
    
    fill(255, 255, 255, alphaVal * 0.25);
    drawStar(0, 0, size, size * 2.5, 6);
    
    fill(255, 255, 255, alphaVal);
    drawStar(0, 0, size * 0.4, size * 1.2, 6);
    pop();
  }
}

function drawStar(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}