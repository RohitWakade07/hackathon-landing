# Railway Deployment Guide

## Step 1: Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Click "Sign Up" and choose "Continue with GitHub"
3. Authorize Railway to access your GitHub account

## Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your `hackathon-landing` repository
4. Click "Deploy Now"

## Step 3: Add Environment Variables

In your Railway project dashboard:

1. Go to the "Variables" tab
2. Add these environment variables:

```
NODE_ENV=production
PORT=3000
ADMIN_TOKEN=your_secure_token_here
CORS_ORIGIN=https://yourdomain.com
```

## Step 4: Add PostgreSQL Database (Optional but Recommended)

1. In your project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create the database
4. Copy the connection string from the "Connect" tab
5. Add it as an environment variable:
   ```
   SUPABASE_DB_URL=postgresql://username:password@host:port/database
   ```

## Step 5: Deploy

1. Railway will automatically deploy when you push to your main branch
2. Go to the "Deployments" tab to monitor the build
3. Once deployed, click on your service to get the public URL

## Step 6: Update Your Frontend

Update your frontend files to use the Railway URL:

1. In `src/problems.html`, update the API base URL:
   ```javascript
   const apiBase = 'https://your-railway-url.railway.app';
   ```

2. In `src/admin/index.html`, update the API calls to use the Railway URL

## Step 7: Test Your Deployment

1. Visit your Railway URL
2. Test the form submission
3. Test the admin panel
4. Check that all images load correctly

## Troubleshooting

### Common Issues:

1. **Build Fails**: Check the build logs in Railway dashboard
2. **Port Issues**: Railway automatically sets PORT, don't override it
3. **Database Connection**: Ensure SUPABASE_DB_URL is correct
4. **File Uploads**: Railway doesn't support persistent file storage

### For File Uploads:
Since Railway doesn't support persistent file storage, consider:
- Using Supabase Storage
- Using Cloudinary
- Storing files in your database as base64

## Railway Free Tier Limits

- ✅ 500 hours/month
- ✅ PostgreSQL database included
- ✅ Automatic deployments
- ✅ Custom domains
- ❌ No persistent file storage

## Next Steps

After successful deployment:
1. Set up a custom domain
2. Configure automatic deployments
3. Set up monitoring and alerts
4. Consider upgrading to paid plan for production use
