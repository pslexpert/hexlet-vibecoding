const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');
const overlayButton = document.getElementById('overlay-button');

const BEST_SCORE_KEY = 'runner-game-best';
const LOGICAL_HEIGHT = 400;
const GRAVITY = 2200;
const JUMP_VELOCITY = -820;
const GROUND_RATIO = 0.82;
const BASE_SPEED = 360;
const SPEED_PER_SCORE = 2.6;
const MAX_SPEED = 900;
const DOUBLE_JUMP_CHARGE_TIME = 2;
const DOUBLE_JUMP_VELOCITY = JUMP_VELOCITY * 0.85;
const OUTLINE_WIDTH = 2;

let logicalWidth = 800;
let dpr = 1;

const player = {
  x: 60,
  y: 0,
  width: 34,
  height: 34,
  vy: 0,
  grounded: true,
};

let obstacles = [];
let groundY = 0;
let distance = 0;
let score = 0;
let doubleJumpCharge = 0; // 0..1, ready to use once it reaches 1
let doubleJumpUsedThisFlight = false;
let best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
let state = 'ready'; // 'ready' | 'playing' | 'gameover'
let nextSpawnAt = 0;
let lastTimestamp = 0;
let rafId = null;

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  logicalWidth = (rect.width / rect.height) * LOGICAL_HEIGHT;
  ctx.setTransform(canvas.width / logicalWidth, 0, 0, canvas.height / LOGICAL_HEIGHT, 0, 0);
  groundY = LOGICAL_HEIGHT * GROUND_RATIO;
  if (state !== 'playing') {
    player.y = groundY - player.height;
  }
}

function currentSpeed() {
  return Math.min(BASE_SPEED + score * SPEED_PER_SCORE, MAX_SPEED);
}

function spawnObstacle() {
  const height = 28 + Math.random() * 30;
  const width = 18 + Math.random() * 14;
  obstacles.push({
    x: logicalWidth + width,
    y: groundY - height,
    width,
    height,
  });
  const gapSeconds = Math.max(0.55, 1.5 - score / 400);
  nextSpawnAt = distance + currentSpeed() * gapSeconds;
}

function resetGame() {
  obstacles = [];
  distance = 0;
  score = 0;
  player.y = groundY - player.height;
  player.vy = 0;
  player.grounded = true;
  doubleJumpCharge = 0;
  doubleJumpUsedThisFlight = false;
  nextSpawnAt = currentSpeed() * 1.1;
  scoreEl.textContent = '0';
}

function jump() {
  if (state === 'ready' || state === 'gameover') {
    startGame();
    return;
  }
  if (state !== 'playing') return;

  if (player.grounded) {
    player.vy = JUMP_VELOCITY;
    player.grounded = false;
    doubleJumpUsedThisFlight = false;
  } else if (!doubleJumpUsedThisFlight && doubleJumpCharge >= 1) {
    player.vy = DOUBLE_JUMP_VELOCITY;
    doubleJumpUsedThisFlight = true;
    doubleJumpCharge = 0;
  }
}

function startGame() {
  resetGame();
  state = 'playing';
  overlay.classList.add('hidden');
  lastTimestamp = performance.now();
}

function endGame() {
  state = 'gameover';
  best = Math.max(best, score);
  localStorage.setItem(BEST_SCORE_KEY, String(best));
  bestEl.textContent = `Рекорд: ${best}`;
  overlayTitle.textContent = 'Игра окончена';
  overlayText.textContent = `Очки: ${score}`;
  overlayButton.textContent = 'Ещё раз';
  overlay.classList.remove('hidden');
}

function update(dt) {
  const speed = currentSpeed();
  distance += speed * dt;
  score = Math.floor(distance / 10);
  scoreEl.textContent = String(score);

  doubleJumpCharge = Math.min(1, doubleJumpCharge + dt / DOUBLE_JUMP_CHARGE_TIME);

  player.vy += GRAVITY * dt;
  player.y += player.vy * dt;
  if (player.y >= groundY - player.height) {
    player.y = groundY - player.height;
    player.vy = 0;
    player.grounded = true;
    doubleJumpUsedThisFlight = false;
  }

  for (const obstacle of obstacles) {
    obstacle.x -= speed * dt;
  }
  obstacles = obstacles.filter((obstacle) => obstacle.x + obstacle.width > -10);

  if (distance >= nextSpawnAt) {
    spawnObstacle();
  }

  const playerBox = { x: player.x + 6, y: player.y + 4, width: player.width - 12, height: player.height - 8 };
  for (const obstacle of obstacles) {
    if (
      playerBox.x < obstacle.x + obstacle.width &&
      playerBox.x + playerBox.width > obstacle.x &&
      playerBox.y < obstacle.y + obstacle.height &&
      playerBox.y + playerBox.height > obstacle.y
    ) {
      endGame();
      break;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, logicalWidth, LOGICAL_HEIGHT);

  const skyGradient = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGradient.addColorStop(0, '#bfe6ff');
  skyGradient.addColorStop(1, '#eaf7ff');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, logicalWidth, groundY);

  ctx.fillStyle = '#4a3b2a';
  ctx.fillRect(0, groundY, logicalWidth, LOGICAL_HEIGHT - groundY);
  ctx.fillStyle = '#5c4a35';
  ctx.fillRect(0, groundY, logicalWidth, 4);

  ctx.fillStyle = '#2f9e44';
  for (const obstacle of obstacles) {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  }

  ctx.fillStyle = '#1f2937';
  ctx.fillRect(player.x, player.y, player.width, player.height);

  drawOutlineProgress(player.x, player.y, player.width, player.height, 1, 'rgba(255, 255, 255, 0.35)');
  const ready = doubleJumpCharge >= 1;
  drawOutlineProgress(
    player.x,
    player.y,
    player.width,
    player.height,
    doubleJumpCharge,
    ready ? '#ffd43b' : '#2f9e44'
  );
}

function drawOutlineProgress(x, y, width, height, progress, color) {
  const perimeter = 2 * (width + height);
  let remaining = Math.max(0, Math.min(1, progress)) * perimeter;
  if (remaining <= 0) return;

  const sides = [
    { dx: width, dy: 0 },
    { dx: 0, dy: height },
    { dx: -width, dy: 0 },
    { dx: 0, dy: -height },
  ];

  ctx.strokeStyle = color;
  ctx.lineWidth = OUTLINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.beginPath();
  let cx = x;
  let cy = y;
  ctx.moveTo(cx, cy);
  for (const side of sides) {
    if (remaining <= 0) break;
    const sideLength = Math.hypot(side.dx, side.dy);
    const used = Math.min(remaining, sideLength);
    const fraction = used / sideLength;
    cx += side.dx * fraction;
    cy += side.dy * fraction;
    ctx.lineTo(cx, cy);
    remaining -= used;
  }
  ctx.stroke();
}

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
  lastTimestamp = timestamp;

  if (state === 'playing') {
    update(dt);
  }
  draw();
  rafId = requestAnimationFrame(loop);
}

function handlePrimaryInput(event) {
  event.preventDefault();
  jump();
}

canvas.addEventListener('pointerdown', handlePrimaryInput);
overlayButton.addEventListener('click', handlePrimaryInput);

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    event.preventDefault();
    jump();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    lastTimestamp = performance.now();
  }
});

window.addEventListener('resize', resize);

bestEl.textContent = `Рекорд: ${best}`;
resize();
rafId = requestAnimationFrame(loop);
