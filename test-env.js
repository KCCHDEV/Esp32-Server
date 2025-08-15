#!/usr/bin/env node

// Simple test to check if all required environment variables are set
console.log('🧪 Testing Environment Variables...\n');

const requiredEnvs = [
  'JWT_SECRET',
  'JWT_EXPIRE', 
  'NETLIFY_DATABASE_URL',
  'NETLIFY_DATABASE_URL_UNPOOLED'
];

let allSet = true;

requiredEnvs.forEach(env => {
  const value = process.env[env];
  const status = value ? '✅' : '❌';
  const display = value ? (env.includes('SECRET') ? '[HIDDEN]' : value.substring(0, 50) + '...') : 'NOT SET';
  
  console.log(`${status} ${env}: ${display}`);
  
  if (!value) {
    allSet = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allSet) {
  console.log('🎉 All environment variables are set!');
  console.log('✅ Ready to run the application');
} else {
  console.log('❌ Some environment variables are missing');
  console.log('📝 Please check your .env file in backend/ folder');
  console.log('\nRequired variables:');
  requiredEnvs.forEach(env => {
    console.log(`   - ${env}`);
  });
}

console.log('\n🚀 To start the application:');
console.log('   npm run install');
console.log('   npm run db:setup');  
console.log('   npm run dev');

process.exit(allSet ? 0 : 1);