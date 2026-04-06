import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { execSync } from 'child_process';

/**
 * Kolkata's Kitchen - PhonePe Secret Validator
 * This script checks if the required secrets are set in Firebase Secret Manager.
 */

const REQUIRED_SECRETS = [
  'PHONEPE_CLIENT_ID',
  'PHONEPE_CLIENT_SECRET',
  'PHONEPE_CLIENT_VERSION',
  'PHONEPE_WEBHOOK_USER',
  'PHONEPE_WEBHOOK_PASS'
];

async function validateSecrets() {
  console.log('\x1b[34m%s\x1b[0m', '🔍 Validating PhonePe Secrets in Firebase...');
  
  let missingSecrets: string[] = [];

  try {
    // We use firebase-tools CLI to list secrets
    const output = execSync('npx firebase functions:secrets:list --json', { encoding: 'utf8' });
    const secretsList = JSON.parse(output);
    
    // The output structure of secrets:list --json is an array of objects with 'name' property
    const existingSecretNames = secretsList.map((s: any) => s.name);

    for (const secret of REQUIRED_SECRETS) {
      if (!existingSecretNames.includes(secret)) {
        missingSecrets.push(secret);
      }
    }

    if (missingSecrets.length > 0) {
      console.error('\x1b[31m%s\x1b[0m', '❌ Missing Secrets Found:');
      missingSecrets.forEach(s => console.error(`   - ${s}`));
      console.log('\n\x1b[33m%s\x1b[0m', 'Run the following commands to set them:');
      missingSecrets.forEach(s => {
        console.log(`   npx firebase functions:secrets:set ${s}`);
      });
      process.exit(1);
    } else {
      console.log('\x1b[32m%s\x1b[0m', '✅ All PhonePe secrets are correctly configured in Firebase Secret Manager.');
    }
  } catch (error: any) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error checking secrets:');
    if (error.message.includes('Command failed')) {
      console.error('   Ensure you are logged into Firebase (npx firebase login) and have a project selected.');
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

validateSecrets();
