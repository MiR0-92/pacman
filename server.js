const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Enhanced static file serving with error handling
app.use(express.static(__dirname, {
    extensions: ['html'],
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.set('Content-Type', 'text/html');
        }
    }
}));

// Explicit routes with error handling
app.get(['/', '/index.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) {
            console.error('Failed to send index.html:', err);
            res.status(500).send('Error loading game');
        }
    });
});

app.get('/controller(.html)?', (req, res) => {
    res.sendFile(path.join(__dirname, 'controller.html'), (err) => {
        if (err) {
            console.error('Failed to send controller.html:', err);
            res.status(404).send('Controller not found');
        }
    });
});

// Debug middleware
app.use((req, res, next) => {
    console.log(`Requested: ${req.method} ${req.url}`);
    next();
});

// Socket.io setup
io.on('connection', (socket) => {
    console.log('A user connected from', socket.handshake.headers.referer);
    socket.on('control', (data) => {
        socket.broadcast.emit('game-control', data);
    });
});

const PORT = 3000;
http.listen(PORT, () => {
    console.log(`Server running on:
    - Game: http://localhost:${PORT}
    - Controller: http://localhost:${PORT}/controller
    - Controller (alt): http://localhost:${PORT}/controller.html`);
});