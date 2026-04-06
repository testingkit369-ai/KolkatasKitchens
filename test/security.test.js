import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'test-project',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Security Rules', () => {
  const userId = 'user_123';
  const otherUserId = 'user_456';
  const riderId = 'rider_789';
  const outletId = 'outlet_001';

  // --- User Profile Tests ---
  test('Regular user can read their own profile', async () => {
    const db = testEnv.authenticatedContext(userId).firestore();
    const userDoc = db.collection('users').doc(userId);
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc(userId).set({
        uid: userId,
        email: 'user@example.com',
        role: 'customer'
      });
    });
    await assertSucceeds(userDoc.get());
  });

  test('Regular user cannot read another user\'s profile (PII protection)', async () => {
    const db = testEnv.authenticatedContext(userId).firestore();
    const otherUserDoc = db.collection('users').doc(otherUserId);
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc(otherUserId).set({
        uid: otherUserId,
        email: 'other@example.com',
        role: 'customer'
      });
    });
    await assertFails(otherUserDoc.get());
  });

  // --- Browsing Tests ---
  test('Public can read outlets (allowed browsing)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const outletDoc = db.collection('outlets').doc(outletId);
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('outlets').doc(outletId).set({
        name: 'Kolkata Kitchen',
        ownerId: 'admin_1',
        location: 'Kolkata'
      });
    });
    await assertSucceeds(outletDoc.get());
  });

  test('Public can read menu (allowed browsing)', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const menuItemDoc = db.collection('outlets').doc(outletId).collection('menu').doc('item_1');
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('outlets').doc(outletId).collection('menu').doc('item_1').set({
        name: 'Biryani',
        price: 350,
        category: 'Main Course'
      });
    });
    await assertSucceeds(menuItemDoc.get());
  });

  // --- Privilege Escalation Tests ---
  test('User cannot self-assign "admin" role (privilege escalation)', async () => {
    const db = testEnv.authenticatedContext(userId).firestore();
    const userDoc = db.collection('users').doc(userId);
    await assertFails(userDoc.set({
      uid: userId,
      email: 'user@example.com',
      role: 'admin' // Attempting to self-assign admin
    }));
  });

  test('User can self-assign "customer" role', async () => {
    const db = testEnv.authenticatedContext(userId).firestore();
    const userDoc = db.collection('users').doc(userId);
    await assertSucceeds(userDoc.set({
      uid: userId,
      email: 'user@example.com',
      role: 'customer'
    }));
  });

  // --- Rider Location Tests ---
  test('Rider location is visible to authenticated customers (order placers)', async () => {
    const db = testEnv.authenticatedContext(userId).firestore();
    const locationDoc = db.collection('riders').doc(riderId).collection('live_location').doc('current');
    
    // Set up user role first
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection('users').doc(userId).set({
        uid: userId,
        email: 'user@example.com',
        role: 'customer'
      });
      await context.firestore().collection('riders').doc(riderId).collection('live_location').doc('current').set({
        lat: 22.5726,
        lng: 88.3639
      });
    });
    
    await assertSucceeds(locationDoc.get());
  });

  test('Rider location is NOT visible to unauthenticated public', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const locationDoc = db.collection('riders').doc(riderId).collection('live_location').doc('current');
    await assertFails(locationDoc.get());
  });
});
