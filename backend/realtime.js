import { Server } from 'socket.io';

let ioInstance = null;
let failedLoginCount = 0;
let suspiciousActivityCount = 0;

export function initIO(server) {
  if (ioInstance) return ioInstance;
  ioInstance = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });

  ioInstance.on('connection', (socket) => {
    // Basic room/join support can be added later if needed
    socket.on('disconnect', () => {});
  });

  // Emit security metrics periodically
  setInterval(() => {
    try {
      const activeSessions = ioInstance.engine ? ioInstance.engine.clientsCount : 0;
      ioInstance.emit('security:metrics', {
        activeSessions,
        failedLogins: failedLoginCount,
        suspiciousActivity: suspiciousActivityCount,
        anchoredCerts: 0,
        networkStatus: 'Connected',
        lastSync: new Date().toISOString()
      });
    } catch {}
  }, 10000);

  return ioInstance;
}

export function getIO() {
  return ioInstance;
}

export function recordFailedLogin() {
  failedLoginCount += 1;
  const io = getIO();
  if (io) {
    io.emit('security:failedLogin', {
      at: new Date().toISOString()
    });
  }
}


