// ==========================================
// 视觉参数与核心配置 (方便你随时修改)
// ==========================================

const IMG_BG = 'bg.png';       
const IMG_SMOKE = 'smoke.png';       // 作为视觉背景的艺术烟雾图
const IMG_SMOKE_PATH = 'smoke2.png'; // 💡 新增：专门用来提取文字路径的隐藏烟雾图
const IMG_INCENSE = 'incense.png'; 

// 2. 文字与动画参数
const TEXT_CONTENT = "不知原是梦，但见包藏无限意。未消香，渐成灰..."; 
const TEXT_SPEED = 0.0003;        // 文字飘动的整体速度 (因为重采样后速度会变均匀，微调了数值)
const BASE_FONT_SIZE = 10;         
const BASE_CHAR_SPACING = 0.008;  // 整体文字密度 (越小越紧密)

// 3. 路径自动寻找参数
const SCAN_START_Y = 1300; 
const SCAN_END_Y = 20;    
const SCAN_Y_STEP = 1;       // 改为 1，逐像素精确扫描，防止漏掉横向平缓的曲线
const PATH_SMOOTH_DIST = 10; // 现升级为：强制的物理间距，确保文字在任何弯道速度绝对均匀！

// 4. 疏密与大小控制
const MIN_SCALE = 0.6; 
const MAX_SCALE = 3.1; 

const DENSITY_ZONES = 4;       
const DENSITY_STRENGTH = 0.022; 
const ROTATION_WEIGHT = 0.06; 

// ==========================================
// 系统变量 (请勿随意修改)
// ==========================================
let bgImg, smokeImg, smokePathImg, incenseImg; // 💡 新增 smokePathImg 变量用来存放路径图
let customFont; // 存放自定义字体的变量
let timeOffset = 0; 
let controlPoints = []; 

function preload() {
  bgImg = loadImage(IMG_BG);
  smokeImg = loadImage(IMG_SMOKE);
  smokePathImg = loadImage(IMG_SMOKE_PATH); // 💡 加载只用于计算路径的图片
  incenseImg = loadImage(IMG_INCENSE);
  
  // 加载你的 ttf 字体文件
  customFont = loadFont('ft.ttf'); 
}

function setup() {
  // 💡 检查路径图是否成功加载
  if (!smokePathImg) {
    console.error("无法加载烟雾路径图，路径自动识别失败。");
    return;
  }
  createCanvas(bgImg.width, bgImg.height);
  textAlign(CENTER, CENTER);
  
  // 应用你加载的自定义字体
  textFont(customFont); 

  // 💡 将计算路径的图像换成 smokePathImg (smoke2.png)
  autoPreprocessPath(smokePathImg); 
}

function draw() {
  image(bgImg, 0, 0);
  image(incenseImg, 0, 0);
  image(smokeImg, 0, 0); // 💡 视觉上依然画 smokeImg (smoke.png)，不画 smokePathImg，使其隐藏

  if (controlPoints.length >= 4) {
    drawDynamicText();
  }
}

// ==========================================
// 核心逻辑函数
// ==========================================

function autoPreprocessPath(img) {
  if (!img) return;
  img.loadPixels(); 

  let rawPoints = [];
  
  // 第一步：极高精度扫描，获取原始路径所有像素点
  for (let y = SCAN_START_Y; y >= SCAN_END_Y; y -= SCAN_Y_STEP) {
    let foundX = -1; 
    for (let x = 0; x < img.width; x++) {
      let index = (x + y * img.width) * 4; 
      let a = img.pixels[index + 3]; 
      if (a > 0) {
        foundX = x;
        break; 
      }
    }
    if (foundX !== -1) {
      rawPoints.push({ x: foundX, y: y });
    }
  }

  if (rawPoints.length == 0) return;

  // 第二步：核心修复 -> 路径等距重采样 (解决忽快忽慢问题)
  let scannedPoints = resamplePath(rawPoints, PATH_SMOOTH_DIST);

  // 第三步：添加 Catmull-Rom 首尾辅助点
  if (scannedPoints.length >= 2) {
    let p1 = scannedPoints[0];
    let p2 = scannedPoints[1];
    controlPoints.push({ x: p1.x - (p2.x - p1.x), y: p1.y + (p1.y - p2.y) * 2 }); 
  }

  for (let p of scannedPoints) {
    controlPoints.push(p);
  }

  if (scannedPoints.length >= 2) {
    let plast = scannedPoints[scannedPoints.length - 1];
    let p2last = scannedPoints[scannedPoints.length - 2];
    controlPoints.push({ x: plast.x + (plast.x - p2last.x), y: plast.y - (p2last.y - plast.y) * 2 });
  }
}

// 等距重采样算法
// 它像尺子一样，顺着崎岖的曲线每隔 exact spacing 准确切出一刀，强制保证物理距离相等
function resamplePath(points, spacing) {
  let result = [points[0]];
  let distanceAccumulated = 0;
  
  for (let i = 0; i < points.length - 1; i++) {
    let p1 = points[i];
    let p2 = points[i+1];
    let segmentLength = dist(p1.x, p1.y, p2.x, p2.y);
    
    // 如果累积距离超过了要求间距，就在这条线段上插值生成一个新点
    while (distanceAccumulated + segmentLength >= spacing) {
      let diff = spacing - distanceAccumulated;
      let ratio = diff / segmentLength;
      
      let newPoint = {
        x: lerp(p1.x, p2.x, ratio),
        y: lerp(p1.y, p2.y, ratio)
      };
      
      result.push(newPoint);
      p1 = newPoint; // 将起点移动到新生成的点
      segmentLength = dist(p1.x, p1.y, p2.x, p2.y);
      distanceAccumulated = 0;
    }
    distanceAccumulated += segmentLength;
  }
  return result;
}

// 重写：无限文字流生成逻辑 (解决断层、源源不断问题)
function drawDynamicText() {
  timeOffset += TEXT_SPEED; 

  // 计算曲线上同时能容纳多少个字 (+1 防止边缘消失过早)
  let charsOnPath = Math.ceil(1.0 / BASE_CHAR_SPACING) + 1; 

  for (let k = 0; k < charsOnPath; k++) {
    // k=0 代表刚刚在起点生成的最新字符，k越大代表越靠近终点的旧字符
    let progress = (timeOffset % BASE_CHAR_SPACING) + k * BASE_CHAR_SPACING;
    
    // 超出路径范围的直接跳过
    if (progress < 0.0 || progress > 1.0) continue;
    
    // 计算这个字是自宇宙大爆炸以来的第几个生成的字 (全局绝对索引)
    let globalCharIndex = Math.floor(timeOffset / BASE_CHAR_SPACING) - k;
    
    // 将全局索引映射到你的文案中 (安全处理负数)
    let charIndex = globalCharIndex % TEXT_CONTENT.length;
    if (charIndex < 0) charIndex += TEXT_CONTENT.length;
    let charToDraw = TEXT_CONTENT[charIndex];
    
    // 应用疏密变化
    let visualProgress = progress + sin(progress * TWO_PI * DENSITY_ZONES) * DENSITY_STRENGTH;
    visualProgress = constrain(visualProgress, 0.0, 1.0);
    
    // 渲染
    let pos = getPointOnPath(visualProgress);
    if (!pos) continue;

    let currentScale = getScaleAtProgress(visualProgress);

    push();
    translate(pos.x, pos.y);
    rotate(pos.angle); 
    scale(currentScale);
    textSize(BASE_FONT_SIZE);
    fill(0); 
    noStroke();
    text(charToDraw, 0, 0); 
    pop();
  }
}

function getPointOnPath(t) {
  let validStartIndex = 1;
  let validEndIndex = controlPoints.length - 3;
  
  let mappedT = t * (validEndIndex - validStartIndex + 1) + validStartIndex;
  let segmentIndex = Math.floor(mappedT);
  segmentIndex = constrain(segmentIndex, validStartIndex, validEndIndex);
  let localT = mappedT - segmentIndex;

  let p0 = controlPoints[segmentIndex - 1];
  let p1 = controlPoints[segmentIndex];
  let p2 = controlPoints[segmentIndex + 1];
  let p3 = controlPoints[segmentIndex + 2];

  let x = curvePoint(p0.x, p1.x, p2.x, p3.x, localT);
  let y = curvePoint(p0.y, p1.y, p2.y, p3.y, localT);

  let tx = curveTangent(p0.x, p1.x, p2.x, p3.x, localT);
  let ty = curveTangent(p0.y, p1.y, p2.y, p3.y, localT);
  let rawAngle = atan2(ty, tx);

  let uprightDeviation = rawAngle + HALF_PI; 
  let finalAngle = uprightDeviation * ROTATION_WEIGHT;

  return { x: x, y: y, angle: finalAngle };
}

function getScaleAtProgress(t) {
  let baseScaleFactor = sin(PI * t); 
  return map(baseScaleFactor, 0, 1, MIN_SCALE, MAX_SCALE); 
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