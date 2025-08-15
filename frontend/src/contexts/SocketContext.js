import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef(null);
  const maxRetries = 3;
  const baseRetryDelay = 2000; // 2 seconds

  useEffect(() => {
    // Check if we're in a serverless environment (Netlify)
    const isNetlify = window.location.hostname.includes('netlify.app') || 
                     window.location.hostname.includes('netlify.com');
    
    // Check if sockets should be enabled
    const shouldConnect = process.env.REACT_APP_ENABLE_SOCKET === 'true' ||
                         (process.env.NODE_ENV === 'development' && !isNetlify);
    
    console.log('Socket configuration:', {
      environment: process.env.NODE_ENV,
      isNetlify,
      shouldConnect,
      enableSocket: process.env.REACT_APP_ENABLE_SOCKET,
      hostname: window.location.hostname
    });

    // Don't connect to sockets in serverless/production environment unless explicitly enabled
    if (!shouldConnect) {
      console.log('Socket.IO disabled for this environment');
      return;
    }
    
    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
    console.log('Attempting to connect to:', socketUrl);
    
    const connectSocket = () => {
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        timeout: 5000, // 5 second timeout
        forceNew: true,
      });

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        setConnectionAttempts(0);
        setIsRetrying(false);
        
        // Clear any pending retry
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        
        // Don't retry if disconnection was intentional
        if (reason === 'io client disconnect') {
          return;
        }
        
        // Attempt reconnection with exponential backoff
        handleReconnection();
      });

      newSocket.on('connect_error', (error) => {
        console.log('Socket connection error:', error.message);
        setIsConnected(false);
        handleReconnection();
      });

      return newSocket;
    };

    const handleReconnection = () => {
      if (connectionAttempts >= maxRetries) {
        console.log('Max reconnection attempts reached. Stopping reconnection.');
        setIsRetrying(false);
        return;
      }

      if (!isRetrying) {
        setIsRetrying(true);
        const delay = baseRetryDelay * Math.pow(2, connectionAttempts); // Exponential backoff
        
        console.log(`Retrying connection in ${delay}ms (attempt ${connectionAttempts + 1}/${maxRetries})`);
        
        retryTimeoutRef.current = setTimeout(() => {
          setConnectionAttempts(prev => prev + 1);
          const newSocket = connectSocket();
          setSocket(newSocket);
        }, delay);
      }
    };

    // Initial connection
    const initialSocket = connectSocket();
    setSocket(initialSocket);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (initialSocket) {
        initialSocket.close();
      }
    };
  }, [connectionAttempts, isRetrying]);

  const value = {
    socket,
    isConnected,
    isRetrying,
    connectionAttempts,
    maxRetries,
    emit: (event, data) => {
      if (socket && isConnected) {
        socket.emit(event, data);
        return true;
      }
      console.warn('Cannot emit event: Socket not connected');
      return false;
    },
    on: (event, callback) => {
      if (socket) {
        socket.on(event, callback);
        return () => socket.off(event, callback);
      }
      return () => {};
    },
    off: (event, callback) => {
      if (socket) {
        socket.off(event, callback);
      }
    },
    reconnect: () => {
      if (socket) {
        socket.disconnect();
        socket.connect();
      }
    },
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};