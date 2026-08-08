const CONFIG={
  canvasW:810,canvasH:1080,bgColor:"#F3F0E8",fps:45,

  // 文本框
  rowGap:25,xGapMin:-2,xGapMax:6,rowJitterY:6,
  overflowX:150,overflowY:50,maxItemsPerRow:26,
  textColor:"#2B2B2B",textSize:16,
  boxPadX:5,boxPadY:3,minBoxW:45,maxBoxW:280,
  boxFill:"#F7F4ED",boxStroke:"#1D1D1D",
  boxStrokeAlpha:115,boxStrokeWeight:0.7,

  // 高清缓存
  cardRenderScale:4,
  cachePerFrame:3,

  // 文本框摇摆
  initialAngleMin:-15,initialAngleMax:15,
  swingAmpMin:8,swingAmpMax:13,
  swingPeriodMin:1.8,swingPeriodMax:2.9,
  swingNoiseAmount:1,
  floatXMin:0.4,floatXMax:2,
  floatYMin:0.5,floatYMax:2.6,
  floatPeriodMin:4,floatPeriodMax:7.5,

  // 撑爆
  burstScaleMax:2,
  burstPrepareDuration:0.14,
  burstExpandDuration:0.36,
  burstFadeDuration:0.16,

  // 墨点
  particlesPerItemMin:4,particlesPerItemMax:7,
  particleSizeMin:1,particleSizeMax:3.5,
  particleSpeedMin:10,particleSpeedMax:42,
  particleAlphaMax:155,particleLife:4.2,

  // people.png
  personEnabled:true,
  personX:0.50,personY:0.53,
  personScale:0.10,personOpacity:255,
  personSwingAmp:9,personSwingPeriod:2.4,
  personFloatXAmp:3,personFloatYAmp:5,
  personFloatPeriod:3.2,

  // 关键词
  positiveMargin:55,
  positiveAlphaMax:220,
  positiveStartProgress:0.90,
  positiveStagger:2.5,
  bubblePopDuration:1.15,

  keywordBubbleAlphaMin:38,
  keywordBubbleAlphaMax:68,

  positiveFloatXMin:16,positiveFloatXMax:46,
  positiveFloatYMin:16,positiveFloatYMax:46,
  positiveFloatPeriodMin:7,positiveFloatPeriodMax:15,

  // 无字背景泡泡
  backgroundBubbleCount:24,
  backgroundBubbleSizeMin:35,
  backgroundBubbleSizeMax:150,
  backgroundBubbleAlphaMin:14,
  backgroundBubbleAlphaMax:38,
  backgroundBubbleStagger:3.5,
  backgroundBubbleFloatMin:15,
  backgroundBubbleFloatMax:60,
  backgroundBubblePeriodMin:8,
  backgroundBubblePeriodMax:18,

  // 时间
  holdDuration:4,
  dissolveDuration:10,
  positiveDuration:6,
  positiveDuration:6,
  restDuration:4,

  grainAmount:900,
  seed:20260808
};

CONFIG.totalDuration=
  CONFIG.holdDuration+
  CONFIG.dissolveDuration+
  CONFIG.positiveDuration+
  CONFIG.restDuration;


const INITIAL_WORDS=[
  "career","success","failure","normal","productive","stable",
  "responsible","mature","professional","ambitious","acceptable",
  "relationship","marriage","family","education","routine",
  "deadline","schedule","procedure","requirement","standard",
  "performance","compare","measure","evaluate","define","categorize",
  "social status","achievement","be useful","buy a house","save money",
  "make progress","grow up","fit in","keep moving","be realistic",
  "work harder","don't fall behind","prove yourself","good daughter",
  "good employee","good partner","good student","good citizen",
  "you should","you must","you need to","people expect",
  "the safe choice","the right choice","life goal","next milestone",
  "before thirty","five year plan","discipline","efficiency",
  "self control","optimization","future","target","result",
  "what comes next?","where are you going?","who are you?",
  "what do you do?","identity","obligation","responsibility",
  "valuable","beautiful","successful","interesting","talented",
  "correct","incorrect","normal life","ideal life","meaningful life"
];


const POSITIVE_ITEMS=[
  {word:"love",       scale:1.75,color:[255,150,190]},
  {word:"hope",       scale:1.30,color:[255,211,125]},
  {word:"freedom",    scale:1.50,color:[160,218,255]},
  {word:"care",       scale:1.08,color:[255,190,154]},
  {word:"choice",     scale:0.92,color:[193,225,178]},
  {word:"breath",     scale:0.82,color:[185,224,232]},
  {word:"courage",    scale:1.18,color:[255,165,136]},
  {word:"calm",       scale:1.15,color:[181,218,197]},
  {word:"light",      scale:0.95,color:[255,235,138]},
  {word:"trust",      scale:0.88,color:[199,190,232]},
  {word:"connection", scale:1.38,color:[175,211,244]},
  {word:"kindness",   scale:1.13,color:[239,185,213]},
  {word:"self",       scale:0.82,color:[213,196,235]},
  {word:"flow",       scale:0.95,color:[181,226,214]},
  {word:"warmth",     scale:1.40,color:[255,177,115]},
  {word:"gentleness", scale:1.10,color:[216,190,235]}
];


const BUBBLE_PALETTE=[
  [255,150,190],
  [255,186,161],
  [255,211,125],
  [255,177,115],
  [193,225,178],
  [181,218,197],
  [181,226,214],
  [160,218,255],
  [185,224,232],
  [175,211,244],
  [199,190,232],
  [213,196,235],
  [216,190,235],
  [239,185,213]
];


let personImg;
let personLoaded=false;

let textItems=[];
let positiveWords=[];
let backgroundBubbles=[];

let cardCache={};
let cacheIndex=0;

let grainLayer;

let initStage="cache";
let animationStartTime=0;


// ============================================================
// PRELOAD
// ============================================================

function preload(){
  personImg=loadImage(
    "people.png",
    ()=>personLoaded=true,
    ()=>personLoaded=false
  );
}


// ============================================================
// SETUP
// ============================================================

function setup(){
  createCanvas(CONFIG.canvasW,CONFIG.canvasH);

  pixelDensity(1);
  frameRate(CONFIG.fps);

  angleMode(DEGREES);
  rectMode(CENTER);
  imageMode(CENTER);

  textAlign(CENTER,CENTER);
  textFont("Times New Roman");

  randomSeed(CONFIG.seed);
  noiseSeed(CONFIG.seed);

  grainLayer=createGrainLayer();

  // 注意：
  // 这里不再一次性创建所有高清缓存
  initStage="cache";
  cacheIndex=0;
}


// ============================================================
// DRAW
// ============================================================

function draw(){

  background(CONFIG.bgColor);

  // ----------------------------------------------------------
  // 初始化阶段
  // ----------------------------------------------------------

  if(initStage!=="ready"){
    runIncrementalInitialization();
    drawLoadingScreen();
    return;
  }


  // ----------------------------------------------------------
  // 正式动画
  // ----------------------------------------------------------

  let seconds=
    (millis()-animationStartTime)/1000;

  let timeline=
    seconds%
    CONFIG.totalDuration;


  let dissolveProgress=
    constrain(
      (timeline-CONFIG.holdDuration)/
      CONFIG.dissolveDuration,
      0,
      1
    );


  drawTextItems(
    timeline,
    seconds
  );


  drawInkParticles(
    timeline,
    seconds
  );


  drawBackgroundBubbles(
    timeline,
    seconds
  );


  drawPositiveWords(
    timeline,
    seconds
  );


  drawPersonImage(
    seconds,
    dissolveProgress
  );


  image(
    grainLayer,
    0,
    0
  );
}


// ============================================================
// 分帧初始化
// ============================================================

function runIncrementalInitialization(){

  // ----------------------------------------------------------
  // STEP 1
  // 每帧只创建3张高清文本缓存
  // ----------------------------------------------------------

  if(initStage==="cache"){

    for(
      let n=0;
      n<CONFIG.cachePerFrame;
      n++
    ){

      if(
        cacheIndex>=
        INITIAL_WORDS.length
      ){
        initStage="layout";
        break;
      }

      let word=
        INITIAL_WORDS[
          cacheIndex
        ];

      if(!cardCache[word]){
        cardCache[word]=
          createCardForWord(word);
      }

      cacheIndex++;
    }

    return;
  }


  // ----------------------------------------------------------
  // STEP 2
  // 生成布局
  //
  // 这里已经不再createGraphics，
  // 所以速度非常快。
  // ----------------------------------------------------------

  if(initStage==="layout"){
    generateTextItems();
    initStage="positive";
    return;
  }


  // ----------------------------------------------------------
  // STEP 3
  // 关键词和背景泡泡
  // ----------------------------------------------------------

  if(initStage==="positive"){
    generatePositiveWords();
    generateBackgroundBubbles();

    animationStartTime=
      millis();

    initStage="ready";
  }
}


// ============================================================
// LOADING
// ============================================================

function drawLoadingScreen(){

  let progress=
    constrain(
      cacheIndex/
      INITIAL_WORDS.length,
      0,
      1
    );


  noStroke();

  fill(
    65,
    60,
    55,
    150
  );


  textFont(
    "Times New Roman"
  );

  textStyle(
    NORMAL
  );

  textSize(15);


  text(
    "preparing...",
    width/2,
    height/2-15
  );


  // loading line
  fill(
    45,
    42,
    40,
    45
  );

  rect(
    width/2,
    height/2+15,
    180,
    2
  );


  fill(
    45,
    42,
    40,
    150
  );

  rectMode(CORNER);

  rect(
    width/2-90,
    height/2+14,
    180*progress,
    2
  );

  rectMode(CENTER);
}


// ============================================================
// 创建单个高清文本缓存
// ============================================================

function createCardForWord(word){

  textSize(
    CONFIG.textSize
  );


  let w=
    constrain(
      textWidth(word)+
      CONFIG.boxPadX*2,
      CONFIG.minBoxW,
      CONFIG.maxBoxW
    );


  let h=
    CONFIG.textSize*1.05+
    CONFIG.boxPadY*2;


  return createHighResCard(
    word,
    w,
    h
  );
}


// ============================================================
// 4X HIGH RES CARD
// ============================================================

function createHighResCard(
  txt,
  w,
  h
){

  let s=
    CONFIG.cardRenderScale;


  let margin=5;


  let logicalW=
    w+
    margin*2;


  let logicalH=
    h+
    margin*2;


  let g=
    createGraphics(
      ceil(logicalW*s),
      ceil(logicalH*s)
    );


  g.pixelDensity(1);

  g.clear();

  g.scale(s);


  g.rectMode(CENTER);

  g.textAlign(
    CENTER,
    CENTER
  );

  g.textFont(
    "Times New Roman"
  );


  let cx=
    logicalW/2;

  let cy=
    logicalH/2;


  g.stroke(
    29,
    29,
    29,
    CONFIG.boxStrokeAlpha
  );


  g.strokeWeight(
    CONFIG.boxStrokeWeight
  );


  g.fill(
    CONFIG.boxFill
  );


  g.rect(
    cx,
    cy,
    w,
    h,
    0.8
  );


  g.noStroke();


  g.fill(
    CONFIG.textColor
  );


  g.textSize(
    CONFIG.textSize
  );


  g.text(
    txt,
    cx,
    cy-0.4
  );


  return{
    graphic:g,

    w:w,
    h:h,

    displayW:logicalW,
    displayH:logicalH
  };
}


// ============================================================
// GENERATE TEXT LAYOUT
// ============================================================

function generateTextItems(){

  textItems=[];


  let rowCount=
    ceil(
      (
        height+
        CONFIG.overflowY*2
      )/
      CONFIG.rowGap
    )+3;


  for(
    let row=0;
    row<rowCount;
    row++
  ){

    let baseY=
      -CONFIG.overflowY+
      row*
      CONFIG.rowGap;


    let x=
      -CONFIG.overflowX+
      random(
        -35,
        15
      );


    for(
      let col=0;
      col<CONFIG.maxItemsPerRow;
      col++
    ){

      if(
        x>
        width+
        CONFIG.overflowX
      )break;


      let txt=
        random(
          INITIAL_WORDS
        );


      let cached=
        cardCache[txt];


      let item={

        x:
          x+
          cached.w*0.5,


        y:
          baseY+
          random(
            -CONFIG.rowJitterY,
            CONFIG.rowJitterY
          ),


        card:
          cached,


        initialAngle:
          random(
            CONFIG.initialAngleMin,
            CONFIG.initialAngleMax
          ),


        swingAmp:
          random(
            CONFIG.swingAmpMin,
            CONFIG.swingAmpMax
          ),


        swingPeriod:
          random(
            CONFIG.swingPeriodMin,
            CONFIG.swingPeriodMax
          ),


        swingPhase:
          random(360),


        floatXAmp:
          random(
            CONFIG.floatXMin,
            CONFIG.floatXMax
          ),


        floatYAmp:
          random(
            CONFIG.floatYMin,
            CONFIG.floatYMax
          ),


        floatPeriod:
          random(
            CONFIG.floatPeriodMin,
            CONFIG.floatPeriodMax
          ),


        floatPhase:
          random(360),


        noiseOffset:
          random(1000),


        burstAt:
          CONFIG.holdDuration+
          random(
            0,
            CONFIG.dissolveDuration*
            0.88
          ),


        particles:[]
      };


      generateParticlesForItem(
        item
      );


      textItems.push(
        item
      );


      x+=
        cached.w+
        random(
          CONFIG.xGapMin,
          CONFIG.xGapMax
        );
    }
  }
}


// ============================================================
// PARTICLES
// ============================================================

function generateParticlesForItem(item){

  let count=
    floor(
      random(
        CONFIG.particlesPerItemMin,
        CONFIG.particlesPerItemMax+1
      )
    );


  for(
    let i=0;
    i<count;
    i++
  ){

    let direction=
      random(360);


    let speed=
      random(
        CONFIG.particleSpeedMin,
        CONFIG.particleSpeedMax
      );


    item.particles.push({

      ox:
        random(
          -item.card.w*0.40,
          item.card.w*0.40
        ),


      oy:
        random(
          -item.card.h*0.30,
          item.card.h*0.30
        ),


      vx:
        cos(direction)*
        speed,


      vy:
        sin(direction)*
        speed,


      size:
        random(
          CONFIG.particleSizeMin,
          CONFIG.particleSizeMax
        ),


      phase:
        random(360),


      wobble:
        random(
          3,
          9
        ),


      wobbleSpeed:
        random(
          24,
          56
        )
    });
  }
}


// ============================================================
// BURST
// ============================================================

function getBurstState(
  item,
  t
){

  let prepare=
    item.burstAt;


  let expand=
    prepare+
    CONFIG.burstPrepareDuration;


  let fade=
    expand+
    CONFIG.burstExpandDuration;


  let end=
    fade+
    CONFIG.burstFadeDuration;


  if(t<prepare){
    return{
      visible:true,
      scale:1,
      alpha:1
    };
  }


  if(t<expand){
    return{
      visible:true,
      scale:1,
      alpha:1
    };
  }


  if(t<fade){

    let p=
      constrain(
        (t-expand)/
        CONFIG.burstExpandDuration,
        0,
        1
      );


    return{
      visible:true,

      scale:
        lerp(
          1,
          CONFIG.burstScaleMax,
          easeOutBack(p)
        ),

      alpha:1
    };
  }


  if(t<end){

    let p=
      constrain(
        (t-fade)/
        CONFIG.burstFadeDuration,
        0,
        1
      );


    return{
      visible:true,

      scale:
        CONFIG.burstScaleMax,

      alpha:
        1-p
    };
  }


  return{
    visible:false,
    scale:
      CONFIG.burstScaleMax,
    alpha:0
  };
}


// ============================================================
// DRAW TEXT ITEMS
// ============================================================

function drawTextItems(
  timeline,
  seconds
){

  for(
    let item of textItems
  ){

    let state=
      getBurstState(
        item,
        timeline
      );


    if(
      !state.visible
    )continue;


    let cycle=
      (
        seconds/
        item.swingPeriod
      )*
      360+
      item.swingPhase;


    let angle=
      item.initialAngle+
      sin(cycle)*
      item.swingAmp+
      map(
        noise(
          item.noiseOffset+
          seconds*0.30
        ),
        0,
        1,
        -CONFIG.swingNoiseAmount,
        CONFIG.swingNoiseAmount
      );


    let fc=
      (
        seconds/
        item.floatPeriod
      )*
      360+
      item.floatPhase;


    let dx=
      cos(fc)*
      item.floatXAmp;


    let dy=
      sin(fc*0.83)*
      item.floatYAmp;


    push();


    translate(
      item.x+dx,
      item.y+dy
    );


    rotate(
      angle
    );


    scale(
      state.scale
    );


    tint(
      255,
      state.alpha*255
    );


    image(
      item.card.graphic,
      0,
      0,
      item.card.displayW,
      item.card.displayH
    );


    noTint();

    pop();
  }
}


// ============================================================
// DRAW INK
// ============================================================

function drawInkParticles(
  timeline,
  seconds
){

  noStroke();


  for(
    let item of textItems
  ){

    let start=
      item.burstAt+
      CONFIG.burstPrepareDuration+
      CONFIG.burstExpandDuration*
      0.72;


    if(
      timeline<
      start
    )continue;


    let life=
      timeline-
      start;


    if(
      life>
      CONFIG.particleLife
    )continue;


    let fadeOut=
      constrain(
        1-
        life/
        CONFIG.particleLife,
        0,
        1
      );


    let fadeIn=
      constrain(
        life/
        0.12,
        0,
        1
      );


    for(
      let p of item.particles
    ){

      let px=
        item.x+
        p.ox+
        p.vx*
        life*
        0.055;


      let py=
        item.y+
        p.oy+
        p.vy*
        life*
        0.055;


      px+=
        sin(
          seconds*
          p.wobbleSpeed+
          p.phase
        )*
        p.wobble*
        0.2;


      py+=
        cos(
          seconds*
          p.wobbleSpeed*
          0.72+
          p.phase
        )*
        p.wobble*
        0.2;


      let alpha=
        CONFIG.particleAlphaMax*
        fadeIn*
        fadeOut;


      fill(
        28,
        28,
        28,
        alpha
      );


      ellipse(
        px,
        py,
        p.size
      );
    }
  }
}


// ============================================================
// KEYWORD BUBBLES
// ============================================================

function generatePositiveWords(){

  positiveWords=[];


  let baseAppearTime=
    CONFIG.holdDuration+
    CONFIG.dissolveDuration*
    CONFIG.positiveStartProgress;


  for(
    let i=0;
    i<POSITIVE_ITEMS.length;
    i++
  ){

    let p=
      POSITIVE_ITEMS[i];


    let baseTextSize=
      random(
        22,
        29
      );


    positiveWords.push({

      text:p.word,
      color:p.color,


      size:
        baseTextSize*
        p.scale,


      x:
        random(
          CONFIG.positiveMargin,
          width-
          CONFIG.positiveMargin
        ),


      y:
        random(
          CONFIG.positiveMargin,
          height-
          CONFIG.positiveMargin
        ),


      phase:
        random(360),


      floatXAmp:
        random(
          CONFIG.positiveFloatXMin,
          CONFIG.positiveFloatXMax
        ),


      floatYAmp:
        random(
          CONFIG.positiveFloatYMin,
          CONFIG.positiveFloatYMax
        ),


      floatPeriod:
        random(
          CONFIG.positiveFloatPeriodMin,
          CONFIG.positiveFloatPeriodMax
        ),


      appearAt:
        baseAppearTime+
        random(
          0,
          CONFIG.positiveStagger
        ),


      alphaMax:
        random(
          CONFIG.positiveAlphaMax*
          0.82,
          CONFIG.positiveAlphaMax
        ),


      bubbleSize:
        random(
          62,
          105
        )*
        p.scale,


      bubbleAlpha:
        random(
          CONFIG.keywordBubbleAlphaMin,
          CONFIG.keywordBubbleAlphaMax
        ),


      rotAmp:
        random(
          -3,
          3
        ),


      rotPeriod:
        random(
          7,
          14
        )
    });
  }
}


// ============================================================
// BACKGROUND BUBBLES
// ============================================================

function generateBackgroundBubbles(){

  backgroundBubbles=[];


  let baseAppearTime=
    CONFIG.holdDuration+
    CONFIG.dissolveDuration*
    CONFIG.positiveStartProgress;


  for(
    let i=0;
    i<CONFIG.backgroundBubbleCount;
    i++
  ){

    let colorValue=
      random(
        BUBBLE_PALETTE
      );


    let size=
      random(
        CONFIG.backgroundBubbleSizeMin,
        CONFIG.backgroundBubbleSizeMax
      );


    if(
      random()<0.18
    ){

      size*=
        random(
          1.25,
          1.65
        );
    }


    backgroundBubbles.push({

      x:
        random(
          -20,
          width+20
        ),


      y:
        random(
          -20,
          height+20
        ),


      size:size,


      color:
        colorValue,


      alpha:
        random(
          CONFIG.backgroundBubbleAlphaMin,
          CONFIG.backgroundBubbleAlphaMax
        ),


      appearAt:
        baseAppearTime+
        random(
          0,
          CONFIG.backgroundBubbleStagger
        ),


      popDuration:
        random(
          0.9,
          1.6
        ),


      phase:
        random(360),


      floatXAmp:
        random(
          CONFIG.backgroundBubbleFloatMin,
          CONFIG.backgroundBubbleFloatMax
        ),


      floatYAmp:
        random(
          CONFIG.backgroundBubbleFloatMin,
          CONFIG.backgroundBubbleFloatMax
        ),


      floatPeriod:
        random(
          CONFIG.backgroundBubblePeriodMin,
          CONFIG.backgroundBubblePeriodMax
        )
    });
  }
}


// ============================================================
// DRAW BACKGROUND BUBBLES
// ============================================================

function drawBackgroundBubbles(
  timeline,
  seconds
){

  for(
    let bubble of backgroundBubbles
  ){

    if(
      timeline<
      bubble.appearAt
    )continue;


    let progress=
      constrain(
        (
          timeline-
          bubble.appearAt
        )/
        bubble.popDuration,
        0,
        1
      );


    let scaleValue=
      elasticBubbleEase(
        progress
      );


    let alphaProgress=
      constrain(
        progress*1.7,
        0,
        1
      );


    let cycle=
      (
        seconds/
        bubble.floatPeriod
      )*
      360+
      bubble.phase;


    let dx=
      cos(cycle)*
      bubble.floatXAmp;


    let dy=
      sin(
        cycle*
        0.73
      )*
      bubble.floatYAmp;


    push();


    translate(
      bubble.x+dx,
      bubble.y+dy
    );


    scale(
      scaleValue
    );


    drawColorBubble(
      0,
      0,
      bubble.size,
      bubble.color,
      bubble.alpha*
      alphaProgress
    );


    pop();
  }
}


// ============================================================
// DRAW KEYWORDS
// ============================================================

function drawPositiveWords(
  timeline,
  seconds
){

  for(
    let item of positiveWords
  ){

    if(
      timeline<
      item.appearAt
    )continue;


    let progress=
      constrain(
        (
          timeline-
          item.appearAt
        )/
        CONFIG.bubblePopDuration,
        0,
        1
      );


    let popScale=
      elasticBubbleEase(
        progress
      );


    let alphaProgress=
      constrain(
        progress*
        1.8,
        0,
        1
      );


    let cycle=
      (
        seconds/
        item.floatPeriod
      )*
      360+
      item.phase;


    let fx=
      cos(cycle)*
      item.floatXAmp;


    let fy=
      sin(
        cycle*
        0.79
      )*
      item.floatYAmp;


    let rot=
      sin(
        (
          seconds/
          item.rotPeriod
        )*
        360+
        item.phase
      )*
      item.rotAmp;


    push();


    translate(
      item.x+fx,
      item.y+fy
    );


    rotate(rot);


    scale(
      popScale
    );


    drawColorBubble(
      0,
      0,
      item.bubbleSize,
      item.color,
      item.bubbleAlpha*
      alphaProgress
    );


    noStroke();


    fill(
      58,
      53,
      50,
      item.alphaMax*
      alphaProgress
    );


    // ★ 普通字重，不加粗
    textFont(
      "Georgia"
    );


    textStyle(
      NORMAL
    );


    textSize(
      item.size
    );


    text(
      item.text,
      0,
      0
    );


    textFont(
      "Times New Roman"
    );


    pop();
  }
}


// ============================================================
// COLOR BUBBLE
// ============================================================

function drawColorBubble(
  x,
  y,
  size,
  c,
  alphaBase
){

  noStroke();


  fill(
    c[0],
    c[1],
    c[2],
    alphaBase*0.10
  );

  ellipse(
    x,y,
    size*1.38
  );


  fill(
    c[0],
    c[1],
    c[2],
    alphaBase*0.17
  );

  ellipse(
    x,y,
    size*1.22
  );


  fill(
    c[0],
    c[1],
    c[2],
    alphaBase*0.26
  );

  ellipse(
    x,y,
    size*1.05
  );


  fill(
    c[0],
    c[1],
    c[2],
    alphaBase*0.39
  );

  ellipse(
    x,y,
    size*0.88
  );


  fill(
    c[0],
    c[1],
    c[2],
    alphaBase*0.43
  );

  ellipse(
    x,y,
    size*0.68
  );
}


// ============================================================
// PERSON
// ============================================================

function drawPersonImage(
  seconds,
  dissolveProgress
){

  if(
    !CONFIG.personEnabled||
    !personLoaded
  )return;


  let calm=
    lerp(
      1,
      0.04,
      easeInOutCubic(
        dissolveProgress
      )
    );


  let px=
    width*
    CONFIG.personX;


  let py=
    height*
    CONFIG.personY;


  let swing=
    sin(
      (
        seconds/
        CONFIG.personSwingPeriod
      )*
      360
    )*
    CONFIG.personSwingAmp*
    calm;


  let dx=
    cos(
      (
        seconds/
        CONFIG.personFloatPeriod
      )*
      360
    )*
    CONFIG.personFloatXAmp*
    calm;


  let dy=
    sin(
      (
        seconds/
        CONFIG.personFloatPeriod
      )*
      360*
      0.86
    )*
    CONFIG.personFloatYAmp*
    calm;


  let w=
    personImg.width*
    CONFIG.personScale;


  let h=
    personImg.height*
    CONFIG.personScale;


  push();


  translate(
    px+dx,
    py+dy
  );


  rotate(
    swing
  );


  tint(
    255,
    CONFIG.personOpacity
  );


  image(
    personImg,
    0,
    0,
    w,
    h
  );


  noTint();


  pop();
}


// ============================================================
// EASING
// ============================================================

function easeOutBack(x){

  const c1=1.70158;
  const c3=c1+1;


  return(
    1+
    c3*
    pow(x-1,3)+
    c1*
    pow(x-1,2)
  );
}


function easeInOutCubic(x){

  return(
    x<0.5
      ?4*x*x*x
      :1-
       pow(-2*x+2,3)/
       2
  );
}


function elasticBubbleEase(x){

  if(x<=0)return 0;
  if(x>=1)return 1;


  let base=
    1-
    pow(
      1-x,
      4
    );


  let bounce=
    sin(
      x*540
    )*
    (1-x)*
    0.24;


  return(
    base+
    bounce
  );
}


// ============================================================
// GRAIN
// ============================================================

function createGrainLayer(){

  let g=
    createGraphics(
      width,
      height
    );


  g.pixelDensity(1);

  g.clear();

  g.noStroke();


  for(
    let i=0;
    i<CONFIG.grainAmount;
    i++
  ){

    let gx=
      random(width);


    let gy=
      random(height);


    let size=
      random(
        0.5,
        1.2
      );


    if(
      random()<0.55
    ){

      g.fill(
        0,
        random(
          3,
          9
        )
      );

    }else{

      g.fill(
        255,
        random(
          2,
          7
        )
      );
    }


    g.ellipse(
      gx,
      gy,
      size,
      size
    );
  }


  return g;
}


// ============================================================
// KEYS
// ============================================================

function keyPressed(){

  if(
    key==="s"||
    key==="S"
  ){

    saveCanvas(
      "word-frame-sea",
      "png"
    );
  }


  if(
    key==="r"||
    key==="R"
  ){

    randomSeed(
      CONFIG.seed
    );

    noiseSeed(
      CONFIG.seed
    );

    generateTextItems();
    generatePositiveWords();
    generateBackgroundBubbles();

    animationStartTime=
      millis();
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