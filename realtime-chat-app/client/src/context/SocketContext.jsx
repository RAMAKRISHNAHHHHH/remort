// client/src/context/SocketContext.jsx
// Gives every component easy access to the shared Socket.IO instance.

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getSocket, connectSocket } from '../services/socket';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(getSocket());

  useEffect(() => {
    if (token) {
      const s = connectSocket(token);
      setSocket(s);
    } else {
      setSocket(null);
    }
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
