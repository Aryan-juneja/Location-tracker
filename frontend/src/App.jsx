import { useState ,useEffect} from 'react'
import './App.css'
import { io } from "socket.io-client";
import 'leaflet/dist/leaflet.css';

function App() {
  const [mssg, setMssg] = useState("");

  useEffect(()=>{
    socket.on("greetResponse",(data)=>{
      console.log("Received message from server:", data);
      setMssg(data.message);
    })
  })
  const socket = io("http://localhost:3000");
  socket.on("connect", () => {
    console.log("Connected to server");
  });
  return (
    <>
      <div className="App">
        Hello
        <button onClick={()=>{
          socket.emit("greet",{"message": "Hello from client!"});
        }}  >Send Message</button>
        <p>Message from server: {mssg}</p>
       </div>        
    </>
  )
}

export default App
