// Debug script to check Firebase configuration
console.log('=== FIREBASE CONFIG DEBUG ===');
console.log('API Key exists:', !!import.meta.env.VITE_FIREBASE_API_KEY);
console.log('Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log('Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
console.log('App ID exists:', !!import.meta.env.VITE_FIREBASE_APP_ID);
console.log('Storage Bucket:', import.meta.env.VITE_FIREBASE_STORAGE_BUCKET);
console.log('Messaging Sender ID exists:', !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
console.log('Measurement ID exists:', !!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID);

// Test environment
console.log('Environment:', import.meta.env.MODE);
console.log('All env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));

export default null;