// Elementos do DOM
const gameStartScreen = document.getElementById('gameStartScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const powerSelectionScreen = document.getElementById('powerSelectionScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const gameCanvas = document.getElementById('gameCanvas');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');
const zombiesCountDisplay = document.getElementById('zombiesCount');
const finalScoreDisplay = document.getElementById('finalScore');
const finalLevelDisplay = document.getElementById('finalLevel');
const levelReachedDisplay = document.getElementById('levelReached');
const powerOptions = document.querySelectorAll('.power-option');

// Contexto do canvas
const ctx = gameCanvas.getContext('2d');

// Variáveis do jogo
let score = 0;
let lives = 3;
let level = 1;
let zombies = [];
let bullets = [];
let specialAttacks = [];
let gameInterval;
let zombieSpawnInterval;
let lastTime = 0;
let isGameOver = false;
let worldOffset = { x: 0, y: 0 };
let keys = {};
let player = null;
let mapSize = 5000; // Tamanho do mapa infinito
let zombiesKilledThisLevel = 0;
let zombiesNeededForNextLevel = 10;
let activePower = null;
let powerUses = 0;
let freezeTime = 0;

// Classes do jogo
class Player {
    constructor() {
        this.x = mapSize / 2;
        this.y = mapSize / 2;
        this.width = 40;
        this.height = 40;
        this.speed = 5;
        this.color = '#3498db';
    }
    
    update() {
        // Movimento baseado nas teclas pressionadas
        if (keys['ArrowUp'] || keys['w'] || keys['W']) this.y -= this.speed;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) this.y += this.speed;
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) this.x -= this.speed;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) this.x += this.speed;
        
        // Limitar jogador ao mapa
        this.x = Math.max(0, Math.min(mapSize - this.width, this.x));
        this.y = Math.max(0, Math.min(mapSize - this.height, this.y));
        
        // Atualizar offset do mundo para criar efeito de câmera
        worldOffset.x = this.x - gameCanvas.width / 2 + this.width / 2;
        worldOffset.y = this.y - gameCanvas.height / 2 + this.height / 2;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(
            this.x - worldOffset.x, 
            this.y - worldOffset.y, 
            this.width, 
            this.height
        );
        
        // Desenhar direção do jogador (um "nariz" para indicar para onde está virado)
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(
            this.x - worldOffset.x + this.width / 2, 
            this.y - worldOffset.y - 10, 
            5, 0, Math.PI * 2
        );
        ctx.fill();
    }
}

class Zombie {
    constructor() {
        this.width = 30;
        this.height = 30;
        
        // Spawnar zumbis fora da tela
        let side = Math.floor(Math.random() * 4);
        let spawnX, spawnY;
        
        switch(side) {
            case 0: // Topo
                spawnX = Math.random() * mapSize;
                spawnY = -this.height;
                break;
            case 1: // Direita
                spawnX = mapSize;
                spawnY = Math.random() * mapSize;
                break;
            case 2: // Baixo
                spawnX = Math.random() * mapSize;
                spawnY = mapSize;
                break;
            case 3: // Esquerda
                spawnX = -this.width;
                spawnY = Math.random() * mapSize;
                break;
        }
        
        this.x = spawnX;
        this.y = spawnY;
        this.speed = 1 + Math.random() * 1.5 + (level * 0.2);
        this.color = `hsl(${Math.random() * 60}, 100%, 30%)`;
        this.isFrozen = false;
        this.frozenTime = 0;
    }
    
    update() {
        if (this.isFrozen) {
            this.frozenTime++;
            if (this.frozenTime > 300) { // 5 segundos a 60fps
                this.isFrozen = false;
                this.frozenTime = 0;
                this.color = `hsl(${Math.random() * 60}, 100%, 30%)`;
            }
            return;
        }
        
        // Mover em direção ao jogador
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
        
        // Verificar colisão com o jogador
        if (
            this.x < player.x + player.width &&
            this.x + this.width > player.x &&
            this.y < player.y + player.height &&
            this.y + this.height > player.y
        ) {
            lives--;
            livesDisplay.textContent = lives;
            zombies.splice(zombies.indexOf(this), 1);
            
            if (lives <= 0) {
                endGame();
            }
        }
    }
    
    draw() {
        const screenX = this.x - worldOffset.x;
        const screenY = this.y - worldOffset.y;
        
        // Só desenhar se estiver na tela
        if (
            screenX + this.width > 0 && 
            screenX < gameCanvas.width &&
            screenY + this.height > 0 && 
            screenY < gameCanvas.height
        ) {
            ctx.fillStyle = this.isFrozen ? '#00aaff' : this.color;
            ctx.fillRect(screenX, screenY, this.width, this.height);
            
            // Desenhar rosto de zumbi
            ctx.fillStyle = this.isFrozen ? '#ffffff' : '#000';
            ctx.fillRect(screenX + 5, screenY + 7, 5, 5); // Olho esquerdo
            ctx.fillRect(screenX + 20, screenY + 7, 5, 5); // Olho direito
            ctx.fillRect(screenX + 10, screenY + 20, 10, 3); // Boca
        }
    }
}

class Bullet {
    constructor(x, y, targetX, targetY, isSpecial = false, powerType = null) {
        this.x = x;
        this.y = y;
        
        // Calcular direção
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        this.dx = (dx / dist) * 10;
        this.dy = (dy / dist) * 10;
        this.radius = isSpecial ? 8 : 5;
        this.color = isSpecial ? 
            (powerType === 'fire' ? '#ff5500' : 
             powerType === 'lightning' ? '#ffff00' : '#55aaff') : 
            '#ffff00';
        this.isSpecial = isSpecial;
        this.powerType = powerType;
        this.distance = 0;
        this.maxDistance = 300; // Distância máxima que uma bala pode percorrer
    }
    
    update() {
        this.x += this.dx;
        this.y += this.dy;
        this.distance += Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        
        // Remover balas que viajaram muito
        if (this.distance > this.maxDistance) {
            return true;
        }
        
        // Verificar colisões com zumbis
        for (let i = zombies.length - 1; i >= 0; i--) {
            const zombie = zombies[i];
            if (
                this.x > zombie.x &&
                this.x < zombie.x + zombie.width &&
                this.y > zombie.y &&
                this.y < zombie.y + zombie.height
            ) {
                // Colisão detectada
                if (this.isSpecial) {
                    this.handleSpecialPower(zombie, i);
                } else {
                    zombies.splice(i, 1);
                    score += 10;
                    zombiesKilledThisLevel++;
                }
                
                scoreDisplay.textContent = score;
                zombiesCountDisplay.textContent = zombies.length;
                
                // Verificar se o jogador avançou de nível
                if (zombiesKilledThisLevel >= zombiesNeededForNextLevel) {
                    levelUp();
                }
                
                // Balas normais desaparecem após acertar
                if (!this.isSpecial) {
                    return true;
                }
                
                // Alguns poderes continuam após acertar
                if (this.powerType === 'lightning') {
                    this.lightningHits = (this.lightningHits || 0) + 1;
                    if (this.lightningHits >= 3) {
                        return true;
                    }
                }
                
                break;
            }
        }
        
        return false;
    }
    
    handleSpecialPower(zombie, index) {
        switch(this.powerType) {
            case 'fire':
                // Fogo causa dano em área
                for (let j = zombies.length - 1; j >= 0; j--) {
                    const otherZombie = zombies[j];
                    const dist = Math.sqrt(
                        Math.pow(otherZombie.x - zombie.x, 2) + 
                        Math.pow(otherZombie.y - zombie.y, 2)
                    );
                    
                    if (dist < 100) { // Raio de explosão
                        zombies.splice(j, 1);
                        score += 10;
                        zombiesKilledThisLevel++;
                    }
                }
                return true; // Bala de fogo some após explosão
                
            case 'lightning':
                // Raio já trata a colisão normalmente (remove 1 zumbi)
                zombies.splice(index, 1);
                score += 10;
                zombiesKilledThisLevel++;
                break;
                
            case 'freeze':
                // Congela o zumbi mas não o mata
                zombie.isFrozen = true;
                zombie.color = '#00aaff';
                break;
        }
    }
    
    draw() {
        const screenX = this.x - worldOffset.x;
        const screenY = this.y - worldOffset.y;
        
        // Só desenhar se estiver na tela
        if (
            screenX + this.radius > 0 && 
            screenX - this.radius < gameCanvas.width &&
            screenY + this.radius > 0 && 
            screenY - this.radius < gameCanvas.height
        ) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Efeitos especiais para poderes
            if (this.isSpecial) {
                if (this.powerType === 'fire') {
                    ctx.fillStyle = 'rgba(255, 150, 0, 0.5)';
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, this.radius + 3, 0, Math.PI * 2);
                    ctx.fill();
                } else if (this.powerType === 'lightning') {
                    ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, this.radius + 2, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
    }
}

// Funções do jogo
function startGame() {
    gameStartScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    powerSelectionScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    score = 0;
    lives = 3;
    level = 1;
    zombies = [];
    bullets = [];
    specialAttacks = [];
    isGameOver = false;
    worldOffset = { x: 0, y: 0 };
    zombiesKilledThisLevel = 0;
    zombiesNeededForNextLevel = 10;
    activePower = null;
    powerUses = 0;
    freezeTime = 0;
    
    player = new Player();
    
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    levelDisplay.textContent = level;
    zombiesCountDisplay.textContent = zombies.length;
    
    // Iniciar loops do jogo
    lastTime = performance.now();
    gameInterval = requestAnimationFrame(gameLoop);
    zombieSpawnInterval = setInterval(spawnZombie, 1000);
}

function endGame() {
    isGameOver = true;
    cancelAnimationFrame(gameInterval);
    clearInterval(zombieSpawnInterval);
    
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    finalScoreDisplay.textContent = score;
    finalLevelDisplay.textContent = level;
}

function spawnZombie() {
    if (isGameOver) return;
    
    // Aumentar número de zumbis baseado no nível
    const zombiesToSpawn = Math.min(level, 10);
    
    for (let i = 0; i < zombiesToSpawn; i++) {
        zombies.push(new Zombie());
    }
    
    zombiesCountDisplay.textContent = zombies.length;
}

function shoot(event) {
    if (isGameOver) return;
    
    const rect = gameCanvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left + worldOffset.x;
    const mouseY = event.clientY - rect.top + worldOffset.y;
    
    if (activePower && powerUses > 0) {
        // Usar poder especial
        bullets.push(new Bullet(
            player.x + player.width / 2, 
            player.y + player.height / 2,
            mouseX,
            mouseY,
            true,
            activePower
        ));
        powerUses--;
        
        // Se acabaram os usos, remover o poder
        if (powerUses === 0) {
            activePower = null;
        }
    } else {
        // Tiro normal
        bullets.push(new Bullet(
            player.x + player.width / 2, 
            player.y + player.height / 2,
            mouseX,
            mouseY
        ));
    }
}

function levelUp() {
    level++;
    zombiesKilledThisLevel = 0;
    zombiesNeededForNextLevel = 10 + (level * 2);
    levelDisplay.textContent = level;
    
    // A cada 5 níveis, oferecer seleção de poder
    if (level % 5 === 0) {
        showPowerSelection();
    }
}

function showPowerSelection() {
    cancelAnimationFrame(gameInterval);
    clearInterval(zombieSpawnInterval);
    
    levelReachedDisplay.textContent = level;
    powerSelectionScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
}

function selectPower(powerType) {
    activePower = powerType;
    
    // Definir número de usos baseado no poder
    switch(powerType) {
        case 'fire':
            powerUses = 5;
            break;
        case 'lightning':
            powerUses = 10;
            break;
        case 'freeze':
            powerUses = 3;
            break;
    }
    
    powerSelectionScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    // Reiniciar loops do jogo
    lastTime = performance.now();
    gameInterval = requestAnimationFrame(gameLoop);
    zombieSpawnInterval = setInterval(spawnZombie, 1000);
}

function gameLoop(timestamp) {
    if (isGameOver) return;
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Limpar o canvas
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // Desenhar fundo (grade para simular mapa infinito)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    const gridSize = 100;
    const startX = -worldOffset.x % gridSize;
    const startY = -worldOffset.y % gridSize;
    
    for (let x = startX; x < gameCanvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, gameCanvas.height);
        ctx.stroke();
    }
    
    for (let y = startY; y < gameCanvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(gameCanvas.width, y);
        ctx.stroke();
    }
    
    // Atualizar e desenhar jogador
    player.update();
    player.draw();
    
    // Atualizar e desenhar zumbis
    for (let i = zombies.length - 1; i >= 0; i--) {
        zombies[i].update();
        zombies[i].draw();
    }
    
    // Atualizar e desenhar balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        const shouldRemove = bullets[i].update();
        if (shouldRemove) {
            bullets.splice(i, 1);
        } else {
            bullets[i].draw();
        }
    }
    
    // Desenhar minimapa
    drawMinimap();
    
    // Desenhar HUD com informações de poder ativo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 50, 200, 30);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    
    if (activePower) {
        let powerName = '';
        switch(activePower) {
            case 'fire': powerName = 'Bola de Fogo'; break;
            case 'lightning': powerName = 'Raio Elétrico'; break;
            case 'freeze': powerName = 'Congelamento'; break;
        }
        ctx.fillText(`Poder: ${powerName} (${powerUses} usos)`, 20, 70);
    } else {
        ctx.fillText('Nenhum poder ativo', 20, 70);
    }
    
    gameInterval = requestAnimationFrame(gameLoop);
}

function drawMinimap() {
    const minimapSize = 150;
    const minimapScale = minimapSize / mapSize;
    const minimapX = gameCanvas.width - minimapSize - 10;
    const minimapY = 10;
    
    // Fundo do minimapa
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(minimapX, minimapY, minimapSize, minimapSize);
    
    // Área visível
    const visibleAreaX = minimapX + worldOffset.x * minimapScale;
    const visibleAreaY = minimapY + worldOffset.y * minimapScale;
    const visibleAreaWidth = gameCanvas.width * minimapScale;
    const visibleAreaHeight = gameCanvas.height * minimapScale;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.strokeRect(visibleAreaX, visibleAreaY, visibleAreaWidth, visibleAreaHeight);
    
    // Jogador no minimapa
    ctx.fillStyle = '#3498db';
    ctx.fillRect(
        minimapX + player.x * minimapScale - 2,
        minimapY + player.y * minimapScale - 2,
        4, 4
    );
    
    // Zumbis no minimapa
    ctx.fillStyle = '#ff0000';
    for (const zombie of zombies) {
        ctx.fillRect(
            minimapX + zombie.x * minimapScale - 1,
            minimapY + zombie.y * minimapScale - 1,
            2, 2
        );
    }
}

// Event listeners
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
gameCanvas.addEventListener('click', shoot);

// Controles de teclado
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Seleção de poderes
powerOptions.forEach(option => {
    option.addEventListener('click', () => {
        selectPower(option.dataset.power);
    });
});