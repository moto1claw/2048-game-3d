import * as THREE from 'three';

// 游戏配置
const LEVELS = [
  { name: '古墓遗迹', target: 256, moves: 30, theme: 'ancient', color: 0x8b4513 },
  { name: '深海漩涡', target: 512, moves: 35, theme: 'ocean', color: 0x0066cc },
  { name: '星际战场', target: 1024, moves: 40, theme: 'space', color: 0x663399 },
  { name: '赛博都市', target: 2048, moves: 45, theme: 'cyber', color: 0x00ff64 },
];

const TILE_COLORS = {
  2: 0xeee4da,
  4: 0xede0c8,
  8: 0xf2b179,
  16: 0xf59563,
  32: 0xf67c5f,
  64: 0xf65e3b,
  128: 0xedcf72,
  256: 0xedcc61,
  512: 0xedc850,
  1024: 0xedc53f,
  2048: 0xedc22e,
};

// 全局变量
let scene, camera, renderer;
let grid = [];
let tiles = [];
let currentLevel = 0;
let score = 0;
let moves = 0;
let power = 0;
let gameOver = false;
let isAnimating = false;

// 初始化
function init() {
  scene = new THREE.Scene();
  
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 8, 8);
  camera.lookAt(0, 0, 0);
  
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  document.getElementById('game-container').appendChild(renderer.domElement);
  
  // 灯光
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);
  
  const pointLight1 = new THREE.PointLight(0x00ffff, 0.5);
  pointLight1.position.set(-5, 5, -5);
  scene.add(pointLight1);
  
  const pointLight2 = new THREE.PointLight(0xff00ff, 0.5);
  pointLight2.position.set(5, 5, 5);
  scene.add(pointLight2);
  
  createGridBase();
  loadLevel(0);
  setupControls();
  window.addEventListener('resize', onWindowResize);
  animate();
}

function createGridBase() {
  const baseGeometry = new THREE.BoxGeometry(5, 0.3, 5);
  const baseMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a1a2e,
    metalness: 0.3,
    roughness: 0.7
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = -0.2;
  base.receiveShadow = true;
  scene.add(base);
  
  const gridHelper = new THREE.GridHelper(4, 4, 0x444444, 0x333333);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
  
  createBackgroundParticles();
}

function createBackgroundParticles() {
  const particleCount = 500;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 30;
    positions[i + 1] = (Math.random() - 0.5) * 30;
    positions[i + 2] = (Math.random() - 0.5) * 30;
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  
  const material = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.05,
    transparent: true,
    opacity: 0.6
  });
  
  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
}

function createTile(value, row, col) {
  const group = new THREE.Group();
  
  const geometry = new THREE.BoxGeometry(0.9, 0.9, 0.9);
  const color = TILE_COLORS[value] || 0x3c3a32;
  const material = new THREE.MeshStandardMaterial({
    color: color,
    metalness: 0.2,
    roughness: 0.5,
    emissive: color,
    emissiveIntensity: 0.1
  });
  
  const cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true;
  cube.receiveShadow = true;
  group.add(cube);
  
  // 数字标签
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = value <= 4 ? '#776e65' : '#f9f6f2';
  ctx.font = 'bold 120px Orbitron, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value.toString(), 128, 128);
  
  const texture = new THREE.CanvasTexture(canvas);
  const labelMaterial = new THREE.MeshBasicMaterial({ 
    map: texture,
    transparent: true
  });
  
  const labelGeometry = new THREE.PlaneGeometry(0.7, 0.7);
  const labelFront = new THREE.Mesh(labelGeometry, labelMaterial);
  labelFront.position.z = 0.46;
  group.add(labelFront);
  
  const labelBack = new THREE.Mesh(labelGeometry, labelMaterial.clone());
  labelBack.position.z = -0.46;
  labelBack.rotation.y = Math.PI;
  group.add(labelBack);
  
  group.position.x = col - 1.5;
  group.position.z = row - 1.5;
  group.position.y = 0.5;
  
  group.scale.set(0, 0, 0);
  animateScale(group, 1, 300);
  
  group.userData = { value, row, col };
  return group;
}

function animateScale(obj, targetScale, duration) {
  const startScale = obj.scale.x;
  const startTime = Date.now();
  
  function update() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    
    const scale = startScale + (targetScale - startScale) * eased;
    obj.scale.set(scale, scale, scale);
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  update();
}

function animateMove(tile, targetRow, targetCol, duration = 150) {
  return new Promise(resolve => {
    const startX = tile.position.x;
    const startZ = tile.position.z;
    const targetX = targetCol - 1.5;
    const targetZ = targetRow - 1.5;
    const startTime = Date.now();
    
    function update() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      tile.position.x = startX + (targetX - startX) * eased;
      tile.position.z = startZ + (targetZ - startZ) * eased;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        tile.userData.row = targetRow;
        tile.userData.col = targetCol;
        resolve();
      }
    }
    update();
  });
}

function loadLevel(levelIndex) {
  currentLevel = levelIndex;
  const level = LEVELS[levelIndex];
  
  document.getElementById('level-badge').textContent = `第 ${levelIndex + 1} 关: ${level.name}`;
  document.getElementById('level-badge').style.borderColor = '#' + level.color.toString(16).padStart(6, '0');
  document.getElementById('target').textContent = level.target;
  
  tiles.forEach(tile => scene.remove(tile));
  tiles = [];
  
  grid = Array(4).fill(null).map(() => Array(4).fill(null));
  score = 0;
  moves = level.moves;
  power = 0;
  gameOver = false;
  
  updateDisplay();
  addRandomTile();
  addRandomTile();
}

function addRandomTile() {
  const emptyCells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) emptyCells.push({r, c});
    }
  }
  
  if (emptyCells.length > 0) {
    const {r, c} = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    const tile = createTile(value, r, c);
    scene.add(tile);
    tiles.push(tile);
    grid[r][c] = tile;
  }
}

function updateDisplay() {
  document.getElementById('score').textContent = score;
  document.getElementById('moves').textContent = moves;
  
  const powerFill = document.getElementById('power-fill');
  const powerPercent = (power / 10) * 100;
  powerFill.style.width = powerPercent + '%';
}

function move(direction) {
  if (gameOver || isAnimating) return;
  
  isAnimating = true;
  let moved = false;
  const movesToAnimate = [];
  
  if (direction === 'left' || direction === 'right') {
    for (let r = 0; r < 4; r++) {
      let row = [];
      for (let c = 0; c < 4; c++) {
        if (grid[r][c]) row.push(grid[r][c]);
      }
      
      if (direction === 'right') row.reverse();
      
      for (let i = 0; i < row.length - 1; i++) {
        if (row[i].userData.value === row[i + 1].userData.value) {
          row[i].userData.value *= 2;
          score += row[i].userData.value;
          
          const toRemove = row[i + 1];
          scene.remove(toRemove);
          tiles = tiles.filter(t => t !== toRemove);
          
          row.splice(i + 1, 1);
          moved = true;
        }
      }
      
      while (row.length < 4) row.push(null);
      if (direction === 'right') row.reverse();
      
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] !== row[c]) moved = true;
        grid[r][c] = row[c];
        if (row[c]) {
          row[c].userData.row = r;
          row[c].userData.col = c;
          movesToAnimate.push({ tile: row[c], row: r, col: c });
        }
      }
    }
  } else {
    for (let c = 0; c < 4; c++) {
      let col = [];
      for (let r = 0; r < 4; r++) {
        if (grid[r][c]) col.push(grid[r][c]);
      }
      
      if (direction === 'down') col.reverse();
      
      for (let i = 0; i < col.length - 1; i++) {
        if (col[i].userData.value === col[i + 1].userData.value) {
          col[i].userData.value *= 2;
          score += col[i].userData.value;
          
          const toRemove = col[i + 1];
          scene.remove(toRemove);
          tiles = tiles.filter(t => t !== toRemove);
          
          col.splice(i + 1, 1);
          moved = true;
        }
      }
      
      while (col.length < 4) col.push(null);
      if (direction === 'down') col.reverse();
      
      for (let r = 0; r < 4; r++) {
        if (grid[r][c] !== col[r]) moved = true;
        grid[r][c] = col[r];
        if (col[r]) {
          col[r].userData.row = r;
          col[r].userData.col = c;
          movesToAnimate.push({ tile: col[r], row: r, col: c });
        }
      }
    }
  }
  
  if (moved) {
    moves--;
    updateDisplay();
    
    Promise.all(movesToAnimate.map(m => animateMove(m.tile, m.row, m.col)))
      .then(() => {
        addRandomTile();
        
        tiles.forEach(tile => updateTileVisual(tile));
        
        const level = LEVELS[currentLevel];
        if (checkWin(level.target)) {
          showGameOver(true);
        } else if (moves <= 0 || checkLose()) {
          showGameOver(false);
        }
        
        isAnimating = false;
      });
  } else {
    isAnimating = false;
  }
}

function updateTileVisual(tile) {
  const value = tile.userData.value;
  
  const color = TILE_COLORS[value] || 0x3c3a32;
  tile.children[0].material.color.setHex(color);
  tile.children[0].material.emissive.setHex(color);
  
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = value <= 4 ? '#776e65' : '#f9f6f2';
  ctx.font = `bold ${value > 999 ? 80 : 120}px Orbitron, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(value.toString(), 128, 128);
  
  const texture = new THREE.CanvasTexture(canvas);
  tile.children[1].material.map = texture;
  tile.children[2].material.map = texture;
}

function checkWin(target) {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] && grid[r][c].userData.value >= target) return true;
    }
  }
  return false;
}

function checkLose() {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!grid[r][c]) return false;
      if (c < 3 && grid[r][c].userData.value === grid[r][c + 1]?.userData.value) return false;
      if (r < 3 && grid[r][c].userData.value === grid[r + 1][c]?.userData.value) return false;
    }
  }
  return true;
}

function showGameOver(won) {
  gameOver = true;
  const modal = document.getElementById('gameover-modal');
  const title = document.getElementById('modal-title');
  const stars = document.getElementById('modal-stars');
  const scoreEl = document.getElementById('modal-score');
  const nextBtn = document.getElementById('modal-next');
  
  if (won) {
    title.textContent = '通关!';
    title.className = 'modal-title success';
    const starCount = moves > LEVELS[currentLevel].moves * 0.5 ? 3 : moves > LEVELS[currentLevel].moves * 0.3 ? 2 : 1;
    stars.textContent = '⭐'.repeat(starCount);
    nextBtn.style.display = currentLevel < LEVELS.length - 1 ? 'inline-block' : 'none';
  } else {
    title.textContent = '失败!';
    title.className = 'modal-title fail';
    stars.textContent = '💔';
    nextBtn.style.display = 'none';
  }
  
  scoreEl.textContent = `得分: ${score}`;
  modal.classList.add('show');
}

function usePower() {
  const cells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c]) cells.push({r, c});
    }
  }
  
  if (cells.length > 0) {
    const target = cells[Math.floor(Math.random() * cells.length)];
    const tile = grid[target.r][target.c];
    
    animateExplosion(tile).then(() => {
      scene.remove(tile);
      tiles = tiles.filter(t => t !== tile);
      grid[target.r][target.c] = null;
    });
    
    power = 0;
    updateDisplay();
  }
}

function animateExplosion(tile) {
  return new Promise(resolve => {
    const startTime = Date.now();
    const duration = 300;
    
    function update() {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      tile.scale.setScalar(1 - progress);
      tile.rotation.y += 0.3;
      tile.position.y += 0.1;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        resolve();
      }
    }
    update();
  });
}

function nextLevel() {
  document.getElementById('gameover-modal').classList.remove('show');
  if (currentLevel < LEVELS.length - 1) {
    loadLevel(currentLevel + 1);
  }
}

function restartLevel() {
  document.getElementById('gameover-modal').classList.remove('show');
  loadLevel(currentLevel);
}

function setupControls() {
  document.addEventListener('keydown', (e) => {
    const keyMap = {
      'ArrowLeft': 'left', 'ArrowRight': 'right', 'ArrowUp': 'up', 'ArrowDown': 'down',
      'a': 'left', 'd': 'right', 'w': 'up', 's': 'down'
    };
    if (keyMap[e.key]) {
      e.preventDefault();
      move(keyMap[e.key]);
    }
  });
  
  let touchStartX, touchStartY;
  const container = document.getElementById('game-container');
  
  container.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  container.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    
    const minSwipe = 50;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > minSwipe) {
      move(dx > 0 ? 'right' : 'left');
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > minSwipe) {
      move(dy > 0 ? 'down' : 'up');
    }
  }, { passive: true });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  
  const time = Date.now() * 0.0001;
  camera.position.x = Math.sin(time) * 0.5;
  camera.lookAt(0, 0, 0);
  
  renderer.render(scene, camera);
}

init();
