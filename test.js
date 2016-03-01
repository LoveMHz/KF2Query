const KF2Query = require('./index.js');

// Host IP and PORT
var host = process.argv[2];
var port = parseInt(process.argv[3], 10);

var kf2_server = new KF2Query(host, port);

kf2_server.getDetails(function(data) {
  console.log('Data received!', data);
});
