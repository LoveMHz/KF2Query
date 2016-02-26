#!/usr/bin/env node

var dgram = require('dgram');
var BufferReader = require('buffer-reader');

// Parse host IP and PORT from command line
var HOST = process.argv[2];
var PORT = parseInt(process.argv[3], 10);

var message = new Buffer([
  0xFF, 0xFF, 0xFF, 0xFF, 0x54, 0x53, 0x6F, 0x75, 0x72, 0x63, 0x65, 0x20, 0x45,
  0x6E, 0x67, 0x69, 0x6E, 0x65, 0x20, 0x51, 0x75, 0x65, 0x72, 0x79, 0x00
]);

var client = dgram.createSocket('udp4');

client.on('listening', function () {
    var address = client.address();
});

client.on('message', function (message, remote) {
  var buffer = new BufferReader(message);

  // Get the header of packet (long)
  var header = buffer.nextInt32LE();

  // Single Packet
  if (header == -1)  {
    processDetails(buffer);
  }
  // TODO: Handle multi packet data
});

client.send(message, 0, message.length, PORT, HOST, function(err, bytes) {
  if (err) throw err;
});


function processDetails(buffer) {
  var details = {
    unknown_0   : buffer.nextUInt8(),
    protocol    : buffer.nextUInt8(),
    hostname    : buffer.nextStringZero(),
    map         : buffer.nextStringZero(),
    game_dir    : buffer.nextStringZero(),
    game_descr  : buffer.nextStringZero(),
    steamappid  : buffer.nextUInt16LE(),
    num_players : buffer.nextUInt8(),
    max_players : buffer.nextUInt8(),
    unknown_1   : buffer.nextUInt8(),
    unknown_2   : buffer.nextUInt8(),
    os          : buffer.nextUInt8(),
    password    : buffer.nextUInt8(),
    unknown_3   : buffer.nextUInt8(),
    version     : buffer.nextString(4),
    unknown_4   : buffer.nextInt32LE(),
    unknown_5   : buffer.nextInt32LE(),
    unknown_6   : buffer.nextInt32LE(),
  };

  // Additional Game Info
  extra_object = JSON.parse(
    '{' + buffer.nextStringZero()
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ').slice(0, -1) + '}'
  );

  // Decode
  Object.assign(details, {
    waves_total   : extra_object.d,
    waves_current : extra_object.e,
    unknown_a     : extra_object.a,
    unknown_l     : extra_object.l,
    unknown_m     : extra_object.m,
    unknown_j     : extra_object.j,
    unknown_k     : extra_object.k,
    unknown_i     : extra_object.i,
    unknown_h     : extra_object.h,
    unknown_b     : extra_object.b,
    unknown_c     : extra_object.c,
    unknown_f     : extra_object.f
  });

  console.log(details);

  return details;
}
