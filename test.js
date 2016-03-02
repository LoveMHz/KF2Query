const KF2Query = require('./index.js');

// Host IP and PORT
var host = process.argv[2];
var port = parseInt(process.argv[3], 10);

var kf2_server = new KF2Query(host, port);

kf2_server.getDetails(function(data) {
  console.log('getDetails received!', data);
});


kf2_server.getPlayers(function(data) {
  console.log('getPlayers received!', data);
});

kf2_server.getRules(function(data) {
  console.log('getRules received!', data);
});
