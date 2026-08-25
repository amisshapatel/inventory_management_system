# StockPilot Deployment Guide

This guide explains how to deploy the StockPilot Inventory Management System to Vercel with both frontend and backend.

## Project Structure

```
inventory-management-system/
├── frontend/          # React + Vite frontend
├── backend/           # Express.js backend
├── api/              # Vercel serverless functions
├── vercel.json       # Vercel configuration
└── .env.example      # Environment variables template
```

## Prerequisites

- Vercel account ([https://vercel.com](https://vercel.com))
- MongoDB Atlas account (for database)
- GitHub repository
- Node.js installed locally

## Deployment Steps

### 1. Prepare Your Code

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Vercel deployment"
   git branch -M main
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

2. **Verify project structure**
   - Ensure you have the `api/` directory with `index.js` and `package.json`
   - Ensure `vercel.json` is in the root directory
   - Ensure `.env.example` exists (don't commit `.env` files)

### 2. Set Up MongoDB Atlas

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user with read/write permissions
4. Get your connection string (MongoDB URI)
5. Whitelist Vercel's IP addresses or allow access from anywhere (0.0.0.0/0)

### 3. Deploy to Vercel

#### Option A: Using Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts and set environment variables when asked

#### Option B: Using Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build --prefix frontend`
   - **Output Directory**: `frontend/dist`

5. **Set Environment Variables** (in Settings > Environment Variables):
   ```
   MONGO_URI=mongodb+srv://your-connection-string
   JWT_SECRET=your_secure_secret_key
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   SMTP_FROM=your_email@gmail.com
   FRONTEND_URL=https://your-project.vercel.app
   ```

6. Set environment variables for frontend (prefix with `VITE_`):
   ```
   VITE_API_URL=/api
   VITE_BACKEND_URL=
   ```

7. Click "Deploy"

### 4. Configure CORS Settings

After deployment, update your MongoDB Atlas network access to allow Vercel's IP addresses or use 0.0.0.0/0 for testing (not recommended for production).

### 5. Test Your Deployment

1. Visit your Vercel URL
2. Try logging in with your credentials
3. Test all major features:
   - Dashboard
   - Products management
   - Inventory tracking
   - Purchases and sales
   - Reports generation

## Environment Variables

### Backend Variables
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT token generation
- `SMTP_HOST`: SMTP server host
- `SMTP_PORT`: SMTP server port
- `SMTP_USER`: SMTP username
- `SMTP_PASS`: SMTP password
- `SMTP_FROM`: From email address
- `FRONTEND_URL`: Your deployed frontend URL

### Frontend Variables
- `VITE_API_URL`: API endpoint URL (use `/api` for Vercel)
- `VITE_BACKEND_URL`: Backend URL (leave empty for Vercel)

## Troubleshooting

### Build Errors
- Ensure all dependencies are listed in both `frontend/package.json` and `api/package.json`
- Check that MongoDB connection string is correct
- Verify JWT_SECRET is set

### Runtime Errors
- Check Vercel function logs for errors
- Ensure MongoDB Atlas allows connections from Vercel
- Verify CORS settings

### API Connection Issues
- Ensure `VITE_API_URL` is set to `/api` for production
- Check that API routes are properly configured in `vercel.json`
- Verify environment variables are set in Vercel dashboard

## Updating Your Deployment

After making changes to your code:

```bash
git add .
git commit -m "Your commit message"
git push
```

Vercel will automatically deploy your changes.

## Custom Domain (Optional)

1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS settings as instructed by Vercel
5. Update `FRONTEND_URL` environment variable

## Security Notes

- Never commit `.env` files to version control
- Use strong, unique passwords for database and SMTP
- Enable MongoDB Atlas authentication
- Consider using Vercel's Edge Network for better performance
- Set up proper CORS rules in production

## Support

For issues with:
- **Vercel deployment**: Check [Vercel Documentation](https://vercel.com/docs)
- **MongoDB Atlas**: Check [MongoDB Documentation](https://docs.atlas.mongodb.com)
- **Application issues**: Check the application logs in Vercel dashboard
