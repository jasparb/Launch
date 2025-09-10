# Deployment Instructions for Studio³ - The End of The World

Your application is ready for deployment! The site is configured for Solana mainnet and will accept real SOL donations to your wallet: `8oYmUTGBuBqzukESX68SXB67nxopemnRrVmzH3hrGpAd`

## Quick Deploy Options

### Option 1: Deploy to Vercel (Recommended - Free)

1. Go to https://vercel.com
2. Sign up with GitHub (free)
3. Click "Add New Project"
4. Import this repository
5. Click "Deploy"
6. Your site will be live in ~2 minutes!

### Option 2: Deploy to Netlify (Free)

1. Go to https://www.netlify.com
2. Sign up with GitHub (free)
3. Click "Add new site" → "Import an existing project"
4. Connect to GitHub and select this repository
5. Click "Deploy site"

### Option 3: Deploy to Render (Free)

1. Go to https://render.com
2. Sign up with GitHub (free)
3. Click "New +" → "Static Site"
4. Connect your GitHub repository
5. Build Command: `npm run build`
6. Publish Directory: `.next`
7. Click "Create Static Site"

### Option 4: Command Line Deploy (if you have accounts)

```bash
# Vercel
npx vercel --prod

# Netlify
npx netlify deploy --prod

# Surge.sh
npx surge ./out your-domain.surge.sh
```

## Important Notes

- The application is configured for Solana MAINNET
- All donations go directly to: `8oYmUTGBuBqzukESX68SXB67nxopemnRrVmzH3hrGpAd`
- Users will receive 1000 governance tokens per $1 donated
- The development server is currently running on http://localhost:3000

## Testing Before Deploy

Visit http://localhost:3000/studio3-presale to see your live page.

## After Deployment

Once deployed, share your URL with potential supporters to start accepting SOL donations for "The End of The World" film project!