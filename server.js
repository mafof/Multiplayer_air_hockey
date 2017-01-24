var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var engines = require('consolidate');
var path = require('path');

app.use(express.static(path.join(__dirname, 'public')));
app.set('views', __dirname + '/public');
app.engine('html', engines.mustache);
app.set('view engine', 'html');

var listPlayer = new Array();
var currentPlayerOnline = 0;
var currentScore = { left: 0, right: 0 };

app.get('/airh', (req, res) => {
	res.render('index.html');
});

io.on('connection', (socket) => {
	io.clients((error, clients)=> {
		console.log("Игрок "+socket.id+" подключился");
		setTimeout(() => {
			io.sockets.emit('SendDateToCoordinate', {date: 'Данные'});
		}, 1500);
	});
	
	socket.on('preconnect', (msg) => {
		console.log("Игрок " + msg.player + " вошел в игру");
		currentPlayerOnline++;
		listPlayer[currentPlayerOnline] = {
			name: msg.player,
			x: 0,
			y: 0
		};
		console.log("Текущее колл-во игроков на сервере "+ currentPlayerOnline);
		if(currentPlayerOnline == 1) {
			socket.emit('Player', { x: 1, y: 225 });
			setTimeout(() => {
				io.sockets.emit('StringWaitPlayers', { string: 'Ожидание других игроков...' });	
			},1000);
		} else if(currentPlayerOnline == 2) {
			socket.emit('Player', { x: 759, y: 225 });
			setTimeout(() => {
				io.sockets.emit('ball', { x: 358, y: 261, course: getRandomArbitrary(0,7), speed: 5 }); // 8 направлений
			},500);
			setTimeout(() => {
				io.sockets.emit('StringWaitPlayers', { });	
			},1000);
		} else {
			socket.emit('Player', { serverString: 'Сервер переполнен' });
		}
	});
	
	socket.on('takeCoord', (msg) => {
		socket.broadcast.emit('CoordOtherPlayer', { x: msg.x, y: msg.y });
	});
	
	socket.on('GetRandomCourse', (msg) => {
		var course = getRandomArbitrary(0,2);
		if(msg.playerSide == 0) {
			switch(course) {
				case 0:
					io.sockets.emit('SetRandomCourse', { course: 4 });
				break;
				case 1:
					io.sockets.emit('SetRandomCourse', { course: 2 });
				break;
				case 2:
					io.sockets.emit('SetRandomCourse', { course: 5 });
				break;
				default:
					
				break;
			}
		} else if(msg.playerSide == 1) {
			switch(course) {
				case 0:
					io.sockets.emit('SetRandomCourse', { course: 6 });
				break;
				case 1:
					io.sockets.emit('SetRandomCourse', { course: 3 });
				break;
				case 2:
					io.sockets.emit('SetRandomCourse', { course: 7 });
				break;
				default:
					
				break;
			}
		} else if(msg.playerSide == 2) {
			switch(course) {
				case 0:
					io.sockets.emit('SetRandomCourse', { course: 7 });
				break;
				case 1:
					io.sockets.emit('SetRandomCourse', { course: 7 });
				break;
				case 2:
					io.sockets.emit('SetRandomCourse', { course: 5 });
				break;
			}
		} else if(msg.playerSide == 3) {
			switch(course) {
				case 0:
					io.sockets.emit('SetRandomCourse', { course: 6 });
				break;
				case 1:
					io.sockets.emit('SetRandomCourse', { course: 4 });
				break;
				case 2:
					io.sockets.emit('SetRandomCourse', { course: 4 });
				break;
			}
		}
		
	});	
	
	socket.on('GetGameStatus', (msg) => {
		if(msg.state == 1) {
			io.sockets.emit('SetGameStatus', { pause: 1 });
		} else if(msg.state == 0) {
			io.sockets.emit('SetGameStatus', { pause: 0 });
		}
	});
	
	socket.on('SetScore', (msg) =>{
		if(msg.left == 1) {
			currentScore.left++;
			var scors = currentScore.left+":"+currentScore.right;
			io.sockets.on('SetScore', { score: scors });
		} else  if(msg.right == 1) {
			currentScore.right++;
			var scors = currentScore.left+":"+currentScore.right;
			io.sockets.on('SetScore', { score: scors });
		}
	});
	
	socket.on('disconnect', () => {
		io.sockets.emit('PlayerDisconnect', {name: socket.id});
		listPlayer.forEach((item,i,arr) => {
			console.log(item);
			if(item.name == socket.id) {
				console.log("Игрок " + socket.id + " вышел");
				delete listPlayer[i];
				currentPlayerOnline--;
			}
		});
		console.log("Текущее колл-во игроков на сервере "+ currentPlayerOnline);
	});
});

http.listen(3000, ()=> {
	console.log("Сервер запущен на порту 3000");
});

function getRandomArbitrary(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}