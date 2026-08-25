# Environment Variables Setup for Vercel Deployment

## Required Environment Variables

### Backend Environment Variables (Set in Vercel Dashboard > Settings > Environment Variables)

#### Database Configuration
```
MONGO_URI=mongodb+srv://amisha130120_db_user:uFanCFUMfcCsNfD8@ac-8xj7gk9-shard-00-00.w3cjevz.mongodb.net:27017,ac-8xj7gk9-shard-00-01.w3cjevz.mongodb.net:27017,ac-8xj7gk9-shard-00-02.w3cjevz.mongodb.net:27017/stockpilot?ssl=true&replicaSet=atlas-yxeai5-shard-0&authSource=admin&appName=Cluster0
```

#### Authentication
```
JWT_SECRET=stockpilot_secret_key_123456789_abcdef_gxyz
```

#### Email Configuration (SMTP)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=amisha130120@gmail.com
SMTP_PASS=hvcqxhvnajtqghfu
SMTP_FROM=amisha130120@gmail.com
```

#### Frontend URL (Update after deployment)
```
FRONTEND_URL=https://inventory-management-system-wheat-alpha.vercel.app
```

### Frontend Environment Variables (Set in Vercel Dashboard > Settings > Environment Variables)

#### API Configuration
```
VITE_API_URL=/api
VITE_BACKEND_URL=
```

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add each variable with its corresponding value
4. Select the appropriate environments (Production, Preview, Development)
5. Click **Save**
6. Redeploy your project to apply the changes

## Important Notes

- **Security**: Never commit `.env` files to version control
- **MONGO_URI**: Use your existing MongoDB Atlas connection string
- **JWT_SECRET**: Use a strong, unique secret key in production
- **SMTP_PASS**: Consider using an app-specific password for Gmail
- **FRONTEND_URL**: Update this after you get your Vercel deployment URL

## Testing Environment Variables

After deployment, you can test if environment variables are set correctly by:

1. Checking the Vercel function logs
2. Adding a test endpoint that returns environment variables (for debugging only)
3. Testing API endpoints that depend on these variables

## Local Development

For local development, continue using your existing `.env` file in the backend directory and `.env.local` in the frontend directory.

## Updating Environment Variables

If you need to update environment variables after deployment:

1. Update the values in Vercel dashboard
2. Go to the **Deployments** tab
3. Click on the latest deployment
4. Click **Redeploy** to apply the new environment variables
