const admin = require('firebase-admin');
const { getFirestore: getFS } = require('firebase-admin/firestore');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account-key.json');

let fbApp = null;

function getServiceAccount() {
  // Priority: env var > local file
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (envJson) {
    try {
      return JSON.parse(envJson);
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT env var is invalid JSON');
    }
  }

  try {
    const fs = require('fs');
    if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      return require(SERVICE_ACCOUNT_PATH);
    }
  } catch (e) {
    // ignore
  }

  return null;
}

function initFirebase() {
  if (fbApp) {
    return { app: fbApp, firestore: getFS(fbApp) };
  }

  try {
    const serviceAccount = getServiceAccount();
    if (serviceAccount) {
      fbApp = admin.initializeApp({
        credential: admin.cert(serviceAccount)
      });
      console.log('Firebase Admin OK (service account)');
    } else {
      fbApp = admin.initializeApp({
        projectId: 'financial-app-pdam-seruyan'
      });
      console.log('Firebase Admin OK (default creds)');
    }
    return { app: fbApp, firestore: getFS(fbApp) };
  } catch (err) {
    console.error('Firebase init error:', err.message);
    return null;
  }
}

function getFirestore() {
  const result = initFirebase();
  return result ? result.firestore : null;
}

module.exports = { initFirebase, getFirestore };
