import React, { useEffect, useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import {openUserStream, openDisplayStream} from "../MediaHandler"
import Peer from 'simple-peer';
import axios from 'axios';


// const APP_KEY = '343b495272969a826752';

function App() {
    const [btn,setBtn] = useState(false);
    const [allUsers,setAllUsers] = useState();
    const authuserid = window.user.id
    const [anwserID, setAnwserID] = useState();
    const [stream, setStream] = useState();
    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
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

    const [users,setUsers] = useState([]);
    const channel = window.Echo.join("video-channel");
    useEffect( () => {
        axios.get("/allUsers")
        .then((data)=>{
            setAllUsers(data.data)
        })
        getMediaHandle();
        callListeners();  
       
      }, []);

    const getUserOnlineStatus = (id) => {
        const onlineUserIndex = users.findIndex(
            (data) => data.id === id
        );
        if (onlineUserIndex < 0) {
        return "Offline";
        }
        return "Online";
    }
    const callListeners = () => {
        channel.here((users) => {
            setUsers(users)
        });
        channel.joining((user) => {
          // check user availability
          const joiningUserIndex = users.findIndex(
            (data) => data.id === user.id
          );
          if (joiningUserIndex < 0) {
                users.push(user);
          }
        });
        channel.leaving((user) => {
          const leavingUserIndex = users.findIndex(
            (data) => data.id === user.id
          );
          users.splice(leavingUserIndex, 1);
        });
        
        channel.listen("StartVideoChat", ({ data }) => {
            // listen to incomming call
          if (data.type === "incomingCall" && data.userToCall === authuserid) 
          {
            // add a new line to the sdp to take care of error
            const updatedSignal = {
              ...data.signalData,
              sdp: `${data.signalData.sdp}\n`,
            };
  
            setReceivingCall(true)
            setCaller(data.from)
            setCallerSignal(updatedSignal)
          } 
          // listen to end call
          else if(data.type === "endCall" && data.to === authuserid)
          {
                setReceivingCall(false)
                setCallAccepted(false)
                setEndCalled(true)
                const userTracks =  userVideo.current.srcObject.getTracks()
                userTracks.forEach(track => {
                        track.stop()
                });
          } 
          // listen to decline call
          else if(data.type === "declineCall" && data.to === authuserid)
          {
            setReceivingCall(false)
            setCallAccepted(false)
            setDeclineCalled(true)
            const userTracks =  userVideo.current.srcObject.getTracks()
                userTracks.forEach(track => {
                        track.stop()
            });
          }
          // listen to start slide show
          else if (data.type === "startSlideShow" && data.to === authuserid)
          {
            setBtnSlideShow(false)
            setReceivingCall(false);
            let peerSlideAnwser = new Peer({
                initiator:false,
                trickle: true,
              });
            setPeerSlideAnwser(peerSlideAnwser)
            peerSlideAnwser.on('signal', signal => {
                axios
                    .post("/video/start-slide-show", {
                        dataSlideShow: signal,
                        to: data.from,
                    })
                    .then(() => {})
                    .catch((error) => {
                        console.log(error);
                    });
            });
            peerSlideAnwser.on('stream', stream => {
                setHasSlideShow(true)
                if(slideShowVideo.current){
                    slideShowVideo.current.srcObject = stream;
                }
            });
                if (data.dataSlideShow.sdp) {
                    const updatedSignal = {
                        ...data.dataSlideShow,
                        sdp: `${data.dataSlideShow.sdp}\n`,
                      };
                    peerSlideAnwser.signal(updatedSignal);
                }
            
          }
          else if(data.type === "stopSlideShow" && data.to === authuserid)
          {
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
      }
    const getMediaHandle = () => {
        openUserStream().then(stream => {
            setStream(stream);
          if (userVideo.current) {
            userVideo.current.srcObject = stream;
          }
        })
    }
   const callPeer = async (userId) => {
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
        axios
            .post("/video/call-user", {
                user_to_call: userId,
                signal_data: data,
            })
            .then(() => {})
            .catch((error) => {
            console.log(error);
            });
        });
        peerCaller.on('stream', (stream) => {
            if (partnerVideo.current) {
                partnerVideo.current.srcObject = stream;
              }
        });
        channel.listen("StartVideoChat", ({ data }) => {
            if (data.type === "callAccepted" && data.to === authuserid) {
              if (data.signal.renegotiate) {
                console.log("renegotating");
              }
              if (data.signal.sdp) {
                setCallAccepted(true);
                setReceivingCall(false);
                const updatedSignal = {
                  ...data.signal,
                  sdp: `${data.signal.sdp}\n`,
                };
                peerCaller.signal(updatedSignal);
              }
            }
          });
        // peerCaller.on('close', () =>{
        //     peerCaller.destroy();
        // })
         userVideo.current.play()
       
    
    }
    const acceptCall = async () => {
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
            axios
                .post("/video/accept-call", {
                    signal: data,
                    to: caller,
                })
                .then(() => {})
                .catch((error) => {
                    console.log(error);
                });
        })
        peerAnwser.on("stream", stream => {
          partnerVideo.current.srcObject = stream;
        });
        peerAnwser.signal(callerSignal);
        // peerAnwser.on('close', () =>{
        //     peerAnwser.destroy();
        // })
        userVideo.current.play()
      }

    const declineCall = () =>{
        // stopRingtone()
        setReceivingCall(false)
        setCallAccepted(false)
        axios
            .post("/video/decline-call", {
                to: caller,
            })
            .then(() => {})
            .catch((error) => {
            console.log(error);
        });
        
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
    //    if(caller === anwserID){
    //        peerAnwser.destroy()
    //    }
    //    else{
    //         peerCaller.destroy()
            
    //    }
       axios
            .post("/video/end-call", {
                to: anwserID,
            })
            .then(() => {})
            .catch((error) => {
            console.log(error);
        });
    //    channel.disconnect()

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
            if(peerCaller){
                console.log("peerCaller");
                // peerCaller.streams[1] = MediaStream
                peerCaller.on('signal', (data) => {
                    console.log(data);
                    axios
                        .post("/video/start-slide-show", {
                            to: anwserID,
                            dataSlideShow: data,
                        })
                        .then(() => {})
                        .catch((error) => {
                        console.log(error);
                    });

                });
                channel.listen("StartVideoChat", ({ data }) => {
                if (data.type === "startSlideShow" && data.to === authuserid) {
                    setReceivingCall(false)
                    if (data.dataSlideShow.sdp) {
                        const updatedSignal = {
                            ...data.dataSlideShow,
                            sdp: `${data.dataSlideShow.sdp}\n`,
                          };
                          peerCaller.signal(updatedSignal);
                    }
                }
              });
            }
            else{
                console.log("peerAnwwer");
                // peerAnwser.streams[1] = MediaStream
                peerAnwser.on('signal', (data) => {
                    console.log(data);
                    axios
                        .post("/video/start-slide-show", {
                            to: anwserID,
                            dataSlideShow: data,
                        })
                        .then(() => {})
                        .catch((error) => {
                        console.log(error);
                    });

                });
                channel.listen("StartVideoChat", ({ data }) => {
                    if (data.type === "startSlideShow" && data.to === authuserid) {
                        setReceivingCall(false)
                        if (data.dataSlideShow.sdp) {
                            const updatedSignal = {
                                ...data.dataSlideShow,
                                sdp: `${data.dataSlideShow.sdp}\n`,
                              };
                              peerAnwser.signal(updatedSignal);
                        }
                    }
                  });
                
            }
            
            // let peerSlideCaller =  new Peer({
            //     initiator:true,
            //     stream: MediaStream,
            //   });
            // setPeerSlideCaller(peerSlideCaller)
            // peerSlideCaller.on('signal', (data) => {
            //     console.log(data);
            //     axios
            //         .post("/video/start-slide-show", {
            //             to: anwserID,
            //             dataSlideShow: data,
            //         })
            //         .then(() => {})
            //         .catch((error) => {
            //         console.log(error);
            //     });

            // });
            // channel.listen("StartVideoChat", ({ data }) => {
            //     if (data.type === "startSlideShow" && data.to === authuserid) {
            //         setReceivingCall(false)
            //         if (data.dataSlideShow.sdp) {
            //             const updatedSignal = {
            //                 ...data.dataSlideShow,
            //                 sdp: `${data.dataSlideShow.sdp}\n`,
            //               };
            //               peerSlideCaller.signal(updatedSignal);
            //         }
            //     }
            //   });
            
        })
    }
    const stopSlideShow = () => {
        let tracks =  slideShowVideo.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        slideShowVideo.current.srcObject = null;
        setHasSlideShow(false)
        axios
            .post("/video/stop-slide-show", {
                to: anwserID,
            })
            .then(() => {})
            .catch((error) => {
            console.log(error);
        });
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
    const listUsers = () => {
       setBtn(true);
    }
   
    return (
        <div className="App">
            <div className="video-container">
                {UserVideo}
                {PartnerVideo}
                {SlideShowVideo}
            </div>
            <div>
            {/* {[1,2,3].map((userId) => {
                return users.id !== userId ?  <button  key={userId} onClick={() => callPeer(userId)}>Call {userId}</button>: null;
            })} */}
            <button onClick={() => listUsers()}>Danh sách</button>
            {btn=== true ? allUsers.map((data)=>{
               return <button  key={data.id} onClick={() => callPeer(data.id)}>Call {data.name} {getUserOnlineStatus(data.id)}</button>
            }) : ""}
            
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
