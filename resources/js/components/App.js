import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import MediaHandler from '../MediaHandler';
import Pusher from 'pusher-js';
import Peer from 'simple-peer';

const APP_KEY = '343b495272969a826752';

function App() {

    const [yourID, setYourID] = useState("");
    const [users, setUsers] = useState(window.user);
    const [stream, setStream] = useState();
    var [channel, setChannel] = useState();
    var [pusher, setPusher] = useState();
    var [peer1, setPeer1] = useState({});
    var [peer2, setPeer2] = useState({});
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState("");
    const [callerSignal, setCallerSignal] = useState();
    const [callAccepted, setCallAccepted] = useState(false);
    
    const userVideo = useRef();
    const partnerVideo = useRef();

    useEffect(() => {
        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
          setStream(stream);
          if (userVideo.current) {
            userVideo.current.srcObject = stream;
          }
        })
        setupPusher();
        channel.bind(`client-signal-${users.id}`, (signal) => {
            setReceivingCall(true);
            setCaller(signal.from);
            setCallerSignal(signal.signalData);
            setYourID(signal.from)
        });
      }, []);

   function setupPusher() {
        // Pusher.logToConsole = true;
        pusher = new Pusher(APP_KEY, {
            authEndpoint: 'http://127.0.0.1:8000/pusher/auth',
            cluster: 'ap1',
            auth: {
                params: users.id,
                headers: {
                    'X-CSRF-Token': window.csrfToken
                }
            }
        });
        setPusher(pusher)
        channel = pusher.subscribe('presence-video-channel');
        setChannel(channel)
        
    }

   function callPeer(userId) {
    const peer = new Peer({
        initiator:true,
        trickle: false,
        stream: stream,
      });
        peer.on('signal', (data) => {
            channel.trigger(`client-signal-${userId}`, {
                 userToCall: userId, 
                 signalData: data, 
                 from: users.id 
            });
        });
        peer.on('stream', (stream) => {
            if (partnerVideo.current) {
                partnerVideo.current.srcObject = stream;
              }
        });
        channel.bind(`client-signal-${users.id}`, (signal) => {
            setCallAccepted(true);
            peer.signal(signal.signal);
        });
        peer.on('close', () => {
            console.log('da dong')
            setCallAccepted(false)
            peer.destroy();
           
        });
        userVideo.current.play()
    setPeer1(peer)
    console.log(peer1)
    }
    function acceptCall() {
        setCallAccepted(true);
        peer2 = new Peer({
          initiator: false,
          trickle: true,
          stream: stream,
        });
        peer2.on("signal", (data) => {
            channel.trigger(`client-signal-${yourID}`, { signal: data, to: caller });
        })
    
        peer2.on("stream", stream => {
          partnerVideo.current.srcObject = stream;
        });
        peer2.signal(callerSignal);
        userVideo.current.play()
        console.log(setPeer2(peer2))
        setPeer2(peer2)
      }

    function endCall(){
        console.log(peer2)
        // peer1.destroy()
        // peer2.destroy()
    }
    let UserVideo;
    if (stream) {
    UserVideo = (
        <video playsInline muted ref={userVideo}  className="my-video"/>
    );
    }

    let PartnerVideo;
    if (callAccepted) {
    PartnerVideo = (
        <video playsInline ref={partnerVideo} autoPlay className="user-video" />
    );
    }

    let incomingCall;
    if (receivingCall) {
    incomingCall = (
        <div>
        <h1>{caller} is calling you</h1>
        <button onClick={acceptCall}>Accept</button>
        <button onClick={endCall}>endCall</button>
        </div>
    )
    }
    return (
        <div className="App">
            <div className="video-container">
                {UserVideo}
                {PartnerVideo}
               
            </div>
            <div>
            {[1,2].map((userId) => {
                return users.id !== userId ?  <button  key={userId} onClick={() => callPeer(userId)}>Call {userId}</button>: null;
            })}
            </div>
            <div>{incomingCall}</div>
        </div>
    );
}
export default App;
if (document.getElementById('app')) {
    ReactDOM.render(<App />, document.getElementById('app'));
}
