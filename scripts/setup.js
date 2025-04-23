const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a secure random string for NEXTAUTH_SECRET
const generateSecret = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create or update .env file
const setupEnv = () => {
  const envPath = path.join(process.cwd(), '.env');
  const nextAuthSecret = generateSecret();
  
  const envContent = `# MongoDB Connection (Replace with your MongoDB Atlas connection string)
MONGODB_URI="mongodb+srv://your-username:your-password@your-cluster.mongodb.net/zachatapp?retryWrites=true&w=majority"

# NextAuth Configuration
NEXTAUTH_SECRET="${nextAuthSecret}"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Pusher Configuration (for real-time features)
# PUSHER_APP_ID=""
# PUSHER_KEY=""
# PUSHER_SECRET=""
# PUSHER_CLUSTER=""
`;

  fs.writeFileSync(envPath, envContent);
  console.log('Created .env file with secure NEXTAUTH_SECRET');
  console.log('Please update MONGODB_URI with your MongoDB Atlas connection string');
};

// Run setup
setupEnv();
