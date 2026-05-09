/**
 * Call State Manager
 * Tracks all active and recent calls in memory
 */

// Map<callId, CallState>
const activeCalls = new Map();

/**
 * CallState shape:
 * {
 *   id: string,
 *   clientData: Object,
 *   phase: 'DIALING' | 'AMD' | 'HUNTING' | 'CONNECTED' | 'MISSED' | 'DONE',
 *   huntIndex: number,           // which agent we're currently trying (0-based)
 *   connectedAt: number | null,  // timestamp when call connected
 *   agentConnected: string,      // agent name who picked up
 *   outcome: string,
 *   startedAt: number,
 * }
 */

function createCall(id, clientData) {
  const state = {
    id,
    clientData,
    phase: 'DIALING',
    huntIndex: 0,
    connectedAt: null,
    agentConnected: null,
    outcome: null,
    startedAt: Date.now(),
  };
  activeCalls.set(id, state);
  return state;
}

function getCall(id) {
  return activeCalls.get(id);
}

function updateCall(id, updates) {
  const call = activeCalls.get(id);
  if (!call) return null;
  const updated = { ...call, ...updates };
  activeCalls.set(id, updated);
  return updated;
}

function endCall(id) {
  const call = activeCalls.get(id);
  if (call) {
    activeCalls.delete(id);
  }
  return call;
}

function getAllActive() {
  return Array.from(activeCalls.values());
}

module.exports = {
  createCall,
  getCall,
  updateCall,
  endCall,
  getAllActive,
};
