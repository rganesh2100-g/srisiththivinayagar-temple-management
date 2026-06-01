export const ERROR_MESSAGES = {
  NETWORK_OFFLINE: "You appear to be offline. Please check your internet connection.",
  NETWORK_TIMEOUT: "The request took too long. Please try again later.",
  SERVER_ERROR: "Something went wrong on our servers. Our technical team has been notified.",
  UNAUTHORIZED: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested resource could not be found or may have been removed.",
  VALIDATION_ERROR: "Please check your inputs and try again.",
  DUPLICATE_SUBMISSION: "This action is already in progress. Please wait.",
  RATE_LIMIT: "You're doing that too fast. Please slow down and try again.",
  DEFAULT: "An unexpected error occurred. Please try again."
};

export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  SERVER: 'SERVER_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};