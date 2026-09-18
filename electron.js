  const { app, BrowserWindow } = require("electron");
  const path = require("path");

  function createWindow() {
    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      // Hardened renderer: no Node.js in web content, isolated context.
      // Dev-only launcher (points at the local dev server by design).
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
    });

    win.loadURL("http://localhost:3000");
  }

  app.whenReady().then(createWindow);
