(function () {
	window.onload = function () {
		main();
	}

	// Constants
	var HEIGHT = 120;
	// var WIDTH = 200;

	var canvas, context;
	var data;
	var ai, player;
	var isPlayer, aiMoved;

	function main() {
		canvas = document.createElement("canvas");
		canvas.width = canvas.height = 3 * HEIGHT + 20;
		context = canvas.getContext("2d");

		document.body.appendChild(canvas);

		canvas.addEventListener("mousedown", mouseDown);

		init();
		tick();
	}

	function mouseDown(event) {
		if (!isPlayer) {
			return true;
		}
		var element = event.target;
		var xPos = event.clientX - element.offsetLeft;
		var yPos = event.clientY - element.offsetTop;

		if (xPos % 120 >= 20 && yPos % 120 >= 20) {
			var index = Math.floor(xPos / 120);
			index += Math.floor(yPos / 120) * 3;

			if (data[index].hasData()) {
				return;
			}
			data[index].flip(player);
			// player = player === Tile.NOUGHT ? Tile.CROSS : Tile.NOUGHT;
			isPlayer = false;
		}
	}

	function init() {
		if (data == null) {
			data = [];

			for (var i = 0; i < 9; i++) {
				var x = (i % 3) * 120 + 20;
				var y = Math.floor(i / 3) * 120 + 20;
				data.push(new Tile(x, y));
			}
		}

		player = Tile.CROSS;
		isPlayer = player === Tile.CROSS;
		aiMoved = false;
		ai = new AIPlayer(data);
		ai.setSeed(player === Tile.NOUGHT ? Tile.CROSS : Tile.NOUGHT);

		console.log(ai.move());
	}

	function tick() {
		window.requestAnimationFrame(tick);

		update();
		render();
	}

	function update() {
		var activeAnimation = false;
		for (var i = 0; i < 9; i++) {
			data[i].update();
			activeAnimation = activeAnimation || data[i].active();
		}

		if (!activeAnimation) {
			if (!isPlayer && !aiMoved) {
				var move = ai.move();
				if (move === -1) {
					console.log("Draw.");
					// return;
				} else {
					data[move].flip(ai.getSeed());
				}
				isPlayer = true;
			}
			aiMoved = true;
		} else {
			aiMoved = false;
		}
	}

	function render() {
		context.clearRect(0, 0, canvas.width, canvas.height);

		for (var i = 0; i < 9; i++) {
			data[i].draw(context);
		}
	}

	function Tile(x, y) {
		var x = x;
		var y = y;

		var tile = Tile.BLANK;
		var animation = 0;

		if (tile == null) {
			var _c = document.createElement("canvas");
			_c.width = _c.height = 100;
			var _context = _c.getContext("2d");

			_context.fillStyle = "skyblue";
			_context.lineWidth = 4;
			_context.strokeStyle = "white";
			_context.lineCap = "round";

			// Blank Tile
			_context.fillRect(0, 0, 100, 100);

			Tile.BLANK = new Image();
			Tile.BLANK.src = _c.toDataURL();

			// Nought
			_context.fillRect(0, 0, 100, 100);

			_context.beginPath();
			_context.arc(50, 50, 30, 0, 2 * Math.PI);
			_context.stroke();

			Tile.NOUGHT = new Image();
			Tile.NOUGHT.src = _c.toDataURL();

			// Cross
			_context.fillRect(0, 0, 100, 100);

			_context.beginPath();
			_context.moveTo(20, 20);
			_context.lineTo(80, 80);
			_context.moveTo(80, 20);
			_context.lineTo(20, 80);
			_context.stroke();

			Tile.CROSS = new Image();
			Tile.CROSS.src = _c.toDataURL();

			tile = Tile.BLANK;
		}

		this.active = function () {
			return animation > 0;
		}

		this.equals = function (_tile) {
			return tile === _tile;
		}

		this.hasData = function () {
			return tile !== Tile.BLANK;
		}

		this.set = function (next) {
			tile = next;
		}

		this.flip = function (next) {
			tile = next;
			animation = 1;
		}

		this.update = function () {
			if (animation > 0) {
				animation -= 0.02;
			}
		}

		this.draw = function (context) {
			if (animation <= 0) {
				context.drawImage(tile, x, y);
				return;
			}

			var resolution = 2;
			var t = animation > 0.5 ? Tile.BLANK : tile;
			var p = -Math.abs(2 * animation - 1) + 1;

			for (var i = 0; i < 100; i += resolution) {
				var j = 50 - (animation > 0.5 ? 100 - i : i);
				context.drawImage(t, i, 0, resolution, 100,
					x + i - p * i + 50 * p,
					y - j * p * 0.2,
					resolution,
					100 + j * p * 0.4
				);
			}
			// context.drawImage(t, x, y);
		}
	}

	function AIPlayer(data) {
		var data = data;
		var seed, oppSeed;

		var winningPatterns = (function () {
			var winPatterns = [
				"111000000", "000111000", "000000111", // Horizontal win patterns
				"100100100", "010010010", "001001001", // Vertical win patterns
				"100010001", "001010100" // Diagonal win patterns
			];
			var r = new Array(winPatterns.length);

			for (var i = 0; i < winPatterns.length; i++) {
				r[i] = parseInt(winPatterns[i], 2); // Evaluates as binary numbers as opposed 
				// to decimal numbers (base 2 instead of base 10)
			}
			return r;
		})();

		this.setSeed = function (_seed) {
			seed = _seed;
			oppSeed = _seed === Tile.NOUGHT ? Tile.CROSS : Tile.NOUGHT;
		}

		this.getSeed = function () {
			return seed;
		}

		this.move = function () {
			return minimax(2, seed)[1];
		}


		var hasWon = this.hasWon = function (player) {
			var pattern = 0;

			for (var i = 0; i < data.length; i++) {
				if (data[i].equals(player)) {
					pattern |= (1 << i);
				}
			}

			for (var i = 0; i < winningPatterns.length; i++) {
				if ((pattern & winningPatterns[i]) === winningPatterns[i]) {
					return true;
				}
			}

			return false;
		};

		function minimax(depth, player) {
			var nextMoves = getValidMoves();

			var best = (player === seed) ? -1e100 : 1e100;
			var current;
			var bestIndex = -1;

			if (nextMoves.length === 0 || depth === 0) {
				best = evaluate();
			} else {
				for (var i = 0; i < nextMoves.length; i++) {
					var move = nextMoves[i];
					data[move].set(player);

					if (player === seed) {
						current = minimax(depth - 1, oppSeed)[0];
						if (current > best) {
							best = current;
							bestIndex = move;
						}
					} else {
						current = minimax(depth - 1, seed)[0];
						if (current < best) {
							best = current;
							bestIndex = move;
						}
					}

					data[move].set(Tile.BLANK);
				}
			}

			return [best, bestIndex];
		}

		function getValidMoves() {
			var nextMoves = [];

			if (hasWon(seed) || hasWon(oppSeed)) {
				return nextMoves;
			}

			for (var i = 0; i < data.length; i++) {
				if (!data[i].hasData()) {
					nextMoves.push(i);
				}
			}
			return nextMoves;
		}

		function evaluate() {
			var score = 0;
			score += evaluateLine(0, 1, 2);
			score += evaluateLine(3, 4, 5);
			score += evaluateLine(6, 7, 8);
			score += evaluateLine(0, 3, 6);
			score += evaluateLine(1, 4, 7);
			score += evaluateLine(2, 5, 8);
			score += evaluateLine(0, 4, 8);
			score += evaluateLine(2, 4, 6);
			return score;
		}

		function evaluateLine(index1, index2, index3) {
			var score = 0;

			if (data[index1].equals(seed)) {
				score = 1;
			} else if (data[index1].equals(oppSeed)) {
				score = -1;
			}

			if (data[index2].equals(seed)) {
				if (score === 1) {
					score = 10;
				} else if (score === -1) {
					score = 0;
				} else {
					score = 1;
				}
			} else if (data[index2].equals(oppSeed)) {
				if (score === -1) {
					score = -10;
				} else if (score === 1) {
					score = 0;
				} else {
					score = -1;
				}
			}

			if (data[index3].equals(seed)) {
				if (score > 0) {
					score *= 10;
				} else if (score < 0) {
					return 0;
				} else {
					score = 1;
				}
			} else if (data[index3].equals(oppSeed)) {
				if (score < 0) {
					score *= 10;
				} else if (score > 0) {
					return 0;
				} else {
					score = -1;
				}
			}
			return score;
		}
	}
})();