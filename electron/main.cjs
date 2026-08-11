const { app, BrowserWindow, Menu, shell, dialog } = require("electron");
const path = require("path");

// URL publicada do painel. O app sempre carrega a versão mais recente,
// então qualquer atualização publicada chega automaticamente ao desktop.
const APP_URL = "https://fluxodecaixasvdhub.lovable.app";

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0b1733",
    title: "Painel Financeiro",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  loadApp();

  // Links externos abrem no navegador padrão.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("did-fail-load", (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame) return;
    mainWindow.loadFile(path.join(__dirname, "offline.html"));
    console.error("Falha ao carregar", url, code, desc);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function loadApp() {
  if (!mainWindow) return;
  mainWindow.loadURL(APP_URL, { extraHeaders: "pragma: no-cache\n" });
}

function buildMenu() {
  const template = [
    {
      label: "Arquivo",
      submenu: [{ role: "quit", label: "Sair" }],
    },
    {
      label: "Exibir",
      submenu: [
        {
          label: "Atualizar agora",
          accelerator: "CmdOrCtrl+R",
          click: () => {
            if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
          },
        },
        { type: "separator" },
        { role: "zoomIn", label: "Aumentar zoom" },
        { role: "zoomOut", label: "Diminuir zoom" },
        { role: "resetZoom", label: "Zoom padrão" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Tela cheia" },
        { role: "toggleDevTools", label: "Ferramentas de desenvolvedor" },
      ],
    },
    {
      label: "Ajuda",
      submenu: [
        {
          label: "Sobre",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Painel Financeiro",
              message: "Painel Financeiro — Fluxo de Caixa",
              detail:
                `Versão do aplicativo: ${app.getVersion()}\n` +
                `Conteúdo: ${APP_URL}\n\n` +
                "O conteúdo é atualizado automaticamente sempre que uma nova versão é publicada.",
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    buildMenu();
    createWindow();

    // Reconsulta a versão publicada a cada 30 minutos (atualização silenciosa).
    setInterval(
      () => {
        if (mainWindow && !mainWindow.webContents.isDevToolsFocused()) {
          mainWindow.webContents.reloadIgnoringCache();
        }
      },
      30 * 60 * 1000,
    );

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

// Reservado para o fallback offline: permite tentar novamente.
app.on("browser-window-created", (_e, win) => {
  win.webContents.on("console-message", (_ev, _lvl, message) => {
    if (message === "retry-app-load") loadApp();
  });
});
