var http = require('http');   // http server와 client 기능을 제공하는 내장 http module
var fs = require('fs');     // file system 관련 기능을 제공하는 내장 fs module
var path = require('path');   // file system 경로 관련 기능을 제공하는 내장 path module
var mime = require('mime');   // 파일명 확장자 기반의 MIME 타입 추론 기능을 제공하는 외부 mime module
var cache = {};   // 캐시 된 파일의 내용이 저장되는 캐시 객체


// 요청한 파일이 존재하지 않을 때 404 오류를 전송
function send404(response) {
  response.writeHead(404, {'Content-type' : 'text/plain'});
  response.write('Error 404: resource not found.');
  response.end();
}

// file data를 서비스하는 함수
function sendFile(response, filePath, fileContents) {
  response.writeHead(
    200,
    {"content-type" : mime.lookup(path.basename(filePath))}
  );
  response.end(fileContents);
}

// static file service
function serveStatic(response, cache, absPath) {
  if (cache[absPath]) {       // file이 메모리에 캐시되어 있는 지 확인
    sendFile(response, absPath, cache[absPath]);    // 캐시에 존재하는 파일이면 바로 서비스
  } else {
    fs.exists(absPath, function(exists) {     // 파일 존재 여부 검사
      if (exists) {
        fs.readFile(absPath, function(err, data) {    // 디스크에서 파일 읽기
          if (err) {
            send404(response);
          } else {
            cache[absPath] = data;
            sendFile(response, absPath, data);    // 디스크에 저장된 파일 서비스
          }
        });
      } else {
        send404(response);    // HTTP 404 오류 응답
      }
    });
  }
}

// HTTP Server 생성
var server = http.createServer(function(request, response) {    // 요청에 대한 처리를 정의하고 있는 익명 함수를 이용한 HTTP Server 생성
  var filePath = false;
  if (request.url == '/') {
    filePath = 'public/index.html';   // 기본으로 서비스되는 HTML 파일 결정
  } else {
    filePath = 'public' + request.url;    // url을 파일의 상대경로로 반환
  }
  var absPath = './' + filePath;
  serveStatic(response, cache, absPath);    // static file service
});

// HTTP Server start

server.listen(3000, function() {
  console.log("Server listening on port 3000.");
});

var chatServer = require('./lib/chat_server');
chatServer.listen(server);
