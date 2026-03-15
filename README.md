# Poker Tracker

A simple, free, offline Texas Hold'em poker game tracker for home games with friends.

## What is it?

Poker Tracker is a web-based application that helps you run Texas Hold'em poker games without needing chips, apps, or accounts. It runs entirely in your browser, saves progress locally, and works offline.

## Features

- **Player Management**: Add up to 6 players with customizable seat positions
- **Blind Controls**: Adjustable small and big blinds with recommended defaults
- **Game Phases**: Full Texas Hold'em flow (Pre-flop, Flop, Turn, River)
- **Player Actions**: Fold, Check, Call, Raise, All In
- **Pot Tracking**: Automatic pot calculation and winner distribution
- **Balance Bars**: Visual indicators showing each player's chip stack relative to the leader
- **Save/Load**: Persist games locally and load them later
- **Manual Winner Selection**: Choose winners when players go all-in or hands go to showdown
- **Split Pot**: Divide winnings among multiple winners

## How to Play

### Setup

1. Open `index.html` in a web browser
2. Set the **Starting Balance** for each player (default: 100)
3. Set **Small Blind** and **Big Blind** amounts (recommended values shown automatically)
4. Click **Start New Game**

### Adding Players

1. Click on any empty seat (numbered 1-6) to add a player
2. Enter the player's name
3. Repeat for all players (minimum 2 required)

### Starting a Hand

1. Once all players have joined, click **Start Hand**
2. Blinds are automatically posted:
   - Small Blind: Player to the left of the dealer
   - Big Blind: Player two positions left of the dealer
3. Each player receives their hole cards (deal your own physical cards)

### Betting Rounds

The active player is highlighted. Available actions:

- **Fold**: Discard your hand and exit the round
- **Check**: Pass without betting (only when no bet to call)
- **Call**: Match the current bet
- **Raise**: Increase the bet (enter amount in the input field)
- **All In**: Bet your entire stack

### Game Phases

1. **Pre-flop**: After blinds, first betting round
2. **Flop**: First 3 community cards revealed, second betting round
3. **Turn**: 4th community card, third betting round
4. **River**: 5th community card, final betting round

### Determining the Winner

- If only one player remains (others folded), they win automatically
- If multiple players remain after the River, click **End Hand** to select the winner
- Use **Split Pot** if multiple players tie

### Managing the Game

- **+/- Blinds**: Adjust blind levels between hands
- **Refill**: Add balance to a player (only before a hand starts)
- **Save Game**: Save current game to load later
- **End Game**: Return to setup screen (game is auto-saved)

## Game Controls

### Menu (bottom-right corner)

- **Guide**: Overview of controls and game flow
- **Legend**: Explanation of badges and UI elements
- **Combinations**: Poker hand rankings reference
- **Save Game**: Save current game state

### Player Badges

- **D**: Dealer (button position)
- **SB**: Small Blind
- **BB**: Big Blind

### Balance Bar Colors

- **Green**: 75-100% of chip leader
- **Yellow**: 40-74% of chip leader
- **Orange**: 15-39% of chip leader
- **Red**: 0-14% of chip leader

## Technical Notes

- Pure HTML, CSS, and JavaScript (jQuery)
- No server required - runs entirely client-side
- Data saved in browser's localStorage
- Works offline after initial load
- Responsive design for various screen sizes

## Getting Started

1. Clone or download this repository
2. Open `index.html` in any modern web browser
3. Start playing!

No installation, dependencies, or internet connection required.