import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import {openUserStream, openDisplayStream} from "../MediaHandler"
import Pusher from 'pusher-js';
import Peer from 'simple-peer';

const APP_KEY = '343b495272969a826752';

function App() {

    const [anwserID, setAnwserID] = useState();
    const [users, setUsers] = useState(window.user);
    const [stream, setStream] = useState();
    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    var [channel, setChannel] = useState();
    var [pusher, setPusher] = useState();
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState("");
    const [callerSignal, setCallerSignal] = useState();
    const [hasSlideShow, setHasSlideShow] = useState(false);
    const [callAccepted, setCallAccepted] = useState(false);
    const [peerCaller,setPeerCaller] = useState();
    const [peerAnwser,setPeerAnwser] = useState();
    const [peerSlideCaller,setPeerSlideCaller] = useState();
    const [peerSlideAnwser,setPeerSlideAnwser] = useState();
    const [endCalled, setEndCalled] = useState(false);
    const [declineCalled, setDeclineCalled] = useState(false);
    const [playRingTone, setPlayRingTone] = useState(false);
    const [btnSlideShow, setBtnSlideShow] = useState(true);
    const userVideo = useRef();
    const partnerVideo = useRef();
    const slideShowVideo = useRef();

    
    useEffect(() => {
        openUserStream().then(stream => {
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

            //Từ chối cuộc gọi
            if(signal.decline === true){
                setReceivingCall(false)
                setCallAccepted(false)
                setDeclineCalled(true)
            }
            // kết thúc cuọc gọi
            if(signal.endCall === true){
                setReceivingCall(false)
                setCallAccepted(false)
                setEndCalled(true)
                const userTracks =  userVideo.current.srcObject.getTracks()
                userTracks.forEach(track => {
                        track.stop()
                });
            }
            // có trình chiếu nội dung
            if(signal.slideshow === true){
                setBtnSlideShow(false)
                setReceivingCall(false);
                let peerSlideAnwser = new Peer({
                    initiator:false,
                    trickle: true,
                  });
                setPeerSlideAnwser(peerSlideAnwser)
                peerSlideAnwser.on('signal', data => {
                    channel.trigger(`client-signal-${signal.slideShowFrom}`, { signalData: data });
                });
                peerSlideAnwser.on('stream', stream => {
                    setHasSlideShow(true)
                    if(slideShowVideo.current){
                        slideShowVideo.current.srcObject = stream;
                    }
                });
                peerSlideAnwser.signal(signal.dataSlideShow);
                
            }
            // dừng trình chiếu nội dung
            if(signal.stopSlideShow === true){
                setBtnSlideShow(true)
                setReceivingCall(false);
                let tracks =  slideShowVideo.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                slideShowVideo.current.srcObject = null;
                setHasSlideShow(false)
                console.log(peerSlideAnwser)
                peerSlideAnwser.destroy()
            }
           
        });
       
      }, []);

   const setupPusher = () => {
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
   const callPeer = (userId) => {
    setAnwserID(userId)
    setDeclineCalled(false)
    setEndCalled(false)
    let peerCaller =  new Peer({
        initiator:true,
        trickle: false,
        stream: stream
      });
    setPeerCaller(peerCaller)
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
             // nhận tín hiêu từ chối cuọc gọi và kết thúc cuộc gọi
            if(signal.decline || signal.endCall){
                peerCaller.destroy()
                const userTracks =  userVideo.current.srcObject.getTracks()
                userTracks.forEach(track => {
                        track.stop()
                });
                userVideo.current.srcObject = undefined
            }
            else{
                setCallAccepted(true);
                setReceivingCall(false);
                // stopRingtone()
                peerCaller.signal(signal.signal);
            }
            
        });
        userVideo.current.play()
        peerCaller.on('close', () =>{
            peerCaller.destroy();
        })
       
    
    }
    const acceptCall = () => {
        stopRingtone()
        setReceivingCall(false)
        setCallAccepted(true);
        setDeclineCalled(false)
        setAnwserID(caller)
        setEndCalled(false)
        let peerAnwser = new Peer({
            initiator:false,
            trickle: true,
            stream: stream
          });
        setPeerAnwser(peerAnwser)
        peerAnwser.on("signal", (data) => {
            channel.trigger(`client-signal-${caller}`, { signal: data, to: caller });
        })
        peerAnwser.on("stream", stream => {
          partnerVideo.current.srcObject = stream;
        });
        channel.bind(`client-signal-${users.id}`, signal => {
           if(signal.endCall === true){
            peerAnwser.destroy()
           }
        })
        peerAnwser.signal(callerSignal);
        peerAnwser.on('close', () =>{
            peerAnwser.destroy();
        })
        userVideo.current.play()
      }

    const declineCall = () =>{
        stopRingtone()
        setReceivingCall(false)
        setCallAccepted(false)
        channel.trigger(`client-signal-${caller}`,{decline:true})
    }
    const endCall = () => {
        setReceivingCall(false)
        setCallAccepted(false)
        setEndCalled(true)
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
       if(caller === anwserID){
           peerAnwser.destroy()
       }
       else{
            peerCaller.destroy()
            
       }
       channel.trigger(`client-signal-${anwserID}`,{endCall: true})
       channel.disconnect()

    }
    const toggleCamera = () =>{
        if(video){
            setVideo(false)
            userVideo.current.srcObject.getVideoTracks()[0].enabled = false
        }
        else{
            setVideo(true)
            userVideo.current.srcObject.getVideoTracks()[0].enabled = true
        }
       
    }
    const toggleAudio =  () => {
        if(audio){
            setAudio(false)
            userVideo.current.srcObject.getAudioTracks()[0].enabled = false
        }
        else {
            setAudio(true)
            userVideo.current.srcObject.getAudioTracks()[0].enabled = true
        }
        
    }

    const startSlideShow= async() => {
        await openDisplayStream().then(async (MediaStream) => {
            setHasSlideShow(true)
            slideShowVideo.current.srcObject = MediaStream
            let peerSlideCaller =  new Peer({
                initiator:true,
                stream: MediaStream,
              });
            setPeerSlideCaller(peerSlideCaller)
            peerSlideCaller.on('signal', (data) => {
                channel.trigger(`client-signal-${anwserID}`, {
                     slideshow: true,
                     dataSlideShow: data,
                     slideShowFrom: users.id
                });
            });
            channel.bind(`client-signal-${users.id}`, (signal) => {
               if(signal.signalData){
                setReceivingCall(false)
                peerSlideCaller.signal(signal.signalData)
               }
            })
            
        })
    }
    const stopSlideShow = () => {
        let tracks =  slideShowVideo.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        slideShowVideo.current.srcObject = null;
        setHasSlideShow(false)
        channel.trigger(`client-signal-${anwserID}`,{stopSlideShow: true})
        peerSlideCaller.destroy()
        setReceivingCall(false)
    }
    let ringtone =  new Audio('http://nhacchuongvui.com/wp-content/uploads/Nhac-chuong-cuoc-goi-Facebook-Messenger-www_nhacchuongvui_com.mp3')
    const playRingtone = () =>{
            ringtone.loop = true
            ringtone.play()
    }
    const stopRingtone = () =>{
            ringtone.pause()
            ringtone.currentTime = 0
       
    }
   
    let UserVideo;
    if (stream) {
    UserVideo = (
        <video playsInline ref={userVideo}  className="my-video"/>
    );
    }
    let SlideShowVideo

    let PartnerVideo;
    let isAccept;
    if (callAccepted) {
        stopRingtone()
        isAccept = (
            <div>
            <button onClick={endCall}>endCall</button>
            <button onClick={toggleCamera}> {video === true ? "hide camera" : "show camera"}</button>
            <button onClick={toggleAudio}> {audio === true ? "mute audio" : "unmute audio"}</button>
            {btnSlideShow === true ? hasSlideShow === true ? <button onClick={stopSlideShow}> stopSlideShow</button> :  <button onClick={startSlideShow}> startSlideShow</button> :""}
            </div>
        );
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
            <button onClick={declineCall}>Decline</button>
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
            <div>{incomingCall}{isAccept}</div>
            <div>{endCalled === true ? "Cuộc gọi đã kết thúc" : ""}</div>
            <div>{declineCalled === true ? "Cuộc gọi bị đối phương từ chối :(" : ""}</div>
        </div>
    );
}
export default App;
if (document.getElementById('app')) {
    ReactDOM.render(<App />, document.getElementById('app'));
}
