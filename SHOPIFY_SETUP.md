# Shopify Test Store Setup for Pricy

Complete step-by-step guide to creating a Shopify development store and wiring it to your local Pricy instance.

> **Last verified**: February 2026. Reflects the Dev Dashboard migration and legacy custom app deprecation (January 1, 2026).

---

## Part 1: Create a Shopify Partner Account

1. Go to https://www.shopify.com/partners and click **Become a partner**
2. You'll be redirected to `accounts.shopify.com` — create a Shopify account (email + password) or log in if you already have one
3. Choose **Create a new partner organization**
4. Select your main focus area (e.g. "Building apps")
5. Fill in the required business information:
   - **Business name** (can be your own name for testing)
   - **Job title**
   - **Business address** (street, city, postal code, country)
   - **Phone number**
   - Accept the **Partner Program Agreement**
6. Confirm your email address via the verification link Shopify sends
7. You're now in the **Shopify Partner Dashboard**

---

## Part 2: Create a Development Store

A development store is a free Shopify store with no trial limits and no expiration. It can't process real payments but has full API access.

### Option A: Via the Partner Dashboard

1. In the Partner Dashboard, click **Stores** in the left sidebar
2. Click **Add store**
3. Select **Development store**
4. Choose **Create a store to test and build**
5. Fill in the store details:
   - **Store name**: Something like `pricy-test-store` (this becomes `pricy-test-store.myshopify.com`)
   - **Country/Region**: Select your country
   - **Build version**: Leave on "Current release"
   - Optionally check **Create store with test data** (pre-populates sample products — saves time, see Part 3)
6. Click **Create development store**
7. Wait for the store to be created — you'll be redirected to its admin

### Option B: Via the Dev Dashboard (newer)

1. Go to https://dev.shopify.com/dashboard
2. Click **Dev stores** in the left sidebar
3. Click **Add dev store**
4. Fill in the store name and country
5. Click **Create**

> **Note**: You do NOT set a separate email/password for the dev store. You access it through your Partner/Dev Dashboard account by clicking **Log in** next to the store.

**Save this value — you'll need it later:**
- **Shop domain**: `pricy-test-store.myshopify.com` (your actual store URL)

---

## Part 3: Add Test Products to the Store

You need products in the store so Pricy has something to sync.

### Option A: Pre-populated dev store (fastest)

When creating the development store in Part 2, check **Create store with test data**. Shopify will pre-populate the store with sample products, collections, and other test data automatically. If you already created the store without this, use one of the options below.

### Option B: Import via CSV

1. In your store admin (`pricy-test-store.myshopify.com/admin`)
2. Go to **Products** in the left sidebar
3. Click **Import** (top right)
4. Download Shopify's official sample CSV template:
   https://help.shopify.com/csv/product_template.csv
5. Upload the CSV file and click **Import**

For a richer set of sample products with images, see:
https://github.com/shopifypartners/product-csvs

### Option C: Create products manually

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

---

## Part 4: Create a Custom App (API credentials)

> **Important (Jan 2026 change):** Legacy custom apps can no longer be created from the Shopify Admin. All new custom apps must be created through the **Dev Dashboard**. Existing legacy apps still work, but the old "Settings > Apps > Develop apps" flow is no longer available for new apps.

Pricy connects to Shopify via a Custom App. This is how you get the Client ID, Client Secret, and set up OAuth access.

### Step 4A: Create the app in the Dev Dashboard

1. Go to https://dev.shopify.com/dashboard
2. Click **Apps** in the left sidebar
3. Click **Create app** (top right)
4. Enter the app name: `Pricy`
5. Click **Create**

### Step 4B: Configure API scopes

1. You're now on the app's overview page
2. Go to the **Versions** tab
3. In the **Access** section, add these Admin API scopes:

**Required scopes:**
- `read_products` — Pricy needs to read your product catalog

**Recommended additional scopes (for future features):**
- `read_orders` — if you ever want order-based pricing insights
- `read_inventory` — if you want stock-level awareness
- `write_products` — if you want Pricy to auto-update your prices based on rules

4. Click **Save**

### Step 4C: Configure the app URLs

1. Go to the **Settings** tab of your app
2. Set the **App URL** to: `http://localhost:7001`
3. Under **Allowed redirection URL(s)**, add:
   ```
   http://localhost:7000/api/auth/shopify/callback
   ```
4. Click **Save**

### Step 4D: Get your credentials

1. Still on the **Settings** tab, find the **Client credentials** section
2. Copy these two values:

| Value | Where to find it | Example |
|-------|-------------------|---------|
| **Client ID** | Settings page | `a1b2c3d4e5f6g7h8i9j0...` |
| **Client Secret** | Settings page, click "Show" | (long string) |

> **Note (terminology change):** What was previously called "API key" is now **Client ID**. What was "API secret key" is now **Client Secret**. Pricy's `.env` still uses `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` which map directly.

### Step 4E: Install the app on your dev store

1. In the Dev Dashboard, go to your app
2. Navigate to the **Overview** or **Install** section
3. Select your development store from the list
4. Click **Install**
5. Approve the requested permissions on the consent screen

> **About access tokens:** When Pricy's OAuth flow completes (Part 6B), Shopify will issue an access token (prefixed `shpat_`). Unlike the old legacy flow where tokens were permanent, tokens obtained through the standard OAuth flow via the Dev Dashboard may have a **24-hour expiry** if using the client credentials grant. The authorization code grant used by Pricy's OAuth flow currently issues offline tokens, but be aware that Shopify is moving toward expiring tokens with refresh capabilities. If you encounter 401 errors after some time, re-running the OAuth flow will get a fresh token.

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
CORS_ORIGINS=http://localhost:7001

# Shopify OAuth
SHOPIFY_CLIENT_ID=your-client-id-from-step-4D
SHOPIFY_CLIENT_SECRET=your-client-secret-from-step-4D
SHOPIFY_REDIRECT_URI=http://localhost:7000/api/auth/shopify/callback

# Frontend URL
FRONTEND_URL=http://localhost:7001
```

Replace the placeholder values with your actual **Client ID** and **Client Secret** from Step 4D.

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

Frontend runs at `http://localhost:7001`.

---

## Part 6: Create a Pricy Account and Connect Shopify

### Step 6A: Sign up in Pricy

1. Open `http://localhost:7001` in your browser
2. Click **Sign Up**
3. Create an account (name, email, password)
4. You'll be logged into the dashboard

### Step 6B: Connect your Shopify store via OAuth

1. The OAuth flow is triggered by navigating to:
   ```
   http://localhost:7000/api/auth/shopify/oauth?shop=pricy-test-store.myshopify.com
   ```
   (Replace `pricy-test-store.myshopify.com` with your actual store domain)

2. **Important**: You must be authenticated. Use this approach:
   - First, get your JWT token from the login response (visible in browser DevTools > Network tab after logging in)
   - Then use curl:
     ```bash
     curl "http://localhost:7000/api/auth/shopify/oauth?shop=pricy-test-store.myshopify.com" \
       -H "Authorization: Bearer YOUR_JWT_TOKEN"
     ```
   - The response contains an `authUrl` — open that URL in your browser

3. You'll be redirected to Shopify's OAuth consent screen
4. Click **Install app** on the Shopify consent page
5. Shopify redirects back to `http://localhost:7000/api/auth/shopify/callback` with a code
6. Pricy exchanges the code for an access token and stores it on your user record
7. You're redirected to `http://localhost:7001` (the frontend)
8. Your Shopify store is now connected!

### Step 6C: Sync your products

1. In the Pricy dashboard, go to **Products**
2. The sync can be triggered via API:
   ```bash
   curl -X POST http://localhost:7000/api/products/sync \
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

- [ ] Shopify Partner account is created
- [ ] Dev store is created and has test products
- [ ] Custom app is created in the **Dev Dashboard** with `read_products` scope
- [ ] App redirect URL is set to `http://localhost:7000/api/auth/shopify/callback`
- [ ] `.env` has `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` from Dev Dashboard
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
   curl -X POST http://localhost:7000/api/competitors/COMPETITOR_ID/check \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```
3. Check the dashboard for new events
4. Check price history:
   ```bash
   curl "http://localhost:7000/api/prices/history?productId=PRODUCT_ID" \
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
- Double-check `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET` in `.env` — these must be the **Client ID** and **Client Secret** from the Dev Dashboard, not the Partner Dashboard
- Make sure the app is installed on your dev store (Step 4E)
- Make sure the redirect URL in the Dev Dashboard matches exactly: `http://localhost:7000/api/auth/shopify/callback`

### "Shopify API error: 401" during sync
- The access token may have expired (tokens can expire after 24 hours)
- Re-run the OAuth flow (Step 6B) to get a fresh token
- Verify the token exists in the database:
  ```bash
  mongosh pricy --eval "db.users.findOne({}, {shopifyAccessToken:1})"
  ```

### "Shopify API error: 404" during sync
- The API version may be outdated. Check `api/src/services/ShopifyService.js` and ensure `apiVersion` is set to a currently supported version (e.g. `2026-01`). Shopify retires API versions after ~12 months.

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

---

## Known Code Issues (Future Work)

1. **Automatic token refresh**: The codebase now detects expired tokens and returns clear errors, but does not yet automatically re-request tokens using the client credentials grant. Users must re-run the OAuth flow manually when a token expires.

## Technical Notes

- **GraphQL Admin API**: The ShopifyService uses the GraphQL Admin API (`/admin/api/2026-01/graphql.json`) exclusively. The REST Admin API is not used. This is required for new public apps submitted to the Shopify App Store since April 2025.
- **API version**: `2026-01` (latest stable). Shopify retires versions after ~12 months. Update annually.
