const express = require("express");
const app = express();
const server = require("http").Server(app);
const { v4: uuidv4 } = require("uuid");

// 添加信任代理设置
app.set('trust proxy', 1);

// 添加基本的安全头部
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.set("view engine", "ejs");
const io = require("socket.io")(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  path: '/socket.io/',
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000
});

const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/',
  proxied: true
});

// 添加错误处理
peerServer.on('connection', (client) => {
  console.log('Peer connected:', client.id);
});

peerServer.on('disconnect', (client) => {
  console.log('Peer disconnected:', client.id);
});

peerServer.on('error', (err) => {
  console.error('Peer server error:', err);
});

app.use('/peerjs', peerServer);
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.redirect(`/${uuidv4()}`);
});

app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId, userName) => {
    socket.join(roomId);
    setTimeout(()=>{
      socket.to(roomId).broadcast.emit("user-connected", userId);
    }, 1000)
    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", message, userName);
    });
  });
});

const PORT = process.env.PORT || 3030;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`PeerJS server is running on /peerjs`);
});
