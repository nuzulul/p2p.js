# p2p.js
p2p.js is an open source JavaScript library which provides solution to build peer to peer webapps without hassle powered by auto matchmaking WebRTC. This solve the common issues faced by WebRTC based application developers who need to deploying their own signaling server.

[>DEMO<](https://nuzulul.github.io/p2p.js/demo.html)

## Benefit

* ✅ WebRTC auto matchmaking
* ✅ No server required
* ✅ Simple API
* ✅ ESM support

## How does it works?

This module manage WebRTC matchmaking automatically via established public WebTorrent protocol as signaling transport then provides video, audio and data channel. Take a look at the [signalingserver.js](https://github.com/nuzulul/signalingserver.js) for more information.

## Ideas

- P2P Chat
- P2P File Transfer
- P2P Video Call
- P2P Media Streaming
- P2P Game Multiplayer
- P2P Screen Sharing
- P2P Camera

## Install

```
npm install p2p.js
```

CDN

* [https://esm.sh/p2p.js](https://esm.sh/p2p.js)

```
<script type="importmap">
{
	"imports": {
		"p2p.js" : "https://esm.sh/p2p.js"
	}
}
</script>
```

## Usage

```
import {createPeer} from 'p2p.js';

const peers = [];

const config = {
	appid: 'myApp'
}

const peer = createPeer(config);

peer.onPeerConnect((peer_id)=>{
	peers.push(peer_id);
	console.log('connect',peer_id);
});

peer.onPeerDisconnect((peer_id)=>{
	peers.splice(peers.findIndex(item=>item===peer_id),1);
	console.log('disconnect',peer_id);
});

peer.onPeerData((peer_id,data) => {
	console.log(`${peer_id} say : ${new TextDecoder().decode(data)}`);
});

setInterval(()=>{
	const me = peer.getPeerId();
	peers.forEach(peer_id=>peer.sendPeerData(peer_id,`i am ${me}`));
},5000);
```

## API

### `peer = createPeer(config)`

Create a new p2p peer.

config - configuration object :
* appid - custom unique application ID.
* password - optional custom password for session encryption.
* tracker - optional custom WebTorrent tracker list.

### `peer.getPeerId()`

Get this peer ID.

### `peer.getPeers()`

Get all peers ID that connected.

### `peer.destroyPeer()`

Destroy and cleanup this peer.

### `peer.sendPeerData(peer_id,data)`

Send data to peer.

### `peer.addPeerStream(peer_id,stream)`

Add a `MediaStream` to peer.

### `peer.removePeerStream(peer_id,stream)`

Remove a `MediaStream` from peer.

### `peer.addPeerTrack(peer_id,track,stream)`

Add a `MediaStreamTrack` to peer.

### `peer.removePeerTrack(peer_id,track,stream)`

Remove a `MediaStreamTrack` from peer.

### `peer.replacePeerTrack(peer_id,old_track,new_track,stream)`

Replace a `MediaStreamTrack` with another track.

### `peer.onPeerConnect((peer_id)=>{})`

Listen on new peer connection.

### `peer.onPeerDisconnect((peer_id)=>{})`

Listen on peer disconnection.

### `peer.onPeerData((peer_id,data)=>{})`

Listen on incoming data.

### `peer.onPeerStream((peer_id,stream)=>{})`

Listen on incoming stream.

### `peer.onPeerTrack((peer_id,track, stream)=>{})`

Listen on incoming video/audio track.

## License

* [MIT](https://github.com/nuzulul/p2p.js/blob/main/LICENSE) (2026) [Nuzulul Zulkarnain](https://github.com/nuzulul)