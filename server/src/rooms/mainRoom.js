const { Room } = require("colyseus");
const { InputData, Player, MainRoomState } = require("../states/main");

exports.default = class MainRoom extends Room {
  onCreate() {
    this.fixedTimeStep = 1000 / 60;

    this.setState(new MainRoomState());

    // set map dimensions
    this.state.mapWidth = 800;
    this.state.mapHeight = 600;

    this.onMessage(0, (client, input) => {
      // handle player input
      const player = this.state.players.get(client.sessionId);

      // enqueue input to user input buffer.
      player.inputQueue.push(input);
    });

    // this.onMessage(1, (client, input) => {
    //   // handle player input
    //   const player = this.state.players.get(client.sessionId);

    //   player.actionQueue.push("attack")

    // });

    let elapsedTime = 0;
    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    });
  }

  fixedTick(timeStep) {
    const velocity = 2;

    this.state.players.forEach((player) => {
      let input = {};

      // dequeue player inputs
      while ((input = player.inputQueue.shift())) {
        if (input.left) {
          player.x -= velocity;
        } else if (input.right) {
          player.x += velocity;
        }

        if (input.up) {
          player.y -= velocity;
        } else if (input.down) {
          player.y += velocity;
        }

        if (input.attack) {
          this.playerAttacked(player.id);
        }

        player.tick = input.tick;
      }
    });
  }

  playerAttacked(playerId) {
    this.state.players.forEach((player) => {
      if (player.id !== playerId) {
        player.hurt();
        console.log("Player hurt!");
      }
    });
  }

  onJoin(client, options) {
    console.log(client.sessionId, "joined!");

    const player = new Player(client.sessionId);
    player.x = Math.random() * this.state.mapWidth;
    player.y = Math.random() * this.state.mapHeight;

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client, consented) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
};
