const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { main } = require("./init.js");
const { exec } = require("child_process");
const path = require("path");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

global.progressStatus = null;

const storage = multer.diskStorage({
  destination: 'input/',
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

app.post("/api/send", upload.array('csv-file'), async (req, res) => {
    const files = req.files;

    console.log("Received files:", files);

    global.progressStatus = null;

    res.json({ status: "Processing started", filesCount: files.length });

    try {
      await main((progress) => {
        global.progressStatus = progress;
      });
    } catch (error) {
      console.error("Error processing files:", error);
      global.progressStatus = {
        type: 'pipeline_error',
        message: error.message
      };
    }
});

app.get("/api/status", (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to server' })}\n\n`);

  const interval = setInterval(() => {
    if (global.progressStatus) {
      res.write(`data: ${JSON.stringify(global.progressStatus)}\n\n`);
    }
  }, 500);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");

  const url = "http://localhost:3000";
  const platform = process.platform;

  let command;
  if (platform === 'darwin') {
    command = `open ${url}`;
  } else if (platform === 'win32') {
    command = `start ${url}`;
  } else {
    command = `xdg-open ${url}`;
  }

  exec(command, (error) => {
    if (error) {
      console.log(`Please open ${url} in your browser`);
    }
  });
});
