    let leaves = [];
    let grasses = [];
    
    // 你可以随时调整这些颜色
    let leafColors = ['#5A7B3E', '#729A51', '#85B361', '#4A6931', '#90B86C'];
    let grassColors = ['#88B062', '#6B9446', '#A1C47B', '#577D38'];

    let branchImg, leafImg, strawImg;

    // ==============================================
    // ⚙️ 核心设置区
    // ==============================================
    
    // 秋千挂载点（你可以根据你画的树枝位置，在这里修改坐标！）
    // 这里的坐标是基于 1200x1600 的画布的
    let swingPivotX = 850; 
    let swingPivotY = 800; 

    // ==============================================

    function preload() {
      // 预加载三张图片。
      // 【注意】：请确保这三张图片尺寸都是 1200x1600，并且背景必须是透明的！
      branchImg = loadImage('branch.png');
      leafImg = loadImage('leaf.png');
      strawImg = loadImage('straw.png');
    }

    function setup() {
      createCanvas(1200, 1600);
      
      // 强制像素密度为1，这对于准确读取图片像素非常重要
      pixelDensity(1); 

      // 1. --- 解析树叶范围图片 (leaf.png) ---
      // 读取图片的像素数据
      leafImg.loadPixels();
      if (leafImg.pixels.length > 0) {
        // 增大了扫描步长 (从15改到22)，让树叶整体变稀疏
        for (let y = 0; y < leafImg.height; y += 22) {
          for (let x = 0; x < leafImg.width; x += 22) {
            // 获取该像素在数组中的索引 (RGBA)
            let idx = (x + y * leafImg.width) * 4;
            // 获取 Alpha 通道（透明度）
            let alpha = leafImg.pixels[idx + 3];
            
            // 如果你在该位置涂了颜色（不透明）
            if (alpha > 50) {
              // 减少了单个点的生成数量 (最多2片)
              let numLeaves = int(random(1, 3));
              for(let i = 0; i < numLeaves; i++) {
                leaves.push({
                  x: x + random(-15, 15),
                  y: y + random(-15, 15),
                  // 调小了树叶的半径 (原来是12-28)
                  r: random(12, 20), 
                  c: random(leafColors),
                  phase: random(TWO_PI) // 摇晃相位
                });
              }
            }
          }
        }
      }

      // 2. --- 解析稻田范围图片 (straw.png) ---
      strawImg.loadPixels();
      if (strawImg.pixels.length > 0) {
        // 稻草的扫描密度，x 决定多密，y 决定层次
        for (let y = 0; y < strawImg.height; y += 10) { 
          for (let x = 0; x < strawImg.width; x += 12) { 
            let idx = (x + y * strawImg.width) * 4;
            let alpha = strawImg.pixels[idx + 3];
            
            if (alpha > 50) {
              grasses.push({
                x: x + random(-6, 6),
                y: y + random(-6, 6),
                h: random(40, 100), // 画布放大，稻草也变长
                c: random(grassColors),
                weight: random(2, 5), // 稻草的粗细
                phase: x * 0.02 // 产生麦浪效果的相位
              });
            }
          }
        }
      }
      
      // 恢复高分屏显示，让画面更细腻
      pixelDensity(displayDensity());
    }

    function draw() {
      background('#F7F7F5'); // 米白背景
      
      // 适配屏幕，确保画面完整展示在浏览器中（按比例缩放，不改变实际渲染分辨率）
      let scaleFactor = min(windowWidth / 1200, windowHeight / 1600);
      translate((windowWidth - 1200 * scaleFactor) / 2, (windowHeight - 1600 * scaleFactor) / 2);
      scale(scaleFactor);
      
      let time = frameCount * 0.025; // 全局时间

      // 1. 绘制底层静态树枝图片并上色
      if (branchImg) {
        push();
        // 给图片染上灰棕色 (使用 tint 函数)
        tint('#8A7A6A'); 
        image(branchImg, 0, 0, 1200, 1600);
        pop();
      }

      // 2. 绘制摇晃的树叶
      drawDynamicLeaves(time);
      
      // 3. 绘制摇摆的秋千
      drawDynamicSwing(time);
      
      // 4. 绘制摇曳的稻田
      drawDynamicGrass(time);
    }

    function drawDynamicLeaves(time) {
      noStroke();
      for (let leaf of leaves) {
        // xOffset 控制树叶左右随风摇晃，幅度大约是 5 个像素
        let xOffset = sin(time + leaf.phase) * 5;
        fill(leaf.c);
        circle(leaf.x + xOffset, leaf.y, leaf.r);
      }
    }

    function drawDynamicGrass(time) {
      for (let grass of grasses) {
        // swayAngle 是风吹过产生的倾斜角
        let swayAngle = map(noise(grass.x * 0.02, grass.y * 0.02), 0, 1, -PI/8, PI/8) + sin(time * 1.5 + grass.phase) * 0.15;
        
        stroke(grass.c);
        strokeWeight(grass.weight);
        
        push();
        translate(grass.x, grass.y);
        rotate(swayAngle);
        line(0, 0, 0, -grass.h); // 从底向上画线段
        pop();
      }
    }

    function drawDynamicSwing(time) {
      push();
      // 将原点移动到树枝的挂载点
      translate(swingPivotX, swingPivotY);
      
      // 计算钟摆的旋转角度
      let swingAngle = sin(time * 1.2) * 0.15;
      rotate(swingAngle);
      
      // 增加了秋千绳子的长度，让人物往下移 (从 220 增加到 350)
      let dropLen = 480; 
      let spacing = 25;  // 两根绳子的间距

      // 画秋千绳子
      stroke('#8A8A8A');
      strokeWeight(3);
      line(-spacing, 0, -spacing, dropLen);
      line(spacing, 0, spacing, dropLen);
      
      noStroke();
      // 画秋千木板
      fill('#A67C52');
      rectMode(CENTER);
      rect(0, dropLen, 80, 14, 4);
      
      // 画人物裤子
      fill('#1F3A5C');
      rect(-18, dropLen - 20, 16, 60, 6);
      rect(8, dropLen - 20, 16, 60, 6);
      
      // 画靴子
      fill('#222');
      rect(-22, dropLen + 30, 24, 16, 4);
      rect(5, dropLen + 30, 24, 16, 4);
      
      // 画衣服
      fill('#142C4A');
      rect(-5, dropLen - 50, 45, 55, 8);
      
      // 画头和手
      fill('#DDA67A');
      circle(-5, dropLen - 95, 30); // 头
      circle(-28, dropLen - 40, 12); // 左手
      circle(18, dropLen - 40, 12);  // 右手
      
      pop();
    }

    function windowResized() {
      resizeCanvas(windowWidth, windowHeight);
    }