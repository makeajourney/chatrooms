// 자바스크립트에서 객체를 생성할 때 Socket.IO의 socket을 단일 인자로 받는 "클래스"와 같은 역할을 한다.
var Chat = function(socket) {
  this.socket = socket;
}

// 채팅 메시지를 전송하는 함수
Chat.prototype.sendMessage = function(room, text) {
  var message = {
    room: room,
    text: text
  };
  this.socket.emit('message', message);
}

// 채팅방을 변경하기 위한 함수
Chat.prototype.changeRoom = function(room) {
  this.socket.emit('join', {
    newRoom: room
  });
};

// 채팅 명령 처리
Chat.prototype.processCommand = function(command) {
  var words = command.split(' ');
  var command = words[0].substring(1, words[0].length).toLowerCase(); // 첫번째 단어에서 명령어 구문 분석
  var message = false;

  switch (command) {
    case 'join':
      words.shift();
      var room = words.join(' ');
      this.changeRoom(room);    // 채팅방 변경/생성 처리
      break;
    case 'nick':
      words.shift();
      var name = words.join(' ');
      this.socket.emit('nameAttempt', name);  // 닉네임 변경 요청 처리
      break;
    default:
      message = 'Unrecognized command.';  // 알 수 없는 명령일 때 오류 메시지 반환
      break;
  }
  return message;
}
