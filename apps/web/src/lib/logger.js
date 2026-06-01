const logger = {
  info: (message, data = null) => {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[INFO ${timestamp}] ${message}`, data);
    } else {
      console.log(`[INFO ${timestamp}] ${message}`);
    }
  },
  
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    if (error) {
      console.error(`[ERROR ${timestamp}] ${message}`, error);
    } else {
      console.error(`[ERROR ${timestamp}] ${message}`);
    }
  },
  
  warn: (message, data = null) => {
    const timestamp = new Date().toISOString();
    if (data) {
      console.warn(`[WARN ${timestamp}] ${message}`, data);
    } else {
      console.warn(`[WARN ${timestamp}] ${message}`);
    }
  }
};

export default logger;