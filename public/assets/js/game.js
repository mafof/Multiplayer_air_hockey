var game = new Phaser.Game(800,600,Phaser.AUTO,'',{ preload: preload, create: create, update: update});
var socket = io('195.133.145.75:3000');


function preload() {
	game.load.image('player', 'assets/img/player.png');
	game.load.image('ball', 'assets/img/ball.png')
}

var player; // игрок
var otherPlayer; // Другой игрок
var coordX = 0; // Координаты нашего игрока
var coordY = 0; // Координаты нашего игрока
var ball; // Мячик
var course; // Направление
var speed; // Скорость
var text = ''; // Текст
var textPause = ''; // текст статусов игры
var textScore = '';
var templateCourse = course;

function create() {
	game.physics.startSystem(Phaser.Physics.ARCADE);
	game.stage.backgroundColor = '#124184';
	
	game.onPause.add(function() {
		socket.emit('GetGameStatus', { state: 1 }); // Пауза
	});

	game.onResume.add(function() {
		socket.emit('GetGameStatus', { state: 0 }); // Воспроизведение
	});

	socket.emit('preconnect', {player: socket.id });
	
	socket.on('Player', function(msg) {
		if(msg.serverString == undefined) {
			if(player == undefined) {
				player = game.add.sprite(msg.x, msg.y, 'player');
				game.physics.enable(player, Phaser.Physics.ARCADE);
				socket.emit('takeCoord', { x: player.x, y: player.y });
			} else {
				otherPlayer = game.add.sprite(msg.x, msg.y, 'player');
				game.physics.enable(otherPlayer, Phaser.Physics.ARCADE);
				socket.emit('takeCoord', { x: player.x, y: player.y });
			}	
		} else {
			game.add.text(0, 0, msg.serverString, {font: "32px Arial", fill: "#ffffff"});
		}
	});
	
	socket.on('ball', function(msg) {
		if(ball == undefined) {
			ball = game.add.sprite(msg.x, msg.y, 'ball');
			game.physics.enable(ball, Phaser.Physics.ARCADE);
			ball.body.collideWorldBounds = true;
		} else {
			ball.x = msg.x;
			ball.y = msg.y;
		}
		course = msg.course;
		speed = msg.speed;
	});
	
	socket.on('CoordOtherPlayer', function(msg) {
		if(otherPlayer == undefined) {
			otherPlayer = game.add.sprite(msg.x, msg.y, 'player');
			game.physics.enable(otherPlayer, Phaser.Physics.ARCADE);
		} else {
			otherPlayer.x = msg.x;
			otherPlayer.y = msg.y;
		}
	});
	
	socket.on('SendDateToCoordinate', function (msg) {
		socket.emit('takeCoord', { x: player.x, y: player.y });
	});
	
	socket.on('PlayerDisconnect', function (msg) {
		otherPlayer.destroy();
	});
	
	socket.on('StringWaitPlayers', function (msg) {
		if(msg.string != undefined) {
			text = game.add.text(0, 0, msg.string, {font: "32px Arial", fill: "#ffffff"});	
		} else {
			text.destroy();
		}
	});
	
	socket.on('SetRandomCourse', function (msg) { // Направление курсива шарика
		course = msg.course;
	});
	
	socket.on('SetGameStatus', function (msg) {
		if(msg.pause == 1) {
			templateCourse = course;
			course = 8;
			textPause = game.add.text(0,0, 'Игрок приостановил игру, ожидайте...', {font: "32px Arial", fill: "#ffffff"});
		} else if(msg.pause == 0) {
			course = templateCourse;
			textPause.destroy();
		}
	});
	
	socket.on('SetScore', function(msg) {
		textScore = '';
		textScore = game.add.text(200, 50, msg.score, {font: "32px Arial", fill: "#ffffff"});
	});
}

function update() {
	// Игрок
	if(player != undefined) {
		if(ball != undefined) {
			game.physics.arcade.collide(ball, player);
			game.physics.arcade.collide(ball, otherPlayer);
		}
		if(player.x != coordX || player.y != coordY) {
			socket.emit('takeCoord', { x: player.x, y: player.y });
			coordX = player.x;
			coordY = player.y;
		}
		if(player.y <= 0) {
			player.y = 0;
		} else if((player.y+100) >= 600) {
			player.y = 500;
		}
	}
	
	// Обработка столкновений
	if(player != undefined) { // ты
		if(ball != undefined) {
			if(player.x > 300) { // Проверка на местонахождение игрока
				if(game.physics.arcade.collide(ball, player)) {
					socket.emit('GetRandomCourse', { playerSide: 0 }); // Если игрок справа
				}	
			} else if(player.x < 300) {
				if(game.physics.arcade.collide(ball, player)) {
					socket.emit('GetRandomCourse', { playerSide: 1 }); // Если игрок справа
				}	
			}
		}
	}
	
	if(otherPlayer != undefined) { // твой оппонент
		if(ball != undefined) {
			if(otherPlayer.x > 300) { // Проверка на местонахождение игрока
				if(game.physics.arcade.collide(ball, otherPlayer)) {
					socket.emit('GetRandomCourse', { playerSide: 0 }); // Если игрок справа
				}	
			} else if(otherPlayer.x < 300) {
				if(game.physics.arcade.collide(ball, otherPlayer)) {
					socket.emit('GetRandomCourse', { playerSide: 1 }); // Если игрок справа
				}	
			}
		}
	}
	
	
	// шарик
	if(ball != undefined) {
		switch(course) { // При старте определение траектории
			case 0:
			ball.y -= speed;
			break;
			case 1:
			ball.y += speed;
			break;
			case 2:
			ball.x -= speed;
			break;
			case 3:
			ball.x += speed;
			break;
			case 4:
			ball.x -= speed;
			ball.y += speed;
			break;
			case 5:
			ball.x -= speed;
			ball.y -= speed;
			break;
			case 6:
			ball.x += speed;
			ball.y -= speed;
			break;
			case 7:
			ball.x += speed;
			ball.y += speed;
			break;
			case 8: // При остановки игры
			ball.x = ball.x;
			ball.y = ball.y;
			break;
		}
		
		if(ball.body.collideWorldBounds) {
			if(ball.y <= 1) {
				socket.emit('GetRandomCourse', { playerSide: 2}); // Елси прикосновение сверху
			} else if(ball.y >= 524) {
				socket.emit('GetRandomCourse', { playerSide: 3}); // Елси прикосновение снизу
			} else if((ball.x + 83) >= 799) {
				socket.emit('SetScore', { right: 1 });
			} else if(ball.x <= 1) {
				socket.emit('SetScore', { left: 1 });
			}
		}
	}
	
	if(game.input.keyboard.isDown(Phaser.Keyboard.DOWN)) {
		player.y += 5;
	} else if(game.input.keyboard.isDown(Phaser.Keyboard.UP)) {
		player.y -= 5;
	}
}