# Deployment Guide

How to deploy the Care Provider Finder HTTP API beyond localhost.

## ⚠️ Important Considerations

**Before deploying publicly:**
- This API contains a CQC API key (public key, but still exposed)
- No authentication or rate limiting built in
- Designed for local/personal use
- Consider security implications of public hosting

**Best for:**
- ✅ Internal corporate server (behind firewall)
- ✅ Personal VPS for own use
- ✅ Shared access for small team

**Not recommended for:**
- ❌ Public internet without authentication
- ❌ High-traffic applications
- ❌ Production services without modification

---

## Deployment Option 1: Internal Corporate Server

**Best for:** Teams within a company, behind corporate firewall

### Prerequisites
- Linux/Windows server on corporate network
- Node.js 18+ installed
- Network access from employee machines
- IT approval

### Step 1: Copy Files to Server

```bash
# SSH to your internal server
ssh user@internal-server

# Clone or copy repository
git clone https://github.com/your-username/care-provider-finder-http.git
cd care-provider-finder-http

# Install dependencies (production only)
npm install --production

# Build TypeScript
npm run build
```

### Step 2: Configure Service

**Using PM2 (Recommended):**

```bash
# Install PM2 globally
npm install -g pm2

# Start the API
pm2 start dist/http-server.js --name care-api

# Configure auto-start on server reboot
pm2 startup
pm2 save

# View logs
pm2 logs care-api

# Monitor
pm2 monit
```

**Using systemd (Linux):**

Create `/etc/systemd/system/care-api.service`:

```ini
[Unit]
Description=Care Provider Finder HTTP API
After=network.target

[Service]
Type=simple
User=nodeuser
WorkingDirectory=/path/to/care-provider-finder-http
ExecStart=/usr/bin/node dist/http-server.js
Restart=on-failure
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable care-api
sudo systemctl start care-api
sudo systemctl status care-api
```

### Step 3: Configure Network Access

**Option A: Direct Access (Simple)**
- Allow port 3000 on server firewall
- Employees access: `http://server-name:3000`

**Option B: Reverse Proxy (Professional)**

Using Nginx:

```nginx
# /etc/nginx/sites-available/care-api
server {
    listen 80;
    server_name care-api.company.local;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable:
```bash
sudo ln -s /etc/nginx/sites-available/care-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Employees access: `http://care-api.company.local`

### Step 4: Update Excel Workbooks

Update Power Query URLs:
- Old: `http://localhost:3000/api/...`
- New: `http://care-api.company.local/api/...`

Or: `http://server-ip:3000/api/...`

---

## Deployment Option 2: Cloud Hosting (VPS)

**Best for:** Personal use, small projects, remote access

### Platform Options

**DigitalOcean Droplet:**
- £5/month for basic droplet
- Full root access
- Simple setup

**AWS EC2:**
- Free tier available (12 months)
- t3.micro sufficient
- More complex setup

**Linode/Vultr:**
- £5-10/month
- Similar to DigitalOcean
- Good performance

### Example: DigitalOcean Deployment

**Step 1: Create Droplet**
1. Sign up at digitalocean.com
2. Create → Droplets
3. Choose: Ubuntu 24.04 LTS
4. Size: Basic, $6/month (1GB RAM)
5. Add SSH key
6. Create Droplet

**Step 2: Initial Setup**

```bash
# SSH to droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Create user
adduser nodeuser
usermod -aG sudo nodeuser
su - nodeuser
```

**Step 3: Deploy Application**

```bash
# Clone repository
cd ~
git clone https://github.com/your-username/care-provider-finder-http.git
cd care-provider-finder-http

# Install dependencies
npm install --production

# Build
npm run build

# Install PM2
sudo npm install -g pm2

# Start app
pm2 start dist/http-server.js --name care-api
pm2 startup
pm2 save
```

**Step 4: Configure Firewall**

```bash
# Enable UFW
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp
sudo ufw enable

# Or use Nginx (see below)
```

**Step 5: Add HTTPS (Recommended)**

```bash
# Install Nginx
sudo apt install -y nginx

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Configure domain (point A record to droplet IP first)
sudo certbot --nginx -d api.yourdomain.com

# Follow prompts
```

Nginx config created automatically by Certbot.

**Step 6: Access**

Your API is now available at:
- `https://api.yourdomain.com`

Update Excel: `https://api.yourdomain.com/api/search/...`

---

## Deployment Option 3: Heroku (Easiest)

**Best for:** Quick prototype, low traffic

### Setup

1. **Create Heroku account** (free tier available)

2. **Install Heroku CLI**
```bash
# Mac
brew tap heroku/brew && brew install heroku

# Windows
# Download from heroku.com/cli
```

3. **Prepare repository**
```bash
cd care-provider-finder-http

# Add Procfile
echo "web: node dist/http-server.js" > Procfile

# Commit changes
git add Procfile
git commit -m "Add Procfile for Heroku"
```

4. **Deploy**
```bash
heroku login
heroku create care-api-yourname

# Deploy
git push heroku main

# Open in browser
heroku open
```

5. **Configure environment**
```bash
# Set port (Heroku provides PORT env var)
# Modify http-server.ts to use process.env.PORT || 3000

# If using custom domain
heroku domains:add api.yourdomain.com
```

**Note:** Heroku free tier has limitations:
- App sleeps after 30 min inactivity
- First request takes 10-30 seconds to wake up
- 550 free hours/month

---

## Security Enhancements (For Public Hosting)

### Add API Key Authentication

**Step 1: Add middleware**

```typescript
// In http-server.ts
const API_KEY = process.env.API_KEY || 'your-secret-key';

app.use((req, res, next) => {
  const key = req.headers['x-api-key'];
  
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
});
```

**Step 2: Set environment variable**

```bash
export API_KEY=your-secure-random-key-here
```

**Step 3: Update clients**

```javascript
// Excel Power Query - add custom headers
// OR

// cURL
curl -H "X-API-Key: your-key" http://api.example.com/api/search/...
```

### Add Rate Limiting

```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);
```

### Add Request Logging

```bash
npm install morgan
```

```typescript
import morgan from 'morgan';

app.use(morgan('combined'));
```

### Enable CORS Properly

```typescript
import cors from 'cors';

const corsOptions = {
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

---

## Monitoring & Maintenance

### Health Checks

**Uptime monitoring:**
- UptimeRobot (free, checks every 5 min)
- Pingdom
- StatusCake

**Set up alerts:**
- Email when API is down
- Slack notifications
- SMS for critical issues

### Log Management

**PM2 logs:**
```bash
pm2 logs care-api
pm2 logs care-api --lines 100
pm2 flush  # Clear old logs
```

**Rotate logs:**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Performance Monitoring

**PM2 monitoring (free):**
```bash
pm2 link <secret> <public>  # Get keys from pm2.io
pm2 monitor
```

**New Relic (free tier):**
- Application performance monitoring
- Error tracking
- Dashboard

### Update Process

**Step 1: Pull latest changes**
```bash
cd ~/care-provider-finder-http
git pull origin main
```

**Step 2: Install dependencies & rebuild**
```bash
npm install --production
npm run build
```

**Step 3: Restart**
```bash
pm2 restart care-api
```

**Step 4: Verify**
```bash
curl http://localhost:3000/health
pm2 logs care-api
```

---

## Backup & Disaster Recovery

### Automated Backups

**Script: `/home/nodeuser/backup-care-api.sh`**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="/home/nodeuser/backups"

# Backup data files
tar -czf $BACKUP_DIR/data-$DATE.tar.gz \
  ~/care-provider-finder-http/data/

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t data-*.tar.gz | tail -n +8 | xargs rm -f
```

**Cron job:**
```bash
crontab -e

# Add line:
0 2 * * * /home/nodeuser/backup-care-api.sh
```

### Restore Process

```bash
# Stop service
pm2 stop care-api

# Extract backup
cd ~/care-provider-finder-http/data
tar -xzf ~/backups/data-YYYYMMDD-HHMMSS.tar.gz

# Restart
pm2 start care-api
```

---

## Cost Estimates

### Internal Server
- **Cost:** $0 (using existing infrastructure)
- **Maintenance:** Low (automatic updates)

### DigitalOcean/Linode
- **Droplet:** £5-10/month
- **Domain:** £10/year (optional)
- **Total:** ~£70/year

### AWS EC2
- **t3.micro:** Free tier (12 months), then ~£8/month
- **Data transfer:** Usually included
- **Total:** ~£96/year (after free tier)

### Heroku
- **Free tier:** £0 (with limitations)
- **Hobby tier:** $7/month (no sleep, custom domain)
- **Total:** ~£65/year

---

## Troubleshooting Deployment

### "npm: command not found"
**Solution:** Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### "Permission denied" errors
**Solution:** Check file ownership
```bash
sudo chown -R nodeuser:nodeuser ~/care-provider-finder-http
```

### API not accessible from network
**Solution:** Check firewall
```bash
sudo ufw status
sudo ufw allow 3000/tcp
```

### PM2 doesn't restart on reboot
**Solution:** Configure startup
```bash
pm2 startup
# Copy and run the command it outputs
pm2 save
```

### High memory usage
**Solution:** Monitor and optimize
```bash
pm2 monit
# If memory keeps growing, restart periodically:
pm2 restart care-api --cron "0 3 * * *"  # 3am daily
```

---

## When NOT to Deploy Publicly

**Don't deploy if:**
- You're not comfortable with server administration
- You can't commit to maintenance and updates
- Data security is a concern (add auth first)
- You need high availability (this is a simple setup)
- You expect >1000 requests/day (add caching first)

**Better alternatives:**
- Keep it localhost and document setup for colleagues
- Share Docker container for easy local deployment
- Use stdio MCP version with Claude Desktop

---

## Next Steps After Deployment

1. **Test thoroughly** from different networks
2. **Update documentation** with your server URLs
3. **Share with team** (if internal deployment)
4. **Monitor for a week** to catch issues
5. **Set up automated backups**
6. **Plan for updates** (monthly data refresh)

## Questions?

Deployment is complex. Start small (localhost), prove value, then expand as needed.
