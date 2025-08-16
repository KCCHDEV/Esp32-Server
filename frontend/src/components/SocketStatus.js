import React from 'react';
import { useSocket } from '../contexts/SocketContext';

const SocketStatus = () => {
  const { isConnected, isRetrying, connectionAttempts, maxRetries } = useSocket();
  
  // Don't show anything if sockets are disabled
  if (process.env.REACT_APP_ENABLE_SOCKET !== 'true') {
    return null;
  }

  const getStatusColor = () => {
    if (isConnected) return '#4CAF50'; // Green
    if (isRetrying) return '#FF9800'; // Orange
    return '#f44336'; // Red
  };

  const getStatusText = () => {
    if (isConnected) return 'Connected';
    if (isRetrying) return `Reconnecting... (${connectionAttempts}/${maxRetries})`;
    if (connectionAttempts >= maxRetries) return 'Connection Failed';
    return 'Disconnected';
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      fontSize: '12px',
      fontFamily: 'monospace',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: getStatusColor(),
        animation: isRetrying ? 'pulse 1s infinite' : 'none'
      }} />
      <span>WebSocket: {getStatusText()}</span>
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default SocketStatus;