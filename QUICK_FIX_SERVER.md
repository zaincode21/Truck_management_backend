# 🚀 Quick Fix Guide for Server

## Current Status
- ✅ Server is running on port 5000
- ❌ Old code still running (trust proxy errors from 15:10:31)
- ❌ Database connection errors (need to fix DATABASE_URL)

## Step 1: Copy Fixed Files to Server

Run these commands **from your local machine**:

```bash
# Navigate to project root
cd ~/Desktop/project/truck-management

# Copy fixed files to server
scp server/src/index.ts root@84.247.131.178:~/project/Truck_management_backend/src/
scp server/src/middleware/security.ts root@84.247.131.178:~/project/Truck_management_backend/src/middleware/
scp server/check-db-connection.sh root@84.247.131.178:~/project/Truck_management_backend/
```

## Step 2: On Your Server - Rebuild and Test

SSH into your server and run:

```bash
# SSH into server
ssh root@84.247.131.178

# Navigate to backend
cd ~/project/Truck_management_backend

# Rebuild the project
npm run build

# Make database checker executable
chmod +x check-db-connection.sh

# Test database connection
./check-db-connection.sh
```

## Step 3: Fix Database Connection

The error `FATAL: could not open shared memory segment "/PostgreSQL.3221400888"` means your database connection string is wrong.

### Check your .env file:

```bash
cd ~/project/Truck_management_backend
cat .env | grep DATABASE_URL
```

### Common Database Connection Strings:

#### If using AlwaysData (Remote):
```env
DATABASE_URL=postgresql://aipos:Serge%21%40%23123@postgresql-aipos.alwaysdata.net:5432/aipos_truckflow?schema=public&sslmode=require
```

#### If using Local PostgreSQL:
```env
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/truckflow?schema=public
```

**Important:**
- Password must be URL-encoded (`!@#` = `%21%40%23`)
- For remote databases, always include `&sslmode=require`
- Make sure database server is accessible from your VPS

### Edit .env file:

```bash
nano .env
# Update DATABASE_URL with correct connection string
# Save: Ctrl+O, Enter, Ctrl+X
```

## Step 4: Restart with Updated Environment

```bash
# Restart PM2 with updated environment variables
pm2 restart truckflow-backend --update-env

# Check logs
pm2 logs truckflow-backend --lines 30

# Check status
pm2 status
```

## Step 5: Verify Everything Works

```bash
# Test health endpoint
curl http://localhost:5000/health

# Test API endpoint
curl http://localhost:5000/api/trucks

# Check for errors
pm2 logs truckflow-backend --err --lines 20
```

## Expected Results

After fixing, you should see:
- ✅ No trust proxy errors
- ✅ Server running successfully
- ✅ Database connection working
- ✅ API endpoints responding

## Still Having Database Issues?

### Test Database Connection Manually:

```bash
# Install PostgreSQL client if needed
apt install postgresql-client -y

# Test connection (replace with your actual connection string)
psql "postgresql://username:password@host:port/database?sslmode=require"
```

### Check Database Server:

```bash
# Test if database server is reachable
telnet postgresql-aipos.alwaysdata.net 5432
# Or
nc -zv postgresql-aipos.alwaysdata.net 5432
```

### Common Issues:

1. **Wrong password**: Make sure password is URL-encoded
2. **Firewall**: Database server might block your VPS IP
3. **SSL required**: Add `&sslmode=require` for remote databases
4. **Database not running**: Check if local PostgreSQL is running: `systemctl status postgresql`

## Quick Copy-Paste Commands

```bash
# On your LOCAL machine:
cd ~/Desktop/project/truck-management
scp server/src/index.ts root@84.247.131.178:~/project/Truck_management_backend/src/
scp server/src/middleware/security.ts root@84.247.131.178:~/project/Truck_management_backend/src/middleware/
scp server/check-db-connection.sh root@84.247.131.178:~/project/Truck_management_backend/

# Then SSH and run:
ssh root@84.247.131.178
cd ~/project/Truck_management_backend
npm run build
chmod +x check-db-connection.sh
./check-db-connection.sh
# Fix DATABASE_URL in .env if needed
pm2 restart truckflow-backend --update-env
pm2 logs truckflow-backend --lines 30
```

