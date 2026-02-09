const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const os = require("os");

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 900,
        focusable: true, 
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
    });

    win.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

// Handler for blur bug
ipcMain.on("refocus-window", () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.blur();
        setTimeout(() => {
            win.focus();
        }, 100);
    }
});

// Handler for background image select
ipcMain.handle("select-background", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        defaultPath: os.homedir() + "/Pictures",
        filters: [{ name: "Images", extensions: ["jpg", "png", "jpeg", "gif"] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    console.log("Selected file path:", result.filePaths[0]);

    return result.filePaths[0];
});
