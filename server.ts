import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // GitHub OAuth Callback
  app.get("/auth/github/callback", async (req, res) => {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).send("Code is required");
    }

    try {
      const response = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: process.env.VITE_GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = response.data;
      
      // Send success message to parent window and close popup
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ 
                  type: 'GITHUB_AUTH_SUCCESS', 
                  token: '${data.access_token}' 
                }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("GitHub OAuth Error:", error.response?.data || error.message);
      res.status(500).send("Failed to exchange code for token");
    }
  });

  // Legacy API endpoint (keep for compatibility if needed, but callback is preferred for popup)
  app.post("/api/github/token", async (req, res) => {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    try {
      const response = await axios.post(
        "https://github.com/login/oauth/access_token",
        {
          client_id: process.env.VITE_GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error("GitHub OAuth Error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to exchange code for token" });
    }
  });

  // Sync Project with GitHub Files
  app.post("/api/project/sync", async (req, res) => {
    const { files } = req.body;
    console.log(`Sync request received. Files to sync: ${files?.length || 0}`);
    
    if (!files || !Array.isArray(files)) {
      console.error("Sync Error: Invalid files array");
      return res.status(400).send("Files array is required");
    }

    try {
      for (const file of files) {
        if (file.type === 'blob') {
          const filePath = path.join(process.cwd(), file.path);
          const dirPath = path.dirname(filePath);
          
          // Ensure directory exists
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }
          
          // Write file
          console.log(`Writing file: ${file.path}`);
          fs.writeFileSync(filePath, file.content);
        }
      }
      console.log("Sync completed successfully");
      res.json({ success: true, message: "Project synced successfully. Restarting..." });
    } catch (error: any) {
      console.error("Sync Error Details:", error);
      res.status(500).send(`Failed to sync project files: ${error.message}`);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
