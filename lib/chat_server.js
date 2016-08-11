var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
  io = socketio.listen(server);   // 기존의 http server에 piggyback 방식으로 socketio를 시작
  io.set('loglevel', 1);

  io.sockets.on('connection', function (socket) { // 각 연결을 어떻게 처리해야 할지 정의
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed); // 사용자가 접속하면 손님 닉네임을 부여
    joinRoom(socket, 'Lobby');    // 사용자가 접속하면 대기실로 이동

    handleMessageBroadcasting(socket, nickNames);   // 사용자의 메시지, 닉네임 변경, 채팅방 생성이나 변경에 관한 처리를 수행
    handleNameChangeAttempts(socket, nickNames, namesUsed);
    handleRoomJoining(socket);

    socket.on('rooms', function() {   // 요청시 이미 생성된 채팅방 목록을 사용자에게 제공
      socket.emit('rooms', io.sockets.manager.rooms);
    });
    handleClientDisconnection(socket, nickNames, namesUsed);  // 사용자가 접속을 끊었을 때 관련 데이터 정리를 위한 로직을 정의
  });
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  var name = 'Guest' + guestNumber; // 새로운 손님 닉네임 생성
  nickNames[socket.id] = name;  // 닉네임을 클라이언트 연결 아이디와 연동
  socket.emit('nameResult', {   // 사용자에게 손님 닉네임을 알려줌
    success: true,
    name: name
  });
  namesUsed.push(name);   // 생성된 닉네임을 사용 중 닉네임에 추가
  return guestNumber + 1;   // 손님 닉네임 생성에 사용되는 카운터 숫자 증가
}

function joinRoom(socket, room) {
  socket.join(room);      // 사용자가 채팅방에 입장
  currentRoom[socket.id] = room;    // 사용자가 이 방에 입장했음을 저장
  socket.emit('joinResult', {room: room});    // 사용자에게 새로운 채팅방에 입장한 사실을 알림
  socket.broadcast.to(room).emit('message', {   // 채팅방의 다른 사용자에게 새로운 사용자가 입장했음을 알림
    text: nickNames[socket.id] + ' has joined ' + room + '.'
  });

  var usersInRoom = io.sockets.clients(room);   // 사용자가 참여한 방에 다른 사용자가 있는지 판단
  if (usersInRoom.length > 1) {   // 다른 사용자가 있다면 해당 사용자의 정보를 요약
    var usersInRoomSummary = 'Users currently in ' + room + ': ';
    for (var index in usersInRoom) {
      var userSocketId = usersInRoom[index].id;
      if (userSocketId != socket.id) {
        if (index > 0) {
          usersInRoomSummary += ', ';
        }

        usersInRoomSummary += nickNames[userSocketId];
      }
    }
    usersInRoomSummary += '.';
    socket.emit('message', {text: usersInRoomSummary});   // 입장한 사용자에게 요약한 다른 사용자의 정보 전송
  }
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
  socket.on('nameAttempt', function(name) {   // 이벤트 리스너에 nameAttempt 이벤트 등록
    if (name.indexOf('Guest') == 0) {   // Guest로 시작하는 닉네임은 허용하지 않음
      socket.emit('nameResult', {
        success: false,
        message: 'Names cannot begin with "Guest".'
      });
    } else {
      if (namesUsed.indexOf(name) == -1) { // 등록되지 않은 닉네임이라면 등록
        var previousName = nickNames[socket.id];
        var previousNameIndex = namesUsed.indexOf(previousName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[previousNameIndex];    // 변경 전 닉네임은 다른 사용자가 사용할 수 있게 삭제
        socket.emit('nameResult', {
          success: true,
          name : name
        });
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
          text: previousName + ' is now known as ' + name + '.'
        });
      } else {
        socket.emit('nameResult', {   // 이미 등록된 닉네임인 경우 클라이언트에 오류 전송
          success: false,
          message: 'That name is already in use.'
        });
      }
    }
  });
}

// 채팅 메시지 보내기
function handleMessageBroadcasting(socket) {
  socket.on('message', function (message) {
    socket.broadcast.to(message.room).emit('message', { // 메시지 전달을 위해 Socket.IO의 broadcast 함수 사용
      text: nickNames[socket.id] + ': ' + message.text
    });
  });
}

// 채팅방 만들기
function handleRoomJoining(socket) {
  socket.on('join', function(room) {
    socket.leave(currentRoom[socket.id]); // 채팅방 변경
    joinRoom(socket, room.newRoom);
  });
}

// 사용자의 접속 해제 처리
function handleClientDisconnection(socket) {
  socket.on('disconnect', function () {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}
