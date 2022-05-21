import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import {openUserStream, openDisplayStream} from "../MediaHandler"
import Pusher from 'pusher-js';
import Peer from 'simple-peer';
import { VideoStreamMerger } from 'video-stream-merger';
import { has } from 'lodash';

const APP_KEY = '343b495272969a826752';

function App() {

    const [yourID, setYourID] = useState("");
    const [users, setUsers] = useState(window.user);
    const [stream, setStream] = useState();
    const [slideShow, setSlideShow] = useState();
    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    var [channel, setChannel] = useState();
    var [pusher, setPusher] = useState();
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState("");
    const [callerSignal, setCallerSignal] = useState();
    const [hasSlideShow, setHasSlideShow] = useState(false);
    const [callAccepted, setCallAccepted] = useState(false);
    const userVideo = useRef();
    const partnerVideo = useRef();
    const slideShowVideo = useRef();

    // var peerCaller = null;
    // var peerAnwser = null;
    const [play, setPlay] = useState(false);
    const [peerCaller, setPeerCaller] = useState();
    const [peerAnwser, setPeerAnwser] = useState();
    var ringtone =  new Audio('http://nhacchuongvui.com/wp-content/uploads/Nhac-chuong-cuoc-goi-Facebook-Messenger-www_nhacchuongvui_com.mp3')

    useEffect(() => {
        openUserStream().then(stream => {
            setStream(stream);
          if (userVideo.current) {
            userVideo.current.srcObject = stream;
          }
          setupPeerCaller(stream)
          setupPeerAnwser(stream)
        })
        setupPusher();
        channel.bind(`client-signal-${users.id}`, (signal) => {
            setReceivingCall(true);
            setCaller(signal.from);
            setCallerSignal(signal.signalData);
            setYourID(signal.userToCall)
            if(has(signal.data)){
                const peer = new Peer({
                    initiator:false,
                    
                  });
                peer.on('stream', stream =>{
                    setSlideShow(stream)
                    if(slideShowVideo.current){
                        slideShowVideo.current.srcObject = stream
                    }
                })
                // peer.signal(signal.data)
                // console.log(peer)
               
                // slideShowVideo.current.srcObject = signal.slideshow
            }
           
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
    function setupPeerCaller(stream){
       const peer = new Peer({
            initiator:true,
            trickle: false,
            streams: [stream],
          });
          setPeerCaller(peer)
        return peer
    }
    function setupPeerAnwser(stream){
       const  peer = new Peer({
            initiator: false,
            trickle: true,
            streams: [stream],
           
          });
           setPeerAnwser(peer)
         return peer
     }

   function callPeer(userId) {
       setupPeerCaller(stream)
      peerCaller.on('signal', (data) => {
            channel.trigger(`client-signal-${userId}`, {
                 userToCall: userId, 
                 signalData: data, 
                 from: users.id 
            });
        });
        peerCaller.on('stream', (stream) => {
            if (partnerVideo.current) {
                partnerVideo.current.srcObject = stream;
              }
        });
        channel.bind(`client-signal-${users.id}`, (signal) => {
            setCallAccepted(true);
            peerCaller.signal(signal.signal);
        });
        peerCaller.on('close', () =>{
            peerCaller.destroy();
        })
        userVideo.current.play()
       
    
    }
    function acceptCall() {
        
        setCallAccepted(true);
        setupPeerAnwser(stream)
        peerAnwser.on("signal", (data) => {
            channel.trigger(`client-signal-${caller}`, { signal: data, to: caller });
        })
        peerAnwser.on("stream", stream => {
          partnerVideo.current.srcObject = stream;
        });
        peerAnwser.signal(callerSignal);
        peerAnwser.on('close', () =>{
            peerAnwser.destroy();
        })
        userVideo.current.play()
      }

    function endCall(){
       if(!video){
        userVideo.current.srcObject.getVideoTracks()[0].enabled = video
       }
       if(!audio){
        userVideo.current.srcObject.getAudioTracks()[0].enabled = audio
       }
       const userTracks =  userVideo.current.srcObject.getTracks()
       userTracks.forEach(track => {
            track.stop()
       });
       const partnerTracks =  partnerVideo.current.srcObject.getTracks()
       partnerTracks.forEach(track => {
            track.stop()
       });
       peerCaller.destroy();
      
        channel.disconnect();

    }

    const toggleCamera = async () =>{
        await setVideo(!video)
        userVideo.current.srcObject.getVideoTracks()[0].enabled = video
        
    }
    const toggleAudio = async () => {
        await setAudio(!audio)
        userVideo.current.srcObject.getAudioTracks()[0].enabled = audio
    }

    const startSlideShow= async() => {
        var merger = new VideoStreamMerger();
        await openDisplayStream().then(async (MediaStream) => {
            setHasSlideShow(true)
            slideShowVideo.current.srcObject = MediaStream

            merger.addStream(stream)
            merger.addStream(MediaStream)
            merger.start()
        })
        const peer = new Peer({
            initiator:true,
            trickle: false,
            stream: merger.result,
            offerConstraints: {
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
              }
          });
        peer.on('signal', data => {
            channel.trigger(`client-signal-${caller}`, {data: data})
        })
    }
    function stopSlideShow(){
        let tracks =  slideShowVideo.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        slideShowVideo.current.srcObject = null;
        setHasSlideShow(false)
    }

    const playRingtone = async () =>{
         if(!callAccepted && play === false){
            await setPlay(true)
            ringtone.loop = true 
            ringtone.play()
            if(play===true){
                ringtone.pause() 
                ringtone.currentTime = 0
            }
        }
        else {
            console.log('stop')
            // ringtone.pause() 
            ringtone.currentTime = 0
        }
        
    }
    let UserVideo;
    if (stream) {
    UserVideo = (
        <video playsInline ref={userVideo}  className="my-video"/>
    );
    }
    let SlideShowVideo

    let PartnerVideo;
    if (callAccepted) {
        if(hasSlideShow){
            SlideShowVideo = (
                <video playsInline ref={slideShowVideo} autoPlay className="slide-show"/>
            )
            PartnerVideo = (
                <video playsInline ref={partnerVideo} autoPlay className="user-video" />
            );
        }
        else {
            PartnerVideo = (
                <video playsInline ref={partnerVideo} autoPlay className="full-display-user-video" />
            );
        }
    }

    let incomingCall;
    if (receivingCall) {  
        
        // playRingtone()
    incomingCall = (
        <div>
        <h1>{caller} is calling you</h1>
        <button onClick={acceptCall}>Accept</button>
        <button onClick={endCall}>endCall</button>
        <button onClick={toggleCamera}> {video === true ? "hide camera" : "show camera"}</button>
        <button onClick={toggleAudio}> {audio === true ? "mute audio" : "unmute audio"}</button>
        {hasSlideShow === true ? <button onClick={stopSlideShow}> stopSlideShow</button> :  <button onClick={startSlideShow}> startSlideShow</button> }
        </div>
    )
    }
    return (
        <div className="App">
            <div className="video-container">
                {UserVideo}
                {PartnerVideo}
                {SlideShowVideo}
            </div>
            <div>
            {[1,2,3].map((userId) => {
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
