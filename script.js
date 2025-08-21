// Elementos do DOM
const gameStartScreen = document.getElementById('gameStartScreen');
const gameScreen = document.getElementById('gameScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const gameCanvas = document.getElementById('gameCanvas');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const waveDisplay = document.getElementById('wave');
const finalScoreDisplay = document.getElementById('finalScore');

// Contexto do canvas
const ctx = gameCanvas.getContext('2d');

// Variáveis do jogo
let score = 0;
let lives = 3;
let wave = 1;
let zombies = [];
let bullets = [];
let gameInterval;
let zombieSpawnInterval;
let lastTime = 0;
let gameSpeed = 1;
let isGameOver = false;

// Configurações do jogo
const player = {
    x: gameCanvas.width / 2,
    y: gameCanvas.height - 50,
    width: 40,
    height: 40,
    color: '#3498db'
};

// Classes do jogo
class Zombie {
    constructor() {
        this.width = 30;
        this.height = 30;
        this.x = Math.random() * (gameCanvas.width - this.width);
        this.y = -this.height;
        this.speed = 1 + Math.random() * 1.5 + (wave * 0.2);
        this.color = `hsl(${Math.random() * 60}, 100%, 30%)`;
    }
    
    update() {
        this.y += this.speed;
        
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
        
        // Verificar se o zumbi passou do jogador
        if (this.y > gameCanvas.height) {
            lives--;
            livesDisplay.textContent = lives;
            zombies.splice(zombies.indexOf(this), 1);
            
            if (lives <= 0) {
                endGame();
            }
        }
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Desenhar rosto de zumbi
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 5, this.y + 7, 5, 5); // Olho esquerdo
        ctx.fillRect(this.x + 20, this.y + 7, 5, 5); // Olho direito
        ctx.fillRect(this.x + 10, this.y + 20, 10, 3); // Boca
    }
}

class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.speed = 10;
        this.color = '#ffff00';
    }
    
    update() {
        this.y -= this.speed;
    }
    
    draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Funções do jogo
function startGame() {
    gameStartScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    score = 0;
    lives = 3;
    wave = 1;
    zombies = [];
    bullets = [];
    isGameOver = false;
    
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    waveDisplay.textContent = wave;
    
    // Iniciar loops do jogo
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
}

function spawnZombie() {
    if (isGameOver) return;
    
    zombies.push(new Zombie());
    
    // A cada 10 zumbis, aumentar a dificuldade
    if (zombies.length % 10 === 0) {
        wave++;
        waveDisplay.textContent = wave;
    }
}

function shoot(event) {
    if (isGameOver) return;
    
    const rect = gameCanvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    bullets.push(new Bullet(mouseX, player.y));
}

function gameLoop(timestamp) {
    if (isGameOver) return;
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    // Limpar o canvas
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    
    // Desenhar jogador
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x - player.width/2, player.y, player.width, player.height);
    
    // Atualizar e desenhar zumbis
    for (let i = zombies.length - 1; i >= 0; i--) {
        zombies[i].update();
        zombies[i].draw();
    }
    
    // Atualizar e desenhar balas
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].update();
        bullets[i].draw();
        
        // Remover balas que saíram da tela
        if (bullets[i].y < 0) {
            bullets.splice(i, 1);
            continue;
        }
        
        // Verificar colisões entre balas e zumbis
        for (let j = zombies.length - 1; j >= 0; j--) {
            if (
                bullets[i] &&
                bullets[i].x > zombies[j].x &&
                bullets[i].x < zombies[j].x + zombies[j].width &&
                bullets[i].y > zombies[j].y &&
                bullets[i].y < zombies[j].y + zombies[j].height
            ) {
                // Colisão detectada
                zombies.splice(j, 1);
                bullets.splice(i, 1);
                score += 10;
                scoreDisplay.textContent = score;
                break;
            }
        }
    }
    
    gameInterval = requestAnimationFrame(gameLoop);
}

// Event listeners
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
gameCanvas.addEventListener('click', shoot);
