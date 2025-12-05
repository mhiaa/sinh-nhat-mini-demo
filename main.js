/* --- GLOBAL VARIABLES & AUDIO SETUP --- */
const STAGE_1_ID = 'stage1-dino'; // Road Run
const STAGE_2_ID = 'stage2-drag'; // Drag Letter (Mới)
const STAGE_3_ID = 'stage3-catch'; // Catch Letter (Cũ là Stage 2)
const STAGE_4_ID = 'stage4-final'; // Final Message (Cũ là Stage 3)

/* --- KHAI BÁO BIẾN AUDIO MỚI --- */
const jumpSound = new Audio('jump_sound.mp3'); 
const dropSound = new Audio('drop_sound.mp3'); 
const selectSound = new Audio('select_sound.mp3'); 
const finalMusic = new Audio('final_music.mp3'); 
finalMusic.loop = true; // Lặp lại nhạc nền

/* --- STAGE 1 (ROAD RUN) VARIABLES --- */
let gameInterval;
let obstacleInterval;
let character;
let gameArea;
let scoreDisplay;
let mailbox;
let cloudContainer;
let isGameRunning = false;
let isJumping = false;

// Vị trí mặt đất
const GROUND_POSITION = 10;
let characterBottom = GROUND_POSITION;
const GRAVITY = 1.0;
const JUMP_VELOCITY = 17;
const OBSTACLE_SPEED = 4;
const HOUSE_SPEED = OBSTACLE_SPEED * 0.3;
let score = 0;
const WINNING_SCORE = 10;
let velocityY = 0; 

/* --- STAGE 3 (CATCH LETTER) VARIABLES --- */
let pinkLetterId = null;
const WHITE_LETTER_QUOTES = [ // 4 câu quote mới
    "Mini béo",
    "Mini suzuki",
    "Cái này là của Giang khoai lang",
    "Mini 100kg"
];
let whiteLetterCount = 0; // Biến đếm số thư trắng đã nhấp
let pinkLetterUnlocked = false; // Trạng thái mở khóa thư hồng

/* --- HELPER FUNCTIONS --- */

// Hàm chơi âm thanh (để reset và phát lại)
function playAudio(audioElement, volume = 1.0) {
    audioElement.volume = volume;
    audioElement.currentTime = 0; // Đưa về đầu để có thể chơi lại ngay lập tức
    audioElement.play().catch(e => console.error("Audio playback error:", e));
}

// Function to switch stages
function switchStage(nextStageId) {
    // Dừng nhạc nền cũ nếu đang chạy (chẳng hạn như nhạc nền cuối cùng)
    finalMusic.pause();
    finalMusic.currentTime = 0;

    const stages = document.querySelectorAll('.game-stage');
    stages.forEach(stage => {
        stage.style.display = 'none'; 
        // Đảm bảo dừng hiệu ứng nền khi chuyển stage
        stage.style.animation = 'none'; 
    });
    document.getElementById(nextStageId).style.display = 'flex';
}

// Hàm kiểm tra va chạm
function isColliding(rect1, rect2) {
    return (
        rect1.left < rect2.right &&
        rect1.right > rect2.left &&
        rect1.top < rect2.bottom &&
        rect1.bottom > rect2.top
    );
}

// THAY ĐỔI: Hàm khởi tạo background có thể dùng cho cả Stage 1 và Stage 3
function initializeBackground(isStage3 = false) { 
    // 1. Tạo Mây
    // Lấy container mây trong Stage 1 HOẶC Stage 3
    const targetContainer = document.getElementById('cloud-container');
    
    if (targetContainer) {
        targetContainer.innerHTML = '';
        // Đảm bảo mây nền ở dưới các chữ cái cho Stage 3
        targetContainer.style.zIndex = isStage3 ? 0 : 1; 
    }
    
    const cloudCount = isStage3 ? 10 : 5; // Tăng số lượng mây cho Stage 3
    for (let i = 0; i < cloudCount; i++) { 
        const cloud = document.createElement('div');
        cloud.classList.add('cloud-piece');
        cloud.textContent = '☁️';
        cloud.style.left = `${Math.random() * 100}vw`;
        // Mây Stage 3 có thể bắt đầu từ trên cao hơn một chút
        cloud.style.top = `${Math.random() * 50 + (isStage3 ? 10 : 150)}px`; 
        const duration = Math.random() * 30 + 50;
        cloud.style.setProperty('--duration', `${duration}s`);
        cloud.style.animationDelay = `-${Math.random() * duration}s`;
                
        if (targetContainer) targetContainer.appendChild(cloud);
    }
    
    // 2. Tạo Nhà (Chỉ cho Stage 1)
    if (!isStage3) {
        document.querySelectorAll('.bg-house').forEach(h => h.remove());
        const houseIcons = ['🏘️', '🏠', '🏡'];
        const totalHouses = 6;
        const spacing = 250;
        for (let i = 0; i < totalHouses; i++) {
            const house = document.createElement('div');
            house.classList.add('bg-house');
            house.textContent = houseIcons[Math.floor(Math.random() * houseIcons.length)];

            house.style.left = `${gameArea.offsetWidth + i * spacing + Math.random() * 100}px`;
            house.style.bottom = `${GROUND_POSITION}px`;
            gameArea.appendChild(house);
        }
    }
}


/* ------------------------------------------- */
/* --- STAGE 1: ROAD RUN GAME LOGIC (DINO) --- */
/* ------------------------------------------- */

function initializeStage1() {
    character = document.getElementById('character');
    gameArea = document.querySelector('.game-area');
    scoreDisplay = document.getElementById('score-display');
    mailbox = document.getElementById('mailbox');
    cloudContainer = document.getElementById('cloud-container');

    characterBottom = GROUND_POSITION;
    character.style.bottom = `${characterBottom}px`;
    isGameRunning = false;
    character.classList.remove('draggable', 'jumping', 'rotated-crash');

    document.getElementById('stage1-instruction').textContent = `Bấm hoặc chạm vào màn hình để NHẢY!
Vượt qua ${WINNING_SCORE} cây để mở khóa thư.`;

    startGame({ type: 'initial-run' });

    initializeBackground(false); // Gọi hàm với tham số false cho Stage 1
}

/* --- THÊM LẠI HÀM SKIP DEV --- */
function skipToWin() {
    if (isGameRunning) {
        clearInterval(gameInterval);
        clearInterval(obstacleInterval);
        isGameRunning = false;
    }
    score = WINNING_SCORE;
    scoreDisplay.textContent = `ĐIỂM: ${score}`;
    document.getElementById(STAGE_1_ID).removeEventListener('click', startGame);
    document.getElementById(STAGE_1_ID).removeEventListener('touchstart', startGame);
    document.getElementById(STAGE_1_ID).removeEventListener('click', jump);
    document.getElementById(STAGE_1_ID).removeEventListener('touchstart', jump);
    document.querySelectorAll('.obstacle').forEach(p => p.remove());
    document.querySelectorAll('.bg-house').forEach(h => h.remove());
    stopGame(true);
}


function startGame(event) {
    console.log("Game Started!");
    
    if (isGameRunning) {
        jump();
        return;
    }

    if (event.currentTarget && event.currentTarget.classList.contains('active-stage') && event.type !== 'click' && event.type !== 'touchstart' && event.type !== 'initial-run') {
        return;
    }
    
    // --- RESET STATE ---
    score = 0;
    scoreDisplay.textContent = 'ĐIỂM: 0';
    characterBottom = GROUND_POSITION;
    velocityY = 0; 
    isJumping = false;
    character.style.bottom = `${characterBottom}px`;

    character.classList.remove('draggable', 'jumping', 'rotated-crash');
    mailbox.style.display = 'none';
    mailbox.classList.remove('unlocked');
    mailbox.classList.add('locked');
    document.querySelectorAll('.obstacle').forEach(p => p.remove());

    isGameRunning = true;

    document.getElementById('stage1-instruction').textContent = "Bấm hoặc chạm vào màn hình để NHẢY!";
    gameInterval = setInterval(gameLoop, 20);
    obstacleInterval = setInterval(generateObstacle, 1500);

    document.getElementById(STAGE_1_ID).addEventListener('click', jump);
    document.getElementById(STAGE_1_ID).addEventListener('touchstart', jump);

    document.getElementById(STAGE_1_ID).removeEventListener('click', startGame);
    document.getElementById(STAGE_1_ID).removeEventListener('touchstart', startGame);
}

function stopGame(isWin = false) {
    console.log("Game Stopped!");
    clearInterval(gameInterval);
    clearInterval(obstacleInterval);
    isGameRunning = false;

    document.getElementById(STAGE_1_ID).removeEventListener('click', jump);
    document.getElementById(STAGE_1_ID).removeEventListener('touchstart', jump);

    character.classList.remove('jumping');

    if (isWin) {
        document.getElementById('stage1-instruction').textContent = "🎉 HOÀN THÀNH! Chuyển sang Giai đoạn Kéo Thư.";
        
        setTimeout(() => {
            switchStage(STAGE_2_ID);
            setupDragDropStage(); 
        }, 1000);

    } else {
        document.getElementById('stage1-instruction').textContent = `THUA!
Điểm của bạn: ${score}. Bấm để chơi lại.`;
                
        character.classList.add('rotated-crash');
        document.getElementById(STAGE_1_ID).addEventListener('click', startGame, { once: true });
        document.getElementById(STAGE_1_ID).addEventListener('touchstart', startGame, { once: true });
    }
}

function jump() {
    if (!isGameRunning || isJumping) return;
    isJumping = true;
    velocityY = JUMP_VELOCITY;
    
    character.classList.add('jumping');
    playAudio(jumpSound); 
}
function gameLoop() {
    if (!isGameRunning) return;

    // 1. Apply Gravity and Update Position
    if (isJumping) {
        characterBottom += velocityY;
        velocityY -= GRAVITY;
    }

    // 2. Check Ground Collision 
    if (characterBottom <= GROUND_POSITION) {
        characterBottom = GROUND_POSITION;
        if (isJumping) {
            isJumping = false;
            velocityY = 0;
            character.classList.remove('jumping');
        }
    }
    // 3. Update Character Position
    character.style.bottom = `${characterBottom}px`;

    // 4. Obstacle Movement and Collision/Score Check
    document.querySelectorAll('.obstacle').forEach(obstacle => {
        let obstacleX = obstacle.offsetLeft - OBSTACLE_SPEED;
        obstacle.style.left = `${obstacleX}px`;
        if (obstacleX + obstacle.offsetWidth < 0) {
            obstacle.remove();
        }
        const charRect = character.getBoundingClientRect();
        const obsRect = obstacle.getBoundingClientRect();
         
        // --- Collision Check (AABB) ---
        if (
            charRect.right > obsRect.left &&
            charRect.left < obsRect.right &&
            charRect.top < obsRect.bottom &&
            charRect.bottom > obsRect.top
        ) {
            stopGame(false);
            return;
        }
                
        // --- Score Check ---
        if (obstacleX + OBSTACLE_SPEED > charRect.left && obstacleX <= charRect.left && !obstacle.dataset.scored) {
            score++;
            obstacle.dataset.scored = true;
            
            scoreDisplay.textContent = `ĐIỂM: ${score}`;
            if (score >= WINNING_SCORE) {
                stopGame(true);
            }
        }
    });

    // 5. Background Houses Movement (Nhà di chuyển chậm)
    document.querySelectorAll('.bg-house').forEach(house => {
        let houseX = house.offsetLeft - HOUSE_SPEED;
                
        if (houseX + house.offsetWidth < 0) {
            houseX = gameArea.offsetWidth + Math.random() * 500 + 200;
        }
                
        house.style.left = `${houseX}px`;
    });
    if (!isGameRunning) return;
}

let obstacleCounter = 0;
function generateObstacle() {
    if (!isGameRunning) return;

    const obstacle = document.createElement('div');
    obstacle.classList.add('obstacle');
    obstacle.textContent = '🌳';
        
    obstacle.style.left = `${gameArea.offsetWidth}px`;
    obstacle.dataset.obstacleId = obstacleCounter++;

    gameArea.appendChild(obstacle);
}
// ------------------------------------------
// --- STAGE 2: DRAG LETTER LOGIC (MỚI) ---
// ------------------------------------------

let mailDropped = false;

function setupDragDropStage() {
    const letter = document.getElementById('draggable-letter');
    const mailbox = document.getElementById('mailbox-drag');
    
    if (!letter || !mailbox) return;
    
    // Reset trạng thái
    mailDropped = false;
    letter.style.display = 'block';
    letter.style.opacity = '1';
    mailbox.innerHTML = '📪';
    
    // Đảm bảo thư ở vị trí ban đầu (dùng translate để di chuyển)
    letter.style.top = '50%'; 
    letter.style.left = '30px'; 
    letter.style.transform = 'translateY(-50%)'; 
    
    // Xóa listener cũ (nếu có)
    const newLetter = letter.cloneNode(true);
    letter.parentNode.replaceChild(newLetter, letter);
    
    const currentLetter = document.getElementById('draggable-letter');

    // Sự kiện kéo (Touch Events cho điện thoại)
    currentLetter.addEventListener('touchstart', (e) => {
        e.preventDefault(); 
        
        const initialTouchX = e.touches[0].clientX;
        const initialTouchY = e.touches[0].clientY;
        const letterRect = currentLetter.getBoundingClientRect();
        
        // Tính toán vị trí offset của ngón tay so với thư
        const offsetX = initialTouchX - letterRect.left;
        const offsetY = initialTouchY - letterRect.top;
        
        // Bắt đầu chế độ kéo/vị trí fixed để kéo qua viewport
        currentLetter.style.position = 'fixed';
        currentLetter.style.zIndex = 1000;

        function onTouchMove(moveEvent) {
            const clientX = moveEvent.touches[0].clientX;
            const clientY = moveEvent.touches[0].clientY;
            
            // Tính toán vị trí mới
            let newLeft = clientX - offsetX;
            let newTop = clientY - offsetY;
            
            // Cập nhật vị trí Thư
            currentLetter.style.left = newLeft + 'px';
            currentLetter.style.top = newTop + 'px';
            currentLetter.style.transform = 'none'; // Bỏ transform cũ khi bắt đầu kéo
            
            
            // Kiểm tra va chạm với thùng thư
            const currentLetterRect = currentLetter.getBoundingClientRect();
            const mailboxRect = mailbox.getBoundingClientRect();

            if (isColliding(currentLetterRect, mailboxRect) && !mailDropped) {
                mailDropped = true;
                
                playAudio(dropSound); 
                
                // Hiệu ứng khi thành công
                currentLetter.style.opacity = '0'; // Thư mờ dần
                mailbox.innerHTML = '📬'; 

                // Chuyển sang giai đoạn 3 (Catch Letter)
                currentLetter.removeEventListener('touchmove', onTouchMove);
                currentLetter.removeEventListener('touchend', onTouchEnd);
                
                setTimeout(() => {
                    switchStage(STAGE_3_ID);
                    initializeStage3(); // Gọi hàm setup Giai đoạn 3
                }, 1500);
            }
        }

        function onTouchEnd() {
            currentLetter.removeEventListener('touchmove', onTouchMove);
            currentLetter.removeEventListener('touchend', onTouchEnd);
            
            // Nếu chưa chạm thùng thư, thả ra sẽ quay về vị trí cố định
            if (!mailDropped) {
                // Đặt lại vị trí ban đầu (dùng absolute/translate)
                currentLetter.style.position = 'absolute';
                currentLetter.style.left = '30px'; 
                currentLetter.style.top = '50%';
                currentLetter.style.transform = 'translateY(-50%)'; 
            }
        }

        currentLetter.addEventListener('touchmove', onTouchMove);
        currentLetter.addEventListener('touchend', onTouchEnd);
    });
}
/* ---------------------------------------------------- */
/* --- STAGE 3: CATCH LETTER LOGIC (CŨ LÀ STAGE 2) --- */
/* ---------------------------------------------------- */

// Thư trắng sẽ rơi vô hạn cho đến khi mở khóa
function createFallingLetter(isPink = false) {
    const letterContainer = document.getElementById('letter-container');
    const letter = document.createElement('div');
    letter.classList.add('falling-letter');

    const specialContent = '💌';
    let isCorrect = false;

    if (isPink) {
        letter.classList.add('pink-letter');
        letter.textContent = specialContent;
        letter.dataset.correct = 'true';
        isCorrect = true;
    } else {
        letter.textContent = '✉️';
        letter.dataset.correct = 'false';
    }

    const left = Math.random() * 90 + 5;
    const duration = Math.random() * 2 + 3;
    const delay = Math.random() * 1.5;
    
    letter.style.left = `${left}vw`;
    letter.style.setProperty('--duration', `${duration}s`);
    letter.style.setProperty('--delay', `${delay}s`);

    // Khi thư rơi hết (animation kết thúc)
    letter.addEventListener('animationend', function(e) {
        if (e.target === letter) {
            letter.remove();
            
            // --- LOGIC RƠI VÔ HẠN (THƯ TRẮNG) ---
            if (!isCorrect) {
                 setTimeout(() => createFallingLetter(false), 200); // Tạo thư trắng mới
            }
        }
    });

    // Sự kiện click
    letter.addEventListener('click', handleLetterClickStage3);
    letter.addEventListener('touchstart', handleLetterClickStage3);
    letterContainer.appendChild(letter);
}

function initializeStage3() {
    const letterContainer = document.getElementById('letter-container');
    letterContainer.innerHTML = '';
    
    // Reset biến đếm và trạng thái mở khóa
    whiteLetterCount = 0;
    pinkLetterUnlocked = false;
        
    // THÊM: Tạo mây nền cho Stage 3
    initializeBackground(true); 

    // Bắt đầu tạo dòng chảy thư trắng (vòng lặp vô hạn)
    document.getElementById('stage3-catch').querySelector('.stage-instruction').textContent = "Rất nhiều thư đang rơi! Hãy chạm vào lá thư màu HỒNG để tìm được thư của bạn.";
    
    // Tạo khoảng 5 thư ban đầu để bắt đầu chuỗi rơi vô hạn
    for (let i = 0; i < 5; i++) {
        setTimeout(() => createFallingLetter(false), i * 100);
    }
    
    // Thiết lập bộ hẹn giờ để spawn thư hồng nếu đã mở khóa
    setInterval(spawnPinkLetterPeriodically, 1000); 
}
function spawnPinkLetterPeriodically() {
    // Chỉ tạo thư hồng nếu nó đã được mở khóa VÀ ngẫu nhiên
    if (pinkLetterUnlocked) {
        // 20% cơ hội thư hồng rơi mỗi 1 giây
        if (Math.random() < 0.2) { 
            createFallingLetter(true);
        }
    }
}
function handleLetterClickStage3(e) {
    const letter = e.currentTarget;
    const isCorrect = letter.dataset.correct === 'true';
    
    playAudio(selectSound); 

    // Dừng animation và xóa listener của thư đã nhấp
    letter.style.animationPlayState = 'paused'; 
    letter.removeEventListener('click', handleLetterClickStage3);
    letter.removeEventListener('touchstart', handleLetterClickStage3);
    
    letter.remove(); // Xóa thư ngay khi click

    if (isCorrect) {
        // --- LOGIC THƯ HỒNG (WIN) ---
        
        // Xóa tất cả thư còn lại
        document.getElementById('letter-container').innerHTML = '';
        
        document.getElementById(STAGE_3_ID).style.pointerEvents = 'none';
        
        setTimeout(() => {
            switchStage(STAGE_4_ID); // Chuyển sang Giai đoạn 4
            showFinalMessage();
        }, 800);
        
    } else {
        // --- LOGIC THƯ TRẮNG (TÍNH NĂNG ẨN) ---
        
        // 1. Hiển thị câu quote hài hước
        const quote = WHITE_LETTER_QUOTES[whiteLetterCount % WHITE_LETTER_QUOTES.length];
        alert(quote);
        whiteLetterCount++;

        // 2. Kiểm tra điều kiện mở khóa thư hồng
        if (whiteLetterCount >= WHITE_LETTER_QUOTES.length && !pinkLetterUnlocked) {
            pinkLetterUnlocked = true;
            alert("Bạn đã mở khóa bí mật! Thư hồng đã bắt đầu rơi!");
            
            // Chức năng spawn thư hồng đã được thiết lập trong initializeStage3()
        }
    }
}


/* ---------------------------------------------------- */
/* --- STAGE 4: FINAL MESSAGE LOGIC (CŨ LÀ STAGE 3) --- */
/* ---------------------------------------------------- */

function showFinalMessage() {
    playAudio(finalMusic, 0.4); 
    
    const finalMessageElement = document.getElementById('final-message');
    const birthdayCardHeading = document.querySelector('#stage4-final .heading');

    // 1. BỎ CHỮ "THÔNG ĐIỆP BÍ MẬT ĐÃ ĐƯỢC MỞ KHÓA!"
    if (birthdayCardHeading) {
        birthdayCardHeading.style.display = 'none';
    }

    // NỘI DUNG MỚI ĐÃ CẬP NHẬT:
    const secretMessage = `
    wibdjskakansns béo jskakaka
    `;

    // 2. THAY KÝ TỰ XUỐNG DÒNG (\n) BẰNG THẺ <br> ĐỂ HIỂN THỊ TRONG HTML
    const formattedMessage = secretMessage.trim().replace(/\n/g, '<br>');
    finalMessageElement.innerHTML = formattedMessage;
    
    startConfetti(); // Đã đổi thành Bong bóng
}

// THAY ĐỔI: Sử dụng logic tạo Bong bóng và giới hạn hiệu ứng trong 4 giây
function startConfetti() {
    const confettiContainer = document.getElementById('confetti-container');
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];

    // Dọn dẹp bong bóng cũ trước khi tạo mới
    confettiContainer.innerHTML = '';
    confettiContainer.style.display = 'block'; // Đảm bảo container hiển thị
    
    // GIỚI HẠN THỜI GIAN HIỆU ỨNG: 4 GIÂY
    const EFFECT_DURATION = 4000; 

    for (let i = 0; i < 80; i++) { // Tạo 80 bong bóng
        const piece = document.createElement('div');
        piece.classList.add('confetti-piece');
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.width = `${Math.random() * 10 + 15}px`; // Kích thước bong bóng lớn hơn
        piece.style.height = piece.style.width; // Đảm bảo hình tròn
        piece.style.left = `${Math.random() * 100}vw`;
        
        // Thời gian bay lên và độ trễ
        const duration = Math.random() * 2 + 3; // Thời gian bay từ 3s đến 5s
        const delay = Math.random() * 0.5;
        
        piece.style.setProperty('--duration', `${duration}s`);
        piece.style.setProperty('--delay', `${delay}s`);
        
        // Áp dụng animation 'rise' đã định nghĩa trong CSS
        piece.style.animation = `rise ${duration}s ease-out ${delay}s forwards`; 

        confettiContainer.appendChild(piece);
    }
    
    setTimeout(() => {
        // Dừng và ẩn toàn bộ container chứa bong bóng sau 4 giây
        confettiContainer.style.display = 'none';
        confettiContainer.innerHTML = ''; 
    }, EFFECT_DURATION); 
}

// Hàm này dùng để mở khóa khả năng phát âm thanh trên thiết bị di động
function unlockAudio() {
    // Tải và thử phát tất cả các âm thanh một lần với âm lượng 0
    jumpSound.load();
    dropSound.load();
    selectSound.load();
    finalMusic.load();
    
    // Thử phát
    jumpSound.play().catch(() => {}); 
    dropSound.play().catch(() => {});
    selectSound.play().catch(() => {});
    finalMusic.play().catch(() => {});
    
    // Ngay lập tức dừng lại và đặt về đầu
    jumpSound.pause();
    dropSound.pause();
    selectSound.pause();
    finalMusic.pause();

    jumpSound.currentTime = 0;
    dropSound.currentTime = 0;
    selectSound.currentTime = 0;
    finalMusic.currentTime = 0;
    
    // Sau khi thành công, xóa listener để không gọi lại nữa
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('touchstart', unlockAudio);
}

/* --------------------------------- */
/* --- INITIALIZATION & RUN GAME --- */
/* --------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // Bắt đầu lắng nghe sự kiện để mở khóa âm thanh ngay khi người dùng chạm vào màn hình lần đầu tiên
    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    
    // Đảm bảo chỉ Stage 1 hiển thị lúc đầu
    document.getElementById(STAGE_2_ID).style.display = 'none';
    document.getElementById(STAGE_3_ID).style.display = 'none';
    document.getElementById(STAGE_4_ID).style.display = 'none';
    document.getElementById(STAGE_1_ID).style.display = 'flex';
    initializeStage1();
});
