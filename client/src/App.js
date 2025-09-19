
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported by browser');
      setStatus('unsupported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const timestamp = position.timestamp;
        console.log('Geolocation granted:', { latitude, longitude, accuracy, timestamp });
        try {
          const response = await axios.post('https://gps-tracker-i0li.onrender.com/api/location', {
            latitude,
            longitude,
            accuracy,
            timestamp
          });
          console.log('Location sent to backend:', response.data);
          setStatus('granted');
        } catch (err) {
          console.error('Failed to send location:', err);
          setError('Failed to send location.');
          setStatus('error');
        }
      },
      (err) => {
        console.error('Geolocation denied:', err);
        setStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  if (status === 'pending') return <div>Requesting location...</div>;
  if (status === 'unsupported') return <div>Geolocation is not supported by your browser.</div>;
  if (status === 'denied') return <div>Location required</div>;
  if (status === 'error') return <div>{error}</div>;
  if (status === 'granted') return (
    <div>
      <h2>Thank you! Location received.</h2>
      <img src="https://placekitten.com/400/300" alt="Location granted" style={{marginTop: 20}} />
    </div>
  );
  return null;
}

export default App;
