# 🚀 GitHub Pages Deployment

## Live Website

Your DevIQ application is now live and accessible at:

### **Primary URL (GitHub Pages)**
👉 **https://saket21s.github.io/deviq/**

### **Custom Domain (if DNS configured)**
👉 **https://deviq.online**

---

## Deployment Details

### GitHub Pages Setup
- **Repository**: https://github.com/saket21s/deviq
- **Deployment Branch**: `gh-pages`
- **Source Branch**: `main`
- **Static Site**: Built with Next.js 15.5.12

### Build & Deploy Command
```bash
npm run deploy
```

This command:
1. Runs `npm run build` to create static export in `out/` directory
2. Uses `gh-pages` package to push to `gh-pages` branch
3. Automatically triggers GitHub Pages deployment

### Custom Domain Setup (deviq.online)

If you want to use your custom domain `deviq.online`:

#### Option A: GitHub DNS (Recommended)
1. Go to repo settings → **Pages**
2. Under "Custom domain", enter: `deviq.online`
3. GitHub will provide DNS configuration

#### Option B: Your DNS Provider
Add a CNAME record:
```
deviq.online CNAME saket21s.github.io
```

---

## Features

✅ **OAuth2 Authentication**
- Google OAuth
- GitHub OAuth

✅ **Backend Integration**
- MongoDB user storage
- JWT token authentication
- Redirect-based OAuth flow

✅ **Static Export**
- Pre-rendered pages
- Optimized for GitHub Pages
- No API routes (external API calls only)

✅ **Responsive Design**
- Works on desktop and mobile
- Tailwind CSS styling

---

## Next Steps

1. **Test the live site**: https://saket21s.github.io/deviq/
2. **Configure custom domain**: Add DNS CNAME record for `deviq.online`
3. **Verify authentication**: Test Google and GitHub OAuth logins
4. **Monitor deployment**: Check GitHub Actions for build status

---

## Troubleshooting

### Site not loading?
- Clear browser cache (Ctrl+Shift+Del)
- Wait 5 minutes for DNS propagation
- Check GitHub Pages settings in repo

### Custom domain not working?
- Verify CNAME record: `dig deviq.online`
- Wait for DNS propagation (can take 24-48 hours)
- Check GitHub Pages SSL certificate status

### Build failed?
- Check GitHub Actions logs in repo
- Run locally: `npm run build`
- Verify Next.js config: `next.config.ts`

---

## Redeploy

To push new changes to the live site:

```bash
git add .
git commit -m "Update: Description of changes"
git push origin main
npm run deploy
```

---

**Deployed**: April 13, 2026
**Technology**: Next.js + GitHub Pages + MongoDB
