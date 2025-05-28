import { useState, useEffect, useRef } from 'react';
import './App.css';
import { io } from "socket.io-client";
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';

function MapCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

function App() {
  const [polylines, setPolylines] = useState({});
  const [userLocation, setUserLocation] = useState(null);
  const [initialCenter, setInitialCenter] = useState([28.6139, 77.2090]); // Default to Delhi
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [locationPermission, setLocationPermission] = useState('Unknown');
  const socketRef = useRef(null);

  useEffect(() => {
    // Use your actual server URL - replace with your ngrok/localtunnel URL
    socketRef.current = io("https://beele.vercel.app", {
      transports: ['websocket', 'polling'], // Enable both transports for better mobile compatibility
      timeout: 20000,
      forceNew: true
    });

    socketRef.current.on("connect", () => {
      console.log("Connected to server:", socketRef.current.id);
      setConnectionStatus('Connected');
    });

    socketRef.current.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnectionStatus('Disconnected');
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setConnectionStatus('Connection Error');
    });

    // Request location permission first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log("Initial location:", latitude, longitude);
          setLocationPermission('Granted');
          setInitialCenter([latitude, longitude]);
          setUserLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.error("Initial geolocation error:", error);
          setLocationPermission('Denied');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );

      // Start watching position after initial position
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const newLocation = { lat: latitude, lng: longitude };

          console.log(`Location update: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);

          // Only send updates if connected and accuracy is reasonable
          if (socketRef.current?.connected && accuracy < 100) {
            socketRef.current.emit("update-location", {
              lat: latitude,
              lng: longitude,
            });
          }

          setUserLocation(newLocation);
        },
        (error) => {
          console.error("Geolocation watch error:", error);
          setLocationPermission('Error');
        },
        { 
          enableHighAccuracy: true, 
          maximumAge: 5000, // Accept cached location up to 5 seconds old
          timeout: 15000 // Wait up to 15 seconds for location
        }
      );

      // Cleanup function
      return () => {
        navigator.geolocation.clearWatch(watchId);
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    } else {
      setLocationPermission('Not Supported');
    }

    socketRef.current.on('all-polylines', (data) => {
      console.log("Received polylines data:", data);
      const updated = {};
      for (const [socketId, locs] of Object.entries(data)) {
        if (locs && locs.length > 0) {
          updated[socketId] = locs.map(loc => ({
            lat: loc.latitude,
            lng: loc.longitude,
          }));
        }
      }
      setPolylines(updated);
    });

  }, []);

  const renderPolylines = () => {
    return Object.entries(polylines).map(([id, coords], index) => {
      if (!coords || coords.length === 0) return null;
      
      const positions = coords.map(loc => [loc.lat, loc.lng]);
      const lastPos = positions[positions.length - 1];
      
      // Different colors for different clients
      const colors = ['blue', 'red', 'green', 'purple', 'orange', 'yellow'];
      const color = colors[index % colors.length];

      return (
        <div key={id}>
          <Polyline 
            positions={positions} 
            color={color}
            weight={4}
            opacity={0.7}
          />
          {lastPos && (
            <Marker position={lastPos}>
              <Popup>
                <div>
                  <strong>Driver {id.slice(0, 8)}</strong><br/>
                  Points: {positions.length}<br/>
                  Last update: {new Date().toLocaleTimeString()}
                </div>
              </Popup>
            </Marker>
          )}
        </div>
      );
    });
  };

  return (
    <div className="App">
      <h1>Real-Time Driver Tracker</h1>
      
      {/* Status indicators */}
      <div style={{ 
        padding: '10px', 
        backgroundColor: '#f0f0f0', 
        marginBottom: '10px',
        borderRadius: '5px'
      }}>
        <div>Connection: <span style={{ 
          color: connectionStatus === 'Connected' ? 'green' : 'red',
          fontWeight: 'bold'
        }}>{connectionStatus}</span></div>
        
        <div>Location Permission: <span style={{ 
          color: locationPermission === 'Granted' ? 'green' : 'red',
          fontWeight: 'bold'
        }}>{locationPermission}</span></div>
        
        {userLocation && (
          <div>Current Location: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}</div>
        )}
        
        <div>Active Routes: {Object.keys(polylines).length}</div>
      </div>

      <MapContainer 
        center={initialCenter} 
        zoom={15} 
        style={{ height: "70vh", width: "100%" }}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapCenter center={userLocation && [userLocation.lat, userLocation.lng]} />
        {renderPolylines()}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]}>
            <Popup>
              <div>
                <strong>Your Current Location</strong><br/>
                Lat: {userLocation.lat.toFixed(6)}<br/>
                Lng: {userLocation.lng.toFixed(6)}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      {/* Debug info */}
      <div style={{ 
        marginTop: '10px', 
        fontSize: '12px', 
        color: '#666',
        padding: '10px',
        backgroundColor: '#f9f9f9'
      }}>
        <strong>Debug Info:</strong><br/>
        Socket ID: {socketRef.current?.id || 'Not connected'}<br/>
        Polylines: {JSON.stringify(Object.keys(polylines))}<br/>
        User Agent: {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}
      </div>
    </div>
  );
}

export default App;