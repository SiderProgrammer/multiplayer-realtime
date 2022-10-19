const { Room } = require("colyseus");
const { InputData, Player, MainRoomState, Monster } = require("../states/main");

exports.default = class MainRoom extends Room {
  onCreate() {
    this.fixedTimeStep = 1000 / 60;
    this.autoDispose = false;
    this.setState(new MainRoomState());
    this.hurtId = 0;
    // set map dimensions
    this.state.mapWidth = 800;
    this.state.mapHeight = 600;
    this.currentTick = 0;
    this.onMessage(0, (client, input) => {
      // handle player input
      const player = this.state.players.get(client.sessionId);

      // enqueue input to user input buffer.
      player.inputQueue.push(input);
    });

    for (let i = 0; i < 1; i++) {
      const monster = new Monster(i);

      monster.x = 200 + i * 150;
      monster.y = 100;

      this.state.monsters.set(i, monster);
    }
    setInterval(() => {
      this.state.monsters.get(0).nextTickAttack = true;
    }, 5000);
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
    this.currentTick++;
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

        player.tick = this.currentTick;

        player.pastQueue.push({
          tick: this.currentTick,
          x: player.x,
          y: player.y,
          attack: input.attack,
          timestamp: input.timestamp,
        });
      }

      if (!input) {
        player.pastQueue.push({
          tick: this.currentTick,
          x: player.x,
          y: player.y,
          timestamp: Date.now(), // TODO : calc delay and set it here
        });
      }
    });

    this.state.monsters.forEach((monster) => {
      //if (monster.canMove) monster.y += 0.2;
      const timestamp = Date.now();
      monster.attack = true;
      monster.pastQueue.push({
        y: monster.y,
        x: monster.x,
        attack: monster.nextTickAttack,
        timestamp: timestamp,
      });

      if (monster.nextTickAttack) {
        this.entityAttacked(monster, timestamp, this.state.players);
        console.log("monster attacked!");
      }

      monster.attack = false;
      monster.nextTickAttack = false;

      // TODO : set better condition
      if (monster.pastQueue.length > 100) {
        monster.pastQueue.shift();
      }
    });

    this.state.players.forEach((player) => {
      const input = player.pastQueue;
      const arrOfPastInputs = Object.values(input);

      arrOfPastInputs.forEach((pastInput) => {
        if (pastInput.attack) {
          // this.playerAttacked(player.id, pastInput.tick, pastInput.timestamp);
          this.entityAttacked(player, pastInput.timestamp, this.state.monsters);
          pastInput.attack = false;
        }
      });
    });
  }

  entityAttacked(attacker, attackerTimestamp, enemies) {
    // create state buffer of every action in the world and clear it every world update
    // if (attacker.isStunned) return;
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

    attacker.hitTimeout = setTimeout(() => {
      attacker.isAttacking = false;

      enemies.forEach((enemy) => {
        enemy.displayWidth = 401 * 0.3;
        enemy.displayHeight = 394 * 0.3;

        // const pastPos =
        // monster.pastQueue.find((data) => data.tick === attackerTick) ||
        // monster;

        const goal = attackerTimestamp + 14 * 30;

        const pastTimestamp = enemy.pastQueue.reduce(function (prev, curr) {
          return Math.abs(curr.timestamp - goal) < Math.abs(prev - goal)
            ? curr.timestamp
            : prev;
        }, 0);

        const pastPos = enemy.pastQueue.find(
          (queue) => queue.timestamp === pastTimestamp
        );

        const pastPosition = {
          x: pastPos.x,
          y: pastPos.y,
          displayWidth: enemy.displayWidth,
          displayHeight: enemy.displayHeight,
        };
        // const attackInPast = player.pastQueue.find((input) => input.attack);

        // if (attackInPast) {
        //   console.log("atack");
        //   if (attackerTimestamp < attackInPast.timestamp) {
        //     console.log("ENEMY WAS FASTER!");
        //     return;
        //   }
        // }

        if (this.isColliding(attackerHitbox, pastPosition)) {
          console.log(this.hurtId++, "Someone got hurt!");

          enemy.hurt();
          enemy.canMove = false;
          //enemy.isStunned = true;
          if (enemy.hitTimeout) clearTimeout(enemy.hitTimeout);
          setTimeout(() => {
            enemy.canMove = true;
            enemy.isAttacking = false;
            //enemy.isStunned = false;
          }, 14 * 30);
        }
      });
    }, 22 * 30);
  }

  // playerAttacked(playerId, attackerTick, attackerTimestamp) {
  //   const attacker = this.state.players.get(playerId);

  //   attacker.isAttacking = true;

  //   const attackerHitbox = {
  //     x: attacker.x,
  //     y: attacker.y,
  //     displayWidth: 50,
  //     displayHeight: 394 * 0.3,
  //   };

  //   if (!attacker.flipX) {
  //     attackerHitbox.x += 401 * 0.3 - 50;
  //   }

  //   setTimeout(() => {
  //     attacker.isAttacking = false;
  //     this.state.monsters.forEach((monster) => {
  //       monster.displayWidth = 401 * 0.3;
  //       monster.displayHeight = 394 * 0.3;

  //       // const pastPos =
  //       // monster.pastQueue.find((data) => data.tick === attackerTick) ||
  //       // monster;

  //       const goal = attackerTimestamp + 14 * 30;

  //       const pastTimestamp = monster.pastQueue.reduce(function (prev, curr) {
  //         return Math.abs(curr.timestamp - goal) < Math.abs(prev - goal)
  //           ? curr.timestamp
  //           : prev;
  //       }, 0);

  //       const pastPos = monster.pastQueue.find(
  //         (queue) => queue.timestamp === pastTimestamp
  //       );

  //       const pastPosition = {
  //         x: pastPos.x,
  //         y: pastPos.y,
  //         displayWidth: monster.displayWidth,
  //         displayHeight: monster.displayHeight,
  //       };
  //       // const attackInPast = player.pastQueue.find((input) => input.attack);

  //       // if (attackInPast) {
  //       //   console.log("atack");
  //       //   if (attackerTimestamp < attackInPast.timestamp) {
  //       //     console.log("ENEMY WAS FASTER!");
  //       //     return;
  //       //   }
  //       // }

  //       if (this.isColliding(attackerHitbox, pastPosition)) {
  //         console.log(this.hurtId++, "Monster hurt!");

  //         monster.hurt();
  //         monster.canMove = false;

  //         setTimeout(() => {
  //           monster.canMove = true;
  //         }, 14 * 30);
  //       }
  //     });
  //   }, 22 * 30);
  // }

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
