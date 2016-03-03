/*eslint-disable no-multi-spaces */
/*eslint-disable key-spacing */

const dgram = require('dgram')
const BufferReader = require('buffer-reader')

module.exports = function (host, port) {
  // Public Varibles
  this.host = host
  this.port = port

  // Const Varibles
  const REQUEST_CHALLENGE = new Buffer([
    0xFF, 0xFF, 0xFF, 0xFF, 0x55, 0xFF, 0xFF, 0xFF, 0xFF
  ])

  const REQUEST_DETAILS = new Buffer([
    0xFF, 0xFF, 0xFF, 0xFF, 0x54, 0x53, 0x6F, 0x75, 0x72, 0x63, 0x65, 0x20, 0x45,
    0x6E, 0x67, 0x69, 0x6E, 0x65, 0x20, 0x51, 0x75, 0x65, 0x72, 0x79, 0x00
  ])

  const REQUEST_PLAYERS = new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0x55])
  const REQUEST_RULES   = new Buffer([0xFF, 0xFF, 0xFF, 0xFF, 0x56])

  const PACKET_CHALLENGE = 'A'
  const PACKET_PLAYERS   = 'D'
  const PACKET_DETAILS   = 'I'
  const PACKET_RULES     = 'E'

  // Private Varibles
  var client = dgram.createSocket('udp4')

  var socket_callbacks = {
    Players : [],
    Details : [],
    Rules   : []
  }

  var challenge_buffer = null
  var challenge_callbacks = []

  // Public Functions
  this.getPlayers = function (callback) {
    // Request challenge
    requestChallengeResponse(function () {
      var request = Buffer.concat([REQUEST_PLAYERS, challenge_buffer])

      client.send(request, 0, request.length, port, host, function (err, bytes) {
        if (err) callback({error: err})
      })

      socket_callbacks.Players.push(callback)
    })
  }

  this.getDetails = function (callback) {
    client.send(REQUEST_DETAILS, 0, REQUEST_DETAILS.length, port, host, function (err, bytes) {
      if (err) callback({error: err})
    })

    socket_callbacks.Details.push(callback)
  }

  this.getRules = function (callback) {
    // Request challenge
    requestChallengeResponse(function () {
      var request = Buffer.concat([REQUEST_RULES, challenge_buffer])

      client.send(request, 0, request.length, port, host, function (err, bytes) {
        if (err) callback({error: err})
      })

      socket_callbacks.Rules.push(callback)
    })
  }

  // Construct
  client.on('message', function (message, remote) {
    var buffer = new BufferReader(message)

    // Get the header of packet (long)
    var header = buffer.nextInt32LE()

    // Single Packet
    // TODO: Handle multi packet data
    if (header === -1) {
      proccessPacket(buffer)
    }
  })

  // Private Functions
  function handleCallback (callback_array, data) {
    while (callback_array.length > 0) {
      callback_array.pop()(data)
    }
  }

  function requestChallengeResponse (callback) {
    client.send(REQUEST_CHALLENGE, 0, REQUEST_CHALLENGE.length, port, host, function (err, bytes) {
      if (err) callback({error: err})
    })

    challenge_callbacks.push(callback)
  }

  function proccessPacket (buffer) {
    var response = buffer.nextString(1)

    switch (response) {
      case PACKET_CHALLENGE:
        return processChallenge(buffer)
      case PACKET_PLAYERS:
        return handleCallback(socket_callbacks.Players, processPlayers(buffer))
      case PACKET_DETAILS:
        return handleCallback(socket_callbacks.Details, processDetails(buffer))
      case PACKET_RULES:
        return handleCallback(socket_callbacks.Rules, processRules(buffer))
      default:
        throw new Error('Unexpected response')
    }
  }

  function processChallenge (buffer) {
    challenge_buffer = buffer.nextBuffer(4)

    while (challenge_callbacks.length > 0) {
      challenge_callbacks.pop()()
    }
  }

  function processPlayers (buffer) {
    var data = {
      player_count : buffer.nextUInt8(),
      players      : []
    }

    for (var i = 0; i < data.player_count; i++) {
      data.players.push({
        id    : buffer.nextUInt8(),
        name  : buffer.nextStringZero(),
        score : buffer.nextInt32LE(),
        time  : buffer.nextInt32LE()
      })
    }

    return data
  }

  function processDetails (buffer) {
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
      unknown_6   : buffer.nextInt32LE()
    }

    // Additional Game Info
    var extra_object = JSON.parse(
      '{' + buffer.nextStringZero()
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2": ')
          .slice(0, -1) + '}'
    )

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
    })

    return details
  }

  function processRules (buffer) {
    var data = {
      rules_count : buffer.nextUInt16LE(),
      rules       : []
    }

    for (var i = 0; i < data.rules_count; i++) {
      var name  = buffer.nextStringZero()
      var value = buffer.nextStringZero()

      // Cleanup values type
      if (!isNaN(value)) {
        value = Number(value)
      } else if (value === 'True' || value === 'False') {
        value = (value === 'True')
      }

      data.rules.push({
        name  : name,
        value : value
      })
    }

    return data
  }
}
