// Texas Hold'em Poker Tracker
(function($) {
    'use strict';

    const MAX_PLAYERS = 6;
    const STORAGE_KEY = 'pokerTrackerGame';
    const GAMES_LIST_KEY = 'pokerTrackerGamesList';

    // Game State
    const GameState = {
        players: [],
        pot: 0,
        currentBet: 0,
        dealerIndex: 0,
        currentPlayerIndex: 0,
        phase: 'waiting',
        smallBlind: 0.5,
        bigBlind: 1,
        startingBalance: 100,
        isHandInProgress: false,
        minRaise: 0,
        lastRaiserIndex: -1,
        pendingJoinSeat: null
    };

    // Format number helper
    function formatNumber(num) {
        if (num === undefined || num === null) return '0';
        return parseFloat(num.toFixed(2));
    }

    // Initialize
    function init() {
        setupEventListeners();
        updateRecommendedBlinds();

        // Check for saved games and show load button if any exist
        const savedData = localStorage.getItem(STORAGE_KEY);
        const gamesList = getSavedGamesList();
        if (savedData || gamesList.length > 0) {
            try {
                const data = savedData ? JSON.parse(savedData) : null;
                if ((data && data.players && data.players.length > 0) || gamesList.length > 0) {
                    $('#load-game-btn').show();
                }
            } catch (e) {
                if (gamesList.length > 0) {
                    $('#load-game-btn').show();
                }
            }
        }

        // Auto-load saved game if exists
        if (loadSavedGame() && GameState.players.length > 0) {
            showGameScreen();
            renderGameScreen();
        }
    }

    // Calculate recommended blinds
    function calculateRecommendedBlinds(balance) {
        const bb = Math.max(0.5, Math.round(balance * 0.01 * 10) / 10);
        const sb = Math.max(0.25, Math.round(bb * 5) / 10);
        return { sb, bb };
    }

    function updateRecommendedBlinds() {
        const balance = parseFloat($('#starting-balance').val()) || 100;
        const recommended = calculateRecommendedBlinds(balance);
        $('#recommended-blinds').text(`Recommended: SB ${formatNumber(recommended.sb)} / BB ${formatNumber(recommended.bb)}`);
        // Auto-fill recommended values
        $('#small-blind').val(recommended.sb);
        $('#big-blind').val(recommended.bb);
        return recommended;
    }

    // Storage Functions
    function saveGame() {
        const saveData = {
            players: GameState.players,
            pot: GameState.pot,
            currentBet: GameState.currentBet,
            dealerIndex: GameState.dealerIndex,
            currentPlayerIndex: GameState.currentPlayerIndex,
            phase: GameState.phase,
            smallBlind: GameState.smallBlind,
            bigBlind: GameState.bigBlind,
            startingBalance: GameState.startingBalance,
            isHandInProgress: GameState.isHandInProgress,
            minRaise: GameState.minRaise,
            lastRaiserIndex: GameState.lastRaiserIndex
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    }

    function loadSavedGame() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                Object.assign(GameState, data);
                // Ensure phase is set
                if (!GameState.phase) {
                    GameState.phase = GameState.isHandInProgress ? 'pre-flop' : 'waiting';
                }
                if (GameState.phase === 'waiting') {
                    GameState.isHandInProgress = false;
                }
                return true;
            } catch (e) {
                console.error('Failed to load saved game:', e);
            }
        }
        return false;
    }

    function clearSavedGame() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // Games List Management
    function getSavedGamesList() {
        const saved = localStorage.getItem(GAMES_LIST_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                return [];
            }
        }
        return [];
    }

    function saveGameToList(gameState, name) {
        const gamesList = getSavedGamesList();
        const gameEntry = {
            id: Date.now().toString(),
            name: name || `Game ${gamesList.length + 1}`,
            date: new Date().toLocaleString(),
            players: gameState.players.map(p => ({ name: p.name, balance: p.balance })),
            smallBlind: gameState.smallBlind,
            bigBlind: gameState.bigBlind,
            state: JSON.stringify(gameState)
        };
        gamesList.unshift(gameEntry); // Add to beginning
        localStorage.setItem(GAMES_LIST_KEY, JSON.stringify(gamesList));
        return gameEntry;
    }

    function loadGameFromList(gameId) {
        const gamesList = getSavedGamesList();
        const game = gamesList.find(g => g.id === gameId);
        if (game) {
            try {
                const state = JSON.parse(game.state);
                Object.assign(GameState, state);
                return true;
            } catch (e) {
                console.error('Failed to load game:', e);
            }
        }
        return false;
    }

    function deleteGameFromList(gameId) {
        const gamesList = getSavedGamesList();
        const filtered = gamesList.filter(g => g.id !== gameId);
        localStorage.setItem(GAMES_LIST_KEY, JSON.stringify(filtered));
    }

    // Screen Functions
    function showGameScreen() {
        $('#setup-screen').hide();
        $('#game-screen').show();
    }

    function showSetupScreen() {
        $('#game-screen').hide();
        $('#setup-screen').show();
    }

    // Game Functions
    function startGame() {
        clearSavedGame();

        const recommended = calculateRecommendedBlinds(parseFloat($('#starting-balance').val()) || 100);
        GameState.smallBlind = parseFloat($('#small-blind').val()) || recommended.sb;
        GameState.bigBlind = parseFloat($('#big-blind').val()) || recommended.bb;
        GameState.startingBalance = parseFloat($('#starting-balance').val()) || 100;

        GameState.players = [];
        GameState.dealerIndex = 0;
        GameState.isHandInProgress = false;
        GameState.pot = 0;
        GameState.currentBet = 0;
        GameState.phase = 'waiting';

        showGameScreen();
        renderGameScreen();
        saveGame();
    }

    function addPlayerAtSeat(name, seat) {
        if (GameState.isHandInProgress) {
            alert('Cannot join during an active hand. Wait for the hand to end.');
            return false;
        }
        if (GameState.players.some(p => p.seat === seat)) {
            alert('This seat is already taken!');
            return false;
        }
        if (GameState.players.length >= MAX_PLAYERS) {
            alert('Maximum 6 players!');
            return false;
        }

        GameState.players.push({
            name: name.trim(),
            seat: seat,
            balance: GameState.startingBalance,
            currentBet: 0,
            folded: false,
            isAllIn: false,
            totalBetThisHand: 0,
            hasActed: false,
            rotation: 0
        });

        GameState.players.sort((a, b) => a.seat - b.seat);
        renderGameScreen();
        saveGame();
        return true;
    }

    function removePlayer(seat) {
        if (GameState.isHandInProgress) {
            alert('Cannot leave during an active hand. Wait for the hand to end.');
            return;
        }

        const playerIndex = GameState.players.findIndex(p => p.seat === seat);
        if (playerIndex === -1) return;

        GameState.players.splice(playerIndex, 1);
        if (GameState.dealerIndex >= GameState.players.length) {
            GameState.dealerIndex = 0;
        }

        renderGameScreen();
        saveGame();
    }

    function startNewHand() {
        const playersWithBalance = GameState.players.filter(p => p.balance > 0);
        if (playersWithBalance.length < 2) {
            alert('Need at least 2 players with balance to start a hand.');
            return;
        }

        GameState.pot = 0;
        GameState.currentBet = 0;
        GameState.phase = 'pre-flop';
        GameState.isHandInProgress = true;
        GameState.minRaise = GameState.bigBlind;

        GameState.players.forEach(player => {
            if (player.balance > 0) {
                player.currentBet = 0;
                player.folded = false;
                player.isAllIn = false;
                player.totalBetThisHand = 0;
                player.hasActed = false;
            } else {
                player.folded = true;
            }
        });

        GameState.dealerIndex = findNextPlayerWithBalance(GameState.dealerIndex);
        postBlinds();
        advanceToNextPlayer();
        renderGameScreen();
        saveGame();
    }

    function postBlinds() {
        const sbIndex = findNextPlayerWithBalance(GameState.dealerIndex);
        const sbPlayer = GameState.players[sbIndex];
        const sbAmount = Math.min(GameState.smallBlind, sbPlayer.balance);

        sbPlayer.balance -= sbAmount;
        sbPlayer.currentBet = sbAmount;
        sbPlayer.totalBetThisHand = sbAmount;
        sbPlayer.hasActed = true;
        GameState.pot += sbAmount;

        const bbIndex = findNextPlayerWithBalance(sbIndex);
        const bbPlayer = GameState.players[bbIndex];
        const bbAmount = Math.min(GameState.bigBlind, bbPlayer.balance);

        bbPlayer.balance -= bbAmount;
        bbPlayer.currentBet = bbAmount;
        bbPlayer.totalBetThisHand = bbAmount;
        bbPlayer.hasActed = false;
        GameState.pot += bbAmount;

        GameState.currentBet = GameState.bigBlind;
        GameState.currentPlayerIndex = bbIndex;
    }

    function findNextPlayerWithBalance(fromIndex) {
        let index = (fromIndex + 1) % GameState.players.length;
        let count = 0;
        while (count < GameState.players.length) {
            if (GameState.players[index].balance > 0) return index;
            index = (index + 1) % GameState.players.length;
            count++;
        }
        return fromIndex;
    }

    function advanceToNextPlayer() {
        let index = (GameState.currentPlayerIndex + 1) % GameState.players.length;
        let count = 0;
        while (count < GameState.players.length) {
            const player = GameState.players[index];
            if (!player.folded && !player.isAllIn && player.balance > 0) {
                GameState.currentPlayerIndex = index;
                return true;
            }
            index = (index + 1) % GameState.players.length;
            count++;
        }
        return false;
    }

    // Betting Actions
    function fold() {
        const player = GameState.players[GameState.currentPlayerIndex];
        player.folded = true;
        player.hasActed = true;

        const nonFolded = GameState.players.filter(p => !p.folded);
        if (nonFolded.length === 1) {
            awardPot([nonFolded[0]]);
            return;
        }
        checkEndOfRound();
    }

    function call() {
        const player = GameState.players[GameState.currentPlayerIndex];
        const callAmount = Math.min(GameState.currentBet - player.currentBet, player.balance);
        player.balance -= callAmount;
        player.currentBet += callAmount;
        player.totalBetThisHand += callAmount;
        GameState.pot += callAmount;
        player.hasActed = true;
        if (player.balance <= 0.001) player.isAllIn = true;
        checkEndOfRound();
    }

    function check() {
        GameState.players[GameState.currentPlayerIndex].hasActed = true;
        checkEndOfRound();
    }

    function raise(amount) {
        const player = GameState.players[GameState.currentPlayerIndex];
        const raiseTotal = (GameState.currentBet + amount) - player.currentBet;
        if (raiseTotal > player.balance) { allIn(); return; }

        player.balance -= raiseTotal;
        player.currentBet += raiseTotal;
        player.totalBetThisHand += raiseTotal;
        GameState.pot += raiseTotal;
        GameState.currentBet = player.currentBet;
        GameState.minRaise = Math.max(GameState.bigBlind, amount);
        player.hasActed = true;

        GameState.players.forEach((p, i) => {
            if (i !== GameState.currentPlayerIndex && !p.folded && !p.isAllIn) p.hasActed = false;
        });
        checkEndOfRound();
    }

    function allIn() {
        const player = GameState.players[GameState.currentPlayerIndex];
        const allInAmount = player.balance;
        player.totalBetThisHand += allInAmount;
        GameState.pot += allInAmount;

        if (player.currentBet + allInAmount > GameState.currentBet) {
            GameState.currentBet = player.currentBet + allInAmount;
            GameState.players.forEach((p, i) => {
                if (i !== GameState.currentPlayerIndex && !p.folded && !p.isAllIn) p.hasActed = false;
            });
        }
        player.currentBet += allInAmount;
        player.balance = 0;
        player.isAllIn = true;
        player.hasActed = true;
        checkEndOfRound();
    }

    function checkEndOfRound() {
        const nonFolded = GameState.players.filter(p => !p.folded);
        if (nonFolded.length === 1) { awardPot([nonFolded[0]]); return; }

        const active = GameState.players.filter(p => !p.folded && !p.isAllIn && p.balance > 0);
        const allActed = active.every(p => p.hasActed);
        const allBetsMatch = active.every(p => Math.abs(p.currentBet - GameState.currentBet) < 0.001);

        if ((allActed && allBetsMatch) || active.length === 0) {
            nextPhase();
        } else {
            advanceToNextPlayer();
            renderGameScreen();
            saveGame();
        }
    }

    function nextPhase() {
        GameState.players.forEach(p => { p.currentBet = 0; p.hasActed = false; });
        GameState.currentBet = 0;

        const phases = ['pre-flop', 'flop', 'turn', 'river'];
        const idx = phases.indexOf(GameState.phase);

        if (idx < phases.length - 1) {
            GameState.phase = phases[idx + 1];
            GameState.currentPlayerIndex = GameState.dealerIndex;
            advanceToNextPlayer();
            renderGameScreen();
            saveGame();
        } else {
            showWinnerModal();
        }
    }

    function awardPot(winners) {
        const share = GameState.pot / winners.length;
        winners.forEach(w => {
            const idx = GameState.players.findIndex(p => p.name === w.name);
            if (idx !== -1) GameState.players[idx].balance += share;
        });

        GameState.pot = 0;
        GameState.isHandInProgress = false;
        GameState.phase = 'waiting';

        GameState.players.forEach(p => {
            p.currentBet = 0;
            p.folded = false;
            p.isAllIn = false;
            p.totalBetThisHand = 0;
            p.hasActed = false;
        });

        if (GameState.players.length > 0) {
            GameState.dealerIndex = (GameState.dealerIndex + 1) % GameState.players.length;
        }

        renderGameScreen();
        saveGame();

        const withBalance = GameState.players.filter(p => p.balance > 0.001);
        if (withBalance.length < 2) {
            setTimeout(() => alert('Not enough players with balance. Waiting for players.'), 500);
        }
    }

    // Render Functions
    function renderGameScreen() {
        renderPlayers();
        renderPot();
        renderPhase();
        renderBlinds();
    }

    function renderBlinds() {
        $('.current-blinds').text(`SB: ${formatNumber(GameState.smallBlind)} / BB: ${formatNumber(GameState.bigBlind)}`);
        // Hide blind controls during hand
        if (GameState.isHandInProgress) {
            $('.blinds-controls').hide();
        } else {
            $('.blinds-controls').show();
        }
    }

    function renderPlayers() {
        const $topRow = $('#players-top');
        const $bottomRow = $('#players-bottom');
        $topRow.empty();
        $bottomRow.empty();

        // Calculate SB and BB indices during hand
        let sbIndex = -1;
        let bbIndex = -1;
        if (GameState.isHandInProgress && GameState.players.length > 0) {
            sbIndex = findNextPlayerWithBalance(GameState.dealerIndex);
            bbIndex = findNextPlayerWithBalance(sbIndex);
        }

        // Find max balance for HP bar calculation
        const maxBalance = GameState.players.length > 0
            ? Math.max(...GameState.players.map(p => p.balance + (p.currentBet || 0)))
            : 1;

        for (let seat = 0; seat < MAX_PLAYERS; seat++) {
            const player = GameState.players.find(p => p.seat === seat);
            const playerIndex = GameState.players.findIndex(p => p.seat === seat);

            const $slot = $('<div class="player-slot">').attr('data-seat', seat);

            if (player) {
                const isActive = playerIndex === GameState.currentPlayerIndex && GameState.isHandInProgress && !player.folded;
                const isDealer = playerIndex === GameState.dealerIndex && GameState.isHandInProgress;
                const isSB = playerIndex === sbIndex && GameState.isHandInProgress;
                const isBB = playerIndex === bbIndex && GameState.isHandInProgress;

                const $card = $('<div class="player-card">')
                    .addClass(isActive ? 'active' : '')
                    .addClass(player.folded && player.balance > 0 ? 'folded' : '')
                    .addClass(player.balance <= 0 ? 'out' : '')
                    .addClass(player.isAllIn ? 'all-in' : '');

                // Build badges
                let badges = '';
                if (isDealer) badges += '<div class="badge dealer-badge">D</div>';
                if (isSB) badges += '<div class="badge sb-badge">SB</div>';
                if (isBB) badges += '<div class="badge bb-badge">BB</div>';

                let status = '';
                if (player.balance <= 0) status = 'Out';
                else if (player.folded) status = 'Folded';
                else if (player.isAllIn) status = 'All In';

                // Calculate balance percentage for HP bar
                const totalBalance = player.balance + (player.currentBet || 0);
                const balancePercent = maxBalance > 0 ? Math.round((totalBalance / maxBalance) * 100) : 0;

                // Determine color class based on percentage
                let balanceClass = 'critical';
                if (balancePercent >= 75) balanceClass = 'high';
                else if (balancePercent >= 40) balanceClass = 'medium';
                else if (balancePercent >= 15) balanceClass = 'low';

                // Initialize rotation if not set
                if (player.rotation === undefined) player.rotation = 0;

                $card.html(`
                    <button class="rotate-btn" title="Rotate">↻</button>
                    <div class="balance-bar">
                        <div class="balance-bar-fill ${balanceClass}" style="width: ${balancePercent}%"></div>
                    </div>
                    <div class="badges-container">${badges}</div>
                    <div class="player-name">${player.name}</div>
                    <div class="player-balance">${formatNumber(player.balance)}</div>
                    ${player.currentBet > 0.001 ? `<div class="player-bet">Bet: ${formatNumber(player.currentBet)}</div>` : ''}
                    ${status ? `<div class="player-status">${status}</div>` : ''}
                `);

                // Apply rotation
                $card.css('transform', `rotate(${player.rotation}deg)`);

                // Rotate button handler
                $card.find('.rotate-btn').on('click', (e) => {
                    e.stopPropagation();
                    player.rotation = ((player.rotation || 0) + 90) % 360;
                    $card.css('transform', `rotate(${player.rotation}deg)`);
                    saveGame();
                });

                // Action buttons for active player
                if (isActive && player.balance > 0.001) {
                    const callAmount = GameState.currentBet - player.currentBet;
                    const bb = GameState.bigBlind;

                    const $actions = $('<div class="player-actions">');

                    // Fold and Check/Call on first row
                    const $row1 = $('<div class="action-row">');
                    const callText = callAmount > 0.001 ? `Call<br>${formatNumber(callAmount)}` : 'Check';
                    $row1.append($('<button class="btn btn-danger">Fold</button>').on('click', fold));
                    $row1.append($(`<button class="btn btn-success"></button>`).html(callText).on('click', callAmount > 0.001 ? call : check));
                    $actions.append($row1);

                    // Raise section with colored background
                    const $raiseSection = $('<div class="raise-section">');
                    let raiseAmount = bb;

                    const $minusBtn = $('<button class="btn btn-minus">-</button>');
                    const $raiseInput = $('<input type="number" class="raise-input" step="0.5" min="0">').val(formatNumber(raiseAmount));
                    const $plusBtn = $('<button class="btn btn-plus">+</button>');

                    const updateInput = () => {
                        $raiseInput.val(formatNumber(raiseAmount));
                        $raiseBtn.prop('disabled', raiseAmount > player.balance);
                    };

                    $raiseInput.on('input', () => {
                        const val = parseFloat($raiseInput.val()) || 0;
                        raiseAmount = Math.max(bb, Math.min(player.balance, val));
                    });

                    $minusBtn.on('click', () => {
                        raiseAmount = Math.max(bb, raiseAmount - bb);
                        updateInput();
                    });
                    $plusBtn.on('click', () => {
                        raiseAmount = Math.min(player.balance, raiseAmount + bb);
                        updateInput();
                    });

                    const $raiseRow = $('<div class="raise-row">');
                    $raiseRow.append($minusBtn);
                    $raiseRow.append($raiseInput);
                    $raiseRow.append($plusBtn);
                    $raiseSection.append($raiseRow);

                    const $raiseBtn = $('<button class="btn btn-warning btn-raise">Raise</button>');
                    $raiseBtn.on('click', () => {
                        const val = parseFloat($raiseInput.val()) || 0;
                        if (val > 0 && val <= player.balance) raise(val);
                    });
                    $raiseSection.append($raiseBtn);
                    $actions.append($raiseSection);

                    // All In on third row
                    const $row3 = $('<div class="action-row">');
                    $row3.append($('<button class="btn btn-allin btn-full">All In</button>').on('click', allIn));
                    $actions.append($row3);

                    $card.append($actions);
                }

                // Leave and Refill buttons (only when not in hand)
                if (!GameState.isHandInProgress) {
                    const $btnRow = $('<div class="player-btn-row">');
                    $btnRow.append($('<button class="btn btn-leave">Leave</button>').on('click', () => {
                        if (confirm(`${player.name} leaves with ${formatNumber(player.balance)}?`)) removePlayer(seat);
                    }));
                    $btnRow.append($('<button class="btn btn-refill">Add</button>').on('click', () => {
                        showRefillModal(seat);
                    }));
                    $card.append($btnRow);
                }
                $slot.append($card);
            } else {
                // Empty seat
                const $empty = $('<div class="player-card empty-seat">');
                if (!GameState.isHandInProgress) {
                    $empty.html(`<div class="seat-number">Seat ${seat + 1}</div><button class="btn btn-join join-btn" data-seat="${seat}">Join</button>`);
                } else {
                    $empty.html(`<div class="seat-number">Seat ${seat + 1}</div><div class="seat-empty-text">Empty</div>`);
                }
                $slot.append($empty);
            }
            // Add to correct row: seats 0,1,2 to top row, seats 3,4,5 to bottom row (reversed for circular layout)
            if (seat < 3) {
                $topRow.append($slot);
            } else {
                // Prepend to reverse order: 3,4,5 becomes 5,4,3 left-to-right
                $bottomRow.prepend($slot);
            }
        }
    }

    function renderPot() {
        $('.pot-amount').text(formatNumber(GameState.pot));
    }

    function renderPhase() {
        const names = { waiting: 'Waiting', 'pre-flop': 'Pre-flop', flop: 'Flop', turn: 'Turn', river: 'River' };
        $('.round-phase').text(names[GameState.phase] || GameState.phase);

        // Update buttons based on game state
        if (GameState.phase === 'waiting') {
            const canStart = GameState.players.filter(p => p.balance > 0.001).length >= 2;
            $('.next-phase-btn').text('Start Hand').prop('disabled', !canStart);
            $('.end-hand-btn').hide();
        } else {
            const nextNames = { 'pre-flop': 'Flop', flop: 'Turn', turn: 'River', river: 'Showdown' };
            $('.next-phase-btn').text(`Next: ${nextNames[GameState.phase]}`).prop('disabled', false);
            $('.end-hand-btn').show();
        }
    }

    // Modals
    function showJoinModal(seat) {
        GameState.pendingJoinSeat = seat;
        $('#join-name').val('');
        $('#join-modal').show();
        $('#join-name').focus();
    }

    function hideJoinModal() {
        $('#join-modal').hide();
        GameState.pendingJoinSeat = null;
    }

    let refillSeat = null;

    function showRefillModal(seat) {
        const player = GameState.players.find(p => p.seat === seat);
        if (!player) return;
        refillSeat = seat;
        $('#refill-player-name').text(`${player.name} (Balance: ${formatNumber(player.balance)})`);
        $('#refill-amount').val(0);
        $('#refill-modal').show();
        $('#refill-amount').focus();
    }

    function hideRefillModal() {
        $('#refill-modal').hide();
        refillSeat = null;
    }

    function refillBalance() {
        const amount = parseFloat($('#refill-amount').val()) || 0;
        if (amount <= 0) {
            alert('Enter a positive amount');
            return;
        }
        const player = GameState.players.find(p => p.seat === refillSeat);
        if (player) {
            player.balance += amount;
            renderGameScreen();
            saveGame();
        }
        hideRefillModal();
    }

    function showWinnerModal() {
        const $list = $('#winner-list').empty();
        GameState.players.filter(p => !p.folded).forEach(p => {
            $list.append($('<button class="winner-btn">').text(`${p.name} (${formatNumber(p.balance)})`).data('player', p));
        });
        $('#winner-modal').show();
    }

    function hideWinnerModal() { $('#winner-modal').hide(); }

    function showSplitModal() {
        const $list = $('#split-list').empty();
        GameState.players.filter(p => !p.folded).forEach(p => {
            $list.append($('<button class="winner-btn">').text(`${p.name} (${formatNumber(p.balance)})`).data('player', p).on('click', function() { $(this).toggleClass('selected'); }));
        });
        $('#split-modal').show();
    }

    function hideSplitModal() { $('#split-modal').hide(); }

    // Load Game Modal
    function showLoadModal() {
        const $list = $('#saved-games-list').empty();
        const gamesList = getSavedGamesList();

        // Also check for current game in progress
        const currentSaved = localStorage.getItem(STORAGE_KEY);
        if (currentSaved) {
            try {
                const data = JSON.parse(currentSaved);
                if (data.players && data.players.length > 0) {
                    gamesList.unshift({
                        id: 'current',
                        name: 'Current Game',
                        date: 'In progress',
                        players: data.players.map(p => ({ name: p.name, balance: p.balance })),
                        smallBlind: data.smallBlind,
                        bigBlind: data.bigBlind,
                        isCurrent: true
                    });
                }
            } catch (e) {}
        }

        if (gamesList.length === 0) {
            $list.append('<div style="opacity: 0.7; padding: 15px;">No saved games found</div>');
        } else {
            gamesList.forEach(game => {
                const $gameBtn = $('<button class="winner-btn">');
                const playerNames = game.players.map(p => p.name).join(', ');
                const playerInfo = game.players.length > 0 ? `${game.players.length} players` : 'No players';
                $gameBtn.html(`
                    <div style="font-weight: bold;">${game.name}</div>
                    <div style="font-size: 0.85rem; opacity: 0.8;">${game.date}</div>
                    <div style="font-size: 0.8rem; opacity: 0.7;">${playerInfo} - SB: ${game.smallBlind} / BB: ${game.bigBlind}</div>
                `);
                $gameBtn.data('gameId', game.id);

                const $btnContainer = $('<div style="display: flex; gap: 5px;">');
                $btnContainer.append($gameBtn.on('click', function() {
                    const gameId = $(this).data('gameId');
                    if (gameId === 'current') {
                        if (loadSavedGame() && GameState.players.length > 0) {
                            hideLoadModal();
                            showGameScreen();
                            renderGameScreen();
                        }
                    } else {
                        if (loadGameFromList(gameId)) {
                            hideLoadModal();
                            showGameScreen();
                            renderGameScreen();
                            saveGame(); // Save as current game
                        }
                    }
                }));

                // Delete button (not for current game)
                if (!game.isCurrent) {
                    const $deleteBtn = $('<button class="btn btn-tiny btn-decrease" style="padding: 8px 12px;">Delete</button>');
                    $deleteBtn.on('click', (e) => {
                        e.stopPropagation();
                        if (confirm(`Delete "${game.name}"?`)) {
                            deleteGameFromList(game.id);
                            showLoadModal(); // Refresh list
                        }
                    });
                    $btnContainer.append($deleteBtn);
                }

                $list.append($btnContainer);
            });
        }
        $('#load-modal').show();
    }

    function hideLoadModal() { $('#load-modal').hide(); }

    // Event Listeners
    function setupEventListeners() {
        // Setup
        $('#start-game-btn').on('click', startGame);
        $('#load-game-btn').on('click', showLoadModal);
        $('#cancel-load-btn').on('click', hideLoadModal);
        $('#forget-all-btn').on('click', () => {
            if (confirm('Clear all saved data?')) {
                clearSavedGame();
                localStorage.removeItem(GAMES_LIST_KEY);
                GameState.players = [];
                location.reload();
            }
        });
        $('#starting-balance').on('input', updateRecommendedBlinds);

        // Join
        $(document).on('click', '.join-btn', function() { showJoinModal($(this).data('seat')); });
        $('#confirm-join-btn').on('click', () => {
            const name = $('#join-name').val().trim();
            if (name && GameState.pendingJoinSeat !== null && addPlayerAtSeat(name, GameState.pendingJoinSeat)) hideJoinModal();
        });
        $('#join-name').on('keypress', e => { if (e.which === 13) $('#confirm-join-btn').click(); });
        $('#cancel-join-btn').on('click', hideJoinModal);

        // Refill
        $('#confirm-refill-btn').on('click', refillBalance);
        $('#refill-amount').on('keypress', e => { if (e.which === 13) refillBalance(); });
        $('#cancel-refill-btn').on('click', hideRefillModal);

        // Menu
        $('#menu-btn').on('click', (e) => {
            e.stopPropagation();
            $('#menu-dropdown').toggle();
        });
        $(document).on('click', (e) => {
            if (!$(e.target).closest('.menu-corner').length) {
                $('#menu-dropdown').hide();
            }
        });

        // Save game
        $('#save-game-btn').on('click', () => {
            if (GameState.players.length > 0) {
                saveGame();
                const playerNames = GameState.players.map(p => p.name).slice(0, 3).join(', ') + (GameState.players.length > 3 ? '...' : '');
                const gameName = `${playerNames} - ${new Date().toLocaleDateString()}`;
                saveGameToList(GameState, gameName);
                $('#menu-dropdown').hide();
                alert('Game saved!');
            } else {
                alert('No game to save.');
            }
        });

        // Guide
        $('#guide-btn').on('click', () => { $('#guide-modal').show(); $('#menu-dropdown').hide(); });
        $('#close-guide-btn').on('click', () => $('#guide-modal').hide());

        // Legend
        $('#legend-btn').on('click', () => { $('#legend-modal').show(); });
        $('#close-legend-btn').on('click', () => $('#legend-modal').hide());

        // Combinations
        $('#combinations-btn').on('click', () => { $('#combinations-modal').show(); });
        $('#close-combinations-btn').on('click', () => $('#combinations-modal').hide());

        // Fullscreen
        $('#fullscreen-btn').on('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.log('Error attempting fullscreen:', err);
                });
            } else {
                document.exitFullscreen();
            }
        });

        // Save Game
        $('#save-game-btn').on('click', () => {
            if (GameState.players.length > 0) {
                saveGame();
                const playerNames = GameState.players.map(p => p.name).slice(0, 3).join(', ') + (GameState.players.length > 3 ? '...' : '');
                const gameName = `${playerNames} - ${new Date().toLocaleDateString()}`;
                saveGameToList(GameState, gameName);
                alert('Game saved!');
                $('#menu-dropdown').hide();
            } else {
                alert('No players in game.');
            }
        });

        // Game controls - use class selector for all control bars
        $(document).on('click', '.next-phase-btn', function() {
            if (GameState.isHandInProgress) {
                const names = { 'pre-flop': 'Flop', flop: 'Turn', turn: 'River', river: 'Showdown' };
                if (confirm(`Advance to ${names[GameState.phase]}?`)) nextPhase();
            } else {
                const count = GameState.players.filter(p => p.balance > 0.001).length;
                if (count >= 2) startNewHand();
                else alert('Need at least 2 players with balance.');
            }
        });

        $(document).on('click', '.end-hand-btn', function() {
            if (GameState.isHandInProgress && confirm('End hand and select winner?')) showWinnerModal();
        });
        $('#end-game-btn').on('click', () => {
            if (confirm('End game and return to setup?')) {
                // Save current game to the list before ending
                if (GameState.players.length > 0) {
                    const playerNames = GameState.players.map(p => p.name).slice(0, 3).join(', ') + (GameState.players.length > 3 ? '...' : '');
                    const gameName = `${playerNames} - ${new Date().toLocaleDateString()}`;
                    saveGameToList(GameState, gameName);
                }
                // Clear current game so it doesn't auto-load on refresh
                clearSavedGame();
                GameState.players = [];
                showSetupScreen();
                $('#load-game-btn').show();
            }
        });

        // Winner modal
        $(document).on('click', '.winner-btn:not(.selected)', function() {
            if ($(this).closest('#split-modal').length) return;
            hideWinnerModal();
            awardPot([$(this).data('player')]);
        });
        $('#split-pot-btn').on('click', () => { hideWinnerModal(); showSplitModal(); });
        $('#cancel-winner-btn').on('click', () => { hideWinnerModal(); renderGameScreen(); });
        $('#confirm-split-btn').on('click', () => {
            const selected = $('#split-list .winner-btn.selected');
            if (selected.length >= 2) { hideSplitModal(); awardPot(selected.map(function() { return $(this).data('player'); }).get()); }
            else alert('Select at least 2 players.');
        });
        $('#cancel-split-btn').on('click', () => { hideSplitModal(); showWinnerModal(); });

        // Blinds (only adjust before hand)
        $(document).on('click', '.decrease-blinds', function() {
            if (!GameState.isHandInProgress) {
                GameState.smallBlind = Math.max(0.1, Math.round(GameState.smallBlind * 0.9 * 10) / 10);
                GameState.bigBlind = Math.max(0.2, Math.round(GameState.bigBlind * 0.9 * 10) / 10);
                renderBlinds(); saveGame();
            }
        });
        $(document).on('click', '.increase-blinds', function() {
            if (!GameState.isHandInProgress) {
                GameState.smallBlind = Math.round(GameState.smallBlind * 1.1 * 10) / 10;
                GameState.bigBlind = Math.round(GameState.bigBlind * 1.1 * 10) / 10;
                renderBlinds(); saveGame();
            }
        });
    }

    $(init);
})(jQuery);