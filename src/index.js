#!/usr/bin/env node

var DevServer = require('./DevServer.js')

switch (process.argv[2]) {
  case "dev":
    var path = '.';
    if (process.argv.length >= 4) {
      path = process.argv[3]
    }
    var server = new DevServer(path)
    if (typeof server.inited !== 'boolean') {
      server.inited.then(() => {
        server.listen()
      })
    }
    break;
  case 'build':
    var path = '.';
    if (process.argv.length >= 4) {
      path = process.argv[3]
    }
    (new DevServer(path)).build();
    break;
  default:
    console.log('Usage: danmakutreetool [action]\n\nAction:\ndev [source]\t\t\t\tstart development server\nbuild [source] [dist]\t\t\tbuild module');
    break;
}