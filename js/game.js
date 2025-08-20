document.addEventListener('DOMContentLoaded', () => {
    // Screens
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const winScreen = document.getElementById('win-screen');
    const roundCompleteScreen = document.getElementById('round-complete-screen');
    const ggangbuIntroScreen = document.getElementById('ggangbu-intro-screen');

    // Buttons
    const startHanaButton = document.getElementById('start-hana-button');
    const startGgangbuButton = document.getElementById('start-ggangbu-button');
    const restartButton = document.getElementById('restart-button');
    const playAgainButton = document.getElementById('play-again-button');
    const nextRoundButton = document.getElementById('next-round-button');

    // Game Elements
    const gameContainer = document.getElementById('game-container');
    const player = document.getElementById('player');
    const player2 = document.getElementById('player2');
    const doll = document.getElementById('doll');
    const timerDisplay = document.querySelector('#timer span');
    const roundDisplay = document.querySelector('#round-display span');
    const statusLight = document.getElementById('status-light');
    const npcContainer = document.getElementById('npc-container');
    const instructions = document.getElementById('instructions');
    const ggangbuQuoteText = document.getElementById('ggangbu-quote-text');
    const confettiContainer = document.getElementById('confetti-container');
    const mobileControls = document.getElementById('mobile-controls');
    const mobileControlP1 = document.getElementById('mobile-control-p1');

    // Audio Elements
    const songAudio = document.getElementById('song-audio');
    const gunshotAudio = document.getElementById('gunshot-audio');
    const greenLightAudio = document.getElementById('green-light-audio');
    const redLightAudio = document.getElementById('red-light-audio');
    const backgroundMusicAudio = document.getElementById('background-music-audio');
    const tenseMusicAudio = document.getElementById('tense-music-audio');
    const footstepsAudio = document.getElementById('footsteps-audio');
    const footstepsAudio2 = document.getElementById('footsteps-audio').cloneNode(); // For Player 2
    const npcFootstepsAudio = document.getElementById('npc-footsteps-audio');
    const victoryMusicAudio = document.getElementById('victory-music-audio');
    const cardRevealAudio = document.getElementById('card-reveal-audio');
    const hoverAudio = document.getElementById('hover-audio');
    const emotionalMusicAudio = document.getElementById('emotional-music-audio');
    const clickAudio = document.getElementById('click-audio');

    // Game Constants
    const PLAYER_SPEED = 0.18; // % per animation frame
    const WIN_POSITION = 85; // % from bottom
    const SONG_DURATION = 3.0; // Approx. duration of the doll's song in seconds.
    const THROB_THRESHOLD = 70; // % from bottom to start throbbing effect
    const TOTAL_ROUNDS = 3;
    const NPC_COUNT = 25;
    const MAX_NPC_FOOTSTEPS_VOLUME = 0.4; // More prominent crowd sound

    // Ggangbu Mode Constants
    const GGANGBU_MAX_DISTANCE = 15; // % of screen height players can be apart
    const GGANGBU_BOOST_DISTANCE = 4;  // % of screen height to be for a boost
    const GGANGBU_BOOST_MULTIPLIER = 1.15;
    const GGANGBU_PENALTY_MULTIPLIER = 0.6;
    const GGANGBU_STRAIN_ELIMINATION_CHANCE = 0.25; // 25% chance to be eliminated if strained during red light
    // Difficulty settings per round. Red light randomness increases each round.
    // Green light is fixed for R1/R2 for authenticity, but random in R3 for a final challenge.
    const DIFFICULTY = {
        1: { time: 40, songSpeed: 1.0, redMin: 2.5, redMax: 4.0 }, // Standard speed and pauses
        2: { time: 32, songSpeed: 1.25, redMin: 2.0, redMax: 3.5 }, // Faster song, shorter pauses
        3: { time: 30, greenMin: 1.2, greenMax: 3.0, redMin: 1.0, redMax: 3.0 }  // Special: silent, very fast and random light changes
    };

    // Game State
    let gameMode = 'hana'; // 'hana' (1P) or 'ggangbu' (2P)
    let gameActive = false;
    let lightIsGreen = true;
    let playerIsMoving = false;
    let player2IsMoving = false;
    let currentRound = 1;
    let timerInterval;
    let gameCycleTimeout;
    let player1Finished = false;
    let player2Finished = false;
    let timeLeft;
    let wins = 0;
    let animationFrameId; // To control the game loop
    let audioInitialized = false;
    let isTenseMusicPlaying = false;
    let isEmotionalMusicPlaying = false;
    let npcs = [];
    let usedPlayerNumbers = new Set();

    // --- Audio Helper ---
    function playAudio(audioElement, playbackRate = 1.0) {
        // Ensure audio is not muted and volume is up
        audioElement.muted = false;
        // To make the tense music feel louder, we lower other primary sounds when it's active,
        // but we want the core game sounds (red/green light) to remain prominent.
        if (audioElement === greenLightAudio || audioElement === redLightAudio) {
            audioElement.volume = 1.0; // Always play these at full volume
        } else {
            audioElement.volume = isTenseMusicPlaying ? 0.5 : 1.0;
        }
        audioElement.playbackRate = playbackRate;
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
    function playFootsteps(audioElement = footstepsAudio) {
        if (!audioInitialized || !gameActive) return;
        audioElement.volume = 0.6; // A bit quieter than other effects
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.error("Footsteps audio failed to play:", error));
        }
    }

    function stopFootsteps(audioElement = footstepsAudio) {
        audioElement.pause();
        audioElement.currentTime = 0;
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

    // --- Emotional Music Controls ---
    function playEmotionalMusic() {
        if (!audioInitialized || isEmotionalMusicPlaying) return;
        isEmotionalMusicPlaying = true;
        stopBackgroundMusic();
        stopTenseMusic();
        emotionalMusicAudio.volume = 0.6;
        const playPromise = emotionalMusicAudio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => console.warn("Emotional music autoplay was prevented.", error));
        }
    }

    function stopEmotionalMusic() {
        if (!isEmotionalMusicPlaying) return;
        isEmotionalMusicPlaying = false;
        // Fade out for a smoother transition
        let vol = emotionalMusicAudio.volume;
        const fadeOutInterval = setInterval(() => {
            vol -= 0.1;
            if (vol <= 0.1) { // Check for <= 0.1 to handle floating point issues
                emotionalMusicAudio.pause();
                emotionalMusicAudio.currentTime = 0;
                clearInterval(fadeOutInterval);
            } else {
                emotionalMusicAudio.volume = vol;
            }
        }, 100); // Fade out over 1 second
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
        [startScreen, gameScreen, gameOverScreen, winScreen, roundCompleteScreen, ggangbuIntroScreen].forEach(s => s.classList.remove('active'));
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
        } else if (screen === roundCompleteScreen) {
            // Do nothing with the music here. This allows the tense music to
            // continue playing seamlessly from the end of round 2 into round 3.
        } else {
            // For start and game over screens, stop all special themes and play the default.
            stopTenseMusic();
            stopVictoryMusic();
            stopEmotionalMusic();
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
    function getUniquePlayerNumber(usedSet) {
        let number;
        do {
            number = Math.floor(Math.random() * 456) + 1;
        } while (usedSet.has(number));
        usedSet.add(number);
        return String(number).padStart(3, '0');
    }

    function assignPlayerNumber(pElement, usedSet) {
        pElement.querySelector('.player-number').textContent = getUniquePlayerNumber(usedSet);
    }

    // Helper for async delays, making sequences easier to read
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // --- Ggangbu Intro Sequence ---
    async function startGgangbuSequence() {
        const quote1 = "A Gganbu is a good friend. One you can trust completely.";
        const quote2 = "We're partners. We stick together until the end.";
        const quoteVisibleDuration = 2500; // How long each quote stays visible
        const quoteFadeDuration = 1000;    // How long it takes to fade out
        const pauseBetweenQuotes = 500;   // Pause between quotes

        showScreen(ggangbuIntroScreen);
        playEmotionalMusic();

        await sleep(500); // Wait for screen transition

        // First Quote
        ggangbuQuoteText.textContent = `"${quote1}"`;
        ggangbuQuoteText.classList.add('visible');
        await sleep(quoteVisibleDuration);
        ggangbuQuoteText.classList.remove('visible');
        await sleep(quoteFadeDuration + pauseBetweenQuotes);

        // Second Quote
        ggangbuQuoteText.textContent = `"${quote2}"`;
        ggangbuQuoteText.classList.add('visible');
        await sleep(quoteVisibleDuration);
        ggangbuQuoteText.classList.remove('visible');

        // End sequence
        stopEmotionalMusic();
        await sleep(500); // Wait for music to fade out
        initGame(1, 'ggangbu');
    }

    // --- Game Initialization ---
    function initGame(round, mode) {
        // Stop any previous game loop to prevent duplicates
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        // Reset tense music if starting a new game from scratch
        if (round === 1 && isTenseMusicPlaying) {
            stopTenseMusic();
        }

        // Clear number set for the new round
        gameMode = mode;
        usedPlayerNumbers.clear();

        // Clear out old NPCs from the previous game
        clearNpcs();
        // Create a new set of NPCs for this game
        createNpcs();

        clearGuards();
        createGuards();

        // Clean up any lingering sound listeners
        gunshotAudio.removeEventListener('ended', playBackgroundMusic); // This line seems to be a mistake in the original code, but I'll leave it as is.

        // Reset player visual state
        player.style.bottom = '12%';
        player.style.zIndex = 5;
        player.classList.remove('moving', 'eliminated', 'strained', 'boosted');
        player.style.opacity = '1';
        player.style.transform = 'translateX(-50%)';
        
        // Reset player 2 visual state and visibility
        if (gameMode === 'ggangbu') {
            player2.style.display = 'block';
            player2.style.bottom = '12%';
            player2.style.zIndex = 5;
            player2.classList.remove('moving', 'eliminated', 'strained', 'boosted');
            player2.style.opacity = '1';
            player2.style.transform = 'translateX(-50%)';
            assignPlayerNumber(player2, usedPlayerNumbers);
            instructions.innerHTML = "Stay close to your Ggangbu!<br>P1: Hold [SPACE] &nbsp;&nbsp;|&nbsp;&nbsp; P2: Hold [ARROW UP]";
        } else {
            player2.style.display = 'none';
            instructions.innerHTML = "Press and hold [SPACE] to run";
        }

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
        player2IsMoving = false;
        player1Finished = false;
        player2Finished = false;
        
        // UI updates
        gameContainer.classList.add('zoomed-in');
        statusLight.classList.remove('red');
        statusLight.classList.add('green');
        doll.classList.remove('looking');
        
        assignPlayerNumber(player, usedPlayerNumbers);
        updateRoundDisplay();
        showScreen(gameScreen);

        // --- Temporary Mobile Instructions ---
        // Only show detailed button text for the very first round of a new game.
        // We check visibility by seeing if the display style is 'flex'.
        if (currentRound === 1 && window.getComputedStyle(mobileControls).display === 'flex') {
            const originalP1Text = mobileControlP1.innerHTML;

            // Add a class for styling the instructional text
            mobileControlP1.classList.add('instruction-text');
            mobileControlP1.innerHTML = 'HOLD TO RUN';

            setTimeout(() => {
                mobileControlP1.classList.remove('instruction-text');
                mobileControlP1.innerHTML = originalP1Text;
            }, 4000); // Show for 4 seconds
        }

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

        if (gameMode === 'ggangbu') {
            updateGgangbuStatus();
        }

        if (playerIsMoving) {
            movePlayer(player, 1);
        }
        if (gameMode === 'ggangbu' && player2IsMoving) {
            movePlayer(player2, 2);
        }
        // Add doll head tracking during red light
        if (doll.classList.contains('looking')) {
            updateDollHeadTracking();
        }
        updateNpcs();
        manageNpcFootsteps();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // --- Ggangbu Mode Logic ---
    function updateGgangbuStatus() {
        if (player1Finished || player2Finished) {
            // If one player finishes, the bond is broken, no more penalties/boosts
            player.classList.remove('strained', 'boosted');
            player2.classList.remove('strained', 'boosted');
            return;
        }

        const p1Bottom = parseFloat(player.style.bottom);
        const p2Bottom = parseFloat(player2.style.bottom);
        const distance = Math.abs(p1Bottom - p2Bottom);

        if (distance > GGANGBU_MAX_DISTANCE) {
            // Strained: too far apart
            player.classList.add('strained');
            player2.classList.add('strained');
            player.classList.remove('boosted');
            player2.classList.remove('boosted');
        } else if (distance < GGANGBU_BOOST_DISTANCE && playerIsMoving && player2IsMoving) {
            // Boosted: close together and both running
            player.classList.add('boosted');
            player2.classList.add('boosted');
            player.classList.remove('strained');
            player2.classList.remove('strained');
        } else {
            // Normal: in a safe distance
            player.classList.remove('strained', 'boosted');
            player2.classList.remove('strained', 'boosted');
        }
    }

    function updateDollHeadTracking() {
        let targetPlayer = player;
        // In Ggangbu mode, the doll tracks the player who is further ahead
        if (gameMode === 'ggangbu' && !player1Finished) {
            const p1Bottom = parseFloat(player.style.bottom);
            const p2Bottom = player2Finished ? -1 : parseFloat(player2.style.bottom); // Don't track finished players
            if (p2Bottom > p1Bottom) {
                targetPlayer = player2;
            }
        }

        const playerRect = targetPlayer.getBoundingClientRect();
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
        // In rounds 1 & 2, green light duration is fixed to the song length.
        // The song is sped up in later rounds, making the green light phase shorter.
        // Round 3 is special (silent and random) for a different challenge.
        const greenLightDuration = currentRound < 3
            ? (SONG_DURATION * 1000) / difficulty.songSpeed
            : (Math.random() * (difficulty.greenMax - difficulty.greenMin) + difficulty.greenMin) * 1000;
        const redLightDuration = (Math.random() * (difficulty.redMax - difficulty.redMin) + difficulty.redMin) * 1000;

        // This function starts the song after the "Green Light" voice line ends.
        // It's defined here so we can remove the listener if the light turns red early.
        const songStarter = () => {
            // In Round 3, the doll is silent for maximum tension.
            if (gameActive && lightIsGreen && currentRound < 3) {
                playAudio(songAudio, difficulty.songSpeed);
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
            let playerCaught = false;
            let caughtMessage = "";
            const p1Strained = player.classList.contains('strained');
            const p2Strained = gameMode === 'ggangbu' && player2.classList.contains('strained');

            if (playerIsMoving) {
                playerCaught = true;
                caughtMessage = gameMode === 'ggangbu' ? "Player 1 moved during Red Light!" : "You moved during Red Light.";
            } else if (gameMode === 'ggangbu' && p1Strained && Math.random() < GGANGBU_STRAIN_ELIMINATION_CHANCE) {
                playerCaught = true;
                caughtMessage = "Player 1 was eliminated for being too far from their Ggangbu!";
                playerIsMoving = true; // Set to true to trigger elimination animation
            } else if (gameMode === 'ggangbu' && player2IsMoving) {
                playerCaught = true;
                caughtMessage = "Player 2 moved during Red Light!";
            } else if (gameMode === 'ggangbu' && p2Strained && Math.random() < GGANGBU_STRAIN_ELIMINATION_CHANCE) {
                playerCaught = true;
                caughtMessage = "Player 2 was eliminated for being too far from their Ggangbu!";
                player2IsMoving = true; // Set to true to trigger elimination animation
            }
            if (playerCaught) {
                endGame(false, caughtMessage);
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

    function movePlayer(pElement, playerNum) {
        const isFinished = playerNum === 1 ? player1Finished : player2Finished;
        if (!gameActive || isFinished) return;
    
        if (!lightIsGreen) {
            const message = gameMode === 'ggangbu' ? `Player ${playerNum} moved during Red Light!` : "You moved during Red Light.";
            endGame(false, message);
            return;
        }

        let speedMultiplier = 1.0;
        if (gameMode === 'ggangbu') {
            if (pElement.classList.contains('strained')) {
                speedMultiplier = GGANGBU_PENALTY_MULTIPLIER;
            } else if (pElement.classList.contains('boosted')) {
                speedMultiplier = GGANGBU_BOOST_MULTIPLIER;
            }
        }
    
        const currentBottom = parseFloat(pElement.style.bottom);
        const newBottom = currentBottom + (PLAYER_SPEED * speedMultiplier);
        pElement.style.bottom = `${newBottom}%`;
    
        // Add throbbing effect when close to the finish line
        if (newBottom >= THROB_THRESHOLD) {
            if (!gameContainer.classList.contains('near-finish')) {
                gameContainer.classList.add('near-finish');
            }
        }
    
        // Dynamically adjust z-index to prevent hiding behind the doll
        if (newBottom > 65) { // Threshold where the player is visually "near" the doll
            pElement.style.zIndex = 11; // Higher than doll (10) but lower than vignette (15)
        } else {
            pElement.style.zIndex = 5;
        }
    
        // Check for win condition
        if (newBottom >= WIN_POSITION) {
            if (playerNum === 1) player1Finished = true;
            if (playerNum === 2) player2Finished = true;
            pElement.classList.remove('moving');
            stopFootsteps(playerNum === 1 ? footstepsAudio : footstepsAudio2);
            checkWinCondition();
        }
    }

    function checkWinCondition() {
        if ((gameMode === 'hana' && player1Finished) || (gameMode === 'ggangbu' && player1Finished && player2Finished)) {
            endGame(true);
        }
    }

    function endGame(isWin, message = "") {
        if (!gameActive) return; // Prevent multiple calls
        gameActive = false; // This will stop the gameLoop from processing movement
        player.classList.remove('moving', 'strained', 'boosted');
        if (gameMode === 'ggangbu') {
            player2.classList.remove('moving', 'strained', 'boosted');
        }
        gameContainer.classList.remove('arena-red-alert'); // Stop arena blinking
        gameContainer.classList.remove('near-finish'); // Always remove the throb effect on game end
        timerDisplay.parentElement.classList.remove('red-light-pause'); // Stop timer blinking
        stopFootsteps(footstepsAudio); // Stop P1 footsteps sound
        stopFootsteps(footstepsAudio2); // Stop P2 footsteps sound
        
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
        stopEmotionalMusic();

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
            if (gameMode === 'ggangbu') {
                if (playerIsMoving) { // P1 was caught
                    player.classList.add('eliminated');
                } else if (player2IsMoving) { // P2 was caught
                    player2.classList.add('eliminated');
                } else { // Time's up, eliminate both if they haven't finished
                    if (!player1Finished) player.classList.add('eliminated');
                    if (!player2Finished) player2.classList.add('eliminated');
                }
            } else { // 1P mode
                player.classList.add('eliminated');
            }

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
            
            // Constrain NPCs to the central play area, away from the guards.
            const startLeft = Math.random() * 70 + 15;   // 15% to 85%
            const startBottom = Math.random() * 3 + 9; // 9% to 12%, to match new player start
            npcElement.style.left = `${startLeft}%`;
            npcElement.style.bottom = `${startBottom}%`;
            npcElement.style.filter = `brightness(${Math.random() * 0.4 + 0.8})`; // 80% to 120%

            const numberSpan = document.createElement('span');
            numberSpan.className = 'player-number';
            numberSpan.textContent = getUniquePlayerNumber(usedPlayerNumbers);
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
    startHanaButton.addEventListener('click', () => {
        initializeAudio();
        clearConfetti();
        initGame(1, 'hana'); // Start 1-Player game
    });
    startGgangbuButton.addEventListener('click', async () => {
        initializeAudio();
        clearConfetti();
        await startGgangbuSequence(); // Start the intro sequence for Ggangbu mode
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
        initGame(currentRound, gameMode);
    });

    document.addEventListener('keydown', (e) => {
        if (!gameActive) return;
        // Player 1 Controls (Space)
        if (e.code === 'Space' && !playerIsMoving && !player1Finished) {
            playerIsMoving = true;
            player.classList.add('moving');
            playFootsteps();
        }
        // Player 2 Controls (ArrowUp)
        if (gameMode === 'ggangbu' && e.code === 'ArrowUp' && !player2IsMoving && !player2Finished) {
            player2IsMoving = true;
            player2.classList.add('moving');
            playFootsteps(footstepsAudio2);
        }
    });

    document.addEventListener('keyup', (e) => {
        // Player 1
        if (e.code === 'Space' && playerIsMoving) {
            playerIsMoving = false;
            player.classList.remove('moving');
            stopFootsteps();
        }
        // Player 2
        if (gameMode === 'ggangbu' && e.code === 'ArrowUp' && player2IsMoving) {
            player2IsMoving = false;
            player2.classList.remove('moving');
            stopFootsteps(footstepsAudio2);
        }
    });
    
    // --- Mobile Touch Controls ---
    // Use a function to handle the start logic to avoid code duplication
    const handleMoveStart = (playerNum) => {
        if (!gameActive) return;

        if (playerNum === 1 && !playerIsMoving && !player1Finished) {
            playerIsMoving = true;
            player.classList.add('moving');
            playFootsteps();
        } else if (playerNum === 2 && gameMode === 'ggangbu' && !player2IsMoving && !player2Finished) {
            player2IsMoving = true;
            player2.classList.add('moving');
            playFootsteps(footstepsAudio2);
        }
    };

    // Use a function to handle the stop logic
    const handleMoveEnd = (playerNum) => {
        if (playerNum === 1 && playerIsMoving) {
            playerIsMoving = false;
            player.classList.remove('moving');
            stopFootsteps();
        } else if (playerNum === 2 && gameMode === 'ggangbu' && player2IsMoving) {
            player2IsMoving = false;
            player2.classList.remove('moving');
            stopFootsteps(footstepsAudio2);
        }
    };

    mobileControlP1.addEventListener('touchstart', (e) => { e.preventDefault(); handleMoveStart(1); });
    mobileControlP1.addEventListener('touchend', (e) => { e.preventDefault(); handleMoveEnd(1); });
    mobileControlP1.addEventListener('touchcancel', (e) => { e.preventDefault(); handleMoveEnd(1); }); // Handle interruption

    // --- UI Sound Event Listeners ---
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('mouseenter', playHoverSound);
        button.addEventListener('click', playClickSound);
    });

    // Initial Load
    loadScore();
    // Show the initial start screen.
    showScreen(startScreen);
    // showScreen(winScreen);
});
