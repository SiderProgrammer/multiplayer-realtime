const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server, matchMaker } = require("@colyseus/core");
const MainRoom = require("./src/rooms/mainRoom").default;

//const { SERVER_PORT } = require("../shared/config");

const port = 8080;
const host = "10.7.1.246";
const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const gameServer = new Server({
  server,
});
gameServer.simulateLatency(200);

gameServer.listen(port, host, undefined, async () => {
  gameServer.define("MainRoom", MainRoom);
  matchMaker.createRoom("MainRoom");
});

console.log(`Server is listening on localhost:${port}`);
