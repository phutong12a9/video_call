import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import MediaHandler from '../MediaHandler';
import Pusher from 'pusher-js';
import Peer from 'simple-peer';

const APP_KEY = '343b495272969a826752';

export default class App extends Component {
    constructor() {
        super();

        this.state = {
            hasMedia: false,
            otherUserId: null
        };

        this.isFocusMyself = true,
        this.callPlaced = false,
        this.callPartner = null,
        this.mutedAudio = false,
        this.mutedVideo = false,
        this.videoCallParams = {
          users: [],
          stream: null,
          receivingCall: false,
          caller: null,
          callerSignal: null,
          callAccepted: false,
          channel: null,
          peer1: null,
          peer2: null,
        }
        this.user = window.user;
        this.user.stream = null;
        this.peers = {};

        this.mediaHandler = new MediaHandler();
        this.setupPusher();

        this.callTo = this.callTo.bind(this);
        this.setupPusher = this.setupPusher.bind(this);
        this.startPeer = this.startPeer.bind(this);
    }

    componentDidMount() {
        this.mediaHandler.getPermissions()
            .then((stream) => {
                this.setState({hasMedia: true});
                this.user.stream = stream;

                try {
                    this.myVideo.srcObject = stream;
                } catch (e) {
                    this.myVideo.src = URL.createObjectURL(stream);
                }

                // this.myVideo.play();
            })
    }

    setupPusher() {
        // Pusher.logToConsole = true;
        this.pusher = new Pusher(APP_KEY, {
            authEndpoint: 'http://127.0.0.1:8000/pusher/auth',
            cluster: 'ap1',
            auth: {
                params: this.user.id,
                headers: {
                    'X-CSRF-Token': window.csrfToken
                }
            }
        });

        this.channel = this.pusher.subscribe('presence-video-channel');

        this.channel.bind(`client-signal-${this.user.id}`, (signal) => {
            let peer = this.peers[signal.userId];

            // if peer is not already exists, we got an incoming call
            if(peer === undefined) {
                this.setState({otherUserId: signal.userId});
                peer = this.startPeer(signal.userId, false);
            }

            peer.signal(signal.data);
        });
    }

    startPeer(userId, initiator = true) {
        const peer = new Peer({
            initiator,
            stream: this.user.stream,
            trickle: false
        });

        peer.on('signal', (data) => {
            this.channel.trigger(`client-signal-${userId}`, {
                type: 'signal',
                userId: this.user.id,
                data: data
            });
        });

        peer.on('stream', (stream) => {
            try {
                this.userVideo.srcObject = stream;
            } catch (e) {
                this.userVideo.src = URL.createObjectURL(stream);
            }

            this.userVideo.play();
        });

        peer.on('close', () => {
            let peer = this.peers[userId];
            if(peer !== undefined) {
                peer.destroy();
            }

            this.peers[userId] = undefined;
        });
        this.myVideo.play();
        return peer;
    }

    closePeer(userId){
      var peer1 = new Peer({
                initiator:true,
                stream: this.user.stream,
                trickle: false
            });
      var peer2 = new Peer()
      
      peer1.on('signal', data => {
        // when peer1 has signaling data, give it to peer2 somehow
        peer2.signal(data)
      })
      
      peer2.on('signal', data => {
        // when peer2 has signaling data, give it to peer1 somehow
        peer1.signal(data)
      })
      
      peer1.on('connect', () => {
        // wait for 'connect' event before using the data channel
        peer1.send('hey peer2, how is it going?')
      })
      
      peer2.on('data', data => {
        // got a data channel message
        console.log('got a message from peer1: ' + data)
      })
      
     
    }

    callTo(userId) {
        this.peers[userId] = this.startPeer(userId);
    }


    render() {
        return (
            <div className="App">
                {[1,2].map((userId) => {
                    return this.user.id !== userId ? <button key={userId} onClick={() => this.callTo(userId)}>Call {userId}</button>: null;
                })}
                {[1,2].map((userId) => {
                    return this.user.id !== userId ? <button key={userId} onClick={() => this.closePeer(userId)} >Close {userId}</button> : null;
                })}
                <div className="video-container">
                    <video className="my-video" ref={(ref) => {this.myVideo = ref;}}></video>
                    <video className="user-video" ref={(ref) => {this.userVideo = ref;}}></video>
                </div>
            </div>
        );
    }
}

if (document.getElementById('app')) {
    ReactDOM.render(<App />, document.getElementById('app'));
}
