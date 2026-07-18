// ═══════════════════════════════════════════════════════════════════════════════
// In-Process Event Bus
// Replaces PocketBase's hook system for cross-service communication.
// Events are synchronous initially; queue-ready for horizontal scaling later.
// ═══════════════════════════════════════════════════════════════════════════════

import { EventEmitter } from 'node:events';
import logger from '../utils/logger.js';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emit(event, data) {
    logger.debug(`[EVENT] ${event}`, data ? JSON.stringify(data).slice(0, 200) : '');
    return super.emit(event, data);
  }
}

const eventBus = new EventBus();
export default eventBus;
