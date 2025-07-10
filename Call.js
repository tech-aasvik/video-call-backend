<!DOCTYPE html>
<html>
<head>
  <title>Video Calling App</title>
</head>
<body>
  <h1>Video Call Page</h1>
  <p id="status">Connecting...</p>

  <!-- Socket.IO client script -->
  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>

  <!-- Apna JS code -->
  <script>
    // ✅ Replace with your backend URL
    const socket = io("http://localhost:5173/");

    socket.on("connect", () => {
      console.log("✅ Connected with ID:", socket.id);
      document.getElementById('status').innerText = "Connected to Socket.IO";
    });

    socket.on("disconnect", () => {
      document.getElementById('status').innerText = "Disconnected";
    });
  </script>
</body>
</html>
