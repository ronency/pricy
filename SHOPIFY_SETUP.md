# Shopify Test Store Setup for Pricy

Complete step-by-step guide to creating a Shopify development store and wiring it to your local Pricy instance.

---

## Part 1: Create a Shopify Partner Account

1. Go to https://partners.shopify.com and click **Join now**
2. Fill in your name, email, and password
3. Confirm your email address
4. Complete the partner account setup (business name, address — can use personal info for testing)
5. You're now in the **Shopify Partner Dashboard**

---

## Part 2: Create a Development Store

A development store is a free Shopify store with no trial limits. It can't process real payments but has full API access.

1. In the Partner Dashboard, click **Stores** in the left sidebar
2. Click **Add store**
3. Select **Development store**
4. Choose **Create a store to test and build**
5. Fill in the store details:
   - **Store name**: Something like `pricy-test-store` (this becomes `pricy-test-store.myshopify.com`)
   - **Store URL**: Auto-generated from the name
   - **Build for**: Select a development store purpose (e.g. "testing an app")
   - **Store login email**: Your email
   - **Store login password**: Choose a password (this is for the Shopify admin, not the Partner dashboard)
6. Click **Create development store**
7. Wait for the store to be created — you'll be redirected to its admin

**Save this value — you'll need it later:**
- **Shop domain**: `pricy-test-store.myshopify.com` (your actual store URL)

---

## Part 3: Add Test Products to the Store

You need products in the store so Pricy has something to sync.

### Option A: Use Shopify's sample data (fastest)

1. In your store admin (`pricy-test-store.myshopify.com/admin`)
2. Go to **Settings** (bottom-left gear icon)
3. Scroll to **Store details** and verify the store is active
4. Go to **Apps** in the left sidebar
5. Search for and install the **Product CSV Import** or simply:
6. Go to **Products** in the left sidebar
7. Click **Import** (top right)
8. Download Shopify's sample product CSV from: https://burst.shopify.com/photos or just create products manually (next option)

### Option B: Create products manually

1. Go to **Products** in the left sidebar
2. Click **Add product**
3. Create 3-5 test products with these fields filled in:
   - **Title**: e.g. "Premium Wireless Headphones"
   - **Description**: Any text
   - **Price**: e.g. `79.99`
   - **Compare at price** (optional): e.g. `99.99` — this is the "original" price for sale display
   - **SKU**: e.g. `HEADPHONES-001`
   - **Vendor**: e.g. "AudioTech"
   - **Product type**: e.g. "Electronics"
4. Click **Save** for each product
5. Repeat for a few more products. Suggested test products:

| Title | Price | Vendor | Type |
|-------|-------|--------|------|
| Premium Wireless Headphones | $79.99 | AudioTech | Electronics |
| Organic Cotton T-Shirt | $29.99 | EcoWear | Apparel |
| Stainless Steel Water Bottle | $24.99 | HydroGear | Accessories |
| Running Shoes Pro | $129.99 | SpeedStep | Footwear |
| Bluetooth Speaker Mini | $49.99 | AudioTech | Electronics |

### Option C: Use Shopify CLI to seed products

```bash
npm install -g @shopify/cli
shopify auth login --store pricy-test-store.myshopify.com
shopify populate products --count 10
```

---

## Part 4: Create a Custom App (API credentials)

Pricy connects to Shopify via a **Custom App** with Admin API access. This is how you get the Client ID, Client Secret, and Access Token.

### Step 4A: Enable custom app development

1. In your store admin, go to **Settings** (bottom-left gear icon)
2. Click **Apps and sales channels**
3. Click **Develop apps** (top right area)
4. You'll see a banner: "Allow custom app development"
5. Click **Allow custom app development**
6. Read the warning and click **Allow custom app development** again to confirm

### Step 4B: Create the Pricy app

1. Still on the **App development** page, click **Create an app**
2. Fill in:
   - **App name**: `Pricy`
   - **App developer**: Select your email
3. Click **Create app**

### Step 4C: Configure API scopes

1. You're now on the app's overview page
2. Click **Configure Admin API scopes**
3. In the scopes list, search for and check these boxes:

**Required scopes:**
- `read_products` — Pricy needs to read your product catalog

**Recommended additional scopes (for future features):**
- `read_orders` — if you ever want order-based pricing insights
- `read_inventory` — if you want stock-level awareness
- `write_products` — if you want Pricy to auto-update your prices based on rules

4. Click **Save**

### Step 4D: Install the app and get the access token

1. Click the **API credentials** tab at the top
2. In the "Access tokens" section, click **Install app**
3. Confirm by clicking **Install**
4. The **Admin API access token** is revealed **ONCE** — copy it immediately!

**Save these values — you need all three:**

| Value | Where to find it | Example |
|-------|-------------------|---------|
| **Admin API access token** | Shown once after install | `shpat_xxxxxxxxxxxxxxxxxxxxx` |
| **API key** (Client ID) | API credentials tab | `a1b2c3d4e5f6g7h8i9j0` |
| **API secret key** (Client Secret) | API credentials tab, click "Show" | `shpss_xxxxxxxxxxxxxxxxxxxxx` |

> **WARNING**: The Admin API access token is only shown once! If you lose it, you must uninstall and reinstall the app to generate a new one.

---

## Part 5: Configure Pricy Backend

### Step 5A: Update the .env file

Open `api/.env` and fill in the Shopify values:

```env
# Server
PORT=8000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/pricy

# Authentication
JWT_SECRET=dev-secret-change-in-production

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:8001

# Shopify OAuth
SHOPIFY_CLIENT_ID=a1b2c3d4e5f6g7h8i9j0
SHOPIFY_CLIENT_SECRET=shpss_xxxxxxxxxxxxxxxxxxxxx
SHOPIFY_REDIRECT_URI=http://localhost:8000/api/auth/shopify/callback

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

Replace the placeholder values with your actual API key and API secret key from Step 4D.

### Step 5B: Start the prerequisites

1. **Start MongoDB** (must be running before the API):
   ```bash
   # If installed locally:
   mongod

   # Or with Docker:
   docker run -d -p 27017:27017 --name pricy-mongo mongo:7
   ```

2. **Verify MongoDB is running**:
   ```bash
   mongosh --eval "db.runCommand({ping: 1})"
   ```

### Step 5C: Start the Pricy API

```bash
cd api
npm install
npm run dev
```

You should see output like:
```
Server running on port 8000
Connected to MongoDB
Scheduler service started
```

### Step 5D: Start the Pricy frontend

```bash
cd web
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

---

## Part 6: Create a Pricy Account and Connect Shopify

### Step 6A: Sign up in Pricy

1. Open `http://localhost:3000` in your browser
2. Click **Sign Up**
3. Create an account (name, email, password)
4. You'll be logged into the dashboard

### Step 6B: Connect your Shopify store via OAuth

1. The OAuth flow is triggered by navigating to:
   ```
   http://localhost:8000/api/auth/shopify/oauth?shop=pricy-test-store.myshopify.com
   ```
   (Replace `pricy-test-store.myshopify.com` with your actual store domain)

2. **Important**: You must be authenticated. Use this approach:
   - First, get your JWT token from the login response (visible in browser DevTools > Network tab after logging in)
   - Then open this URL in your browser (or use curl):
     ```bash
     curl "http://localhost:8000/api/auth/shopify/oauth?shop=pricy-test-store.myshopify.com" \
       -H "Authorization: Bearer YOUR_JWT_TOKEN"
     ```
   - The response contains an `authUrl` — open that URL in your browser

3. You'll be redirected to Shopify's OAuth consent screen
4. Click **Install app** on the Shopify consent page
5. Shopify redirects back to `http://localhost:8000/api/auth/shopify/callback` with a code
6. Pricy exchanges the code for an access token and stores it
7. You're redirected to `http://localhost:3000` (the frontend)
8. Your Shopify store is now connected!

### Step 6C: Sync your products

1. In the Pricy dashboard, go to **Products**
2. The sync can be triggered via API:
   ```bash
   curl -X POST http://localhost:8000/api/products/sync \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```
3. You should see a response like:
   ```json
   {
     "message": "Sync complete",
     "created": 5,
     "updated": 0,
     "total": 5
   }
   ```
4. Refresh the Products page in the frontend — your Shopify products should appear

---

## Part 7: Generate an API Key (for Chrome Extension)

1. Go to **Settings** in the Pricy dashboard (gear icon in the nav bar)
2. Click **Generate API Key**
3. Copy the API key (starts with `pk_`)
4. You'll need this to connect the Chrome extension

---

## Part 8: Set Up the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `chrome/` folder from the Pricy project
5. The "Pricy - Add Competitor" extension appears
6. Pin it to the toolbar (click the puzzle piece icon, then the pin next to Pricy)

### Test the extension:

1. Navigate to any product page (e.g., a competitor's product on Amazon, Walmart, etc.)
2. Click the Pricy extension icon in the toolbar
3. Enter your API key (`pk_...`) and click **Connect**
4. The extension should:
   - Show the detected product name and price from the page
   - Show a dropdown of your Pricy products to link it to
5. Select one of your synced products and click **Add Competitor**
6. After success, you'll see rule preset buttons (Match price, Stay 5% below, etc.)

---

## Part 9: Verify Everything Works End-to-End

### Checklist:

- [ ] Shopify dev store is created and has test products
- [ ] Custom app is created with `read_products` scope
- [ ] `.env` has `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`
- [ ] MongoDB is running
- [ ] API server starts without errors (`npm run dev` in `api/`)
- [ ] Frontend starts without errors (`npm run dev` in `web/`)
- [ ] Pricy account is created (sign up via frontend)
- [ ] Shopify OAuth flow completes (store connected)
- [ ] Product sync works (products appear in Pricy)
- [ ] API key is generated (from Settings page)
- [ ] Chrome extension connects with the API key
- [ ] Extension detects product data on a competitor page
- [ ] Competitor can be added and linked to a product
- [ ] Rule presets work (creates a pricing rule)

### Test the price check flow:

1. Add a competitor (via the Chrome extension or the frontend)
2. Trigger a manual price check:
   ```bash
   curl -X POST http://localhost:8000/api/competitors/COMPETITOR_ID/check \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```
3. Check the dashboard for new events
4. Check price history:
   ```bash
   curl "http://localhost:8000/api/prices/history?productId=PRODUCT_ID" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

---

## Troubleshooting

### "Shopify not connected" error on sync
- The OAuth flow didn't complete. Re-run Step 6B.
- Check MongoDB to verify `shopifyDomain` and `shopifyAccessToken` are saved on your user document:
  ```bash
  mongosh pricy --eval "db.users.findOne({}, {shopifyDomain:1, shopifyAccessToken:1})"
  ```

### OAuth callback returns "Failed to get access token"
- Double-check `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` in `.env`
- Make sure you're using the API key/secret from the **custom app**, not the Partner dashboard
- Make sure the app is installed (Step 4D)

### "Shopify API error: 401" during sync
- The access token has expired or is invalid
- Uninstall and reinstall the custom app in Shopify to get a new access token
- Re-run the OAuth flow

### Chrome extension: "Failed to load" on non-product pages
- This is expected. Content script extraction only works on HTTP pages with product markup.
- The extension shows the page URL even when extraction fails.

### Chrome extension: content script not injecting
- Make sure the extension has `<all_urls>` host permission
- Try reloading the extension on `chrome://extensions/`
- Refresh the target page after loading the extension

### Products sync but show no price
- Check that your Shopify products have at least one variant with a price set
- The sync uses the first variant's price as `currentPrice`

### MongoDB connection refused
- Make sure MongoDB is running: `mongod` or `docker start pricy-mongo`
- Default connection is `mongodb://localhost:27017/pricy`
