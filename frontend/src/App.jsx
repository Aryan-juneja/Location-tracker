import { useState, useEffect, useRef } from 'react';
import './App.css';
import { io } from 'socket.io-client';
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
  const [initialCenter, setInitialCenter] = useState([28.6139, 77.2090]); // Delhi
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [locationPermission, setLocationPermission] = useState('Unknown');
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io("https://location-tracker-2-ouqp.onrender.com", {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    socketRef.current.on("connect", () => {
      console.log("✅ Connected:", socketRef.current.id);
      setConnectionStatus('Connected');
    });

    socketRef.current.on("disconnect", () => {
      console.log("❌ Disconnected");
      setConnectionStatus('Disconnected');
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("🚫 Connection error:", error);
      setConnectionStatus('Connection Error');
    });

    socketRef.current.on("all-polylines", (data) => {
      console.log("📡 Received polylines:", data);
      const updated = {};
      for (const [socketId, locs] of Object.entries(data)) {
        if (locs.length > 0) {
          updated[socketId] = locs.map(loc => ({
            lat: loc.latitude,
            lng: loc.longitude,
          }));
        }
      }
      setPolylines(updated);
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocationPermission('Granted');
          const loc = { lat: latitude, lng: longitude };
          setInitialCenter([latitude, longitude]);
          setUserLocation(loc);

          // Initial emit
          if (socketRef.current?.connected) {
            socketRef.current.emit("update-location", loc);
          }
        },
        (error) => {
          console.error("❗ Initial geolocation error:", error);
          setLocationPermission('Denied');
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const newLoc = { lat: latitude, lng: longitude };
          setUserLocation(newLoc);

          if (socketRef.current?.connected && accuracy < 100) {
            socketRef.current.emit("update-location", newLoc);
            console.log("🛰️ Emitted location:", newLoc);
          }
        },
        (error) => {
          console.error("📍 Geolocation watch error:", error);
          setLocationPermission('Error');
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
        socketRef.current?.disconnect();
      };
    } else {
      setLocationPermission('Not Supported');
    }
  }, []);

  const renderMapData = () => {
    return Object.entries(polylines).flatMap(([id, coords], index) => {
      if (!coords || coords.length === 0) return [];

      const positions = coords.map(loc => [loc.lat, loc.lng]);
      const lastPos = positions[positions.length - 1];
      const colors = ['blue', 'red', 'green', 'purple', 'orange', 'yellow'];
      const color = colors[index % colors.length];

      return [
        <Polyline
          key={`polyline-${id}`}
          positions={positions}
          color={color}
          weight={4}
          opacity={0.7}
        />,
        <Marker key={`marker-${id}`} position={lastPos}>
          <Popup>
            <div>
              <strong>Driver {id.slice(0, 6)}</strong><br />
              Points: {positions.length}<br />
              Last update: {new Date().toLocaleTimeString()}
            </div>
          </Popup>
        </Marker>
      ];
    });
  };

  return (
    <div className="App">
      <h1>🚛 Real-Time Driver Tracker</h1>

      <div style={{
        padding: '10px',
        backgroundColor: '#f0f0f0',
        marginBottom: '10px',
        borderRadius: '5px'
      }}>
        <div>Connection: <strong style={{ color: connectionStatus === 'Connected' ? 'green' : 'red' }}>{connectionStatus}</strong></div>
        <div>Location Permission: <strong style={{ color: locationPermission === 'Granted' ? 'green' : 'red' }}>{locationPermission}</strong></div>
        {userLocation && (
          <div>Your Location: {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}</div>
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
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapCenter center={userLocation && [userLocation.lat, userLocation.lng]} />
        {renderMapData()}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]}>
            <Popup>
              <strong>Your Current Location</strong><br />
              Lat: {userLocation.lat.toFixed(6)}<br />
              Lng: {userLocation.lng.toFixed(6)}
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div style={{
        marginTop: '10px',
        fontSize: '12px',
        color: '#666',
        padding: '10px',
        backgroundColor: '#f9f9f9'
      }}>
        <strong>Debug Info:</strong><br />
        Socket ID: {socketRef.current?.id || 'Not connected'}<br />
        Polylines: {JSON.stringify(Object.keys(polylines))}<br />
        User Agent: {navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'}
      </div>
    </div>
  );
}

export default App;
