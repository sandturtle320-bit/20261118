let walkSpriteSheet; 
let standSpriteSheet; 
let jumpSpriteSheet; 
let jumpMoveSpriteSheet; 
let fallingSpriteSheet; 
let attackSpriteSheet;  
let squatSpriteSheet;      
let squatMoveSpriteSheet;  
let muzzleFlashImg;     
let hitEffectImg;       

let characterX = 100;  
let characterY = 100;  
let velocityY = 0; 
let gravity = 0.8; 
let jumpStrength = -20; 

let facingDirection = 1; 
let currentFrame = 0; 
let lastFrameTime = 0; 
let previousAnimation = "stand"; 
let animationState = "stand"; 

// 遊戲畫面與關卡狀態
// "WORLD_MAP" | "LEVEL_INTRO" | "PLAYING" | "TRANSFORM_FREEZE" | "FLAG_SLIDE" | "WALK_TO_CASTLE" | "ENTERING_PIPE" | "BOSS_DEFEAT_CUTSCENE" | "GAME_OVER" | "ALL_CLEAR"
let gameState = "WORLD_MAP"; 
let currentLevel = 1;   // 1 = 1-1, 2 = 1-2, 3 = 1-3, 4 = 1-4
let is1_2Intro = false; 
let stateTimer = 0;     
let castleTargetX = 0;  
let hideCharacter = false; 

// World Map 大地圖選關變數
let selectedMapNode = 1;
let mapAvatarX = 0;
let mapAvatarY = 0;
let showMapItemDrawer = false;
let clearedLevels = [false, false, false, false, false];
let levelTimer = 400;
let lastLevelTimerTick = 0;

// 狀態系統變數
let isActionLocked = false; 
let isGliding = false; 
let isOnGround = false; 
let isShortJump = false; 
let featherFlapsLeft = 2;        // 羽翼披風每次滯空最多可振翅 2 次
let isAttacking = false;         
let hasFiredThisAttack = false;  
let isCrouching = false;         
let prevHitboxH = 46;            
let activeEffects = [];          

// 3層生命力梯度系統 (1 = 一般小隻, 2 = 蘑菇大隻, 3 = 能力強化狀態)
let powerLevel = 1;
let powerType = "none";
let reservedItem = null;         // 畫面中上方備用道具箱 ("mushroom" | "fire" | "feather" | "speed")

// 變身/受擊定格閃爍、無敵與無敵星計時器
let transformTimer = 0;          
let transformIsDamage = false;   
let transformFromBig = false;
let transformToBig = false;
let invincibleTimer = 0;         
let starTimer = 0;               

// 加速菇衝刺蓄力系統
let currentSprintBonus = 0;      

// 生命值與金幣計數系統
let lives = 3;
let coinCount = 0;
let score = 0;

// 場上實體陣列
let items = [];                  
let enemies = [];                
let playerFireballs = [];        
let brickParticles = [];         
let coins = []; 
let floatingTexts = []; 
let bumpingTiles = [];           

// 1-3 / 1-4 移動浮空平台系統
let movingPlatforms = [];
let platformCarryDX = 0;

// 1-4 魔王城專屬系統
let fireBars = [];
let boss = null;
let bossFireballs = [];
let bridgeCollapsing = false;
let bridgeCollapseTimer = 0;
let bridgeTiles = [];

// 動畫影格設定
const WALK_FRAME_COUNT = 8; 
const STAND_FRAME_COUNT = 7; 
const JUMP_FRAME_COUNT = 10; 
const JUMP_MOVE_FRAME_COUNT = 23; 
const FALLING_FRAME_COUNT = 3;    
const ATTACK_FRAME_COUNT = 12;   
const SQUAT_FRAME_COUNT = 5;        
const SQUAT_MOVE_FRAME_COUNT = 12;  

let spriteMetrics = {};
const BASE_FRAME_INTERVAL = 100;  
const MOVE_SPEED = 4; 

// 離線生成高質感像素材質包
let textures = {};

// --- 內建 8-bit 晶片音效與動態 BGM 合成引擎 ---
let audioMuted = false;
let bgmStep = 0;
let lastBgmNoteTime = 0;
let bgmOsc = null;
let bgmEnv = null;

function initAudioEngine() {
  if (!bgmOsc && typeof p5 !== "undefined" && p5.Oscillator) {
    bgmOsc = new p5.Oscillator('triangle');
    bgmEnv = new p5.Envelope();
    bgmEnv.setADSR(0.01, 0.08, 0.2, 0.1);
    bgmEnv.setRange(0.12, 0);
    bgmOsc.amp(0);
    bgmOsc.start();
  }
}

function playTone(freq, type = 'square', duration = 0.1, vol = 0.15, slideTo = null) {
  if (audioMuted || typeof p5 === "undefined" || !p5.Oscillator) return;
  try {
    userStartAudio();
    let osc = new p5.Oscillator(type);
    let env = new p5.Envelope();
    env.setADSR(0.005, duration * 0.4, 0.1, duration * 0.5);
    env.setRange(vol, 0);
    osc.freq(freq);
    osc.amp(0);
    osc.start();
    if (slideTo) {
      osc.freq(slideTo, duration);
    }
    env.play(osc);
    setTimeout(() => {
      try { osc.stop(); osc.dispose(); } catch (e) {}
    }, duration * 1000 + 80);
  } catch (e) {}
}

function playSFX(name) {
  if (audioMuted) return;
  if (name === "jump") {
    playTone(260, 'square', 0.16, 0.14, 580);
  } else if (name === "flap") {
    playTone(340, 'triangle', 0.12, 0.16, 660);
  } else if (name === "coin") {
    playTone(987.77, 'square', 0.07, 0.14);
    setTimeout(() => playTone(1318.51, 'square', 0.22, 0.14), 65);
  } else if (name === "powerup") {
    let notes = [330, 392, 659, 523, 587, 784];
    notes.forEach((f, idx) => setTimeout(() => playTone(f, 'square', 0.08, 0.14), idx * 55));
  } else if (name === "1up") {
    let notes = [330, 392, 659, 523, 587, 784, 1046.5];
    notes.forEach((f, idx) => setTimeout(() => playTone(f, 'triangle', 0.09, 0.2), idx * 65));
  } else if (name === "shrink") {
    let notes = [523, 440, 349, 261, 196];
    notes.forEach((f, idx) => setTimeout(() => playTone(f, 'sawtooth', 0.08, 0.14), idx * 65));
  } else if (name === "stomp") {
    playTone(220, 'square', 0.09, 0.16, 440);
  } else if (name === "kick") {
    playTone(180, 'triangle', 0.12, 0.18, 520);
  } else if (name === "shoot") {
    playTone(720, 'sawtooth', 0.1, 0.13, 180);
  } else if (name === "fireball") {
    playTone(540, 'square', 0.11, 0.14, 240);
  } else if (name === "brick") {
    playTone(140, 'sawtooth', 0.12, 0.18, 65);
  } else if (name === "death") {
    let notes = [493.88, 698.46, 698.46, 659.25, 587.33, 523.25];
    notes.forEach((f, idx) => setTimeout(() => playTone(f, 'square', 0.13, 0.16), idx * 110));
  } else if (name === "clear") {
    let notes = [261.63, 329.63, 392.00, 523.25, 392.00, 523.25];
    notes.forEach((f, idx) => setTimeout(() => playTone(f, 'square', 0.14, 0.16), idx * 120));
  } else if (name === "mapMove") {
    playTone(440, 'triangle', 0.06, 0.12, 587);
  }
}

function updateBGM() {
  if (audioMuted || gameState !== "PLAYING") return;
  initAudioEngine();
  if (!bgmOsc || !bgmEnv) return;

  const MELODY_1_1 = [659, 659, 0, 659, 0, 523, 659, 0, 784, 0, 0, 0, 392, 0, 0, 0];
  const MELODY_1_2 = [261, 523, 220, 440, 233, 466, 0, 0, 261, 523, 220, 440, 233, 466, 0, 0];
  const MELODY_1_3 = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1046, 880, 784, 659, 587];
  const MELODY_1_4 = [220, 233, 220, 246, 220, 261, 246, 233, 196, 207, 196, 220, 196, 233, 220, 196];
  const MELODY_STAR = [523, 523, 523, 440, 523, 0, 523, 440, 493, 493, 493, 392, 493, 0, 493, 392];

  let activeMelody = MELODY_1_1;
  let tempo = 175;

  if (starTimer > 0) {
    activeMelody = MELODY_STAR;
    tempo = 115;
  } else if (currentLevel === 2 && !is1_2Intro) {
    activeMelody = MELODY_1_2;
    tempo = 190;
  } else if (currentLevel === 3) {
    activeMelody = MELODY_1_3;
    tempo = 170;
  } else if (currentLevel === 4) {
    activeMelody = MELODY_1_4;
    tempo = 155;
  }

  if (millis() - lastBgmNoteTime >= tempo) {
    lastBgmNoteTime = millis();
    let freq = activeMelody[bgmStep % activeMelody.length];
    bgmStep++;
    if (freq > 0) {
      bgmOsc.setType(starTimer > 0 ? 'square' : (currentLevel === 4 ? 'sawtooth' : 'triangle'));
      bgmOsc.freq(freq);
      bgmEnv.play(bgmOsc);
    }
  }
}

// 地圖系統設定
const TILE_SIZE = 40; 
let cameraX = 0;      

const MAP_1_1 = [
  "                                                                                                                                                                                                                    ",
  "                                                                                                                                                                                                                    ",
  "                                                                                                                                                                                                                    ",
  "                                                                                                                                                                                                 |                  ",
  "                                                                                BBBBBBBB   BBB?                                                                                                  F                  ",
  "                      ?                                                                                                                                    BB?B                                  F                  ",
  "                                                                                                                                                                                                 F                  ",
  "            B?BMB                                                                  *                                  B?B                                                                        F                  ",
  "                                                                                                                                                       S  SS      BB      I                      F        CCC       ",
  "                                    PP                                                                                                                SS  SSS                                    F       CCCCC      ",
  "                            PP      PP      PP                      ?               ?  ?  ?     B         BB         B   B              P            SSS  SSSS             P                     F       CCCCC      ",
  "                    PP      PP      PP      PP                                                                                         PP           SSSS  SSSSS           PP         BB?B        F       CCCCC      ",
  "                    PP      PP      PP      PP                                                                                        PPP          SSSSS  SSSSSS         PPP                     S       CCCCC      ",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG  GGGGGGGGGGGGGGG   GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG  GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG  GGGGGGGGGGGGGGG   GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG  GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"
];

const MAP_1_2_INTRO = [
  "                              ",
  "                              ",
  "                              ",
  "                              ",
  "                              ",
  "                              ",
  "                              ",
  "                              ",
  "                    PP        ",
  "                    PP        ",
  "                    PP        ",
  "                  HHPP        ",
  "                  HHPP        ",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"
];

const MAP_1_2 = [
  "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB                                    ",
  "                                                                                                                                                                                                                    ",
  "                                                                                                                                                                                                                    ",
  "                                                                                                                                                                                                 |                  ",
  "                                                                    BBBBBB           BBBBBB                                        BBBBBBBBBBBB                                                  F                  ",
  "                                                                    B    B           B    B                                                                                                      F                  ",
  "                                                                    B ?M B           B ?? B               BBBB      BBBB                                                                         F                  ",
  "            ?????                                                   B    B           B    B                                 *                                     SS                             F                  ",
  "                                                                    BBBBBB           BBBBBB                                                                      SSS         I                   F        CCC       ",
  "                                           PP                                                                       PP                    PP                    SSSS                             F       CCCCC      ",
  "                                 PP        PP                                                       BB?B            PP                    PP                   SSSSS         P                   F       CCCCC      ",
  "                       PP        PP        PP                                                                       PP                    PP                  SSSSSS        PP                   F       CCCCC      ",
  "             S         PP        PP        PP                                                                       PP                    PP                 SSSSSSS       PPP                   S       CCCCC      ",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG   GGGGGGGGGGGGGGGGGGGGGG   GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG   GGGGGGGGGGGGGGGGGGGG   GGGGGGGGGGGGGGGGG   GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG   GGGGGGGGGGGGGGGGGGGGGG   GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG   GGGGGGGGGGGGGGGGGGGG   GGGGGGGGGGGGGGGGG   GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"
];

const MAP_1_3 = [
  "                                                                                                                                                                                                                    ",
  "                                                                                                                                                                                                                    ",
  "                                                                                                                                                                                                                    ",
  "                                                                                                                                                                                                 |                  ",
  "                                                                                     ?                                                                                                           F                  ",
  "                                          TTTTT                                                                                                                                TTTTTT            F                  ",
  "                        TTTT                                                      BBBBBBB                                     TTTTT                                                              F                  ",
  "                                                                                                                                                                     TTTT                        F                  ",
  "            B?MB                  TTTTT               TTTTTTT                                            TTTTTT                                           SS                                     F        CCC       ",
  "                                                                               BBBBBBBBBBBBB                                                             SSS                                     F       CCCCC      ",
  "                                                                                                                                                        SSSS                                     F       CCCCC      ",
  "                                                                                                   TTTT                                                SSSSS                                     F       CCCCC      ",
  "                                                                               TTTTTTTTTTTTT                                                          SSSSSS                                     S       CCCCC      ",
  "GGGGGGGGGGGGGGGGGG                                                                                                                               GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
  "GGGGGGGGGGGGGGGGGG                                                                                                                               GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG"
];

const MAP_1_4 = [
  "GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG",
  "G                                                                                                                                                                                                                  G",
  "G                                                                                                                                                                                                                  G",
  "G                                                                                                                                                                                                                  G",
  "G                                                                                                                                                                                                                  G",
  "G                                                   BBBBBBBBBBB                                                                                                                                                    G",
  "G                     ?                             B         B                                                                                                                                                    G",
  "G                                                   B   ?M?   B                                                                                 BBBBBBBB                                                           G",
  "G         B?MB                                      B         B                                                                                 B      B                                                           G",
  "G                                                   BBBBBBBBBBB                                     GGGGGGGGGG                                  B   I  B                                       A                   G",
  "G                                                                              GGG                  G        G                                                                                 S                   G",
  "G                        S                                                                          G        G                                                         DDDDDDDDDDDDDDDDDDDDDDDDD     CCCCCCCC      G",
  "G                       SS                                              E                           G        G                                                         G                       G     C      C      G",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGLLLLLLLLLLLLGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGLLLLLLLLLLLLLLGGGGGGGGGGGGGGGGGGGGGGGGGGLLLLLLLLLLLLLLLLLLGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGLLLLLLLLLLLLLLLLLLLLLLLGGGGGGGGGGGGGGGGGGG",
  "GGGGGGGGGGGGGGGGGGGGGGGGGGLLLLLLLLLLLLGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGLLLLLLLLLLLLLLGGGGGGGGGGGGGGGGGGGGGGGGGGLLLLLLLLLLLLLLLLLLGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGLLLLLLLLLLLLLLLLLLLLLLLGGGGGGGGGGGGGGGGGGG"
];

let levelMap = [];
let flagCol = -1; 
let nextPowerCycle = 0;

function loadLevelMap(sourceMap) {
  levelMap = [];
  flagCol = -1;
  bridgeTiles = [];
  for (let r = 0; r < sourceMap.length; r++) {
    let rowArr = sourceMap[r].split('');
    for (let c = 0; c < rowArr.length; c++) {
      if (rowArr[c] === '|' || rowArr[c] === 'F') {
        flagCol = c;
      }
      if (rowArr[c] === 'D') {
        bridgeTiles.push({ r: r, c: c });
      }
    }
    levelMap.push(rowArr);
  }
  bridgeTiles.sort((a, b) => b.c - a.c);
}

const BASE_HITBOX_W = 22;
const BASE_HITBOX_H = 46; 
const BIG_HITBOX_W = 28;
const BIG_HITBOX_H = 74;  

function preload() { 
  walkSpriteSheet = loadImage("action/walk/ALL3.png"); 
  standSpriteSheet = loadImage("action/stand/ALL1.png"); 
  jumpSpriteSheet = loadImage("action/jump/ALL2.png"); 
  jumpMoveSpriteSheet = loadImage("action/jumpforward/ALL4.png"); 
  fallingSpriteSheet = loadImage("action/falling/ALL5.png"); 
  
  squatSpriteSheet = loadImage("action/squat_down/squat_down.png", () => {}, () => console.error("找不到蹲下圖片")); 
  squatMoveSpriteSheet = loadImage("action/squat_down_move/squat_down_move.png", () => {}, () => console.error("找不到蹲下走路圖片")); 

  attackSpriteSheet = loadImage("action/attackA/ALL5.png", () => {}, () => console.error("找不到攻擊圖片")); 
  muzzleFlashImg = loadImage("action/special_effects/hit-removebg-preview.png", () => {}, () => console.error("找不到槍口特效")); 
  hitEffectImg = loadImage("action/special_effects/hited-removebg-preview.png", () => {}, () => console.error("找不到擊中特效")); 
} 

function measureSpriteMetrics(img, frameCount) {
  if (!img || img.width === 0) {
    return { contentHeight: 100, minY: 0, frameBottomPaddings: new Array(frameCount).fill(0), frameHeight: 100 };
  }
  img.loadPixels();
  let fw = floor(img.width / frameCount);
  let fh = img.height;
  let frameBottomPaddings = [];
  let maxContentHeight = 0;
  let globalMinY = fh;

  for (let f = 0; f < frameCount; f++) {
    let minY = fh;
    let maxY = 0;
    let startX = f * fw;
    let endX = startX + fw;

    for (let y = 0; y < fh; y++) {
      for (let x = startX; x < endX; x++) {
        let idx = (y * img.width + x) * 4;
        let alpha = img.pixels[idx + 3];
        if (alpha > 20) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (minY > maxY) {
      minY = 0;
      maxY = fh - 1;
    }
    if (minY < globalMinY) globalMinY = minY;
    let ch = maxY - minY + 1;
    if (ch > maxContentHeight) maxContentHeight = ch;
    frameBottomPaddings.push((fh - 1) - maxY);
  }

  return {
    contentHeight: maxContentHeight,
    minY: globalMinY,
    frameBottomPaddings: frameBottomPaddings,
    frameHeight: fh
  };
}

// --- 離線生成高品質像素材質包 ---
function buildTexturePack() {
  let gDay = createGraphics(TILE_SIZE, TILE_SIZE);
  gDay.noStroke();
  gDay.fill("#C85A32");
  gDay.rect(0, 0, TILE_SIZE, TILE_SIZE);
  gDay.fill("#9E3F1E");
  gDay.rect(6, 16, 10, 8, 2);
  gDay.rect(24, 26, 10, 8, 2);
  gDay.fill("#38B000");
  gDay.rect(0, 0, TILE_SIZE, 10);
  gDay.fill("#70E000");
  gDay.rect(0, 0, TILE_SIZE, 4);
  gDay.fill("#38B000");
  gDay.triangle(4, 10, 10, 16, 16, 10);
  gDay.triangle(22, 10, 28, 17, 34, 10);
  textures["G_DAY"] = gDay;

  let gUnder = createGraphics(TILE_SIZE, TILE_SIZE);
  gUnder.noStroke();
  gUnder.fill("#1D4E89");
  gUnder.rect(0, 0, TILE_SIZE, TILE_SIZE);
  gUnder.fill("#3A86FF");
  gUnder.rect(2, 2, TILE_SIZE - 4, 4);
  gUnder.fill("#0B2545");
  gUnder.rect(0, TILE_SIZE - 4, TILE_SIZE, 4);
  gUnder.rect(19, 0, 2, 20);
  gUnder.rect(0, 19, TILE_SIZE, 2);
  textures["G_UNDER"] = gUnder;

  let gSky = createGraphics(TILE_SIZE, TILE_SIZE);
  gSky.noStroke();
  gSky.fill("#6D597A");
  gSky.rect(0, 0, TILE_SIZE, TILE_SIZE);
  gSky.fill("#B56576");
  gSky.rect(0, 0, TILE_SIZE, 8);
  gSky.fill("#355070");
  gSky.rect(0, TILE_SIZE - 5, TILE_SIZE, 5);
  textures["G_SKY"] = gSky;

  let gCastle = createGraphics(TILE_SIZE, TILE_SIZE);
  gCastle.noStroke();
  gCastle.fill("#495057");
  gCastle.rect(0, 0, TILE_SIZE, TILE_SIZE);
  gCastle.fill("#6C757D");
  gCastle.rect(2, 2, 17, 16);
  gCastle.rect(21, 2, 17, 16);
  gCastle.rect(10, 21, 18, 17);
  gCastle.fill("#212529");
  gCastle.rect(0, 19, TILE_SIZE, 2);
  gCastle.rect(19, 0, 2, 20);
  gCastle.rect(8, 20, 2, 20);
  textures["G_CASTLE"] = gCastle;

  let brick = createGraphics(TILE_SIZE, TILE_SIZE);
  brick.noStroke();
  brick.fill("#B5432A");
  brick.rect(0, 0, TILE_SIZE, TILE_SIZE);
  brick.fill("#E07A5F");
  brick.rect(1, 1, 18, 3);
  brick.rect(21, 1, 18, 3);
  brick.rect(1, 21, 8, 3);
  brick.rect(11, 21, 18, 3);
  brick.rect(31, 21, 8, 3);
  brick.fill("#3D1E16");
  brick.rect(0, 18, TILE_SIZE, 2);
  brick.rect(0, 38, TILE_SIZE, 2);
  brick.rect(19, 0, 2, 18);
  brick.rect(9, 20, 2, 18);
  brick.rect(29, 20, 2, 18);
  textures["BRICK"] = brick;

  let qBox = createGraphics(TILE_SIZE, TILE_SIZE);
  qBox.noStroke();
  qBox.fill("#F4A261");
  qBox.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
  qBox.fill("#FFD166");
  qBox.rect(3, 3, TILE_SIZE - 6, TILE_SIZE - 6, 3);
  qBox.fill("#9C6644");
  qBox.rect(5, 5, 3, 3);
  qBox.rect(TILE_SIZE - 8, 5, 3, 3);
  qBox.rect(5, TILE_SIZE - 8, 3, 3);
  qBox.rect(TILE_SIZE - 8, TILE_SIZE - 8, 3, 3);
  qBox.textAlign(CENTER, CENTER);
  qBox.textSize(24);
  qBox.textStyle(BOLD);
  qBox.fill("#7F4F24");
  qBox.text("?", TILE_SIZE / 2 + 2, TILE_SIZE / 2 + 2);
  qBox.fill("#FFF3B0");
  qBox.text("?", TILE_SIZE / 2, TILE_SIZE / 2);
  textures["QBOX"] = qBox;

  let emptyBox = createGraphics(TILE_SIZE, TILE_SIZE);
  emptyBox.noStroke();
  emptyBox.fill("#582F0E");
  emptyBox.rect(0, 0, TILE_SIZE, TILE_SIZE, 4);
  emptyBox.fill("#7F4F24");
  emptyBox.rect(3, 3, TILE_SIZE - 6, TILE_SIZE - 6, 3);
  emptyBox.fill("#432818");
  emptyBox.rect(6, 6, 3, 3);
  emptyBox.rect(TILE_SIZE - 9, 6, 3, 3);
  emptyBox.rect(6, TILE_SIZE - 9, 3, 3);
  emptyBox.rect(TILE_SIZE - 9, TILE_SIZE - 9, 3, 3);
  textures["EMPTY"] = emptyBox;

  // 直立水管身體
  let pipe = createGraphics(TILE_SIZE, TILE_SIZE);
  pipe.noStroke();
  pipe.fill("#1B7F3A");
  pipe.rect(2, 0, TILE_SIZE - 4, TILE_SIZE);
  pipe.fill("#2EC4B6");
  pipe.rect(5, 0, 5, TILE_SIZE);
  pipe.fill("#80ED99");
  pipe.rect(12, 0, 10, TILE_SIZE);
  pipe.fill("#134E27");
  pipe.rect(TILE_SIZE - 8, 0, 6, TILE_SIZE);
  textures["PIPE"] = pipe;

  // 直立水管頂端寬管口凸緣 (Top Rim)
  let pipeTop = createGraphics(TILE_SIZE, TILE_SIZE);
  pipeTop.noStroke();
  pipeTop.fill("#1B7F3A");
  pipeTop.rect(2, 16, TILE_SIZE - 4, TILE_SIZE - 16);
  pipeTop.fill("#80ED99");
  pipeTop.rect(12, 16, 10, TILE_SIZE - 16);
  pipeTop.fill("#134E27");
  pipeTop.rect(TILE_SIZE - 8, 16, 6, TILE_SIZE - 16);
  pipeTop.fill("#0D3B1E");
  pipeTop.rect(0, 0, TILE_SIZE, 18, 3);
  pipeTop.fill("#2EC4B6");
  pipeTop.rect(2, 2, TILE_SIZE - 4, 14, 2);
  pipeTop.fill("#80ED99");
  pipeTop.rect(6, 2, 12, 14);
  pipeTop.fill("#134E27");
  pipeTop.rect(TILE_SIZE - 7, 2, 5, 14);
  pipeTop.fill("#0D3B1E");
  pipeTop.rect(2, 18, TILE_SIZE - 4, 3);
  textures["PIPE_TOP"] = pipeTop;

  // 水平橫向水管身體與管口
  let pipeH = createGraphics(TILE_SIZE, TILE_SIZE);
  pipeH.noStroke();
  pipeH.fill("#1B7F3A");
  pipeH.rect(0, 2, TILE_SIZE, TILE_SIZE - 4);
  pipeH.fill("#2EC4B6");
  pipeH.rect(0, 5, TILE_SIZE, 5);
  pipeH.fill("#80ED99");
  pipeH.rect(0, 12, TILE_SIZE, 10);
  pipeH.fill("#134E27");
  pipeH.rect(0, TILE_SIZE - 8, TILE_SIZE, 6);
  pipeH.fill("#0D3B1E");
  pipeH.rect(0, 0, 10, TILE_SIZE);
  pipeH.fill("#80ED99");
  pipeH.rect(2, 10, 6, 12);
  textures["PIPE_H"] = pipeH;

  let stair = createGraphics(TILE_SIZE, TILE_SIZE);
  stair.noStroke();
  stair.fill("#9C6644");
  stair.rect(0, 0, TILE_SIZE, TILE_SIZE);
  stair.fill("#DDB892");
  stair.triangle(0, 0, TILE_SIZE, 0, 0, TILE_SIZE);
  stair.fill("#7F5539");
  stair.triangle(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE, 0, TILE_SIZE);
  stair.fill("#B08968");
  stair.rect(6, 6, TILE_SIZE - 12, TILE_SIZE - 12);
  textures["STAIR"] = stair;
}

function setup() { 
  createCanvas(windowWidth, windowHeight); 
  imageMode(CENTER); 
  frameRate(60); 

  buildTexturePack();

  spriteMetrics["walk"]      = measureSpriteMetrics(walkSpriteSheet, WALK_FRAME_COUNT);
  spriteMetrics["stand"]     = measureSpriteMetrics(standSpriteSheet, STAND_FRAME_COUNT);
  spriteMetrics["jump"]      = measureSpriteMetrics(jumpSpriteSheet, JUMP_FRAME_COUNT);
  spriteMetrics["jumpMove"]  = measureSpriteMetrics(jumpMoveSpriteSheet, JUMP_MOVE_FRAME_COUNT);
  spriteMetrics["falling"]   = measureSpriteMetrics(fallingSpriteSheet, FALLING_FRAME_COUNT);
  spriteMetrics["attack"]    = measureSpriteMetrics(attackSpriteSheet, ATTACK_FRAME_COUNT);
  spriteMetrics["squat"]     = measureSpriteMetrics(squatSpriteSheet, SQUAT_FRAME_COUNT);
  spriteMetrics["squatMove"] = measureSpriteMetrics(squatMoveSpriteSheet, SQUAT_MOVE_FRAME_COUNT);
} 

function draw() { 
  if (gameState === "WORLD_MAP") {
    drawWorldMap();
    return;
  }

  if (gameState === "LEVEL_INTRO") {
    drawLevelIntro();
    return;
  }

  if (gameState === "GAME_OVER") {
    drawGameOver();
    return;
  }

  updateBGM();

  if (currentLevel === 1 || is1_2Intro) {
    background("#6b8cff"); 
  } else if (currentLevel === 2) {
    background("#0a0a12");
  } else if (currentLevel === 3) {
    background("#ff9a76");
  } else {
    background("#1a0505"); 
  }

  // 關卡倒數計時器
  if (gameState === "PLAYING") {
    if (millis() - lastLevelTimerTick >= 1000) {
      lastLevelTimerTick = millis();
      levelTimer--;
      if (levelTimer <= 0) {
        levelTimer = 0;
        handlePlayerDeath();
        return;
      }
    }
  }

  if (invincibleTimer > 0) {
    invincibleTimer -= deltaTime;
    if (invincibleTimer < 0) invincibleTimer = 0;
  }
  if (starTimer > 0) {
    starTimer -= deltaTime;
    if (starTimer < 0) starTimer = 0;
  }

  // --- 0.5 秒時間靜止變身／縮小演出 (TRANSFORM_FREEZE) ---
  if (gameState === "TRANSFORM_FREEZE") {
    transformTimer -= deltaTime;

    push();
    let mapOffsetY = height - (levelMap.length * TILE_SIZE);
    translate(-cameraX, mapOffsetY);

    drawMap();
    drawMovingPlatforms();
    drawEnemies();
    if (currentLevel === 4) {
      drawFireBars();
      drawBossAndFireballs();
    }

    let showPhaseA = (floor(transformTimer / 100) % 2 === 0);
    let activeSpriteSheet = standSpriteSheet;
    let activeFrameCount = STAND_FRAME_COUNT;
    let metric = spriteMetrics["stand"] || spriteMetrics["walk"];
    let frameWidth = activeSpriteSheet.width / activeFrameCount;
    let frameHeight = activeSpriteSheet.height;

    let displayRealH = showPhaseA ? (transformFromBig ? 80 : 53) : (transformToBig ? 80 : 53);
    let displayScale = displayRealH / metric.contentHeight;
    let currentHitboxH = (powerLevel >= 2) ? BIG_HITBOX_H : BASE_HITBOX_H;
    let hitboxBottomY = characterY + currentHitboxH / 2;
    let frameBottomPad = metric.frameBottomPaddings[0] || 0;
    let drawCenterY = hitboxBottomY - (frameHeight * displayScale) / 2 + frameBottomPad * displayScale;

    push();
    translate(characterX, drawCenterY);
    scale(facingDirection * displayScale, displayScale);
    if (!showPhaseA && powerLevel === 3) {
      tint(getPowerTintColor(powerType));
    }
    image(activeSpriteSheet, 0, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
    noTint();
    pop();

    pop();

    drawNSMBHUD();

    if (transformTimer <= 0) {
      let oldHitboxH = transformFromBig ? BIG_HITBOX_H : BASE_HITBOX_H;
      let newHitboxH = (powerLevel >= 2) ? BIG_HITBOX_H : BASE_HITBOX_H;
      characterY += (oldHitboxH - newHitboxH) / 2;
      prevHitboxH = newHitboxH;
      if (transformIsDamage) {
        invincibleTimer = 1000;
      }
      gameState = "PLAYING";
    }
    return;
  }

  let isBig = (powerLevel >= 2);

  // --- 蹲下狀態判斷 ---
  let standHitboxW = isBig ? BIG_HITBOX_W : BASE_HITBOX_W;
  let standHitboxH = isBig ? BIG_HITBOX_H : BASE_HITBOX_H;

  let currentFeetY = characterY + prevHitboxH / 2;
  let standCenterY = currentFeetY - standHitboxH / 2;
  let hasCeilingAbove = checkCollision(characterX, standCenterY, standHitboxW, standHitboxH);

  if (gameState === "PLAYING" && !isAttacking) {
    if (isOnGround && keyIsDown(DOWN_ARROW)) {
      isCrouching = true;
    } else if (isCrouching) {
      if (!hasCeilingAbove) {
        isCrouching = false;
      }
    }
  } else if (!hasCeilingAbove) {
    isCrouching = false;
  }

  let crouchHitboxFactor = isCrouching ? (isBig ? 0.5 : 0.75) : 1.0;
  let currentHitboxW = standHitboxW;
  let currentHitboxH = standHitboxH * crouchHitboxFactor;

  if (currentHitboxH !== prevHitboxH) {
    characterY += (prevHitboxH - currentHitboxH) / 2;
    prevHitboxH = currentHitboxH;
  }

  updateMovingPlatforms();
  updateBumpingTiles();
  updateEnemies(currentHitboxW, currentHitboxH);
  if (gameState === "TRANSFORM_FREEZE" || gameState === "GAME_OVER" || gameState === "LEVEL_INTRO") return;
  updatePlayerFireballs();

  if (currentLevel === 4) {
    updateFireBars(currentHitboxW, currentHitboxH);
    if (gameState === "TRANSFORM_FREEZE" || gameState === "GAME_OVER" || gameState === "LEVEL_INTRO") return;
    updateBossAndFireballs(currentHitboxW, currentHitboxH);
    if (gameState === "TRANSFORM_FREEZE" || gameState === "GAME_OVER" || gameState === "LEVEL_INTRO") return;
    updateBridgeCollapse();
  }

  // --- 1. 處理移動、加速菇漸進衝刺與過場 ---
  let moveX = 0; 
  let isMovingInput = (keyIsDown(RIGHT_ARROW) || keyIsDown(LEFT_ARROW)) && !isAttacking && !isCrouching;
  let wantsSprint = (powerType === "speed" && (keyIsDown(CONTROL) || keyIsDown(SHIFT)) && isMovingInput);

  if (wantsSprint) {
    currentSprintBonus = min(1.0, currentSprintBonus + 0.022);
  } else {
    currentSprintBonus = max(0.0, currentSprintBonus - 0.04);
  }

  let speedMultiplier = 1.0 + currentSprintBonus * 0.85;
  if (starTimer > 0) speedMultiplier = max(speedMultiplier, 1.3);

  let effectiveMoveSpeed = isCrouching ? (MOVE_SPEED / 3) : (MOVE_SPEED * speedMultiplier);

  if (gameState === "PLAYING") {
    if (!isAttacking) {
      if (keyIsDown(RIGHT_ARROW)) { moveX = effectiveMoveSpeed; facingDirection = 1; } 
      if (keyIsDown(LEFT_ARROW))  { moveX = -effectiveMoveSpeed; facingDirection = -1; } 
    }
    
    characterX += moveX + platformCarryDX; 
    characterX = constrain(characterX, currentHitboxW / 2, levelMap[0].length * TILE_SIZE - currentHitboxW / 2);

    if (flagCol !== -1) {
      let flagWallX = flagCol * TILE_SIZE + TILE_SIZE / 2;
      if (characterX + currentHitboxW / 2 > flagWallX) {
        characterX = flagWallX - currentHitboxW / 2;
      }
    }

    if (checkCollision(characterX, characterY, currentHitboxW, currentHitboxH)) {
      characterX -= (moveX + platformCarryDX); 
      currentSprintBonus = 0;
    }

    if (is1_2Intro && keyIsDown(RIGHT_ARROW)) {
      checkEnterPipe(characterX, characterY, currentHitboxW, currentHitboxH);
    }

    if (currentLevel === 4) {
      checkAxeTrigger(characterX, characterY, currentHitboxW, currentHitboxH);
    }

  } else if (gameState === "BOSS_DEFEAT_CUTSCENE") {
    velocityY += gravity;
    characterY += velocityY;
    if (checkCollision(characterX, characterY, currentHitboxW, currentHitboxH)) {
      let bottomTileRow = floor((characterY + currentHitboxH / 2) / TILE_SIZE);
      characterY = bottomTileRow * TILE_SIZE - currentHitboxH / 2 - 0.1;
      velocityY = 0;
      isOnGround = true;
    }
    if (!bridgeCollapsing && boss && !boss.alive) {
      gameState = "WALK_TO_CASTLE";
      castleTargetX = 198 * TILE_SIZE;
    }

  } else if (gameState === "FLAG_SLIDE") {
    velocityY = 5;
    characterY += velocityY;
    let groundTopY = 13 * TILE_SIZE - currentHitboxH / 2 - 0.1; 
    if (characterY >= groundTopY) {
      characterY = groundTopY;
      velocityY = 0;
      isOnGround = true;
      gameState = "WALK_TO_CASTLE";
    }

  } else if (gameState === "WALK_TO_CASTLE") {
    if (!hideCharacter) {
      moveX = 3;
      facingDirection = 1;
      characterX += moveX;
      if (characterX >= castleTargetX) {
        characterX = castleTargetX;
        hideCharacter = true; 
        stateTimer = millis();
      }
    } else {
      if (millis() - stateTimer > 1500) {
        clearedLevels[currentLevel] = true;
        if (currentLevel < 4) {
          selectedMapNode = currentLevel + 1;
          gameState = "WORLD_MAP";
        } else {
          gameState = "ALL_CLEAR";
        }
      }
    }

  } else if (gameState === "ENTERING_PIPE") {
    moveX = 2;
    facingDirection = 1;
    characterX += moveX;
    if (millis() - stateTimer > 900) {
      is1_2Intro = false;
      loadLevelMap(MAP_1_2);
      spawnLevelEnemies(2);
      characterX = 100;
      characterY = 100;
      velocityY = 0;
      hideCharacter = false;
      gameState = "PLAYING";
    }
  }

  // --- 2. 物理系統與碰撞偵測 ---
  platformCarryDX = 0;

  if (gameState === "PLAYING" || gameState === "WALK_TO_CASTLE") {
    if (isGliding && velocityY > 0) {
      velocityY += gravity * 0.2; 
      if (velocityY > 2) velocityY = 2; 
    } else {
      velocityY += gravity;    
    }
    
    let prevFeetY = characterY + currentHitboxH / 2;
    characterY += velocityY; 
    isOnGround = false; 
    
    if (velocityY < 0) {
      let headY = characterY - currentHitboxH / 2;
      let hitHiddenLeft  = checkHiddenBlockHit(characterX - currentHitboxW * 0.25, headY);
      let hitHiddenRight = checkHiddenBlockHit(characterX + currentHitboxW * 0.25, headY);
      if (hitHiddenLeft || hitHiddenRight) {
        let topTileRow = floor(headY / TILE_SIZE);
        characterY = (topTileRow + 1) * TILE_SIZE + currentHitboxH / 2 + 0.1;
        velocityY = 0;
      }
    }

    if (checkCollision(characterX, characterY, currentHitboxW, currentHitboxH)) {
      if (velocityY > 0) { 
        let bottomTileRow = floor((characterY + currentHitboxH / 2) / TILE_SIZE);
        characterY = bottomTileRow * TILE_SIZE - currentHitboxH / 2 - 0.1; 
        velocityY = 0; 
        isOnGround = true; 
        isGliding = false; 
        isActionLocked = false; 
        isShortJump = false; 
        featherFlapsLeft = 2;
      } else if (velocityY < 0) { 
        let topTileRow = floor((characterY - currentHitboxH / 2) / TILE_SIZE);
        characterY = (topTileRow + 1) * TILE_SIZE + currentHitboxH / 2 + 0.1; 
        velocityY = 0; 
        
        checkHitTile(characterX - currentHitboxW * 0.25, characterY - currentHitboxH / 2 - 4);
        checkHitTile(characterX + currentHitboxW * 0.25, characterY - currentHitboxH / 2 - 4);
      }
    }

    if (velocityY >= 0 && !isOnGround) {
      let newFeetY = characterY + currentHitboxH / 2;
      for (let mp of movingPlatforms) {
        if (characterX + currentHitboxW / 2 > mp.x && characterX - currentHitboxW / 2 < mp.x + mp.w) {
          if (prevFeetY <= mp.y + 8 && newFeetY >= mp.y) {
            characterY = mp.y - currentHitboxH / 2 - 0.1;
            velocityY = 0;
            isOnGround = true;
            isGliding = false;
            isActionLocked = false;
            isShortJump = false;
            featherFlapsLeft = 2;
            platformCarryDX = mp.dx;
            break;
          }
        }
      }
    }

    if (gameState === "PLAYING" && checkLavaHazard(characterX, characterY, currentHitboxW, currentHitboxH)) {
      handlePlayerDeath();
      return;
    }
  }

  if (gameState === "PLAYING") {
    checkFlagpole(characterX, characterY, currentHitboxW, currentHitboxH);
  }

  if (characterY > levelMap.length * TILE_SIZE + 200) {
    handlePlayerDeath();
    return;
  }

  // --- 3. 判斷動畫狀態 ---
  const isJumping = !isOnGround; 
  
  if (gameState === "FLAG_SLIDE") {
    animationState = "falling";
  } else if (gameState === "WALK_TO_CASTLE" || gameState === "ENTERING_PIPE") {
    animationState = "walk";
  } else if (isAttacking) {
    animationState = "attack"; 
  } else if (isActionLocked) {
    animationState = "jump";
  } else {
    if (isGliding) {
      animationState = "falling";
    } else if (isJumping) {
      if (previousAnimation === "jump") {
        animationState = "falling";
      } else if (moveX !== 0) {
        animationState = "jumpMove"; 
      } else {
        if (velocityY > 0) {
          animationState = "falling";
        } else {
          animationState = "jump";
          isActionLocked = true; 
        }
      }
    } else if (isCrouching) {
      if (moveX !== 0) {
        animationState = "squatMove";
      } else {
        animationState = "squat";
      }
    } else {
      if (moveX !== 0) {
        animationState = "walk";
      } else {
        animationState = "stand";
      }
    }
  }

  let activeSpriteSheet;
  let activeFrameCount;

  if (animationState === "attack") { activeSpriteSheet = attackSpriteSheet; activeFrameCount = ATTACK_FRAME_COUNT; }
  else if (animationState === "squatMove") { activeSpriteSheet = squatMoveSpriteSheet; activeFrameCount = SQUAT_MOVE_FRAME_COUNT; }
  else if (animationState === "squat") { activeSpriteSheet = squatSpriteSheet; activeFrameCount = SQUAT_FRAME_COUNT; }
  else if (animationState === "falling") { activeSpriteSheet = fallingSpriteSheet; activeFrameCount = FALLING_FRAME_COUNT; } 
  else if (animationState === "jumpMove") { activeSpriteSheet = jumpMoveSpriteSheet; activeFrameCount = JUMP_MOVE_FRAME_COUNT; } 
  else if (animationState === "jump") { activeSpriteSheet = jumpSpriteSheet; activeFrameCount = JUMP_FRAME_COUNT; } 
  else if (animationState === "walk") { activeSpriteSheet = walkSpriteSheet; activeFrameCount = WALK_FRAME_COUNT; } 
  else { activeSpriteSheet = standSpriteSheet; activeFrameCount = STAND_FRAME_COUNT; }
  
  const frameWidth = activeSpriteSheet.width / activeFrameCount; 
  const frameHeight = activeSpriteSheet.height; 

  const WALK_REAL_HEIGHT = isBig ? 80 : 53;
  let metric = spriteMetrics[animationState] || spriteMetrics["walk"];

  let targetContentHeight = WALK_REAL_HEIGHT;
  if (animationState === "squat" || animationState === "squatMove") {
    targetContentHeight = WALK_REAL_HEIGHT * 0.78 * 1.15;
  }

  let displayScale = targetContentHeight / metric.contentHeight;

  // --- 4. 動態播放速率控制 ---
  if (animationState !== previousAnimation) { 
    currentFrame = 0; 
    lastFrameTime = millis(); 
    previousAnimation = animationState; 
  } 

  let currentFrameInterval = BASE_FRAME_INTERVAL;
  if (animationState === "walk") {
    currentFrameInterval = BASE_FRAME_INTERVAL / (1.0 + currentSprintBonus * 1.35);
  } else if (animationState === "jumpMove") {
    currentFrameInterval = isShortJump ? 25 : 60; 
  } else if (animationState === "squat") {
    currentFrameInterval = 60; 
  }

  if (millis() - lastFrameTime >= currentFrameInterval) { 
    currentFrame++;
    lastFrameTime = millis(); 
    
    if (animationState === "attack") {
      if (currentFrame >= activeFrameCount) {
        isAttacking = false; 
        currentFrame = activeFrameCount - 1; 
      }
    } else if (animationState === "squat") {
      currentFrame = min(currentFrame, activeFrameCount - 1);
    } else if (animationState === "jump" && currentFrame >= JUMP_FRAME_COUNT) {
      isActionLocked = false;
      animationState = "falling";
      previousAnimation = "jump"; 
      currentFrame = 0;
    } else {
      currentFrame = currentFrame % activeFrameCount;
    }
  }
  currentFrame = min(currentFrame, activeFrameCount - 1);

  // --- 射擊與火焰花攻擊邏輯 ---
  if (isAttacking && (currentFrame === 6 || currentFrame === 7) && !hasFiredThisAttack) {
    let muzzleOffsetX = (WALK_REAL_HEIGHT * 0.75) * facingDirection; 
    let muzzleOffsetY = isBig ? -15 : -10; 
    
    let startX = characterX + muzzleOffsetX;
    let startY = characterY + muzzleOffsetY;

    if (powerType === "fire") {
      playSFX("fireball");
      playerFireballs.push({
        x: startX,
        y: startY,
        vx: 11.5 * facingDirection,
        vy: -1.2,
        life: 110
      });
    } else {
      playSFX("shoot");
    }

    let hitX = startX;
    let hitY = startY;
    let maxDistance = width; 
    let step = 10;           
    let currentDistance = 0;

    while (currentDistance < maxDistance) {
      hitX += step * facingDirection;
      currentDistance += step;

      let hitEnemy = false;
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        let en = enemies[ei];
        if (!en.dead && abs(hitX - en.x) < en.w / 2 + 8 && abs(hitY - en.y) < en.h / 2 + 8) {
          en.dead = true;
          en.vy = -6;
          score += 200;
          playSFX("kick");
          floatingTexts.push({ text: "+200", x: en.x, y: en.y - 20, vy: -1.5, life: 45 });
          hitEnemy = true;
          break;
        }
      }
      if (hitEnemy) break;

      if (currentLevel === 4 && boss && boss.alive && !boss.falling) {
        if (abs(hitX - boss.x) < boss.w / 2 && abs(hitY - boss.y) < boss.h / 2) {
          let dmg = (powerType === "fire") ? 3 : 1;
          boss.hp -= dmg;
          boss.flashTimer = 6;
          score += 200 * dmg;
          if (boss.hp <= 0) {
            boss.falling = true;
            boss.vy = -6;
            score += 15000;
            playSFX("clear");
            floatingTexts.push({ text: "+15000 BOSS DEFEATED!", x: boss.x - 60, y: boss.y - 60, vy: -1.5, life: 120 });
            gameState = "BOSS_DEFEAT_CUTSCENE";
          }
          break;
        }
      }
      
      let c = floor(hitX / TILE_SIZE);
      let r = floor(hitY / TILE_SIZE);
      
      if (r >= 0 && r < levelMap.length && c >= 0 && c < levelMap[0].length) {
        let tile = levelMap[r][c];
        if (tile !== ' ' && tile !== 'I' && tile !== 'A' && tile !== 'L' && tile !== '|' && tile !== 'F' && tile !== 'C') { 
          if (tile === 'B') {
            levelMap[r][c] = ' ';
            score += 50;
            playSFX("brick");
            spawnBrickParticles(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE + TILE_SIZE / 2);
          } else if (tile === '?') {
            levelMap[r][c] = 'E';
            addCoinAndScore(c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE);
          } else if (tile === 'M' || tile === '*') {
            levelMap[r][c] = 'E';
            spawnPowerupFromBlock(tile, c * TILE_SIZE + TILE_SIZE / 2, r * TILE_SIZE - TILE_SIZE / 2);
          }
          break; 
        }
      }
    }

    let effectScale = isBig ? 0.24 : 0.166;

    activeEffects.push({
      img: muzzleFlashImg,
      x: startX,
      y: startY,
      spawnTime: millis(),
      duration: 50,      
      scale: effectScale,      
      direction: facingDirection
    });

    activeEffects.push({
      img: hitEffectImg,
      x: hitX,
      y: hitY,
      spawnTime: millis(),
      duration: 50,      
      scale: effectScale,      
      direction: facingDirection
    });

    hasFiredThisAttack = true; 
  }

  // --- 5. 攝影機跟隨 ---
  let maxCameraX = max(0, levelMap[0].length * TILE_SIZE - width);
  cameraX = constrain(characterX - width / 3, 0, maxCameraX);

  // --- 6. 繪製世界 ---
  push(); 
  let mapOffsetY = height - (levelMap.length * TILE_SIZE);
  translate(-cameraX, mapOffsetY); 

  drawMap();
  drawMovingPlatforms();
  drawEnemies();
  if (currentLevel === 4) {
    drawFireBars();
    drawBossAndFireballs();
  }
  updateAndDrawItems(currentHitboxW, currentHitboxH);
  drawPlayerFireballs();
  updateAndDrawCoins(); 
  updateAndDrawBrickParticles();

  let isInvincibleHidden = (invincibleTimer > 0 && floor(invincibleTimer / 100) % 2 === 1);
  if (!hideCharacter && !isInvincibleHidden) {
    let hitboxBottomY = characterY + currentHitboxH / 2;
    let frameBottomPad = metric.frameBottomPaddings[currentFrame] || 0;
    let realFeetOffsetFromCanvasBottom = frameBottomPad * displayScale;
    let drawCenterY = hitboxBottomY - (frameHeight * displayScale) / 2 + realFeetOffsetFromCanvasBottom;

    if (currentSprintBonus > 0.45 && moveX !== 0) {
      push();
      translate(characterX - facingDirection * 14, drawCenterY);
      scale(facingDirection * displayScale, displayScale);
      tint(100, 220, 255, 110);
      image(activeSpriteSheet, 0, 0, frameWidth, frameHeight, currentFrame * frameWidth, 0, frameWidth, frameHeight);
      noTint();
      pop();
    }

    if (powerType === "feather") {
      push();
      translate(characterX - facingDirection * 12, drawCenterY - 4);
      fill("#FFF3B0");
      stroke("#E09F3E");
      strokeWeight(2);
      let wingFlap = sin(frameCount * 0.25) * 6;
      ellipse(0, wingFlap, 18, 28);
      pop();
    }

    push(); 
    translate(characterX, drawCenterY); 
    scale(facingDirection * displayScale, displayScale); 
    if (starTimer > 0) {
      colorMode(HSB, 360, 100, 100);
      tint((frameCount * 18) % 360, 85, 100);
    } else if (powerLevel === 3) {
      tint(getPowerTintColor(powerType));
    }
    image(activeSpriteSheet, 0, 0, frameWidth, frameHeight, currentFrame * frameWidth, 0, frameWidth, frameHeight); 
    noTint();
    pop(); 
  }

  if (gameState === "ENTERING_PIPE") {
    drawPipesOnly();
  }

  for (let i = activeEffects.length - 1; i >= 0; i--) {
    let ef = activeEffects[i];
    if (millis() - ef.spawnTime > ef.duration) {
      activeEffects.splice(i, 1); 
    } else {
      push();
      translate(ef.x, ef.y);
      scale(ef.direction * ef.scale, ef.scale); 
      image(ef.img, 0, 0); 
      pop();
    }
  }

  updateAndDrawFloatingTexts();

  pop(); 

  drawNSMBHUD();

  if (gameState === "ALL_CLEAR") {
    fill(0, 0, 0, 190);
    rect(0, 0, width, height);
    fill("#FFD700");
    textSize(52);
    textAlign(CENTER, CENTER);
    text("ALL COURSES CLEAR!", width / 2, height / 2 - 50);
    fill("#FF6B6B");
    textSize(26);
    text("你成功擊敗了熔岩魔王，拯救了整座王國！", width / 2, height / 2 + 5);
    fill(255);
    textSize(26);
    text(`FINAL SCORE: ${score}`, width / 2, height / 2 + 50);
    textSize(20);
    text("按 [M] 返回大地圖選關畫面", width / 2, height / 2 + 95);
  }
} 

// =====================================================================
// 《New Super Mario Bros. Wii》風格 UI 系統（大地圖 + 過場卡 + 遊戲 HUD）
// =====================================================================

// 繪製彩色立體「World 1-X」標題字樣
function drawColorfulWorldLogo(worldStr, x, y, size = 38) {
  const palette = ["#FF3B30", "#FF9500", "#FFCC00", "#34C759", "#32ADE6", "#AF52DE"];
  push();
  textFont("Arial Black, Impact, sans-serif");
  textStyle(BOLD);
  textSize(size);
  textAlign(LEFT, CENTER);

  let curX = x;
  for (let i = 0; i < worldStr.length; i++) {
    let ch = worldStr[i];
    if (ch === ' ') {
      curX += size * 0.35;
      continue;
    }
    stroke(0);
    strokeWeight(size * 0.22);
    fill(0);
    text(ch, curX + 2, y + 3);
    fill(palette[i % palette.length]);
    text(ch, curX, y);
    noStroke();
    curX += textWidth(ch) + 2;
  }
  pop();
}

// 繪製角色頭像徽章（依實際人物有效高度等比例縮放，不變扁也不過小）
function drawPlayerHeadBadge(cx, cy, radius = 20) {
  push();
  translate(cx, cy);
  stroke(0);
  strokeWeight(3);
  fill("#FFFFFF");
  ellipse(0, 0, radius * 2, radius * 2);

  if (standSpriteSheet && standSpriteSheet.width > 0) {
    let fw = standSpriteSheet.width / STAND_FRAME_COUNT;
    let fh = standSpriteSheet.height;
    let metric = spriteMetrics["stand"] || { contentHeight: fh, minY: 0 };
    // 只裁切人物上半身頭胸部區域，填滿圓形徽章
    let cropY = metric.minY;
    let cropH = metric.contentHeight * 0.58;
    let aspect = fw / cropH;
    let drawH = radius * 1.65;
    let drawW = drawH * aspect;
    imageMode(CENTER);
    image(standSpriteSheet, 0, 1, drawW, drawH, 0, cropY, fw, cropH);
  }
  pop();
}

// 1. 《NSMB Wii》風格遊戲內 HUD
function drawNSMBHUD() {
  push();
  textFont("Arial Black, sans-serif");
  textStyle(BOLD);

  // --- 左上角：角色頭像 × 命數 & 金幣圖示 × 金幣數 ---
  drawPlayerHeadBadge(44, 42, 21);

  stroke(0);
  strokeWeight(5);
  fill("#FFFFFF");
  textSize(24);
  textAlign(LEFT, CENTER);
  text(`× ${lives}`, 74, 44);

  // 金幣圖示
  push();
  translate(44, 84);
  stroke(0);
  strokeWeight(3);
  fill("#FFD166");
  ellipse(0, 0, 22, 28);
  noStroke();
  fill("#FFF3B0");
  rect(-2, -7, 4, 14, 2);
  pop();

  stroke(0);
  strokeWeight(5);
  fill("#FFD166");
  textSize(24);
  textAlign(LEFT, CENTER);
  text(`× ${nf(coinCount, 2)}`, 74, 85);

  // --- 正上方中央：備用道具箱 (按 B 空投) ---
  let boxSize = 58;
  let boxX = width / 2 - boxSize / 2;
  let boxY = 18;

  fill(15, 25, 45, 210);
  stroke(reservedItem ? "#FFD166" : "#FFFFFF");
  strokeWeight(3.5);
  rect(boxX, boxY, boxSize, boxSize, 12);
  noStroke();

  if (reservedItem) {
    drawPowerupIcon(reservedItem, width / 2, boxY + boxSize / 2 - 2, 1.15);
    stroke(0);
    strokeWeight(3);
    fill("#FFD166");
    textSize(12);
    textAlign(CENTER, BOTTOM);
    text("[B]", width / 2, boxY + boxSize - 1);
  } else {
    fill(200);
    textSize(11);
    textAlign(CENTER, CENTER);
    text("ITEM\n[B]", width / 2, boxY + boxSize / 2);
  }

  // --- 右上角：8位數分數 + 時鐘倒數 ---
  stroke(0);
  strokeWeight(5);
  fill("#FFFFFF");
  textSize(26);
  textAlign(RIGHT, CENTER);
  text(nf(score, 8), width - 32, 38);

  let timerTextX = width - 32;
  let timerY = 74;
  stroke(0);
  strokeWeight(5);
  fill(levelTimer <= 60 ? "#FF3B30" : "#FFD166");
  textSize(24);
  text(nf(levelTimer, 3), timerTextX, timerY);

  push();
  translate(timerTextX - 68, timerY - 1);
  stroke(0);
  strokeWeight(3);
  fill("#FFD166");
  ellipse(0, 0, 22, 22);
  line(0, 0, 0, -6);
  line(0, 0, 5, 0);
  pop();

  // --- 左下角：功能快捷提示膠囊 ---
  let stageLabel = is1_2Intro ? "1-2 ENTRANCE" : `1-${currentLevel}`;
  let powerShort = "NORMAL";
  if (powerLevel === 2) powerShort = "SUPER";
  if (powerLevel === 3) {
    let pNames = { fire: "FIRE FLOWER", feather: "FEATHER CAPE", speed: "SPEED BOOST [Ctrl]" };
    powerShort = pNames[powerType] || "SUPER";
  }
  if (starTimer > 0) powerShort += ` ★${(starTimer / 1000).toFixed(1)}s`;

  noStroke();
  fill(0, 0, 0, 120);
  rect(18, height - 38, 520, 26, 13);
  fill(255, 255, 255, 220);
  textFont("sans-serif");
  textStyle(NORMAL);
  textSize(13);
  textAlign(LEFT, CENTER);
  text(`WORLD ${stageLabel}  |  ${powerShort}  |  [M] 大地圖  [U] 音效:${audioMuted ? "關" : "開"}  [R] 重置`, 30, height - 25);

  pop();
}

// 2. 《NSMB Wii》風格大地圖選關畫面 (World 1 Overworld)
function getWorldMapNodes() {
  let yBase = height * 0.54;
  return [
    { id: 1, label: "1-1", title: "草原起點", x: width * 0.22, y: yBase + 35, type: "stage" },
    { id: 2, label: "1-2", title: "地下洞穴", x: width * 0.41, y: yBase - 35, type: "stage" },
    { id: 3, label: "1-3", title: "黃昏浮島", x: width * 0.60, y: yBase + 25, type: "stage" },
    { id: 4, label: "1-4", title: "熔岩魔王城", x: width * 0.80, y: yBase - 30, type: "castle" }
  ];
}

function drawWorldMap() {
  background("#5CC8FF");
  noStroke();
  fill(255, 255, 255, 190);
  ellipse(width * 0.18, height * 0.16, 130, 52);
  ellipse(width * 0.23, height * 0.15, 90, 44);
  ellipse(width * 0.72, height * 0.14, 150, 56);
  ellipse(width * 0.78, height * 0.13, 100, 45);

  fill("#70E000");
  ellipse(width * 0.25, height * 0.78, width * 0.75, height * 0.75);
  fill("#55C200");
  ellipse(width * 0.78, height * 0.80, width * 0.72, height * 0.78);
  fill("#38B000");
  rect(0, height * 0.68, width, height * 0.32);

  fill("#2B9348");
  arc(width * 0.12, height * 0.48, 120, 140, PI, TWO_PI);
  arc(width * 0.50, height * 0.44, 150, 170, PI, TWO_PI);
  arc(width * 0.88, height * 0.46, 130, 150, PI, TWO_PI);

  // 裝飾奇諾比奧香菇屋
  push();
  translate(width * 0.31, height * 0.40);
  fill("#FFF3B0");
  rect(-14, 0, 28, 22, 4);
  fill("#E63946");
  arc(0, 2, 46, 36, PI, TWO_PI);
  fill(255);
  ellipse(-10, -7, 9, 9);
  ellipse(10, -7, 9, 9);
  ellipse(0, -12, 10, 10);
  pop();

  let nodes = getWorldMapNodes();

  // 繪製黃沙色立體道路連線
  stroke("#C9963B");
  strokeWeight(18);
  noFill();
  beginShape();
  for (let n of nodes) vertex(n.x, n.y);
  endShape();

  stroke("#F4D58D");
  strokeWeight(12);
  beginShape();
  for (let n of nodes) vertex(n.x, n.y);
  endShape();
  noStroke();

  for (let n of nodes) {
    let isSelected = (selectedMapNode === n.id);
    let isCleared = clearedLevels[n.id];

    if (n.type === "castle") {
      push();
      translate(n.x, n.y - 34);
      stroke(0);
      strokeWeight(3);
      fill("#6C757D");
      rect(-32, -26, 64, 48, 4);
      fill("#495057");
      rect(-24, -44, 48, 22);
      fill("#E63946");
      triangle(-28, -44, 0, -68, 28, -44);
      fill("#1A0505");
      arc(0, 22, 24, 30, PI, TWO_PI);
      pop();
    }

    push();
    translate(n.x, n.y);
    stroke(0);
    strokeWeight(4);
    fill(isCleared ? "#38B000" : "#E63946");
    ellipse(0, 0, isSelected ? 46 : 38, isSelected ? 32 : 26);
    noStroke();
    fill(255, 255, 255, 160);
    ellipse(-5, -4, 14, 7);

    stroke(0);
    strokeWeight(4);
    fill("#FFFFFF");
    textFont("Arial Black, sans-serif");
    textSize(18);
    textAlign(CENTER, TOP);
    text(n.label, 0, 22);
    pop();
  }

  // 平滑移動大地圖上的角色小人（以實際人物有效高度縮放至 76px，比例修長自然）
  let targetNode = nodes[selectedMapNode - 1];
  if (mapAvatarX === 0 && mapAvatarY === 0) {
    mapAvatarX = targetNode.x;
    mapAvatarY = targetNode.y;
  } else {
    mapAvatarX = lerp(mapAvatarX, targetNode.x, 0.22);
    mapAvatarY = lerp(mapAvatarY, targetNode.y, 0.22);
  }

  if (standSpriteSheet && standSpriteSheet.width > 0) {
    let fw = standSpriteSheet.width / STAND_FRAME_COUNT;
    let fh = standSpriteSheet.height;
    let metric = spriteMetrics["stand"] || { contentHeight: fh, frameBottomPaddings: [0] };
    let targetRealH = 76; // 大地圖上角色的實際視覺身高
    let s = targetRealH / metric.contentHeight;
    let bottomPad = (metric.frameBottomPaddings[0] || 0) * s;
    let bounce = abs(sin(frameCount * 0.12)) * 5;
    let drawY = mapAvatarY - (fh * s) / 2 + bottomPad - bounce;
    image(standSpriteSheet, mapAvatarX, drawY, fw * s, fh * s, 0, 0, fw, fh);
  }

  // --- 左上角《NSMB Wii》風格 UI 區塊 ---
  drawColorfulWorldLogo(`World 1-${selectedMapNode}`, 34, 44, 38);

  drawPlayerHeadBadge(54, 102, 20);
  stroke(0);
  strokeWeight(5);
  fill("#FFFFFF");
  textFont("Arial Black, sans-serif");
  textSize(24);
  textAlign(LEFT, CENTER);
  text(`× ${lives}`, 84, 104);

  // --- 右上角關卡名稱 ---
  stroke(0);
  strokeWeight(5);
  fill("#FFD166");
  textSize(24);
  textAlign(RIGHT, CENTER);
  text(targetNode.title, width - 36, 44);

  // --- 右下角《NSMB Wii》風格 Items 備用道具按鈕 ---
  let itemBtnW = 140;
  let itemBtnH = 44;
  let itemBtnX = width - itemBtnW - 28;
  let itemBtnY = height - itemBtnH - 22;

  stroke(0);
  strokeWeight(3.5);
  fill(20, 30, 50, 210);
  rect(itemBtnX, itemBtnY, itemBtnW, itemBtnH, 22);
  noStroke();
  fill("#FFFFFF");
  textFont("Arial Black, sans-serif");
  textSize(17);
  textAlign(CENTER, CENTER);
  text("Items [I]", itemBtnX + itemBtnW / 2, itemBtnY + itemBtnH / 2);

  stroke(0);
  strokeWeight(4);
  fill("#FFFFFF");
  textSize(16);
  textAlign(LEFT, CENTER);
  text("← → 選擇關卡  ｜  Enter / 空白鍵 / 點擊進入關卡", 32, height - 42);

  if (showMapItemDrawer) {
    fill(0, 0, 0, 170);
    rect(0, 0, width, height);

    let panelW = 360;
    let panelH = 210;
    stroke("#FFD166");
    strokeWeight(4);
    fill("#1D2D44");
    rect(width / 2 - panelW / 2, height / 2 - panelH / 2, panelW, panelH, 18);

    noStroke();
    fill("#FFD166");
    textSize(22);
    textAlign(CENTER, TOP);
    text("備用道具箱 (ITEM STOCK)", width / 2, height / 2 - panelH / 2 + 20);

    if (reservedItem) {
      drawPowerupIcon(reservedItem, width / 2, height / 2 + 5, 1.6);
      fill(255);
      textSize(15);
      text("進入關卡後按 [B] 鍵即可呼叫空投！", width / 2, height / 2 + 50);
    } else {
      fill(190);
      textSize(16);
      text("目前備用道具箱是空的", width / 2, height / 2 + 10);
    }

    fill("#8D99AE");
    textSize(13);
    text("按 [I] 鍵關閉視窗", width / 2, height / 2 + panelH / 2 - 28);
  }
}

// 3. 《NSMB Wii》黑底關卡開場過場卡 (Level Intro Screen)
function drawLevelIntro() {
  background(0);

  drawColorfulWorldLogo(`World 1 - ${currentLevel}`, width / 2 - 125, height / 2 - 48, 44);

  drawPlayerHeadBadge(width / 2 - 45, height / 2 + 32, 24);
  stroke(255);
  strokeWeight(1);
  fill("#FFFFFF");
  textFont("Arial Black, sans-serif");
  textSize(28);
  textAlign(LEFT, CENTER);
  text(`× ${lives}`, width / 2 - 8, height / 2 + 34);

  if (millis() - stateTimer > 1500) {
    gameState = "PLAYING";
    lastLevelTimerTick = millis();
  }
}

function getPowerTintColor(type) {
  if (type === "fire") return color(255, 165, 130);
  if (type === "feather") return color(255, 245, 150);
  if (type === "speed") return color(135, 225, 255);
  return color(255);
}

// --- 獎勵加命 1-UP ---
function triggerOneUp(x, y) {
  lives++;
  playSFX("1up");
  floatingTexts.push({
    text: "1UP",
    x: x - 18,
    y: y - 20,
    vy: -1.8,
    life: 95,
    isOneUp: true
  });
}

// --- 蒐集金幣（每滿 10 枚自動加一條命） ---
function addCoinAndScore(cx, cy) {
  score += 100;
  coinCount++;
  playSFX("coin");
  coins.push({
    x: cx,
    y: cy,
    vy: -8,
    life: 20
  });
  if (coinCount >= 10) {
    coinCount -= 10;
    triggerOneUp(characterX, characterY - 30);
  }
}

// --- 繪製各類道具圖示 ---
function drawPowerupIcon(type, mx, my, scaleFactor = 1.0) {
  push();
  translate(mx, my);
  scale(scaleFactor);
  noStroke();

  if (type === "mushroom") {
    fill("#FFE4B5");
    rect(-8, 0, 16, 14, 3);
    fill("#E63946");
    arc(0, 2, 32, 28, PI, TWO_PI);
    fill(255);
    ellipse(-7, -5, 6, 6);
    ellipse(7, -5, 6, 6);
    ellipse(0, -9, 7, 7);
  } else if (type === "fire") {
    fill("#2EC4B6");
    rect(-2, 2, 4, 14);
    ellipse(-7, 8, 10, 5);
    ellipse(7, 8, 10, 5);
    fill("#FF2A00");
    ellipse(0, -4, 26, 18);
    fill("#FF9E00");
    ellipse(0, -4, 18, 12);
    fill("#FFF3B0");
    ellipse(0, -4, 9, 6);
  } else if (type === "feather") {
    fill("#FFD166");
    stroke("#E09F3E");
    strokeWeight(1.5);
    ellipse(0, -2, 16, 28);
    noStroke();
    fill("#FFF3B0");
    rect(-1.5, -14, 3, 28);
  } else if (type === "speed") {
    fill("#FFE4B5");
    rect(-8, 0, 16, 14, 3);
    fill("#0096C7");
    arc(0, 2, 32, 28, PI, TWO_PI);
    fill("#FFD166");
    triangle(-2, -13, 5, -5, -1, -5);
    triangle(2, 1, -5, -7, 1, -7);
  } else if (type === "star") {
    fill(frameCount % 6 < 3 ? "#FFD700" : "#FFF3B0");
    stroke("#E09F3E");
    strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < 10; i++) {
      let r = (i % 2 === 0) ? 15 : 6;
      let a = -HALF_PI + i * PI / 5;
      vertex(cos(a) * r, sin(a) * r);
    }
    endShape(CLOSE);
    noStroke();
    fill(0);
    rect(-3, -3, 2, 5);
    rect(2, -3, 2, 5);
  }
  pop();
}

// --- 3→2→1 逐級受擊降級機制 ---
function takeDamage() {
  if (gameState !== "PLAYING" || invincibleTimer > 0 || starTimer > 0) return;

  if (powerLevel === 3) {
    powerLevel = 2;
    powerType = "mushroom";
    currentSprintBonus = 0;
    playSFX("shrink");
    gameState = "TRANSFORM_FREEZE";
    transformTimer = 500;
    transformIsDamage = true;
    transformFromBig = true;
    transformToBig = true;
    isAttacking = false;
    isCrouching = false;
    isGliding = false;
  } else if (powerLevel === 2) {
    powerLevel = 1;
    powerType = "none";
    currentSprintBonus = 0;
    playSFX("shrink");
    gameState = "TRANSFORM_FREEZE";
    transformTimer = 500;
    transformIsDamage = true;
    transformFromBig = true;
    transformToBig = false;
    isAttacking = false;
    isCrouching = false;
    isGliding = false;
  } else {
    handlePlayerDeath();
  }
}

function handlePlayerDeath() {
  lives--;
  playSFX("death");
  if (lives <= 0) {
    lives = 0;
    gameState = "GAME_OVER";
  } else {
    startLevel(currentLevel, false, false);
  }
}

function drawGameOver() {
  background("#0d0d14");
  textAlign(CENTER, CENTER);
  fill("#E63946");
  textSize(56);
  text("GAME OVER", width / 2, height / 2 - 50);
  fill(255);
  textSize(24);
  text(`FINAL SCORE: ${score}`, width / 2, height / 2 + 15);
  textSize(20);
  fill("#FFD700");
  text("按 [R] 重新挑戰（恢復 3 條命）或按 [M] 返回大地圖選單", width / 2, height / 2 + 65);
}

function mousePressed() {
  initAudioEngine();
  if (gameState === "WORLD_MAP") {
    let itemBtnW = 140;
    let itemBtnH = 44;
    let itemBtnX = width - itemBtnW - 28;
    let itemBtnY = height - itemBtnH - 22;
    if (mouseX >= itemBtnX && mouseX <= itemBtnX + itemBtnW && mouseY >= itemBtnY && mouseY <= itemBtnY + itemBtnH) {
      showMapItemDrawer = !showMapItemDrawer;
      playSFX("mapMove");
      return;
    }

    if (showMapItemDrawer) {
      showMapItemDrawer = false;
      return;
    }

    let nodes = getWorldMapNodes();
    for (let n of nodes) {
      if (dist(mouseX, mouseY, n.x, n.y) < 38) {
        if (selectedMapNode === n.id) {
          startLevel(n.id, false, true);
        } else {
          selectedMapNode = n.id;
          playSFX("mapMove");
        }
        return;
      }
    }
  }
}

function startLevel(levelNum, resetRunStats, keepPowerup = false) {
  currentLevel = levelNum;
  movingPlatforms = [];
  fireBars = [];
  boss = null;
  bossFireballs = [];
  bridgeCollapsing = false;
  transformTimer = 0;
  invincibleTimer = 0;
  starTimer = 0;
  currentSprintBonus = 0;
  bumpingTiles = [];
  playerFireballs = [];
  enemies = [];
  levelTimer = 400;

  if (levelNum === 1) {
    is1_2Intro = false;
    loadLevelMap(MAP_1_1);
    spawnLevelEnemies(1);
  } else if (levelNum === 2) {
    is1_2Intro = true;
    loadLevelMap(MAP_1_2_INTRO);
  } else if (levelNum === 3) {
    is1_2Intro = false;
    loadLevelMap(MAP_1_3);
    spawnLevelEnemies(3);
    movingPlatforms = [
      { x: 102 * TILE_SIZE, y: 10 * TILE_SIZE, w: 3 * TILE_SIZE, h: 16, minX: 100 * TILE_SIZE, maxX: 112 * TILE_SIZE, speed: 2.2, dx: 0 },
      { x: 122 * TILE_SIZE, y: 8 * TILE_SIZE,  w: 3 * TILE_SIZE, h: 16, minX: 118 * TILE_SIZE, maxX: 132 * TILE_SIZE, speed: -2.5, dx: 0 }
    ];
  } else {
    is1_2Intro = false;
    loadLevelMap(MAP_1_4);
    spawnLevelEnemies(4);

    movingPlatforms = [
      { x: 122 * TILE_SIZE, y: 11 * TILE_SIZE, w: 3 * TILE_SIZE, h: 16, minX: 121 * TILE_SIZE, maxX: 135 * TILE_SIZE, speed: 2.4, dx: 0 }
    ];

    fireBars = [
      { cx: 43 * TILE_SIZE + 20, cy: 12 * TILE_SIZE + 20, angle: 0, speed: 0.032, count: 6, spacing: 20 },
      { cx: 72 * TILE_SIZE + 20, cy: 12 * TILE_SIZE + 20, angle: PI, speed: -0.035, count: 6, spacing: 20 },
      { cx: 105 * TILE_SIZE + 20, cy: 9 * TILE_SIZE + 20, angle: HALF_PI, speed: 0.038, count: 6, spacing: 20 }
    ];

    boss = {
      x: 185 * TILE_SIZE,
      y: 11 * TILE_SIZE - 42,
      w: 64,
      h: 84,
      vx: -1.6,
      vy: 0,
      minX: 173 * TILE_SIZE,
      maxX: 190 * TILE_SIZE,
      hp: 12,
      maxHp: 12,
      alive: true,
      falling: false,
      flashTimer: 0,
      lastFireTime: millis(),
      lastJumpTime: millis()
    };
  }

  gameState = "LEVEL_INTRO";
  stateTimer = millis();

  characterX = 100;
  characterY = 100;
  velocityY = 0;

  if (resetRunStats) {
    score = 0;
    lives = 3;
    coinCount = 0;
    reservedItem = null;
  }
  if (!keepPowerup) {
    powerLevel = 1;
    powerType = "none";
  }

  isCrouching = false;
  prevHitboxH = (powerLevel >= 2) ? BIG_HITBOX_H : BASE_HITBOX_H;
  hideCharacter = false;
  isGliding = false;
  isActionLocked = false;
  isShortJump = false;
  featherFlapsLeft = 2;
  isAttacking = false;
  items = [];
  coins = [];
  brickParticles = [];
  activeEffects = [];
  floatingTexts = [];
}

function spawnLevelEnemies(lvl) {
  enemies = [];
  const createEnemy = (type, col, row) => ({
    type: type,
    x: col * TILE_SIZE + 20,
    y: row * TILE_SIZE - 16,
    baseY: row * TILE_SIZE - 16,
    w: 30,
    h: type === "goomba" ? 30 : 40,
    vx: -1.4,
    vy: 0,
    shellMoving: false,
    dead: false,
    flyPhase: random(TWO_PI)
  });

  if (lvl === 1) {
    enemies.push(createEnemy("goomba", 22, 13));
    enemies.push(createEnemy("goomba", 42, 13));
    enemies.push(createEnemy("koopa", 56, 13));
    enemies.push(createEnemy("goomba", 82, 13));
    enemies.push(createEnemy("goomba", 85, 13));
    enemies.push(createEnemy("koopa", 118, 13));
    enemies.push(createEnemy("goomba", 142, 13));
  } else if (lvl === 2) {
    enemies.push(createEnemy("goomba", 18, 13));
    enemies.push(createEnemy("koopa", 36, 13));
    enemies.push(createEnemy("goomba", 62, 13));
    enemies.push(createEnemy("goomba", 92, 13));
    enemies.push(createEnemy("koopa", 125, 13));
  } else if (lvl === 3) {
    enemies.push(createEnemy("parakoopa", 32, 8));
    enemies.push(createEnemy("goomba", 56, 8));
    enemies.push(createEnemy("parakoopa", 72, 7));
    enemies.push(createEnemy("parakoopa", 112, 7));
    enemies.push(createEnemy("koopa", 155, 13));
  } else if (lvl === 4) {
    enemies.push(createEnemy("goomba", 33, 13));
    enemies.push(createEnemy("koopa", 64, 13));
    enemies.push(createEnemy("goomba", 142, 13));
  }
}

function updateEnemies(playerW, playerH) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    let en = enemies[i];

    if (en.dead) {
      en.vy += gravity * 0.6;
      en.y += en.vy;
      if (en.y > levelMap.length * TILE_SIZE + 100) {
        enemies.splice(i, 1);
      }
      continue;
    }

    if (abs(en.x - characterX) > width * 1.1) continue;

    if (en.type === "parakoopa") {
      en.x += en.vx * 0.8;
      en.flyPhase += 0.055;
      en.y = en.baseY + sin(en.flyPhase) * 48;
      if (checkCollision(en.x, en.y, en.w, en.h)) {
        en.x -= en.vx * 0.8;
        en.vx *= -1;
      }
    } else {
      en.x += en.vx;
      if (checkCollision(en.x, en.y, en.w, en.h)) {
        en.x -= en.vx;
        en.vx *= -1;
        if (en.type === "shell" && en.shellMoving) {
          playSFX("stomp");
        }
      }

      en.vy += gravity * 0.6;
      en.y += en.vy;
      if (checkCollision(en.x, en.y, en.w, en.h)) {
        if (en.vy > 0) {
          let bottomRow = floor((en.y + en.h / 2) / TILE_SIZE);
          en.y = bottomRow * TILE_SIZE - en.h / 2 - 0.1;
          en.vy = 0;
        }
      }
    }

    if (en.type === "shell" && en.shellMoving) {
      for (let j = enemies.length - 1; j >= 0; j--) {
        if (i === j) continue;
        let other = enemies[j];
        if (!other.dead && abs(en.x - other.x) < (en.w + other.w) / 2 && abs(en.y - other.y) < (en.h + other.h) / 2) {
          other.dead = true;
          other.vy = -7;
          score += 400;
          playSFX("kick");
          floatingTexts.push({ text: "+400", x: other.x, y: other.y - 20, vy: -1.5, life: 45 });
        }
      }
    }

    if (en.y > levelMap.length * TILE_SIZE + 100) {
      enemies.splice(i, 1);
      continue;
    }

    if (gameState === "PLAYING" &&
        abs(characterX - en.x) < (playerW + en.w) / 2 - 2 &&
        abs(characterY - en.y) < (playerH + en.h) / 2 - 2) {

      if (starTimer > 0) {
        en.dead = true;
        en.vy = -8;
        score += 300;
        playSFX("kick");
        floatingTexts.push({ text: "+300", x: en.x, y: en.y - 20, vy: -1.5, life: 45 });
        continue;
      }

      let playerBottom = characterY + playerH / 2;
      let isStomp = (velocityY > 0 && playerBottom <= en.y + en.h * 0.25);

      if (isStomp) {
        velocityY = -14;
        isOnGround = false;
        isGliding = false;
        isActionLocked = false;
        isShortJump = false;
        featherFlapsLeft = 2;

        if (en.type === "goomba") {
          en.dead = true;
          en.vy = -3;
          score += 200;
          playSFX("stomp");
          floatingTexts.push({ text: "+200", x: en.x, y: en.y - 20, vy: -1.5, life: 45 });
        } else if (en.type === "parakoopa") {
          en.type = "koopa";
          en.vy = 0;
          score += 200;
          playSFX("stomp");
          floatingTexts.push({ text: "+200", x: en.x, y: en.y - 20, vy: -1.5, life: 45 });
        } else if (en.type === "koopa") {
          en.type = "shell";
          en.h = 26;
          en.vx = 0;
          en.shellMoving = false;
          score += 200;
          playSFX("stomp");
        } else if (en.type === "shell") {
          if (!en.shellMoving) {
            en.shellMoving = true;
            en.vx = (characterX < en.x ? 8 : -8);
            playSFX("kick");
          } else {
            en.shellMoving = false;
            en.vx = 0;
            playSFX("stomp");
          }
        }
      } else if (en.type === "shell" && !en.shellMoving) {
        en.shellMoving = true;
        en.vx = (characterX < en.x ? 8 : -8);
        score += 100;
        playSFX("kick");
      } else {
        takeDamage();
        return;
      }
    }
  }
}

function drawEnemies() {
  for (let en of enemies) {
    push();
    translate(en.x, en.y);
    if (en.dead) scale(1, -1);

    if (en.type === "goomba") {
      noStroke();
      fill("#8D5524");
      arc(0, 2, 30, 28, PI, TWO_PI);
      fill("#F1C27D");
      rect(-8, 2, 16, 10, 3);
      fill(255);
      ellipse(-5, -4, 6, 8);
      ellipse(5, -4, 6, 8);
      fill(0);
      ellipse(-4, -4, 3, 5);
      ellipse(4, -4, 3, 5);
      let footShift = sin(frameCount * 0.25) * 3;
      fill("#3D1E16");
      ellipse(-7 + footShift, 13, 10, 6);
      ellipse(7 - footShift, 13, 10, 6);
    } else if (en.type === "koopa" || en.type === "parakoopa") {
      let dir = en.vx >= 0 ? 1 : -1;
      scale(dir, 1);
      noStroke();
      fill(en.type === "parakoopa" ? "#E63946" : "#2EC4B6");
      arc(-2, 4, 28, 32, PI, TWO_PI);
      stroke(255);
      strokeWeight(1.5);
      arc(-2, 4, 28, 32, PI, TWO_PI);
      noStroke();
      fill("#FFD166");
      ellipse(10, -8, 14, 16);
      fill(255);
      ellipse(12, -10, 5, 7);
      fill(0);
      ellipse(13, -10, 2.5, 4);
      fill("#F4A261");
      let walkShift = sin(frameCount * 0.25) * 3;
      ellipse(-6 + walkShift, 16, 10, 7);
      ellipse(6 - walkShift, 16, 10, 7);

      if (en.type === "parakoopa") {
        fill(255);
        stroke("#ADB5BD");
        strokeWeight(1.5);
        let flap = sin(frameCount * 0.35) * 6;
        ellipse(-8, -8 + flap, 14, 22);
      }
    } else if (en.type === "shell") {
      noStroke();
      fill("#2EC4B6");
      arc(0, 6, 28, 24, PI, TWO_PI);
      fill(255);
      rect(-14, 6, 28, 5, 2);
    }
    pop();
  }
}

function updatePlayerFireballs() {
  for (let i = playerFireballs.length - 1; i >= 0; i--) {
    let fb = playerFireballs[i];
    fb.x += fb.vx;
    fb.vy += gravity * 0.28;
    fb.y += fb.vy;
    fb.life--;

    let dir = fb.vx >= 0 ? 1 : -1;
    let targetY = null;
    let nearestDist = 420;

    for (let en of enemies) {
      if (en.dead) continue;
      let dx = (en.x - fb.x) * dir;
      if (dx > 0 && dx < nearestDist && abs(en.y - fb.y) < 150) {
        nearestDist = dx;
        targetY = en.y;
      }
    }

    if (targetY === null && currentLevel === 4 && boss && boss.alive && !boss.falling) {
      let dx = (boss.x - fb.x) * dir;
      if (dx > 0 && dx < 500 && abs(boss.y - fb.y) < 180) {
        targetY = boss.y;
      }
    }

    if (targetY !== null) {
      fb.vy += (targetY - fb.y) * 0.018;
      fb.vy = constrain(fb.vy, -7, 7);
    }

    if (checkCollision(fb.x, fb.y + 6, 12, 12) && fb.vy > 0) {
      fb.vy = -7.5;
    }

    for (let ei = enemies.length - 1; ei >= 0; ei--) {
      let en = enemies[ei];
      if (!en.dead && abs(fb.x - en.x) < en.w / 2 + 18 && abs(fb.y - en.y) < en.h / 2 + 18) {
        en.dead = true;
        en.vy = -7;
        score += 300;
        playSFX("kick");
        floatingTexts.push({ text: "+300", x: en.x, y: en.y - 20, vy: -1.5, life: 45 });
        fb.life = 0;
        break;
      }
    }

    if (currentLevel === 4 && boss && boss.alive && !boss.falling) {
      if (abs(fb.x - boss.x) < boss.w / 2 + 14 && abs(fb.y - boss.y) < boss.h / 2 + 14) {
        boss.hp -= 3;
        boss.flashTimer = 8;
        score += 600;
        fb.life = 0;
        if (boss.hp <= 0) {
          boss.falling = true;
          boss.vy = -6;
          score += 15000;
          playSFX("clear");
          floatingTexts.push({ text: "+15000 BOSS DEFEATED!", x: boss.x - 60, y: boss.y - 60, vy: -1.5, life: 120 });
          gameState = "BOSS_DEFEAT_CUTSCENE";
        }
      }
    }

    if (fb.life <= 0 || fb.y > levelMap.length * TILE_SIZE + 50) {
      playerFireballs.splice(i, 1);
    }
  }
}

function drawPlayerFireballs() {
  for (let fb of playerFireballs) {
    push();
    translate(fb.x, fb.y);
    noStroke();
    fill("#FF2A00");
    ellipse(0, 0, 18, 18);
    fill("#FFD166");
    ellipse(0, 0, 10, 10);
    pop();
  }
}

function addBumpTile(r, c) {
  bumpingTiles.push({ r: r, c: c, offsetY: -10 });
}

function updateBumpingTiles() {
  for (let i = bumpingTiles.length - 1; i >= 0; i--) {
    bumpingTiles[i].offsetY += 1.5;
    if (bumpingTiles[i].offsetY >= 0) {
      bumpingTiles.splice(i, 1);
    }
  }
}

function getTileBumpOffset(r, c) {
  for (let bt of bumpingTiles) {
    if (bt.r === r && bt.c === c) return bt.offsetY;
  }
  return 0;
}

function spawnPowerupFromBlock(tileChar, spawnX, spawnY) {
  playSFX("powerup");
  let spawnedType = "mushroom";

  if (tileChar === '*') {
    spawnedType = "star";
  } else if (powerLevel >= 2) {
    let pool = ["fire", "feather", "speed"];
    spawnedType = pool[nextPowerCycle % pool.length];
    nextPowerCycle++;
  }

  items.push({
    type: spawnedType,
    x: spawnX,
    y: spawnY,
    vx: 2.2,
    vy: spawnedType === "star" ? -6 : -2,
    size: 32,
    spawnDelay: 0
  });
}

function updateAndDrawItems(playerW, playerH) {
  for (let i = items.length - 1; i >= 0; i--) {
    let it = items[i];

    if (it.spawnDelay && it.spawnDelay > 0) {
      it.spawnDelay -= deltaTime;
      if (floor(it.spawnDelay / 100) % 2 === 0) {
        drawPowerupIcon(it.type, it.x, it.y, 1.0);
      }
      continue;
    }

    if (it.type !== "fire") {
      it.x += it.vx;
      if (checkCollision(it.x, it.y, it.size, it.size)) {
        it.x -= it.vx;
        it.vx *= -1;
      }
    }

    it.vy += gravity * 0.6;
    it.y += it.vy;
    if (checkCollision(it.x, it.y, it.size, it.size)) {
      if (it.vy > 0) {
        let bottomRow = floor((it.y + it.size / 2) / TILE_SIZE);
        it.y = bottomRow * TILE_SIZE - it.size / 2 - 0.1;
        it.vy = (it.type === "star") ? -10 : 0;
      }
    }

    drawPowerupIcon(it.type, it.x, it.y, 1.0);

    if (abs(characterX - it.x) < (playerW + it.size) / 2 &&
        abs(characterY - it.y) < (playerH + it.size) / 2) {
      score += 1000;
      items.splice(i, 1);

      if (it.type === "star") {
        starTimer = 8000;
        playSFX("powerup");
        floatingTexts.push({ text: "STAR POWER!", x: characterX - 45, y: characterY - 55, vy: -1.5, life: 70 });
        continue;
      }

      if (it.type === "mushroom") {
        if (powerLevel === 1) {
          transformFromBig = false;
          transformToBig = true;
          powerLevel = 2;
          powerType = "mushroom";
          playSFX("powerup");
          gameState = "TRANSFORM_FREEZE";
          transformTimer = 500;
          transformIsDamage = false;
        } else {
          reservedItem = "mushroom";
          playSFX("coin");
          floatingTexts.push({ text: "ITEM STORED!", x: characterX - 40, y: characterY - 55, vy: -1.5, life: 60 });
        }
      } else {
        if (powerLevel === 1) {
          transformFromBig = false;
          transformToBig = true;
          powerLevel = 2;
          powerType = "mushroom";
          playSFX("powerup");
          gameState = "TRANSFORM_FREEZE";
          transformTimer = 500;
          transformIsDamage = false;
        } else if (powerLevel === 2) {
          transformFromBig = true;
          transformToBig = true;
          powerLevel = 3;
          powerType = it.type;
          playSFX("powerup");
          gameState = "TRANSFORM_FREEZE";
          transformTimer = 500;
          transformIsDamage = false;
        } else {
          if (powerType !== it.type) {
            reservedItem = powerType;
            powerType = it.type;
            playSFX("powerup");
            floatingTexts.push({ text: "POWER SWAP!", x: characterX - 40, y: characterY - 55, vy: -1.5, life: 60 });
          } else {
            reservedItem = it.type;
            playSFX("coin");
            floatingTexts.push({ text: "ITEM STORED!", x: characterX - 40, y: characterY - 55, vy: -1.5, life: 60 });
          }
        }
      }
      continue;
    }

    if (it.y > levelMap.length * TILE_SIZE + 100) {
      items.splice(i, 1);
    }
  }
}

function updateFireBars(playerW, playerH) {
  for (let fb of fireBars) {
    fb.angle += fb.speed;
    if (gameState !== "PLAYING" || invincibleTimer > 0 || starTimer > 0) continue;

    for (let i = 1; i <= fb.count; i++) {
      let fx = fb.cx + cos(fb.angle) * (i * fb.spacing);
      let fy = fb.cy + sin(fb.angle) * (i * fb.spacing);
      if (abs(characterX - fx) < (playerW / 2 + 7) && abs(characterY - fy) < (playerH / 2 + 7)) {
        takeDamage();
        return;
      }
    }
  }
}

function drawFireBars() {
  for (let fb of fireBars) {
    fill("#555555");
    stroke(0);
    strokeWeight(2);
    ellipse(fb.cx, fb.cy, 20, 20);
    noStroke();

    for (let i = 1; i <= fb.count; i++) {
      let fx = fb.cx + cos(fb.angle) * (i * fb.spacing);
      let fy = fb.cy + sin(fb.angle) * (i * fb.spacing);
      fill("#FF4500");
      ellipse(fx, fy, 18, 18);
      fill("#FFD700");
      ellipse(fx, fy, 9, 9);
    }
  }
}

function updateBossAndFireballs(playerW, playerH) {
  if (!boss) return;

  for (let i = bossFireballs.length - 1; i >= 0; i--) {
    let bf = bossFireballs[i];
    bf.x += bf.vx;
    bf.y += (bf.targetY - bf.y) * 0.04;

    if (gameState === "PLAYING" && invincibleTimer <= 0 && starTimer <= 0 &&
        abs(characterX - bf.x) < (playerW / 2 + 12) && abs(characterY - bf.y) < (playerH / 2 + 8)) {
      bossFireballs.splice(i, 1);
      takeDamage();
      return;
    }

    if (bf.x < cameraX - 100 || bf.x > cameraX + width + 200) {
      bossFireballs.splice(i, 1);
    }
  }

  if (!boss.alive) return;

  if (boss.flashTimer > 0) boss.flashTimer--;

  if (boss.falling) {
    boss.vy += gravity * 0.7;
    boss.y += boss.vy;
    if (boss.y > 14 * TILE_SIZE) {
      boss.alive = false;
      bossFireballs = [];
    }
    return;
  }

  if (abs(characterX - boss.x) < width * 0.85 && gameState === "PLAYING") {
    boss.x += boss.vx;
    if (boss.x <= boss.minX) {
      boss.x = boss.minX;
      boss.vx = abs(boss.vx);
    } else if (boss.x >= boss.maxX) {
      boss.x = boss.maxX;
      boss.vx = -abs(boss.vx);
    }

    if (millis() - boss.lastJumpTime > 2200 && boss.vy === 0) {
      boss.vy = -13;
      boss.lastJumpTime = millis();
    }

    boss.vy += gravity * 0.65;
    boss.y += boss.vy;
    let bridgeTopY = 11 * TILE_SIZE - boss.h / 2;
    if (boss.y >= bridgeTopY) {
      boss.y = bridgeTopY;
      boss.vy = 0;
    }

    if (millis() - boss.lastFireTime > 1900) {
      let aimHigh = random() < 0.5;
      let fireY = aimHigh ? (11 * TILE_SIZE - 68) : (11 * TILE_SIZE - 26);
      bossFireballs.push({
        x: boss.x - boss.w / 2,
        y: boss.y - 10,
        targetY: fireY,
        vx: -5.2
      });
      boss.lastFireTime = millis();
    }

    if (invincibleTimer <= 0 && starTimer <= 0 &&
        abs(characterX - boss.x) < (playerW + boss.w) / 2 - 6 &&
        abs(characterY - boss.y) < (playerH + boss.h) / 2 - 6) {
      takeDamage();
    }
  }
}

function drawBossAndFireballs() {
  for (let bf of bossFireballs) {
    push();
    translate(bf.x, bf.y);
    fill("#FF2A00");
    ellipse(0, 0, 34, 18);
    fill("#FFA500");
    ellipse(-4, 0, 22, 12);
    fill("#FFFF66");
    ellipse(-8, 0, 12, 6);
    pop();
  }

  if (!boss || !boss.alive) return;

  push();
  translate(boss.x, boss.y);

  if (!boss.falling) {
    fill(0);
    rect(-35, -boss.h / 2 - 22, 70, 8, 3);
    fill("#FF3B30");
    rect(-34, -boss.h / 2 - 21, 68 * (boss.hp / boss.maxHp), 6, 2);
  }

  let isFlashing = boss.flashTimer > 0;
  fill(isFlashing ? 255 : "#1B4332");
  arc(10, 5, 62, 68, -HALF_PI, HALF_PI);
  fill(isFlashing ? 255 : "#F8F9FA");
  triangle(36, -15, 48, -10, 38, -2);
  triangle(40, 5, 52, 10, 38, 16);

  fill(isFlashing ? 255 : "#D97706");
  rect(-26, -24, 46, 56, 12);
  fill(isFlashing ? 255 : "#FDE68A");
  rect(-24, -14, 24, 40, 6);

  fill(isFlashing ? 255 : "#15803D");
  rect(-34, -44, 38, 30, 8);
  fill(isFlashing ? 255 : "#DC2626");
  triangle(-22, -44, -10, -56, -4, -44);
  fill(isFlashing ? 255 : "#FFFFFF");
  triangle(-28, -42, -38, -54, -20, -44);

  fill("#FF0000");
  rect(-30, -34, 8, 6);
  fill(255);
  triangle(-32, -20, -28, -14, -24, -20);
  triangle(-22, -20, -18, -14, -14, -20);

  fill(isFlashing ? 255 : "#B45309");
  rect(-22, 28, 18, 14, 4);
  rect(4, 28, 18, 14, 4);
  pop();
}

function checkAxeTrigger(cx, cy, cw, ch) {
  let col = floor(cx / TILE_SIZE);
  let row = floor(cy / TILE_SIZE);
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r >= 0 && r < levelMap.length && c >= 0 && c < levelMap[0].length) {
        if (levelMap[r][c] === 'A') {
          levelMap[r][c] = ' ';
          bridgeCollapsing = true;
          bridgeCollapseTimer = millis();
          bossFireballs = [];
          score += 15000;
          playSFX("clear");
          floatingTexts.push({ text: "+15000 AXE CLEAR!", x: c * TILE_SIZE - 40, y: r * TILE_SIZE - 30, vy: -1.5, life: 120 });

          characterX = c * TILE_SIZE + TILE_SIZE / 2;
          characterY = (r + 1) * TILE_SIZE - ch / 2 - 0.1;
          velocityY = 0;
          isOnGround = true;

          gameState = "BOSS_DEFEAT_CUTSCENE";
          isAttacking = false;
          isCrouching = false;
          return;
        }
      }
    }
  }
}

function updateBridgeCollapse() {
  if (!bridgeCollapsing) return;
  if (millis() - bridgeCollapseTimer > 65) {
    bridgeCollapseTimer = millis();
    if (bridgeTiles.length > 0) {
      let tilePos = bridgeTiles.shift();
      levelMap[tilePos.r][tilePos.c] = ' ';
      playSFX("brick");
      spawnBrickParticles(tilePos.c * TILE_SIZE + TILE_SIZE / 2, tilePos.r * TILE_SIZE + TILE_SIZE / 2);
    } else {
      bridgeCollapsing = false;
      if (boss && boss.alive) {
        boss.falling = true;
        boss.vy = 2;
      }
    }
  }
}

function checkLavaHazard(cx, cy, cw, ch) {
  let left = cx - cw / 2 + 4;
  let right = cx + cw / 2 - 4;
  let bottom = cy + ch / 2;
  let startCol = floor(left / TILE_SIZE);
  let endCol = floor(right / TILE_SIZE);
  let row = floor(bottom / TILE_SIZE);

  if (row >= 0 && row < levelMap.length) {
    for (let c = startCol; c <= endCol; c++) {
      if (c >= 0 && c < levelMap[0].length && levelMap[row][c] === 'L') {
        return true;
      }
    }
  }
  return false;
}

function updateMovingPlatforms() {
  for (let mp of movingPlatforms) {
    let oldX = mp.x;
    mp.x += mp.speed;
    if (mp.x <= mp.minX) {
      mp.x = mp.minX;
      mp.speed *= -1;
    } else if (mp.x >= mp.maxX) {
      mp.x = mp.maxX;
      mp.speed *= -1;
    }
    mp.dx = mp.x - oldX;
  }
}

function drawMovingPlatforms() {
  for (let mp of movingPlatforms) {
    fill(currentLevel === 4 ? "#8D99AE" : "#E07A5F");
    stroke("#2B2D42");
    strokeWeight(2);
    rect(mp.x, mp.y, mp.w, mp.h, 4);
    fill(currentLevel === 4 ? "#EDF2F4" : "#F2CC8F");
    noStroke();
    rect(mp.x + 4, mp.y + 3, mp.w - 8, 5, 2);
  }
}

function checkEnterPipe(cx, cy, cw, ch) {
  let rightEdge = cx + cw / 2 + 4;
  let col = floor(rightEdge / TILE_SIZE);
  let row = floor(cy / TILE_SIZE);

  if (row >= 0 && row < levelMap.length && col >= 0 && col < levelMap[0].length) {
    if (levelMap[row][col] === 'H') {
      gameState = "ENTERING_PIPE";
      stateTimer = millis();
      isAttacking = false;
      isCrouching = false;
      playSFX("shrink");
    }
  }
}

function checkHiddenBlockHit(hitX, hitY) {
  let col = floor(hitX / TILE_SIZE);
  let row = floor(hitY / TILE_SIZE);

  if (row >= 0 && row < levelMap.length && col >= 0 && col < levelMap[0].length) {
    if (levelMap[row][col] === 'I') {
      levelMap[row][col] = 'E';
      addBumpTile(row, col);
      addCoinAndScore(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE);
      return true;
    }
  }
  return false;
}

function checkHitTile(hitX, hitY) {
  let col = floor(hitX / TILE_SIZE);
  let row = floor(hitY / TILE_SIZE);

  if (row >= 0 && row < levelMap.length && col >= 0 && col < levelMap[0].length) {
    let tile = levelMap[row][col];
    
    if (tile === '?') {
      levelMap[row][col] = 'E'; 
      addBumpTile(row, col);
      addCoinAndScore(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE);
    } else if (tile === 'M' || tile === '*') {
      levelMap[row][col] = 'E';
      addBumpTile(row, col);
      spawnPowerupFromBlock(tile, col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE - TILE_SIZE / 2);
    } else if (tile === 'B') {
      if (powerLevel >= 2) {
        levelMap[row][col] = ' ';
        score += 50;
        playSFX("brick");
        spawnBrickParticles(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
      } else {
        addBumpTile(row, col);
        playSFX("stomp");
      }
    }
  }
}

function spawnBrickParticles(bx, by) {
  let dirs = [[-3, -8], [3, -8], [-2, -5], [2, -5]];
  for (let d of dirs) {
    brickParticles.push({
      x: bx,
      y: by,
      vx: d[0],
      vy: d[1],
      life: 40
    });
  }
}

function updateAndDrawBrickParticles() {
  for (let i = brickParticles.length - 1; i >= 0; i--) {
    let p = brickParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.5;
    p.life--;

    fill((currentLevel === 2 && !is1_2Intro) ? "#3b6e8c" : (currentLevel === 4 ? "#6c757d" : "#A33B20"));
    rect(p.x - 6, p.y - 6, 12, 12);

    if (p.life <= 0) {
      brickParticles.splice(i, 1);
    }
  }
}

function checkFlagpole(cx, cy, cw, ch) {
  if (flagCol === -1 || gameState !== "PLAYING") return;

  let flagX = flagCol * TILE_SIZE + TILE_SIZE / 2;
  if (cx + cw / 2 >= flagX - 6) {
    characterX = flagX;
    velocityY = 0;
    isGliding = false;
    isAttacking = false;
    isCrouching = false;
    gameState = "FLAG_SLIDE";
    playSFX("clear");

    let grabRow = floor(cy / TILE_SIZE);
    let earnedPoints = 200;
    if (grabRow <= 3) {
      earnedPoints = 10000; 
      triggerOneUp(flagX + 25, cy - 30);
    } else if (grabRow === 4) {
      earnedPoints = 8000;
    } else if (grabRow === 5) {
      earnedPoints = 4000;
    } else if (grabRow === 6) {
      earnedPoints = 2000;
    } else if (grabRow === 7) {
      earnedPoints = 1000;
    } else if (grabRow === 8) {
      earnedPoints = 800;
    } else if (grabRow === 9 || grabRow === 10) {
      earnedPoints = 400;
    } else {
      earnedPoints = 200;
    }

    score += earnedPoints;

    floatingTexts.push({
      text: "+" + earnedPoints,
      x: flagX + 25,
      y: cy,
      vy: -1.5,
      life: 120 
    });

    let minCastleCol = 9999;
    let maxCastleCol = -1;
    for (let r = 0; r < levelMap.length; r++) {
      for (let c = flagCol + 1; c < levelMap[r].length; c++) {
        if (levelMap[r][c] === 'C') {
          minCastleCol = min(minCastleCol, c);
          maxCastleCol = max(maxCastleCol, c);
        }
      }
    }
    if (maxCastleCol !== -1) {
      castleTargetX = ((minCastleCol + maxCastleCol + 1) / 2) * TILE_SIZE;
    } else {
      castleTargetX = flagX + 8 * TILE_SIZE;
    }
  }
}

function updateAndDrawFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.life--;

    push();
    if (ft.isOneUp) {
      fill("#4CD137");
      stroke(0);
      strokeWeight(5);
      textSize(30);
      textStyle(BOLD);
    } else {
      fill("#FFD700");
      stroke(0);
      strokeWeight(4);
      textSize(24);
      textStyle(NORMAL);
    }
    textAlign(LEFT, CENTER);
    text(ft.text, ft.x, ft.y);
    pop();

    if (ft.life <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
}

function updateAndDrawCoins() {
  for (let i = coins.length - 1; i >= 0; i--) {
    let c = coins[i];
    c.y += c.vy; 
    c.vy += 0.6; 
    c.life--;

    fill("#FFD700");
    stroke("#B8860B");
    strokeWeight(2);
    ellipse(c.x, c.y, 16, 22);
    noStroke();

    if (c.life <= 0) {
      coins.splice(i, 1);
    }
  }
}

function drawPipesOnly() {
  push();
  imageMode(CORNER);
  for (let row = 0; row < levelMap.length; row++) {
    for (let col = 0; col < levelMap[row].length; col++) {
      let tile = levelMap[row][col];
      if (tile === 'P') {
        let isPipeTop = (row === 0 || levelMap[row - 1][col] !== 'P');
        image(isPipeTop ? textures["PIPE_TOP"] : textures["PIPE"], col * TILE_SIZE, row * TILE_SIZE);
      } else if (tile === 'H') {
        image(textures["PIPE_H"], col * TILE_SIZE, row * TILE_SIZE);
      }
    }
  }
  pop();
}

function drawMap() {
  let isUnderground = (currentLevel === 2 && !is1_2Intro);
  push();
  imageMode(CORNER);

  for (let row = 0; row < levelMap.length; row++) {
    for (let col = 0; col < levelMap[row].length; col++) {
      let tile = levelMap[row][col];
      let tileX = col * TILE_SIZE;
      let tileY = row * TILE_SIZE + getTileBumpOffset(row, col);

      if (tileX + TILE_SIZE > cameraX && tileX < cameraX + width) {
        if (tile === 'G') {
          let tex = textures["G_DAY"];
          if (currentLevel === 4) tex = textures["G_CASTLE"];
          else if (currentLevel === 3) tex = textures["G_SKY"];
          else if (isUnderground) tex = textures["G_UNDER"];
          image(tex, tileX, tileY);
        } else if (tile === 'B') {
          image(textures["BRICK"], tileX, tileY);
        } else if (tile === '?' || tile === 'M' || tile === '*') {
          if (floor(frameCount / 15) % 2 === 0) tint(255, 250, 210);
          image(textures["QBOX"], tileX, tileY);
          noTint();
        } else if (tile === 'E') {
          image(textures["EMPTY"], tileX, tileY);
        } else if (tile === 'T') {
          fill("#C87D4B");
          rect(tileX, tileY, TILE_SIZE, TILE_SIZE * 0.45);
          fill("#8D5524");
          rect(tileX, tileY + TILE_SIZE * 0.45, TILE_SIZE, TILE_SIZE * 0.55);
        } else if (tile === 'D') {
          fill("#D4A373");
          rect(tileX, tileY, TILE_SIZE, TILE_SIZE * 0.4);
          fill("#6C757D");
          rect(tileX + 6, tileY + TILE_SIZE * 0.4, TILE_SIZE - 12, TILE_SIZE * 0.3);
        } else if (tile === 'L') {
          noStroke();
          fill("#FF2A00");
          rect(tileX, tileY, TILE_SIZE, TILE_SIZE);
          fill("#FF9E00");
          let wave = sin(frameCount * 0.1 + col) * 4;
          rect(tileX, tileY + 4 + wave, TILE_SIZE, 8);
        } else if (tile === 'A') {
          noStroke();
          fill("#ADB5BD");
          rect(tileX + 18, tileY + 6, 4, 28);
          fill("#FFD700");
          arc(tileX + 20, tileY + 14, 24, 18, -HALF_PI, HALF_PI);
        } else if (tile === 'P') {
          let isPipeTop = (row === 0 || levelMap[row - 1][col] !== 'P');
          image(isPipeTop ? textures["PIPE_TOP"] : textures["PIPE"], tileX, tileY);
        } else if (tile === 'H') {
          image(textures["PIPE_H"], tileX, tileY);
        } else if (tile === 'S') {
          image(textures["STAIR"], tileX, tileY);
        } else if (tile === 'F') {
          noStroke();
          fill("#FFFFFF");
          rect(tileX + TILE_SIZE / 2 - 4, tileY, 8, TILE_SIZE);
        } else if (tile === '|') {
          noStroke();
          fill("#FFFFFF");
          rect(tileX + TILE_SIZE / 2 - 4, tileY, 8, TILE_SIZE);
          fill("#2ECC71");
          triangle(tileX + TILE_SIZE / 2 - 4, tileY, tileX + TILE_SIZE / 2 - 36, tileY + 15, tileX + TILE_SIZE / 2 - 4, tileY + 30);
        } else if (tile === 'C') {
          fill(currentLevel === 4 ? "#FFD166" : "#8D4925");
          rect(tileX, tileY, TILE_SIZE, TILE_SIZE);
        }
      }
    }
  }
  pop();
}

function checkCollision(cx, cy, cw, ch) {
  let left = cx - cw / 2;
  let right = cx + cw / 2;
  let top = cy - ch / 2;
  let bottom = cy + ch / 2; 

  let startCol = floor(left / TILE_SIZE);
  let endCol = floor(right / TILE_SIZE);
  let startRow = floor(top / TILE_SIZE);
  let endRow = floor(bottom / TILE_SIZE);

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      if (r >= 0 && r < levelMap.length && c >= 0 && c < levelMap[0].length) {
        let tile = levelMap[r][c];
        if (tile !== ' ' && tile !== 'I' && tile !== 'A' && tile !== 'L' && tile !== 'F' && tile !== '|' && tile !== 'C') { 
          return true; 
        }
      }
    }
  }
  return false;
}

function keyPressed() { 
  initAudioEngine();

  if (key === 'u' || key === 'U') {
    audioMuted = !audioMuted;
    return;
  }

  if (gameState === "WORLD_MAP") {
    if (key === 'i' || key === 'I') {
      showMapItemDrawer = !showMapItemDrawer;
      playSFX("mapMove");
      return;
    }
    if (showMapItemDrawer) {
      if (keyCode === ESCAPE || keyCode === 32 || keyCode === ENTER) {
        showMapItemDrawer = false;
      }
      return;
    }
    if (keyCode === RIGHT_ARROW) {
      selectedMapNode = min(4, selectedMapNode + 1);
      playSFX("mapMove");
    } else if (keyCode === LEFT_ARROW) {
      selectedMapNode = max(1, selectedMapNode - 1);
      playSFX("mapMove");
    } else if (key === '1' || key === '2' || key === '3' || key === '4') {
      selectedMapNode = int(key);
      startLevel(selectedMapNode, false, true);
    } else if (keyCode === ENTER || keyCode === 32) {
      startLevel(selectedMapNode, false, true);
    }
    return;
  }

  if (gameState === "GAME_OVER") {
    if (key === 'r' || key === 'R') {
      startLevel(currentLevel, true, false);
    } else if (key === 'm' || key === 'M') {
      lives = 3;
      score = 0;
      coinCount = 0;
      gameState = "WORLD_MAP";
    }
    return;
  }

  if (key === 'm' || key === 'M') {
    gameState = "WORLD_MAP";
    return;
  }

  if (key === 'r' || key === 'R') {
    startLevel(currentLevel, false, false);
    return;
  }

  if (gameState !== "PLAYING") return;

  if ((key === 'b' || key === 'B') && reservedItem) {
    let dropType = reservedItem;
    reservedItem = null;
    playSFX("powerup");
    items.push({
      type: dropType,
      x: characterX,
      y: characterY - 3 * TILE_SIZE,
      vx: 2,
      vy: 0,
      size: 32,
      spawnDelay: 500
    });
    return;
  }

  if (keyCode === 32) { 
    if (isOnGround && !isActionLocked) {
      velocityY = jumpStrength; 
      isShortJump = false; 
      playSFX("jump");
    } else if (!isOnGround) {
      if (powerType === "feather" && featherFlapsLeft > 0) {
        featherFlapsLeft--;
        velocityY = -13;
        isGliding = true;
        isActionLocked = false;
        playSFX("flap");
      } else {
        isGliding = !isGliding;  
        isActionLocked = false; 
        if (isGliding) {
          if (velocityY > 0) velocityY = 0; 
          else velocityY *= 0.5; 
        }
      }
    }
    return false; 
  } 

  if (key === 'f' || key === 'F') { 
    if (!isAttacking && !isCrouching) {
      isAttacking = true;
      hasFiredThisAttack = false; 
      currentFrame = 0; 
      lastFrameTime = millis();
    }
  }
} 

function keyReleased() {
  if (keyCode === 32 && gameState === "PLAYING") {
    if (velocityY < 0 && powerType !== "feather") {
      velocityY = 0;      
      isShortJump = true; 
    }
  }
}

function windowResized() { 
  resizeCanvas(windowWidth, windowHeight); 
}