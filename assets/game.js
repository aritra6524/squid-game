document.addEventListener('DOMContentLoaded', () => {
    // Screens
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const winScreen = document.getElementById('win-screen');
    const roundCompleteScreen = document.getElementById('round-complete-screen');

    // Buttons
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const playAgainButton = document.getElementById('play-again-button');
    const nextRoundButton = document.getElementById('next-round-button');

    // Game Elements
    const gameContainer = document.getElementById('game-container');
    const player = document.getElementById('player');
    const doll = document.getElementById('doll');
    const timerDisplay = document.querySelector('#timer span');
    const roundDisplay = document.querySelector('#round-display span');
    const statusLight = document.getElementById('status-light');
    const npcContainer = document.getElementById('npc-container');
    const confettiContainer = document.getElementById('confetti-container');

    // Audio Elements
    const songAudio = document.getElementById('song-audio');
    const gunshotAudio = document.getElementById('gunshot-audio');
    const greenLightAudio = document.getElementById('green-light-audio');
    const redLightAudio = document.getElementById('red-light-audio');
    const backgroundMusicAudio = document.getElementById('background-music-audio');
    const tenseMusicAudio = document.getElementById('tense-music-audio');
    const footstepsAudio = document.getElementById('footsteps-audio');
    const npcFootstepsAudio = document.getElementById('npc-footsteps-audio');
    const victoryMusicAudio = document.getElementById('victory-music-audio');
    const cardRevealAudio = document.getElementById('card-reveal-audio');
    const hoverAudio = document.getElementById('hover-audio');
    const clickAudio = document.getElementById('click-audio');

    // Game Constants
    const PLAYER_SPEED = 0.3; // % per animation frame
    const WIN_POSITION = 85; // % from bottom
    const THROB_THRESHOLD = 70; // % from bottom to start throbbing effect
    const TOTAL_ROUNDS = 3;
    const NPC_COUNT = 25;
    const MAX_NPC_FOOTSTEPS_VOLUME = 0.4; // More prominent crowd sound

    // Difficulty settings per round: { time, greenMin, greenMax, redMin, redMax }
    const DIFFICULTY = {
        1: { time: 45, greenMin: 2.5, greenMax: 4.5, redMin: 2.0, redMax: 3.5 },
        2: { time: 35, greenMin: 2.0, greenMax: 3.5, redMin: 1.5, redMax: 3.0 },
        3: { time: 25, greenMin: 1.5, greenMax: 2.5, redMin: 1.0, redMax: 2.0 }
    };

    // Game State
    let gameActive = false;
    let lightIsGreen = true;
    let playerIsMoving = false;
    let currentRound = 1;
    let timerInterval;
    let gameCycleTimeout;
    let timeLeft;
    let wins = 0;
    let animationFrameId; // To control the game loop
    let audioInitialized = false;
    let isTenseMusicPlaying = false;
    let npcs = [];
    let usedPlayerNumbers = new Set();

    // --- Audio Helper ---
    function playAudio(audioElement) {
        // Ensure audio is not muted and volume is up
        audioElement.muted = false;
        // To make the tense music feel louder, we lower other primary sounds when it's active.
        audioElement.volume = isTenseMusicPlaying ? 0.5 : 1.0;
        audioElement.currentTime = 0;
        
        const playPromise = audioElement.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error(`Audio playback failed for #${audioElement.id}:`, error);
                // This is a common issue. We can't force audio, but we can inform the user.
                // You can uncomment the alert below for easier debugging on your end.
                // alert("Could not play audio. Please ensure your browser tab is not muted and you have interacted with the page.");
            });
        }
    }

    // --- Footstep Sound Controls ---
    function playFootsteps() {
        if (!audioInitialized || !gameActive) return;
        footstepsAudio.volume = 0.6; // A bit quieter than other effects
        const playPromise = footstepsAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.error("Footsteps audio failed to play:", error));
        }
    }

    function stopFootsteps() {
        footstepsAudio.pause();
        footstepsAudio.currentTime = 0;
    }

    // --- UI Sound Controls ---
    function playHoverSound() {
        if (!audioInitialized) return;
        hoverAudio.volume = 0.5; // Keep it subtle
        hoverAudio.currentTime = 0;
        const playPromise = hoverAudio.play();
        if (playPromise !== undefined) {
            // Intentionally empty catch to suppress console errors on rapid hovers
            playPromise.catch(() => {});
        }
    }

    function playClickSound() {
        if (!audioInitialized) return;
        clickAudio.volume = 0.7;
        clickAudio.currentTime = 0;
        const playPromise = clickAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(() => {}); // Intentionally empty
        }
    }

    // --- NPC Footstep Controls ---
    function manageNpcFootsteps() {
        if (!audioInitialized || !gameActive) return;

        const runningNpcs = npcs.filter(npc => npc.isMoving && !npc.isEliminated).length;
        // Calculate target volume based on the proportion of running NPCs
        const targetVolume = (runningNpcs / NPC_COUNT) * MAX_NPC_FOOTSTEPS_VOLUME;

        // Smoothly transition to the target volume to avoid jarring sound changes
        const currentVolume = npcFootstepsAudio.volume;
        const smoothingFactor = 0.05; // Lower is smoother
        npcFootstepsAudio.volume += (targetVolume - currentVolume) * smoothingFactor;
    }


    // --- Background Music Controls ---
    function playBackgroundMusic() {
        // Don't attempt to play any music until the user has interacted with the page.
        if (!audioInitialized) {
            console.log("Audio not initialized. Waiting for user interaction.");
            return;
        }

        backgroundMusicAudio.volume = 0.5; // Lower volume for background
        const playPromise = backgroundMusicAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                // Autoplay is often blocked. Music will start after user interaction.
                console.warn("Background music autoplay was prevented.", error);
            });
        }
    }

    function stopBackgroundMusic() {
        backgroundMusicAudio.pause();
        backgroundMusicAudio.currentTime = 0;
    }

    // --- Tense Music Controls ---
    function playTenseMusic() {
        if (!audioInitialized || isTenseMusicPlaying) return;
        isTenseMusicPlaying = true;
        stopBackgroundMusic();
        tenseMusicAudio.volume = 1.0; // Max volume for high tension
        const playPromise = tenseMusicAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.warn("Tense music autoplay was prevented.", error));
        }
    }

    function stopTenseMusic() {
        if (!isTenseMusicPlaying) return;
        isTenseMusicPlaying = false;
        tenseMusicAudio.pause();
        tenseMusicAudio.currentTime = 0;
    }

    // --- Victory Music Controls ---
    function playVictoryMusic() {
        if (!audioInitialized) return;
        // Ensure all other thematic music is stopped
        stopBackgroundMusic();
        stopTenseMusic();

        victoryMusicAudio.volume = 0.7; // A good celebratory volume
        const playPromise = victoryMusicAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.warn("Victory music autoplay was prevented.", error));
        }
    }

    function stopVictoryMusic() {
        victoryMusicAudio.pause();
        victoryMusicAudio.currentTime = 0;
    }

    // --- Confetti Controls ---
    function createConfetti() {
        if (!confettiContainer) return;
        clearConfetti(); // Clear any existing confetti first
        const confettiCount = 150;
        const colors = ['#ffd700', '#f0e68c', '#daa520', '#ffec8b'];

        for (let i = 0; i < confettiCount; i++) {
            const confettiPiece = document.createElement('div');
            confettiPiece.className = 'confetti';
            
            confettiPiece.style.left = `${Math.random() * 100}%`;
            // Randomize animation properties for a natural look
            confettiPiece.style.animationDuration = `${Math.random() * 3 + 4}s`; // 4s to 7s
            confettiPiece.style.animationDelay = `${Math.random() * 5}s`;
            
            // Add a bit of color variation for a more dynamic look
            const color = colors[Math.floor(Math.random() * colors.length)];
            confettiPiece.style.background = `linear-gradient(135deg, ${color}, gold)`;

            // Randomize the final Z rotation for more varied tumbling
            confettiPiece.style.setProperty('--rotate-z-end', `${Math.random() * 720 - 360}deg`);

            confettiContainer.appendChild(confettiPiece);
        }
    }

    function clearConfetti() {
        if (confettiContainer) confettiContainer.innerHTML = '';
    }

    // --- Screen Management ---
    function showScreen(screen) {
        [startScreen, gameScreen, gameOverScreen, winScreen, roundCompleteScreen].forEach(s => s.classList.remove('active'));
        screen.classList.add('active');

        if (screen === gameScreen) {
            stopBackgroundMusic();
            stopVictoryMusic(); // Ensure victory music doesn't bleed into a new game
            // Apply round-specific styles
            document.body.classList.remove('round-2', 'round-3'); // Clear previous
            if (currentRound > 1) {
                document.body.classList.add(`round-${currentRound}`);
            }
        } else if (screen === winScreen) {
            // The endGame function handles starting the victory music.
            // We just need to ensure other tracks are stopped.
            stopBackgroundMusic();
            stopTenseMusic();
        } else {
            // For start, game over, and round complete screens, play the default theme.
            stopTenseMusic();
            stopVictoryMusic();
            playBackgroundMusic();
            // Remove game-specific styles when on a menu screen
            document.body.classList.remove('round-2', 'round-3');
        }
    }

    // --- Audio Initialization ---
    function initializeAudio() {
        if (audioInitialized) return;
        audioInitialized = true;
        console.log("Audio context unlocked by user interaction.");
    }

    // --- Score Management ---
    function loadScore() {
        const savedWins = localStorage.getItem('squidGameWins');
        wins = savedWins ? parseInt(savedWins, 10) : 0;
    }

    function saveScore() {
        localStorage.setItem('squidGameWins', wins);
    }

    function updateRoundDisplay() {
        if (roundDisplay) {
            roundDisplay.textContent = `${currentRound} / ${TOTAL_ROUNDS}`;
        }
    }

    // --- Number Assignment ---
    function getUniquePlayerNumber() {
        let number;
        do {
            number = Math.floor(Math.random() * 456) + 1;
        } while (usedPlayerNumbers.has(number));
        usedPlayerNumbers.add(number);
        return String(number).padStart(3, '0');
    }

    function assignPlayerNumber() {
        document.querySelector('#player .player-number').textContent = getUniquePlayerNumber();
    }

    // --- Game Initialization ---
    function initGame(round) {
        // Stop any previous game loop to prevent duplicates
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        // Reset tense music if starting a new game from scratch
        if (round === 1 && isTenseMusicPlaying) {
            stopTenseMusic();
        }

        // Clear number set for the new round
        usedPlayerNumbers.clear();

        // Clear out old NPCs from the previous game
        clearNpcs();
        // Create a new set of NPCs for this game
        createNpcs();

        clearGuards();
        createGuards();

        // Clean up any lingering sound listeners
        gunshotAudio.removeEventListener('ended', playBackgroundMusic);

        // Reset player visual state
        player.style.bottom = '5%';
        player.style.zIndex = 5;
        player.classList.remove('moving', 'eliminated');
        player.style.opacity = '1';
        player.style.transform = 'translateX(-50%)';
        
        // Reset UI elements
        timerDisplay.parentElement.classList.remove('warning');
        timerDisplay.parentElement.classList.remove('red-light-pause');
        gameContainer.classList.remove('arena-red-alert');
        gameContainer.classList.remove('near-finish');

        // Set up round difficulty
        currentRound = round;

        // Start tense music at the beginning of round 2
        if (currentRound === 2 && !isTenseMusicPlaying) {
            playTenseMusic();
        }

        const difficulty = DIFFICULTY[currentRound];
        timeLeft = difficulty.time;
        timerDisplay.textContent = timeLeft;
        
        // Reset state
        gameActive = true;
        lightIsGreen = true;
        playerIsMoving = false;
        
        // UI updates
        gameContainer.classList.add('zoomed-in');
        statusLight.classList.remove('red');
        statusLight.classList.add('green');
        doll.classList.remove('looking');
        
        assignPlayerNumber();
        updateRoundDisplay();
        showScreen(gameScreen);

        // Start the NPC footsteps loop, muted. The gameLoop will manage its volume.
        npcFootstepsAudio.volume = 0;
        const playPromise = npcFootstepsAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.warn("NPC footsteps audio failed to start:", error));
        }
        
        // Start timers
        startTimer();
        startGameCycle();
        gameLoop(); // Start the main game loop
    }

    // --- Game Logic ---
    // New game loop for handling continuous movement
    function gameLoop() {
        if (!gameActive) return; // Stop loop if game is not active
        if (playerIsMoving) {
            movePlayer();
        }
        // Add doll head tracking during red light
        if (doll.classList.contains('looking')) {
            updateDollHeadTracking();
        }
        updateNpcs();
        manageNpcFootsteps();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    function updateDollHeadTracking() {
        const playerRect = player.getBoundingClientRect();
        const gameAreaRect = gameContainer.getBoundingClientRect();

        // Calculate player's horizontal center relative to the game container
        const playerCenter = playerRect.left - gameAreaRect.left + (playerRect.width / 2);
        
        // Convert to a percentage (-1 for far left, 0 for center, 1 for far right)
        const playerPercentX = (playerCenter / gameAreaRect.width - 0.5) * 2;

        // Map the percentage to a rotation angle (e.g., -40 to +40 degrees)
        const maxRotation = 40; 
        const headRotation = playerPercentX * maxRotation;

        // Apply the rotation via CSS custom property for smooth animation
        doll.style.setProperty('--head-rotate-y', `${headRotation}deg`);
    }

    function startTimer() {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            // Timer only counts down during Green Light
            if (lightIsGreen) {
                timeLeft--;
                timerDisplay.textContent = timeLeft;
            }
            // Add warning for Round 2 when time is low
            if (currentRound === 2 && timeLeft <= 10) {
                timerDisplay.parentElement.classList.add('warning');
            }

            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                if (gameActive) {
                    endGame(false, "Time's up!");
                }
            }
        }, 1000);
    }

    function startGameCycle() {
        if (!gameActive) return;

        const difficulty = DIFFICULTY[currentRound];
        const greenLightDuration = (Math.random() * (difficulty.greenMax - difficulty.greenMin) + difficulty.greenMin) * 1000;
        const redLightDuration = (Math.random() * (difficulty.redMax - difficulty.redMin) + difficulty.redMin) * 1000;

        // This function starts the song after the "Green Light" voice line ends.
        // It's defined here so we can remove the listener if the light turns red early.
        const songStarter = () => {
            // In Round 3, the doll is silent for maximum tension.
            if (gameActive && lightIsGreen && currentRound < 3) {
                playAudio(songAudio);
            }
        };

        // GREEN LIGHT
        lightIsGreen = true;
        timerDisplay.parentElement.classList.remove('red-light-pause'); // Stop blinking
        gameContainer.classList.remove('arena-red-alert'); // Stop arena blinking
        statusLight.classList.remove('red');
        statusLight.classList.add('green');
        doll.classList.remove('looking');
        // Reset head tracking when light turns green
        doll.style.setProperty('--head-rotate-y', '0deg');
        greenLightAudio.addEventListener('ended', songStarter, { once: true });
        playAudio(greenLightAudio);
        
        gameCycleTimeout = setTimeout(() => {
            if (!gameActive) return;

            // RED LIGHT
            lightIsGreen = false;
            timerDisplay.parentElement.classList.add('red-light-pause'); // Start blinking
            gameContainer.classList.add('arena-red-alert'); // Start arena blinking

            // At the moment the light turns red, determine which NPCs are caught.
            // This is crucial because the game might end immediately after this if the player moves.
            const caughtNpcs = npcs.filter(npc => !npc.isEliminated && (npc.isMoving || Math.random() < npc.clumsiness));

            // Immediately stop all NPCs from visually moving so they don't look like they are running on red.
            npcs.forEach(npc => {
                if (npc.isMoving) {
                    npc.isMoving = false;
                    npc.element.classList.remove('moving');
                }
            });

            // Stop green-light-phase audio and play the red light sound
            greenLightAudio.removeEventListener('ended', songStarter); // Clean up listener
            greenLightAudio.pause();
            songAudio.pause();
            playAudio(redLightAudio);

            statusLight.classList.remove('green');
            statusLight.classList.add('red');
            doll.classList.add('looking');
            
            // Eliminate the caught NPCs with a staggered delay for sound effects.
            checkNpcEliminations(caughtNpcs);

            // Check if player was moving when light turned red
            if (playerIsMoving) {
                endGame(false, "You moved during Red Light.");
                return;
            }

            // Calculate the total time required for all elimination animations and sounds to complete.
            // Base delay is 250ms. Each subsequent shot is staggered by 150ms.
            // We add an extra buffer (e.g., 500ms) to ensure the last sound has time to finish playing.
            const eliminationDuration = caughtNpcs.length > 0
                ? 250 + ((caughtNpcs.length - 1) * 150) + 500
                : 0;

            // The red light will last for the duration of the eliminations, or the
            // pre-calculated random red light time, whichever is longer.
            const nextCycleDelay = Math.max(redLightDuration, eliminationDuration);

            // Schedule next green light
            gameCycleTimeout = setTimeout(startGameCycle, nextCycleDelay);

        }, greenLightDuration);
    }

    function movePlayer() {
        if (!gameActive || !playerIsMoving) return;

        if (!lightIsGreen) {
            endGame(false, "You moved during Red Light.");
            return;
        }

        const currentBottom = parseFloat(player.style.bottom);
        const newBottom = currentBottom + PLAYER_SPEED;
        player.style.bottom = `${newBottom}%`;

        // Add throbbing effect when close to the finish line
        if (newBottom >= THROB_THRESHOLD) {
            if (!gameContainer.classList.contains('near-finish')) {
                gameContainer.classList.add('near-finish');
            }
        }

        // Dynamically adjust z-index to prevent hiding behind the doll
        if (newBottom > 65) { // Threshold where the player is visually "near" the doll
            player.style.zIndex = 11; // Higher than doll (10) but lower than vignette (15)
        } else {
            player.style.zIndex = 5;
        }

        // Check for win condition
        if (newBottom >= WIN_POSITION) {
            endGame(true);
        }
    }

    function endGame(isWin, message = "") {
        if (!gameActive) return; // Prevent multiple calls
        gameActive = false; // This will stop the gameLoop from processing movement
        player.classList.remove('moving');
        gameContainer.classList.remove('arena-red-alert'); // Stop arena blinking
        gameContainer.classList.remove('near-finish'); // Always remove the throb effect on game end
        timerDisplay.parentElement.classList.remove('red-light-pause'); // Stop timer blinking
        stopFootsteps(); // Stop footsteps sound immediately
        
        // Stop all game loops
        clearInterval(timerInterval);
        clearTimeout(gameCycleTimeout);
        // Also stop the animation frame loop
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        // Reset head tracking on game end
        doll.style.setProperty('--head-rotate-y', '0deg');
        // Ensure all game sounds are stopped
        songAudio.pause();
        greenLightAudio.pause();
        redLightAudio.pause();
        npcFootstepsAudio.pause();
        npcFootstepsAudio.currentTime = 0;

        if (isWin) {
            if (currentRound < TOTAL_ROUNDS) {
                // Won the round, but not the game yet
                currentRound++;
                updateRoundDisplay();
                showScreen(roundCompleteScreen);
            } else {
                // Won the final round!
                wins++;
                saveScore();
                currentRound = 1; // Reset for a new game
                createConfetti();
                playVictoryMusic();
                gameContainer.classList.remove('zoomed-in'); // Reset zoom for next game
                showScreen(winScreen);
                // Play the card reveal sound timed with the CSS animation
                setTimeout(() => {
                    cardRevealAudio.volume = 0.7;
                    playAudio(cardRevealAudio);
                }, 1200); // Matches the animation-delay on .card in main.css
            }
        } else {
            currentRound = 1; // Reset round progress on loss

            // On elimination, always stop the tense music and play the main theme.
            if (isTenseMusicPlaying) {
                stopTenseMusic();
            }
            playBackgroundMusic();

            // Elimination sequence
            player.classList.add('eliminated');
            playAudio(gunshotAudio);
            
            // Wait for the fall animation to complete before showing the game over screen
            setTimeout(() => {
                document.querySelector('#game-over-screen p').textContent = message;
                gameContainer.classList.remove('zoomed-in'); // Reset zoom for next game
                showScreen(gameOverScreen);
            }, 800); // Delay should be slightly longer than the animation
        }
    }

    // --- Guard Management ---
    function createGuards() {
        const guardContainer = document.getElementById('guard-container');
        const guardCount = 6;
        const shapes = ['circle', 'triangle', 'square'];

        for (let i = 0; i < guardCount; i++) {
            const guardEl = document.createElement('div');
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            guardEl.className = `guard ${shape}`;

            // Position them clearly on the sidelines, outside the main play area
            const side = Math.random() < 0.5 ? 'left' : 'right';
            guardEl.style.left = side === 'left' ? `${Math.random() * 5 + 4}%` : `${Math.random() * 5 + 91}%`; // Left: 4-9%, Right: 91-96%
            guardEl.style.bottom = `${Math.random() * 60 + 10}%`; // From 10% to 70% up the screen
            guardEl.style.filter = `brightness(${Math.random() * 0.3 + 0.7})`; // Vary brightness

            guardContainer.appendChild(guardEl);
        }
    }

    function clearGuards() {
        const guardContainer = document.getElementById('guard-container');
        if (guardContainer) {
            guardContainer.innerHTML = '';
        }
    }

    // --- NPC Management ---
    function clearNpcs() {
        npcContainer.innerHTML = '';
        npcs = [];
    }

    function createNpcs() {
        for (let i = 0; i < NPC_COUNT; i++) {
            const npcElement = document.createElement('div');
            npcElement.className = 'npc-player';
            
            // Constrain NPCs to the central play area, away from the guards
            const startLeft = Math.random() * 70 + 15; // 15% to 85%
            const startBottom = Math.random() * 3 + 2; // 2% to 5%
            npcElement.style.left = `${startLeft}%`;
            npcElement.style.bottom = `${startBottom}%`;
            npcElement.style.filter = `brightness(${Math.random() * 0.4 + 0.8})`; // 80% to 120%

            const numberSpan = document.createElement('span');
            numberSpan.className = 'player-number';
            numberSpan.textContent = getUniquePlayerNumber();
            npcElement.appendChild(numberSpan);

            npcs.push({
                element: npcElement,
                isEliminated: false,
                isMoving: false,
                // Personality: higher bravery = runs more, higher clumsiness = more likely to fail
                bravery: Math.random() * 0.03 + 0.01, // Chance to start running per frame
                clumsiness: Math.random() * 0.08,     // Chance to be eliminated on red light
                speed: Math.random() * 0.1 + PLAYER_SPEED * 0.6 // Slower than player
            });
            npcContainer.appendChild(npcElement);
        }
    }

    function updateNpcs() {
        if (!lightIsGreen) {
            // Ensure all NPCs stop moving visually when light is red
            npcs.forEach(npc => {
                if (npc.isMoving) {
                    npc.isMoving = false;
                    npc.element.classList.remove('moving');
                }
            });
            return;
        }

        npcs.forEach(npc => {
            if (npc.isEliminated) return;

            // Decide whether to start or stop running
            if (npc.isMoving) {
                // Chance to stop running (less likely than starting)
                if (Math.random() < (npc.bravery * 0.5)) {
                    npc.isMoving = false;
                    npc.element.classList.remove('moving');
                }
            } else {
                // Chance to start running
                if (Math.random() < npc.bravery) {
                    npc.isMoving = true;
                    npc.element.classList.add('moving');
                }
            }

            if (npc.isMoving) {
                const currentBottom = parseFloat(npc.element.style.bottom);
                const newBottom = currentBottom + npc.speed;
                if (newBottom < WIN_POSITION) {
                    npc.element.style.bottom = `${newBottom}%`;
                } else {
                    // NPC reached the finish line
                    npc.element.style.bottom = `${WIN_POSITION}%`;
                    npc.isMoving = false;
                    npc.element.classList.remove('moving');
                }
            }
        });
    }

    function checkNpcEliminations(caughtNpcs) {
        // Stagger the elimination animation and sound for each caught NPC
        caughtNpcs.forEach((npc, index) => {
            setTimeout(() => {
                eliminateNpc(npc);
            }, 250 + (index * 150)); // Base delay for doll to "notice" + stagger per NPC
        });
    }

    function eliminateNpc(npc) {
        // If the game is no longer active (e.g., player was eliminated just now),
        // we should not process any more NPC eliminations from the same "red light" event.
        // This prevents a cascade of gunshots after the game is already over.
        if (!gameActive) return;

        npc.isEliminated = true;
        npc.isMoving = false;
        npc.element.classList.remove('moving');
        npc.element.classList.add('fallen');
        // Random fall rotation
        const rotation = Math.random() * 180 - 90; // -90 to +90 degrees
        npc.element.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        npc.element.style.opacity = '0.7';

        // Clone the pre-loaded gunshot audio element to allow for overlapping sounds.
        // This is more efficient and reliable than creating a new Audio object from scratch every time.
        const shot = gunshotAudio.cloneNode();
        // Make NPC gunshots even quieter when tense music is playing to heighten the focus.
        shot.volume = isTenseMusicPlaying ? 0.15 : 0.3;
        shot.play();
    }

    // --- Global Event Listeners ---
    startButton.addEventListener('click', () => {
        initializeAudio();
        clearConfetti();
        initGame(1); // Always start at round 1
    });
    restartButton.addEventListener('click', () => {
        clearConfetti();
        // When restarting, we go back to the start screen first, which will trigger the music
        showScreen(startScreen);
    });
    if (playAgainButton) {
        playAgainButton.addEventListener('click', () => {
            clearConfetti();
            // Same logic as restarting
            showScreen(startScreen);
        });
    }

    nextRoundButton.addEventListener('click', () => {
        initGame(currentRound);
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && gameActive && !playerIsMoving) {
            playerIsMoving = true;
            player.classList.add('moving');
            playFootsteps();
            // The game loop now handles the call to movePlayer()
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.code === 'Space' && playerIsMoving) {
            playerIsMoving = false;
            player.classList.remove('moving');
            stopFootsteps();
        }
    });
    
    // --- UI Sound Event Listeners ---
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('mouseenter', playHoverSound);
        button.addEventListener('click', playClickSound);
    });

    // Initial Load
    loadScore();
    // Show the initial start screen.
    // showScreen(startScreen);
    showScreen(winScreen);
});
