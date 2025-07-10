import React, { useEffect } from 'react';
import { io } from 'socket.io-client';

// ✅ Yahan apna backend Render URL daalo
const socket = io("https://your-backend-url.onrender.com");

function Call() {
  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Connected to socket with ID:", socket.id);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <p>Socket connection active.</p>
    </div>
  );
}

export default Call;
