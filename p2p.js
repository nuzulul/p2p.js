/**
 * p2p.js - Build serverless peer to peer webapps powered by auto matchmaking WebRTC.
 * https://github.com/nuzulul/p2p.js
 * MIT License - 2026 - Nuzulul Zulkarnain
 */

import {createSignalingServer} from 'signalingserver.js';
import Peer from '@workadventure/simple-peer';

const appName = 'p2p.js';
const defaultAppId = 'global';
const charSet = '0123456789AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz';
const createId = () => new Array(20).fill().map(()=>charSet[Math.floor(Math.random() * charSet.length)]).join('');
const broadcastMs = 10000;
const lockPoolMs = 5000;
const cleanPoolMs = 30000;
const typePool = ['initiator','collaborator'];

const createPeer = (config) => {
	
	let nodeConfig = {};
	let password = appName+defaultAppId;
	let onPeerConnect = () => {};
	const myId = createId();
	const connectedPeers = {};
	const peerPool = {};
	const lockPool = {};
	let stopSignal = false;
	
	if(config && config.appid){
		const appid = appName+config.appid;
		nodeConfig[appid] = appid;
		password = appName+config.appid;
	}else{
		const appid = appName+defaultAppId;
		nodeConfig[appid] = appid;
	}
	
	if(config && config.password){
		password += config.password;
	}
	
	if(config && config.tracker){
		if(!config.tracker.length){
			throw new Error(`Tracker list is empty`);
		}
		nodeConfig[tracker] = config.tracker;
	}
	
	//create signaling server node;
	const node = createSignalingServer(nodeConfig);
	
	const sender = async (signal, signal_id) => {
		if(typeof signal !== "object"){
			throw new Error('Non object signal');
		}
		const enc = await encrypt(JSON.stringify(signal), password);
		if(signal_id){
			node.send(enc, signal_id);
		}else{
			node.send(enc);
		}
	}
	
	node.data( async (signal,signal_id)=>{
		
		if(stopSignal){
			return;
		}
		
		const dec = JSON.parse(await decrypt(signal, password));
		if(signal_id){
			receiver(dec, signal_id);
		}else{
			receiver(dec);
		}
	})
	
	const receiver = (signal, signal_id) => {
		
		const node_id = signal.from_node_id;
		const type = signal.type;
		
		if(!connectedPeers[node_id]){
			
			if(type === 'announce'){
				
				makePeer(node_id,true);
				
			}
			
			if(type === 'signal' && signal.to_node_id && signal.to_node_id === myId){
				
				if(signal.initiator){
					makePeer(node_id,false,signal.data,signal_id);
				}else{
					if(peerPool[node_id+typePool[0]]){
						peerPool[node_id+typePool[0]].signal(signal.data);
					}
				}
				
			}
			
		}
		
	}
	
	const makePeer = (node_id,initiator = false,data,signal_id) => {
		
		let type;
		
		if(initiator){
			type = typePool[0];
		}else{
			type = typePool[1];
		}
		
		if(lockPool[node_id+type]){
			return;
		}else{
			lockPool[node_id+type] = true;
			setTimeout(() => {
				delete lockPool[node_id+type];
			},lockPoolMs)
		}

		if(peerPool[node_id+type]) {
			peerPool[node_id+type].destroy();
			delete peerPool[node_id+type];
		}
				
		peerPool[node_id+type] = new Peer({
			initiator,
			trickle : false
		});
		
		if(data){
			peerPool[node_id+type].signal(data);
		}	
		
		peerPool[node_id+type].on('signal', data => {
			const announce = {
				type : 'signal',
				from_node_id : myId,
				to_node_id : node_id,
				data,
				initiator
			}
			if(signal_id){
				sender(announce,signal_id);
			}else{
				sender(announce);
			}
		});
		
		peerPool[node_id+type].on('connect', () => {
			
			if(!connectedPeers[node_id]){
				connectedPeers[node_id] = type; 
				onPeerConnect(peerPool[node_id+type], node_id);			
			}
			
		});
		
		peerPool[node_id+type].on('close', () => {
			delete connectedPeers[node_id];
		});
		
	}
	
	const onDestroyPeer = () => {
		clearInterval(broadcastInterval);
		stopSignal = true;
	}	
	
	const announce = {
		type : 'announce',
		from_node_id : myId
	}

	sender(announce);

	const broadcastInterval = setInterval(()=>{
		//broadcast self
		sender(announce);
	},broadcastMs);	
	
	setInterval(()=>{
		//clean unused pool
		Object.keys(peerPool).forEach((pool) => {
			let poolstatus = false;
			Object.entries(connectedPeers).forEach(([key,val]) => {
				if(pool.includes(key)){
					poolstatus = true;
				}
			});
			if(!poolstatus){
				peerPool[pool].destroy();
				delete peerPool[pool];
			}
		});
	},cleanPoolMs);	
	
	return createRoom(
		myId,
		f => (onPeerConnect = f),
		onDestroyPeer
	);
	
}

const createRoom = (myId,onNewPeer, onDestroyPeer) => {
	
	const peerPool = {};
	let onPeerConnect = ()=>{};
	let onPeerDisconnect = ()=>{};
	let onPeerStream = ()=>{};
	let onPeerTrack = ()=>{};
	let onPeerData = ()=>{};
	
	onNewPeer((peer,peer_id) => {
		if(peerPool[peer_id]){
			return;
		}
		
		peerPool[peer_id] = peer;
		
		peer.on('close', () => {
			delete peerPool[peer_id];
			onPeerDisconnect(peer_id);
		});
		
		peer.on('stream', (stream) => {
			onPeerStream(peer_id,stream);
		});
		
		peer.on('track', (track, stream) => {
			onPeerTrack(peer_id,track, stream);
		});
		
		peer.on('data', (data) => {
			onPeerData(peer_id,data);
		});
		
		onPeerConnect(peer_id);
	});
	
	return {
		
		getPeerId: () => myId,
		
		getPeers: () => Object.keys(peerPool),
		
		destroyPeer: () => {
			Object.entries(peerPool).forEach(([peer_id,peer]) => {
				onDestroyPeer();
				peer.destroy();
				delete peerPool[peer_id];
			});
		},
		
		addPeerStream: (peer_id,stream) => {
			peerPool[peer_id].addStream(stream);
		},
		
		removePeerStream: (peer_id,stream) => {
			peerPool[peer_id].removeStream(stream);
		},
		
		addPeerTrack: (peer_id,track,stream) => {
			peerPool[peer_id].addTrack(track,stream);
		},
		
		removePeerTrack: (peer_id,track,stream) => {
			peerPool[peer_id].removeTrack(track,stream);
		},
		
		replacePeerTrack: (peer_id,old_track,new_track,stream) => {
			peerPool[peer_id].replaceTrack(old_track,new_track,stream);
		},
		
		sendPeerData: (peer_id,data) => {
			peerPool[peer_id].send(data);
		},
		
		onPeerConnect: f => (onPeerConnect = f),
		
		onPeerDisconnect: f => (onPeerDisconnect = f),
		
		onPeerStream: f => (onPeerStream = f),
		
		onPeerTrack: f => (onPeerTrack = f),
		
		onPeerData: f => (onPeerData = f)
		
	};
	
}

const getKey = async (customKey) => {
	const enc = new TextEncoder();
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		enc.encode(customKey.padEnd(32, "0").slice(0, 32)),
		{ name: "PBKDF2" },
		false,
		["deriveKey"]
	);
	
	return crypto.subtle.deriveKey(
		{ name: "PBKDF2", salt: enc.encode("fixed-salt"), iterations: 100000, hash: "SHA-256"},
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt","decrypt"]
	);
}

const encrypt = async (text, customKey) => {
	const enc = new TextEncoder();
	const key = await getKey(customKey);
	const iv = crypto.getRandomValues(new Uint8Array(12));
	
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv },
		key,
		enc.encode(text)
	);
	
	const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
	combined.set(iv, 0);
	combined.set(new Uint8Array(encrypted), iv.byteLength);
	
	return Array.from(combined).map(b => b.toString(16).padStart(2, "0")).join("");
}

const decrypt = async (hexString, customKey) => {
	const key = await getKey(customKey);
	
	const combined = new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
	const iv = combined.slice(0, 12);
	const ciphertext = combined.slice(12);
	
	const decrypted = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: iv },
		key,
		ciphertext
	);
	
	return new TextDecoder().decode(decrypted);
}

export {createPeer};

export default createPeer;

