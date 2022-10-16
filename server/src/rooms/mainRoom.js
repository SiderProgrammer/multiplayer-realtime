const { Room } = require("colyseus");
const { InputData, Player, MainRoomState } = require("../states/main");

exports.default = class MainRoom extends Room {
  onCreate() {
    this.fixedTimeStep = 1000 / 60;
    this.autoDispose = false;
    this.setState(new MainRoomState());
    this.hurtId = 0;
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
        if (player.canMove) {
          if (input.left) {
            player.x -= velocity;
            player.flipX = true;
          } else if (input.right) {
            player.x += velocity;
            player.flipX = false;
          }

          if (input.up) {
            player.y -= velocity;
          } else if (input.down) {
            player.y += velocity;
          }
        }

        player.tick = input.tick;

        player.pastQueue.push({
          tick: player.tick,
          x: player.x,
          y: player.y,
          attack: input.attack,
          timestamp: input.timestamp,
        });
      }
    });

    this.state.players.forEach((player) => {
      const input = player.pastQueue;
      const arrOfPastInputs = Object.values(input);

      arrOfPastInputs.forEach((pastInput) => {
        if (pastInput.attack) {
          this.playerAttacked(player.id, pastInput.tick, pastInput.timestamp);
          pastInput.attack = false;
        }
      });
    });
  }

  playerAttacked(playerId, attackerTick, attackerTimestamp) {
    const attacker = this.state.players.get(playerId);

    attacker.isAttacking = true;

    const attackerHitbox = {
      x: attacker.x,
      y: attacker.y,
      displayWidth: 50,
      displayHeight: 394 * 0.3,
    };

    if (!attacker.flipX) {
      attackerHitbox.x += 401 * 0.3 - 50;
    }

    setTimeout(() => {
      attacker.isAttacking = false;
      this.state.players.forEach((player) => {
        if (player.id !== playerId) {
          player.displayWidth = 401 * 0.3;
          player.displayHeight = 394 * 0.3;

          const pastPos =
            player.pastQueue.find((input) => input.tick === attackerTick) ||
            player;
          const pastPosition = {
            x: pastPos.x,
            y: pastPos.y,
            displayWidth: player.displayWidth,
            displayHeight: player.displayHeight,
          };
          const attackInPast = player.pastQueue.find((input) => input.attack);

          if (attackInPast) {
            console.log("atack");
            if (attackerTimestamp < attackInPast.timestamp) {
              console.log("ENEMY WAS FASTER!");
              return;
            }
          }

          if (this.isColliding(attackerHitbox, pastPosition)) {
            console.log(this.hurtId++, "Player hurt!");

            player.hurt();
            player.canMove = false;
            setTimeout(() => {
              player.canMove = true;
            }, 14 * 30);
          }
        }
      });
    }, 22 * 30);
  }

  onJoin(client, options) {
    function randomIntFromInterval(min, max) {
      // min and max included
      return Math.floor(Math.random() * (max - min + 1) + min);
    }

    console.log(client.sessionId, "joined!");

    const player = new Player(client.sessionId);

    player.x = randomIntFromInterval(200, this.state.mapWidth - 200);
    player.y = 250;

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client, consented) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }

  isColliding(obj1, obj2) {
    if (
      obj1.x < obj2.x + obj2.displayWidth &&
      obj1.x + obj1.displayWidth > obj2.x &&
      obj1.y < obj2.y + obj2.displayHeight &&
      obj1.displayHeight + obj1.y > obj2.y
    ) {
      return true;
    }
  }
};
