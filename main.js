// This file contains the JavaScript code that implements the Tetris game logic.

const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

canvas.width = 240;
canvas.height = 400;

const colors = [
    null,
    'cyan',
    'blue',
    'orange',
    'yellow',
    'green',
    'purple',
    'red'
];

const tetrominoes = [
    [],
    [[1, 1, 1, 1]], // I
    [[2, 2, 2], [0, 2, 0]], // T
    [[3, 3, 0], [0, 3, 3]], // Z
    [[0, 4, 4], [4, 4, 0]], // S
    [[5, 5, 5], [5, 0, 0]], // L
    [[6, 6, 6], [0, 0, 6]], // J
    [[7, 7], [7, 7]] // O
];

// Variáveis globais corrigidas
let board = Array.from({ length: 20 }, () => Array(12).fill(0));
let currentPiece;
let currentPosition;
let score = 0;
let dropInterval = 1000;
let lastTime = 0;
let isPaused = true;
let fastDrop = false; // Variável para controlar a queda rápida
let nextPieces = []; // Fila de próximas peças
let highScore = { score: 0, player: "None" };
let highScores = []; // Lista de maiores pontuações

// Inicializa o canvas para as próximas peças
const nextCanvas = document.getElementById('nextCanvas');
const nextContext = nextCanvas.getContext('2d');

// Carrega a maior pontuação do localStorage
function loadHighScore() {
    const savedHighScore = JSON.parse(localStorage.getItem('highScore'));
    if (savedHighScore) {
        highScore = savedHighScore;
        document.getElementById('highScore').innerText = `High Score: ${highScore.score} (Player: ${highScore.player})`;
    }
}

// Carrega as maiores pontuações do localStorage
function loadHighScores() {
    const savedScores = JSON.parse(localStorage.getItem('highScores'));
    if (savedScores) {
        highScores = savedScores;
        updateHighScoreList();
    }
}

// Salva a maior pontuação no localStorage
function saveHighScore() {
    if (score > highScore.score) {
        const playerName = prompt("New High Score! Enter your name:");
        highScore = { score, player: playerName || "Anonymous" };
        document.getElementById('highScore').innerText = `High Score: ${highScore.score} (Player: ${highScore.player})`;
        localStorage.setItem('highScore', JSON.stringify(highScore));
    }
}

// Salva as maiores pontuações no localStorage
function saveHighScores() {
    localStorage.setItem('highScores', JSON.stringify(highScores));
}

// Atualiza a maior pontuação
function updateHighScore() {
    if (score > highScore.score) {
        const playerName = prompt("New High Score! Enter your name:");
        highScore = { score, player: playerName || "Anonymous" };
        document.getElementById('highScore').innerText = `High Score: ${highScore.score} (Player: ${highScore.player})`;
        saveHighScore();
    }
}

// Atualiza a lista de maiores pontuações no DOM
function updateHighScoreList() {
    const highScoreList = document.getElementById('highScoreList');
    highScoreList.innerHTML = highScores
        .map((entry, index) => `<li>${index + 1}. ${entry.player}: ${entry.score}</li>`)
        .join('');
}

// Adiciona uma nova pontuação à lista de maiores pontuações
function addHighScore(score) {
    const playerName = prompt("Game Over! Enter your name:");
    highScores.push({ score, player: playerName || "Anonymous" });
    highScores.sort((a, b) => b.score - a.score); // Ordena por pontuação decrescente
    highScores = highScores.slice(0, 10); // Mantém apenas os 10 melhores
    saveHighScores();
    updateHighScoreList();
}

// Desenha o tabuleiro
function drawBoard() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
            if (board[r][c] !== 0) {
                context.fillStyle = colors[board[r][c]];
                context.fillRect(c * 20, r * 20, 20, 20);
                context.strokeStyle = 'black';
                context.strokeRect(c * 20, r * 20, 20, 20);
            }
        }
    }
}

// Desenha a peça atual
function drawPiece() {
    currentPiece.shape.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value !== 0) {
                context.fillStyle = colors[value];
                context.fillRect((currentPosition.x + c) * 20, (currentPosition.y + r) * 20, 20, 20);
                context.strokeStyle = 'black';
                context.strokeRect((currentPosition.x + c) * 20, (currentPosition.y + r) * 20, 20, 20);
            }
        });
    });
}

// Desenha as próximas peças no canvas
function drawNextPieces() {
    nextContext.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    nextPieces.forEach((piece, index) => {
        piece.shape.forEach((row, r) => {
            row.forEach((value, c) => {
                if (value !== 0) {
                    nextContext.fillStyle = colors[value];
                    nextContext.fillRect(c * 20, (r + index * 4) * 20, 20, 20);
                    nextContext.strokeStyle = 'black';
                    nextContext.strokeRect(c * 20, (r + index * 4) * 20, 20, 20);
                }
            });
        });
    });
}

// Gera uma peça aleatória
function generateRandomPiece() {
    const index = Math.floor(Math.random() * (tetrominoes.length - 1)) + 1;
    return {
        shape: tetrominoes[index],
        color: index
    };
}

// Cria uma nova peça usando a fila de peças
function createPiece() {
    if (nextPieces.length === 0) {
        for (let i = 0; i < 3; i++) {
            nextPieces.push(generateRandomPiece());
        }
    }
    currentPiece = nextPieces.shift();
    nextPieces.push(generateRandomPiece());
    currentPosition = { x: 4, y: 0 };
    drawNextPieces();
}

// Verifica colisões
function collision(offset, shape = currentPiece.shape) {
    for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
            if (shape[r][c] !== 0) {
                const newX = currentPosition.x + c + offset.x;
                const newY = currentPosition.y + r + offset.y;

                // Verifica se está fora dos limites horizontais
                if (newX < 0 || newX >= board[0].length) {
                    return true;
                }

                // Verifica se está fora dos limites verticais
                if (newY >= board.length) {
                    return true;
                }

                // Verifica se colide com outra peça no tabuleiro
                if (newY >= 0 && board[newY][newX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Mescla a peça com o tabuleiro
function merge() {
    currentPiece.shape.forEach((row, r) => {
        row.forEach((value, c) => {
            if (value !== 0) {
                board[currentPosition.y + r][currentPosition.x + c] = currentPiece.color;
            }
        });
    });
}

// Atualiza a função clearLines para fazer as peças acima caírem
function clearLines() {
    let linesCleared = 0;
    for (let y = board.length - 1; y >= 0; y--) {
        if (board[y].every(cell => cell !== 0)) {
            board.splice(y, 1);
            board.unshift(new Array(board[0].length).fill(0));
            linesCleared++;
            y++;
        }
    }
    if (linesCleared > 0) {
        updateScore(linesCleared);
    }
}

// Atualiza a função updateScore para verificar a maior pontuação e ajustar a velocidade
function updateScore(linesCleared) {
    const pointsPerLine = [0, 40, 100, 300, 1200];
    score += pointsPerLine[linesCleared];
    document.getElementById('score').innerText = `Score: ${score}`;

    // Ajusta a velocidade com base na pontuação
    if (score >= 2000) dropInterval = 400;
    else if (score >= 1500) dropInterval = 500;
    else if (score >= 1000) dropInterval = 600;
    else if (score >= 500) dropInterval = 750;
}

// Atualiza o jogo
function update(time = 0) {
    if (isPaused) return; // Não atualiza o jogo se estiver pausado

    const deltaTime = time - lastTime; // Calcula o tempo decorrido desde a última atualização
    const currentDropInterval = fastDrop ? 100 : dropInterval; // Usa queda rápida se fastDrop for true

    if (deltaTime > currentDropInterval) {
        lastTime = time; // Atualiza o último tempo registrado

        // Faz a peça cair automaticamente
        if (!collision({ x: 0, y: 1 })) {
            currentPosition.y++;
        } else {
            merge(); // Mescla a peça com o tabuleiro
            clearLines(); // Limpa linhas completas
            createPiece(); // Cria uma nova peça

            // Verifica se a nova peça colide imediatamente (fim de jogo)
            if (collision({ x: 0, y: 0 })) {
                alert('Game Over');
                addHighScore(score); // Adiciona a pontuação à lista de maiores pontuações
                resetPlayfield(); // Reseta o tabuleiro
                score = 0; // Reseta a pontuação
                dropInterval = 1000; // Reseta o intervalo de queda
                document.getElementById('score').innerText = `Score: ${score}`;
                return; // Para a atualização
            }
        }
    }

    drawBoard(); // Desenha o tabuleiro
    drawPiece(); // Desenha a peça atual
    requestAnimationFrame(update); // Continua o loop do jogo
}

// Função para resetar o tabuleiro
function resetPlayfield() {
    board = Array.from({ length: 20 }, () => Array(12).fill(0));
}

// Função para rotacionar a peça
function rotatePiece() {
    // Gera a nova forma rotacionada (90 graus no sentido horário)
    const rotatedShape = currentPiece.shape[0].map((_, index) =>
        currentPiece.shape.map(row => row[index]).reverse()
    );

    const originalPosition = currentPosition.x;
    let offset = 0;

    // Verifica colisões ao rotacionar
    while (collision({ x: offset, y: 0 }, rotatedShape)) {
        offset = offset > 0 ? -offset : -offset + 1;

        // Cancela a rotação se não houver espaço suficiente
        if (offset > currentPiece.shape[0].length) {
            return; // Cancela a rotação
        }
    }

    // Aplica a rotação e ajusta a posição
    currentPiece.shape = rotatedShape;
    currentPosition.x += offset;
}

// Eventos para controlar o jogo
document.addEventListener('keydown', (event) => {
    if (isPaused) return; // Não faz nada se o jogo estiver pausado

    switch (event.key) {
        case 'ArrowLeft': // Move para a esquerda
            if (!collision({ x: -1, y: 0 })) {
                currentPosition.x--;
            }
            break;
        case 'ArrowRight': // Move para a direita
            if (!collision({ x: 1, y: 0 })) {
                currentPosition.x++;
            }
            break;
        case 'ArrowDown': // Move para baixo (queda rápida)
            if (!collision({ x: 0, y: 1 })) {
                currentPosition.y++;
            }
            fastDrop = true; // Ativa a queda rápida
            break;
        case 'ArrowUp': // Rotaciona a peça
            rotatePiece();
            break;
    }

    drawBoard(); // Redesenha o tabuleiro
    drawPiece(); // Redesenha a peça atual
});

document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowDown') {
        fastDrop = false; // Desativa a queda rápida
    }
});

// Botão "Start Game"
document.getElementById('startButton').addEventListener('click', () => {
    if (isPaused) {
        isPaused = false;
        createPiece(); // Gera a primeira peça
        lastTime = 0; // Reseta o tempo
        update(); // Inicia o loop do jogo
    }
});

// Botão "Pause Game"
document.getElementById('pauseButton').addEventListener('click', () => {
    isPaused = !isPaused; // Alterna entre pausado e despausado
    if (!isPaused) {
        update(); // Retoma o loop do jogo se despausado
    }
});

// Botão "Restart Game"
document.getElementById('restartButton').addEventListener('click', () => {
    resetPlayfield(); // Reseta o tabuleiro
    score = 0; // Reseta a pontuação
    dropInterval = 1000; // Reseta o intervalo de queda
    document.getElementById('score').innerText = `Score: ${score}`;
    isPaused = false;
    nextPieces = []; // Reseta a fila de próximas peças
    createPiece(); // Gera a primeira peça
    lastTime = 0; // Reseta o tempo
    update(); // Inicia o loop do jogo
});