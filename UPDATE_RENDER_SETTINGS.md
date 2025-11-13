# 🔧 Update Render Service Settings

## Current Issue
Build command is incomplete, causing deployment failures.

## ✅ Solution

### Method 1: Update via Render Dashboard (Fastest)

1. **Go to Service Settings:**
   https://dashboard.render.com/web/srv-d4amcd8gjchc73evq790/settings

2. **Update Build Command:**
   - Find "Build Command" section
   - Replace current command with:
   ```
   npm install && npm run build && npx prisma generate && npx prisma migrate deploy
   ```

3. **Verify Start Command:**
   - Should be: `npm start` or `node dist/index.js`
   - Both work since `npm start` runs `node dist/index.js`

4. **Verify Root Directory:**
   - Should be: (empty/blank)
   - Since your repo is the backend itself, not a monorepo

5. **Click "Save Changes"**
   - This will automatically trigger a new deployment

### Method 2: Use render.yaml (If Blueprint is enabled)

If your service was created from a Blueprint, you can:
1. Ensure `render.yaml` is at the root of your backend repo
2. Push it to GitHub
3. Render should auto-detect and apply it

## 📋 Complete Configuration

**Build Command:**
```
npm install && npm run build && npx prisma generate && npx prisma migrate deploy
```

**Start Command:**
```
npm start
```
or
```
node dist/index.js
```

**Root Directory:**
```
(leave empty)
```

## 🔍 What Each Step Does

1. `npm install` - Installs all dependencies
2. `npm run build` - Compiles TypeScript to JavaScript (creates `dist/` folder)
3. `npx prisma generate` - Generates Prisma Client
4. `npx prisma migrate deploy` - Applies database migrations

## ✅ After Update

The deployment should:
- ✅ Build successfully
- ✅ Create `dist/` folder with compiled code
- ✅ Start server correctly
- ✅ Connect to AlwaysData database

## 🐛 Troubleshooting

If it still fails:
- Check build logs for specific errors
- Verify `DATABASE_URL` environment variable is set
- Ensure database is accessible from Render


