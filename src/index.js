const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const api = require('./routes/api');
const { requireAuth } = require('./middleware/auth');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '1mb' }));

// Attach a small health route
app.get('/_health', (req, res) => res.json({ status: 'ok' }));

// ── Auth login route (public — no auth required) ──────────────────────────
// Step 1: Extension opens browser to this URL with ?callback=vscode://...
// Step 2: Backend generates a custom token for a demo UID
// Step 3: Redirects back to vscode:// URI with uid + token
const { auth: firebaseAuth } = require('./firebase');

app.get('/api/auth/login', async (req, res) => {
  try {
    const callbackUrl = req.query.callback;
    if (!callbackUrl) {
      return res.status(400).send('Missing callback parameter');
    }

    // Support passing a UID from the dashboard for real user auth
    const uid = req.query.uid || 'contextlens-demo-user';

    // Generate a Firebase custom token for this uid
    const customToken = await firebaseAuth.createCustomToken(uid);

    // Redirect back to VS Code extension with uid + token
    const redirectUrl = `${callbackUrl}?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(customToken)}`;
    
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ContextLens Authentication</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: radial-gradient(circle at center, #0a0e17 0%, #04060a 100%);
            color: #ffffff;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            overflow: hidden;
          }
          
          /* Ambient glowing background effect */
          .glow {
            position: absolute;
            width: 600px;
            height: 600px;
            background: radial-gradient(circle, rgba(126, 200, 200, 0.15) 0%, rgba(0, 0, 0, 0) 70%);
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 0;
            pointer-events: none;
          }

          .container {
            position: relative;
            z-index: 1;
            background: rgba(22, 27, 34, 0.6);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            padding: 3rem 2.5rem;
            border-radius: 20px;
            border: 1px solid rgba(126, 200, 200, 0.15);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
            text-align: center;
            max-width: 420px;
            animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            opacity: 0;
            transform: translateY(20px);
          }
          
          @keyframes slideUp {
            to { opacity: 1; transform: translateY(0); }
          }

          .logo {
            font-size: 3rem;
            margin-bottom: 1.25rem;
            color: #7ec8c8;
            text-shadow: 0 0 20px rgba(126, 200, 200, 0.5);
            animation: float 3s ease-in-out infinite;
          }
          
          @keyframes float {
            0% { transform: translateY(0px) scale(0.95); opacity: 0.9; }
            50% { transform: translateY(-8px) scale(1.05); opacity: 1; }
            100% { transform: translateY(0px) scale(0.95); opacity: 0.9; }
          }

          h1 {
            color: #ffffff;
            margin-top: 0;
            margin-bottom: 0.75rem;
            font-size: 1.65rem;
            font-weight: 500;
            letter-spacing: -0.02em;
          }

          p {
            margin-bottom: 2.25rem;
            color: #a1aab5;
            line-height: 1.6;
            font-size: 0.85rem;
            font-weight: 300;
          }

          .counter {
            font-weight: 600;
            color: #7ec8c8;
            display: inline-block;
            min-width: 1ch;
          }

          .button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #4f98a3 0%, #3a757e 100%);
            color: #ffffff;
            padding: 0.85rem 2rem;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 500;
            font-size: 0.95rem;
            letter-spacing: 0.02em;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 15px rgba(79, 152, 163, 0.3);
          }

          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(79, 152, 163, 0.4);
            background: linear-gradient(135deg, #5baab6 0%, #468c97 100%);
          }
          
          .button:active {
            transform: translateY(1px);
            box-shadow: 0 2px 10px rgba(79, 152, 163, 0.3);
          }
        </style>
      </head>
      <body>
        <div class="glow"></div>
        <div class="container">
          <div class="logo">✦</div>
          <h1>Authentication Successful!</h1>
          <p>You have successfully signed in to ContextLens.<br/>This window will automatically redirect back to VS Code in <span id="counter" class="counter">5</span> seconds, after which you may close this tab.</p>
          <a href="${redirectUrl}" class="button">Open VS Code Now</a>
        </div>
        <script>
          let seconds = 5;
          const counterEl = document.getElementById('counter');
          
          // Dynamic countdown timer
          const interval = setInterval(() => {
            seconds -= 1;
            if (seconds > 0) {
              counterEl.textContent = seconds;
            } else {
              clearInterval(interval);
            }
          }, 1000);

          // Redirect and close attempt
          setTimeout(() => {
            window.location.href = "${redirectUrl}";
            // Attempt to close the window shortly after redirecting
            setTimeout(() => {
              window.close();
            }, 1000);
          }, 5000);
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Auth login error:', err);
    res.status(500).send('Authentication failed');
  }
});

// All other API routes require Firebase auth
app.use('/api', requireAuth, api);

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: { code: 'internal_error', message: 'Unexpected server error' } });
});

const functions = require('firebase-functions');

// Check if we're running locally (not in Firebase Functions emulator or production)
if (process.env.NODE_ENV === 'development' && !process.env.FUNCTIONS_EMULATOR) {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`ContextLens backend listening on port ${port}`);
  });
}

// Export as Firebase Function
exports.api = functions.https.onRequest(app);
