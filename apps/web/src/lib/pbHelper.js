import pb from './pocketbaseClient.js';
import { ERROR_MESSAGES } from '@/constants/ErrorConstants.js';

const inFlightRequests = new Map();
const requestCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Logs PocketBase operations to localStorage for diagnostic purposes.
 */
const logOperation = (op, collection, payload, error = null) => {
  try {
    const logs = JSON.parse(localStorage.getItem('pb_diagnostic_logs') || '[]');
    logs.unshift({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      op,
      collection,
      payload: payload ? JSON.stringify(payload).substring(0, 200) : null,
      error: error ? error.message : null,
      status: error ? error.status : 200,
      success: !error
    });
    if (logs.length > 100) logs.pop();
    localStorage.setItem('pb_diagnostic_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to write diagnostic log', e);
  }
};

export const mapPbError = (err) => {
  if (!navigator.onLine) return ERROR_MESSAGES.NETWORK_OFFLINE;
  if (err.isAbort) return ERROR_MESSAGES.NETWORK_TIMEOUT;

  switch (err.status) {
    case 400: return ERROR_MESSAGES.VALIDATION_ERROR;
    case 403: return ERROR_MESSAGES.UNAUTHORIZED;
    case 404: return ERROR_MESSAGES.NOT_FOUND;
    case 429: return ERROR_MESSAGES.RATE_LIMIT;
    case 500:
    case 502:
    case 503: return ERROR_MESSAGES.SERVER_ERROR;
    default: return err.message || ERROR_MESSAGES.DEFAULT;
  }
};

/**
 * Request deduplicator to prevent duplicate submissions within 1 second.
 */
const deduplicateRequest = (key, operationPromiseThunk) => {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const promise = operationPromiseThunk().finally(() => {
    setTimeout(() => {
      inFlightRequests.delete(key);
    }, 1000);
  });

  inFlightRequests.set(key, promise);
  return promise;
};

/**
 * Cache management
 */
const getCachedData = (key) => {
  const cached = requestCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  if (cached) requestCache.delete(key);
  return null;
};

const setCachedData = (key, data, collection) => {
  requestCache.set(key, { data, timestamp: Date.now(), collection });
};

const invalidateCollectionCache = (collection) => {
  for (const [key, value] of requestCache.entries()) {
    if (value.collection === collection) {
      requestCache.delete(key);
    }
  }
};

const retryOperation = async (operation, maxRetries = 3) => {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      if (!navigator.onLine) throw new Error('OFFLINE');
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 30000);
      });
      return await Promise.race([operation(), timeoutPromise]);
    } catch (err) {
      lastError = err;
      if (err.message === 'OFFLINE') {
        err.isAbort = true;
        throw err;
      }
      if (err.message === 'TIMEOUT') {
        err.isAbort = true;
      } else if (err.status >= 400 && err.status < 500 && err.status !== 429 && err.status !== 408) {
        throw err;
      }
      if (i === maxRetries - 1) throw err;
      const delay = 1000 * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
};

// ============================================================================
// CRUD Wrappers with Deduplication & Caching
// ============================================================================

export const createRecord = (collection, data, options = {}) => {
  const reqKey = `CREATE_${collection}_${JSON.stringify(data)}`;
  return deduplicateRequest(reqKey, async () => {
    const opts = { $autoCancel: false, ...options };
    try {
      const record = await retryOperation(() => pb.collection(collection).create(data, opts));
      logOperation('CREATE', collection, data);
      invalidateCollectionCache(collection);
      return record;
    } catch (err) {
      logOperation('CREATE', collection, data, err);
      const mappedError = new Error(mapPbError(err));
      mappedError.original = err;
      throw mappedError;
    }
  });
};

export const readRecord = (collection, id, options = {}) => {
  const reqKey = `READ_${collection}_${id}_${JSON.stringify(options)}`;
  
  if (!options.skipCache) {
    const cached = getCachedData(reqKey);
    if (cached) return Promise.resolve(cached);
  }

  return deduplicateRequest(reqKey, async () => {
    const opts = { $autoCancel: false, ...options };
    try {
      const record = await retryOperation(() => pb.collection(collection).getOne(id, opts));
      logOperation('READ', collection, { id });
      setCachedData(reqKey, record, collection);
      return record;
    } catch (err) {
      logOperation('READ', collection, { id }, err);
      const mappedError = new Error(mapPbError(err));
      mappedError.original = err;
      throw mappedError;
    }
  });
};

export const updateRecord = (collection, id, data, options = {}) => {
  const reqKey = `UPDATE_${collection}_${id}_${JSON.stringify(data)}`;
  return deduplicateRequest(reqKey, async () => {
    const opts = { $autoCancel: false, ...options };
    try {
      const record = await retryOperation(() => pb.collection(collection).update(id, data, opts));
      logOperation('UPDATE', collection, { id, ...data });
      invalidateCollectionCache(collection);
      return record;
    } catch (err) {
      logOperation('UPDATE', collection, { id, ...data }, err);
      const mappedError = new Error(mapPbError(err));
      mappedError.original = err;
      throw mappedError;
    }
  });
};

export const deleteRecord = (collection, id, options = {}) => {
  const reqKey = `DELETE_${collection}_${id}`;
  return deduplicateRequest(reqKey, async () => {
    const opts = { $autoCancel: false, ...options };
    try {
      const result = await retryOperation(() => pb.collection(collection).delete(id, opts));
      logOperation('DELETE', collection, { id });
      invalidateCollectionCache(collection);
      return result;
    } catch (err) {
      logOperation('DELETE', collection, { id }, err);
      const mappedError = new Error(mapPbError(err));
      mappedError.original = err;
      throw mappedError;
    }
  });
};

export const listRecords = (collection, page = 1, perPage = 50, options = {}) => {
  const reqKey = `LIST_${collection}_${page}_${perPage}_${JSON.stringify(options)}`;
  
  if (!options.skipCache) {
    const cached = getCachedData(reqKey);
    if (cached) return Promise.resolve(cached);
  }

  return deduplicateRequest(reqKey, async () => {
    const opts = { $autoCancel: false, ...options };
    try {
      const result = await retryOperation(() => pb.collection(collection).getList(page, perPage, opts));
      logOperation('LIST', collection, { page, perPage, filter: opts.filter });
      setCachedData(reqKey, result, collection);
      return result;
    } catch (err) {
      logOperation('LIST', collection, { page, perPage, filter: opts.filter }, err);
      const mappedError = new Error(mapPbError(err));
      mappedError.original = err;
      throw mappedError;
    }
  });
};

export const getFullList = (collection, options = {}) => {
  const reqKey = `FULLLIST_${collection}_${JSON.stringify(options)}`;
  
  if (!options.skipCache) {
    const cached = getCachedData(reqKey);
    if (cached) return Promise.resolve(cached);
  }

  return deduplicateRequest(reqKey, async () => {
    const opts = { $autoCancel: false, ...options };
    try {
      const result = await retryOperation(() => pb.collection(collection).getFullList(opts));
      logOperation('FULL_LIST', collection, { filter: opts.filter });
      setCachedData(reqKey, result, collection);
      return result;
    } catch (err) {
      logOperation('FULL_LIST', collection, { filter: opts.filter }, err);
      const mappedError = new Error(mapPbError(err));
      mappedError.original = err;
      throw mappedError;
    }
  });
};

export const logAdminAction = async (adminId, adminName, action, notes = '') => {
  try {
    await pb.collection('approval_logs').create({
      admin_id: adminId,
      admin_name: adminName,
      action: action,
      notes: notes,
      timestamp: new Date().toISOString()
    }, { $autoCancel: false });
  } catch (e) {
    console.error('Failed to log admin action to database', e);
  }
};