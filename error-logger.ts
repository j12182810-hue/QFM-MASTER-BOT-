import fs from 'fs';
const originalError = console.error;
console.error = function(...args) {
  // Just pass through to original console.error for Cloud Run
  originalError.apply(console, args);
};
