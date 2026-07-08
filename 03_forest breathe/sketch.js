// ====== 图片资源变量 ======
let bgImg, underImg, dotImg;

// ====== 全局变量 ======
let customNodes = [];    
let edges = [];          

// 🎨 【视觉调整】：网格全局连线跨度
// 调大 (比如 500)：边缘的孤立点也会强行跨越很远的距离拉上线。
// 调小 (比如 150)：只有靠得很近的点才会连线，网格会变得破碎，有更多空白断层。
let maxDist = 350;       

let pgTerrain;           
let pgStars;             
let starLines = [];      

function preload() {
  bgImg = loadImage('bg.jpg');
  underImg = loadImage('under.png'); 
  dotImg = loadImage('dot.png');     
}

function setup() {
  createCanvas(bgImg.width, bgImg.height); 
  pgTerrain = createGraphics(width, height);
  pgStars = createGraphics(width, height); 
  
  dotImg.loadPixels();
  for (let y = 0; y < dotImg.height; y += 2) { 
    for (let x = 0; x < dotImg.width; x += 2) {
      let index = (x + y * dotImg.width) * 4;
      let r = dotImg.pixels[index];
      let a = dotImg.pixels[index + 3]; 
      
      // 🎨 【视觉调整】：读取白点的容差
      // (a > 100 && r > 150) 代表只读取透明度高于100且偏白的像素。
      // 后面距离判断 (< 12) 控制了提取点的密度，数字越大点越少。
      if (a > 100 && r > 150) {
        let tooClose = false;
        for (let n of customNodes) {
          if (dist(x, y, n.baseX, n.baseY) < 12) { 
            tooClose = true;
            break;
          }
        }
        if (!tooClose) {
          customNodes.push({ baseX: x, baseY: y, currentY: y });
        }
      }
    }
  }

  // 这里的 Gabriel Graph 算法负责剔除多余的线，防止变成蜘蛛网
  for (let i = 0; i < customNodes.length; i++) {
    for (let j = i + 1; j < customNodes.length; j++) {
      let n1 = customNodes[i];
      let n2 = customNodes[j];
      let d = dist(n1.baseX, n1.baseY, n2.baseX, n2.baseY);
      
      if (d < maxDist) {
        let midX = (n1.baseX + n2.baseX) / 2;
        let midY = (n1.baseY + n2.baseY) / 2;
        let radius = d / 2;
        let isValidEdge = true;
        
        for (let k = 0; k < customNodes.length; k++) {
          if (k === i || k === j) continue;
          let n3 = customNodes[k];
          if (dist(n3.baseX, n3.baseY, midX, midY) < radius) {
            isValidEdge = false;
            break;
          }
        }
        if (isValidEdge) {
          edges.push({ n1: n1, n2: n2, distance: d });
        }
      }
    }
  }

  // 🎨 【视觉调整】：星轨的数量
  // 调大：天上的线变密集。调小：变得稀疏清冷。
  for (let i = 0; i < 30; i++) {
    starLines.push(new StarLine(random(width)));
  }
}

function draw() {
  background(0);
  image(bgImg, 0, 0);
  drawStarsMasked();
  drawCustomTerrainMasked();
}

function drawStarsMasked() {
  pgStars.clear(); 
  for (let s of starLines) {
    s.update();
    s.display(pgStars);
  }
  pgStars.drawingContext.globalCompositeOperation = 'destination-out';
  pgStars.image(underImg, 0, 0);
  pgStars.drawingContext.globalCompositeOperation = 'source-over'; 
  blendMode(ADD);
  image(pgStars, 0, 0);
  blendMode(BLEND); 
}

// ================= 蕨类网格视觉参数区 =================
function drawCustomTerrainMasked() {
  pgTerrain.clear(); 
  let time = millis() * 0.001;

  for (let n of customNodes) {
    // 🎨 【视觉调整】：网格顶点的起伏(呼吸)幅度
    // -12, 12 改为 -30, 30 会让波浪起伏极其夸张；改为 -2, 2 几乎静止。
    // 0.01 是呼吸频率，调大（如 0.05）网格会剧烈抖动。
    n.currentY = n.baseY + map(noise(n.baseX * 0.01, n.baseY * 0.01, time), 0, 1, -10, 10);
  }

  for (let e of edges) {
    // 🎨 【视觉调整】：网格连线的粗细
    // 改为 2 或 3 会变粗。由于节点多，改粗容易显得乱，建议保持 1 或 1.5。
    pgTerrain.strokeWeight(1); 
    
    // 🎨 【视觉调整】：网格连线的透明度
    // 参数 map(e.distance, 0, maxDist, 220, 30)
    // 220 代表“距离最近的线的透明度”(最高255)；30 代表“距离最远的线的透明度”。
    // 如果把 30 改成 0，边缘长线会完全隐形；如果把 220 改成 100，整体网格会变暗淡。
    pgTerrain.stroke(255, 255, 255, map(e.distance, 0, maxDist, 200, 30));
    pgTerrain.line(e.n1.baseX, e.n1.currentY, e.n2.baseX, e.n2.currentY);
  }
    
  for (let n of customNodes) {
    pgTerrain.noStroke();
    // 🎨 【视觉调整】：网格顶点的透明度
    // 最后的 255 改小（如 100），白点会变成半透明。
    pgTerrain.fill(255, 255, 255, 200);
    // 🎨 【视觉调整】：网格顶点的大小
    // 把 7 调大（如 12），白点会变得像珍珠一样大；调小（如 3），会变成星尘。
    pgTerrain.circle(n.baseX, n.currentY, 6); 
  }

  pgTerrain.drawingContext.globalCompositeOperation = 'destination-in';
  pgTerrain.image(underImg, 0, 0);
  pgTerrain.drawingContext.globalCompositeOperation = 'source-over'; 
  image(pgTerrain, 0, 0);
}

// ================= 星线与四芒星视觉参数区 =================
class StarLine {
  constructor(x) {
    this.x = x;                           
    this.y = random(-height, 0);          
    
    // 🎨 【视觉调整】：背后长线的长度范围
    // 改为 random(10, 50) 会变成短雨滴；改为 random(500, 1000) 就像通天的激光栅栏。
    this.lineLen = random(100, 400);      
    
    this.lineSpeed = random(0.2, 0.6);    
    this.starRelY = random(0, this.lineLen); 
    this.starSpeed = random(1.5, 3.5);    
    
    // 🎨 【视觉调整】：四芒星的尖刺长度（长芒与短芒）
    // 想要更夸张的十字星，把 longArm 的数值调大；
    // 想让星星肚子更饱满，把 shortArm 数值调大。
    this.longArm = random(6, 12);        
    this.shortArm = random(1.5, 3);         
  }
  
  update() {
    this.y += this.lineSpeed;
    this.starRelY += this.starSpeed;
    
    if (this.starRelY > this.lineLen) this.starRelY = 0; 
    
    if (this.y - this.lineLen > height) {
      this.y = random(-300, -50); 
      this.x = random(width);         
      this.lineLen = random(100, 400); 
      this.starRelY = 0; 
    }
  }
  
  display(pg) {
    // 🎨 【视觉调整】：背后长线的颜色和透明度
    // (180, 255, 220, 100) 是一种偏冷的微弱薄荷绿。
    // 如果想要纯白，改成 (255, 255, 255, 100)。
    // 最后的 100 是透明度，调大到 255 线条会非常刺眼。
    pg.stroke(180, 255, 220, 100); 
    // 🎨 【视觉调整】：背后长线的粗细
    pg.strokeWeight(1.5);
    pg.line(this.x, this.y - this.lineLen, this.x, this.y);

    let starAbsoluteY = (this.y - this.lineLen) + this.starRelY;

    pg.push();
    pg.translate(this.x, starAbsoluteY);
    
    // 🎨 【视觉调整】：星星核心的发光晕圈透明度
    pg.noStroke();
    // 最后的 120 是光晕透明度。想让星星更通透柔和，可以调小（如 60）。
    pg.fill(255, 255, 255, 120);
    // 🎨 【视觉调整】：星星核心的发光晕圈大小（当前是短芒的3倍大小）
    pg.circle(0, 0, this.shortArm * 3);
    
    // 🎨 【视觉调整】：四芒星实体的透明度
    // 当前为255(不透明的实心白)。
    pg.fill(255, 255, 255, 255);
    pg.beginShape();
    for (let i = 0; i < 4; i++) {
      let angle = i * HALF_PI; 
      pg.vertex(cos(angle) * this.longArm, sin(angle) * this.longArm);
      
      let angle2 = angle + QUARTER_PI; 
      pg.vertex(cos(angle2) * this.shortArm, sin(angle2) * this.shortArm);
    }
    pg.endShape(CLOSE);
    pg.pop();
  }
}