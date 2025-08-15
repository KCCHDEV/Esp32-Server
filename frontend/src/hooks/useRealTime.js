import { useSocket } from '../contexts/SocketContext';

/**
 * Custom hook for components that need real-time functionality
 * Provides a way to gracefully handle when WebSocket is not available
 */
export const useRealTime = () => {
  const socketContext = useSocket();
  
  const isRealTimeEnabled = process.env.REACT_APP_ENABLE_SOCKET === 'true';
  const isRealTimeAvailable = isRealTimeEnabled && socketContext.isConnected;
  
  return {
    // Whether real-time features are enabled in configuration
    isEnabled: isRealTimeEnabled,
    
    // Whether real-time connection is actually available
    isAvailable: isRealTimeAvailable,
    
    // Connection status
    isConnected: socketContext.isConnected,
    isRetrying: socketContext.isRetrying,
    
    // Socket methods (only work when connected)
    emit: socketContext.emit,
    on: socketContext.on,
    off: socketContext.off,
    reconnect: socketContext.reconnect,
    
    // Helper to emit events with fallback handling
    emitWithFallback: (event, data, fallback) => {
      if (isRealTimeAvailable) {
        return socketContext.emit(event, data);
      } else if (fallback) {
        console.log(`Real-time not available, using fallback for ${event}`);
        return fallback(data);
      }
      return false;
    },
    
    // Helper to show real-time status to users
    getStatusMessage: () => {
      if (!isRealTimeEnabled) return 'Real-time features disabled';
      if (socketContext.isConnected) return 'Real-time connected';
      if (socketContext.isRetrying) return 'Connecting...';
      return 'Real-time unavailable';
    }
  };
};