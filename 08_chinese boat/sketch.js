let lakeImg;
let boatImg;
let movingTexts = [];
const charCount = 150; 
const chineseCharsSet = "东方字绘本墨张中国古典魅力山水诗意浩淼流长古韵今风梦回水乡一叶扁舟墨染流年";


function preload() {
  // 加载图片并带有成功和失败的回调提示
  lakeImg = loadImage(
    'lake.png', 
    () => console.log("✅ lake.png 加载成功！"), 
    (err) => console.error("❌ lake.png 加载失败，原因：", err)
  );
  
  boatImg = loadImage(
    'boat.png', 
    () => console.log("✅ boat.png 加载成功！"), 
    (err) => console.error("❌ boat.png 加载失败，原因：", err)
  );
}

function draw() {
  background(248, 248, 245); 

  // 1. 绘制河流底图 (带排错检查)
  if (lakeImg && lakeImg.width > 0) {
    image(lakeImg, 0, 0, width, height);
  } else {
    // 如果 lake.png 没加载出来，画一个大红框提示
    push();
    stroke(255, 0, 0);
    strokeWeight(10);
    noFill();
    rect(0, 0, width, height);
    fill(255, 0, 0);
    noStroke();
    textSize(40);
    text("未找到 lake.png\n请检查左侧文件名和大小写", width / 2, height / 2);
    pop();
  }

  // 2. 更新并画出流动的文字
  for (let i = movingTexts.length - 1; i >= 0; i--) {
    let t = movingTexts[i];
    t.update();
    t.display();
    
    if (t.y < -50) {
      movingTexts.splice(i, 1);
      spawnText(false); 
    }
  }

  // 3. 绘制小船 (带排错检查)
  let boatX = width / 2 - 80; 
  let boatY = height - 400; 

  if (boatImg && boatImg.width > 0) {
    image(boatImg, boatX, boatY, 160, 120); 
  } else {
    // 如果 boat.png 没加载出来，画一个红色方块提示
    push();
    fill(255, 100, 100);
    rect(boatX, boatY, 160, 120);
    fill(255);
    textSize(20);
    text("船没找到", boatX + 80, boatY + 60);
    pop();
  }
}

function spawnText(isRandomY) {
  let t = new MovingText();
  if (isRandomY) {
    t.y = random(0, height);
  } else {
    t.y = height + random(20, 100);
  }
  movingTexts.push(t);
}

class MovingText {
  constructor() {
    this.text = chineseCharsSet[floor(random(chineseCharsSet.length))];
    this.y = 0;
    this.x = 0;
    this.baseSpeed = random(1.5, 2.5); 
    this.xOffset = random(-180, 180); 
  }

  update() {
    let speedMult = map(this.y, height, 0, 1.5, 0.3, true);
    this.y -= this.baseSpeed * speedMult;
    let basePathX = width / 2 + sin(this.y * 0.0035) * 250;
    let widthScale = map(this.y, height, 0, 1.0, 0.3, true);
    this.x = basePathX + (this.xOffset * widthScale);
  }

  display() {
    let size = map(this.y, height, 0, 80, 15, true);
    textSize(size);
    let textAlpha = 200; 
    if (this.y > height - 150) {
      textAlpha = map(this.y, height, height - 150, 0, 200, true);
    }
    if (this.y < 200) {
      textAlpha = map(this.y, 200, 0, 200, 0, true);
    }
    fill(255, 255, 255, textAlpha); 
    noStroke();
    textFont('KaiTi, "楷体", STKaiti, "Songti SC", serif'); 
    text(this.text, this.x, this.y);
  }
}