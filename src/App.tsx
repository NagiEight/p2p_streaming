// App.tsx
import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

const App: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const [isBroadcaster, setIsBroadcaster] = useState(false);

  useEffect(() => {
    peerConnection.current = new RTCPeerConnection();

    // Handle remote stream
    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("candidate", event.candidate);
      }
    };

    // Socket listeners
    socket.on("offer", async (offer) => {
      if (!isBroadcaster) {
        await peerConnection.current?.setRemoteDescription(
          new RTCSessionDescription(offer)
        );
        const answer = await peerConnection.current?.createAnswer();
        await peerConnection.current?.setLocalDescription(answer!);
        socket.emit("answer", answer);
      }
    });

    socket.on("answer", async (answer) => {
      if (isBroadcaster) {
        await peerConnection.current?.setRemoteDescription(
          new RTCSessionDescription(answer)
        );
      }
    });

    socket.on("candidate", async (candidate) => {
      try {
        await peerConnection.current?.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (err) {
        console.error("Error adding candidate", err);
      }
    });
  }, [isBroadcaster]);

  const startBroadcast = async () => {
    setIsBroadcaster(true);

    if (localVideoRef.current) {
      // Load and play your media file
      localVideoRef.current.src = "/movie.mp4"; // put movie.mp4 in public/ folder
      await localVideoRef.current.play();

      // Capture the video element as a MediaStream
      const stream = (localVideoRef.current as any).captureStream();

      stream.getTracks().forEach((track: MediaStreamTrack) => {
        peerConnection.current?.addTrack(track, stream);
      });

      const offer = await peerConnection.current?.createOffer();
      await peerConnection.current?.setLocalDescription(offer!);
      socket.emit("offer", offer);
    }
  };

  return (
    <div>
      <h1>WebRTC Media File Streaming</h1>
      <button onClick={startBroadcast}>Start Broadcast</button>
      <div style={{ display: "flex", gap: "20px" }}>
        {/* Local video plays the file */}
        <video ref={localVideoRef} controls style={{ width: "300px" }} />
        {/* Remote video shows the WebRTC stream */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          style={{ width: "300px" }}
        />
      </div>
    </div>
  );
};

export default App;
