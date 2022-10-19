import Phaser from "phaser";
import { Room, Client } from "colyseus.js";
import { BACKEND_URL } from "../backend";
import HealthBar from "../components/Healthbar";

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: "MainScene" });

    this.room = {};

    this.currentPlayer = null;
    this.playerEntities = {};
    this.monsterEntities = {};

    this.debugFPS = {};

    this.localRef = {};
    this.removeRef = {};

    this.cursorKeys = {};

    this.inputPayload = {
      left: false,
      right: false,
      up: false,
      down: false,
      tick: undefined,
    };

    this.elapsedTime = 0;
    this.fixedTimeStep = 1000 / 60;

    this.currentTick = 0;
  }

  preload() {
    this.load.image("logo", "./assets/logo.png");
    this.load.image("healthBarContainer", "./assets/healthBarContainer.png");
    this.load.image("healthBar", "./assets/healthBar.png");

    this.load.atlas(
      "char1_walk",
      "./assets/Char03/Walk/char1_walk.png",
      "./assets/Char03/Walk/char1_walk.json"
    );
    this.load.atlas(
      "char1_hit",
      "./assets/Char03/Hit/char1_hit.png",
      "./assets/Char03/Hit/char1_hit.json"
    );
    this.load.atlas(
      "char1_idle",
      "./assets/Char03/Idle/char1_idle.png",
      "./assets/Char03/Idle/char1_idle.json"
    );
    this.load.atlas(
      "char1_hurt",
      "./assets/Char03/GetHit/char1_hurt.png",
      "./assets/Char03/GetHit/char1_hurt.json"
    );
  }

  createEntity(x, y) {
    const entity = this.add
      .sprite(x, y, "char1_idle")
      .setOrigin(0)
      .play("char1_idle")
      .setScale(0.3);
    entity.health = 100;
    entity.canMove = true;
    entity.hasAttacked = false;
    entity.isDuringAttack = false;
    entity.isAlive = true;
    entity.pastQueue = [];
    entity.update = () => {
      entity.healthbar.setPosition(entity.x, entity.y - 50);
    };
    entity.on(
      "animationcomplete",
      function (anim, frame) {
        this.emit("animationcomplete_" + anim.key, anim, frame);
      },
      entity
    );

    entity.on("animationcomplete_char1_hit", function () {
      entity.isPlayingHitAnimation = false;
      // entity.hasAttacked = true;
    });
    entity.on("animationcomplete_char1_hurt", function () {
      entity.canMove = true;
    });
    entity.healthbar = new HealthBar(
      this,
      entity.x,
      entity.y - 100,
      entity.health
    );

    entity.attackHitbox = {
      x: 0,
      y: 0,
      width: 50,
      height: entity.displayHeight,
      flipX: entity.flipX,
    };

    entity.hurt = () => {
      if (!entity.isAlive) return;
      entity.health -= 20;
      entity.healthbar.health = entity.health;
      entity.healthbar.update();
      entity.play("char1_hurt", true);
      entity.canMove = false;
      entity.isPlayingHitAnimation = false;
      if (entity.health <= 0) {
        entity.isAlive = false;
        entity.destroy();
      }
    };
    return entity;
  }

  async create() {
    const animations = [
      {
        key: "char1_walk",
        frames: this.anims.generateFrameNames("char1_walk", {
          prefix: "skeleton-Walk_",
          start: 0,
          end: this.textures.list.char1_walk.frameTotal - 2,
        }),
        frameRate: 20,
      },
      {
        key: "char1_idle",
        frames: this.anims.generateFrameNames("char1_idle", {
          prefix: "skeleton-Idle_",
          start: 0,
          end: this.textures.list.char1_idle.frameTotal - 2,
        }),
        frameRate: 20,
        repeat: -1,
      },
      {
        key: "char1_hit",
        frames: this.anims.generateFrameNames("char1_hit", {
          prefix: "skeleton-Hit_",
          start: 0,
          end: 21,
        }),
        frameRate: 30,
      },
      {
        key: "char1_hurt",
        frames: this.anims.generateFrameNames("char1_hurt", {
          prefix: "skeleton-GetHit_",
          start: 0,
          end: 13,
        }),
        frameRate: 30,
      },
    ];
    const attackAnimDuration = 22 * 30;

    animations.forEach((anim) => this.anims.create(anim));

    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.debugFPS = this.add.text(4, 4, "", { color: "#ff0000" });

    await this.connect();

    this.room.state.monsters.onAdd = (monster) => {
      const entity = this.createEntity(monster.x, monster.y);

      this.monsterEntities[monster.id] = entity;

      entity.localRef = this.add
        .rectangle(0, 0, entity.displayWidth, entity.displayHeight)
        .setOrigin(0);

      entity.localRef.setStrokeStyle(1, 0x00ff00);

      monster.onChange = () => {
        entity.isAttacking = monster.isAttacking;
        entity.setData("serverX", monster.x);
        entity.setData("serverY", monster.y);

        if (monster.health < entity.health) {
          //entity.health = player.health;
          entity.hurt();
          // entity.play("char1_idle", true);
          if (!entity.isAlive) delete this.monsterEntities[monster.id];
        }
      };
    };

    this.room.state.players.onAdd = (player, sessionId) => {
      const entity = this.createEntity(player.x, player.y);

      this.playerEntities[sessionId] = entity;

      // is current player
      if (sessionId === this.room.sessionId) {
        this.currentPlayer = entity;

        this.localRef = this.add
          .rectangle(0, 0, entity.displayWidth, entity.displayHeight)
          .setOrigin(0);
        this.localRef.setStrokeStyle(1, 0x00ff00);

        this.remoteRef = this.add
          .rectangle(0, 0, entity.displayWidth, entity.displayHeight)
          .setOrigin(0);
        this.remoteRef.setStrokeStyle(1, 0xff0000);

        player.onChange = () => {
          this.remoteRef.x = player.x;
          this.remoteRef.y = player.y;
          // const pastInput = entity.pastQueue.find(
          //   (pastInput) => pastInput.tick === player.tick
          // );

          // console.log(entity.x, entity.y, serverX, serverY);

          // if (
          // //  pastInput &&
          // //  player.canMove &&
          //   (pastInput.x !== player.x || pastInput.y !== player.y)
          // ) {
          //   entity.x = player.x;
          //   entity.y = player.y;
          //   // entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
          //   //entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);
          // }
          // entity.x = player.x;
          // entity.y = player.y;
          if (player.health < entity.health) {
            //entity.health = player.health;
            entity.hurt();
            if (entity.x !== player.x || entity.y !== player.y) {
              // entity.x = player.x;
              // entity.y = player.y;
              // entity.x = Phaser.Math.Linear(entity.x, player.x, 0.2);
              // entity.y = Phaser.Math.Linear(entity.y, player.y, 0.2);
              this.tweens.add({
                targets: entity,
                x: player.x,
                y: player.y,
                duration: 100,
              });
            }
            // entity.play("char1_idle", true);
          }
        };
      } else {
        // listening for server updates
        entity.localRef = this.add
          .rectangle(0, 0, entity.displayWidth, entity.displayHeight)
          .setOrigin(0);
        entity.localRef.setStrokeStyle(1, 0x00ff00);
        player.onChange = () => {
          //
          // we're going to LERP the positions during the render loop.
          //
          entity.isAttacking = player.isAttacking;
          entity.setData("serverX", player.x);
          entity.setData("serverY", player.y);

          if (player.health < entity.health) {
            //entity.health = player.health;
            entity.hurt();
            // entity.play("char1_idle", true);
          }
        };
      }
    };

    // remove local reference when entity is removed from the server
    this.room.state.players.onRemove = (player, sessionId) => {
      const entity = this.playerEntities[sessionId];
      if (entity) {
        entity.destroy();
        delete this.playerEntities[sessionId];
      }
    };

    // this.cameras.main.startFollow(this.ship, true, 0.2, 0.2);
    // this.cameras.main.setZoom(1);
    this.cameras.main.setBounds(0, 0, 800, 600);

    this.input.on("pointerdown", () => {
      this.attack();
    });
  }

  attack() {
    this.currentPlayer.isPlayingHitAnimation = true;
    this.currentPlayer.hasAttacked = true;
    this.currentPlayer.isDuringAttack = true;
  }

  async connect() {
    // add connection status text
    const connectionStatusText = this.add
      .text(0, 0, "Trying to connect with the server...")
      .setStyle({ color: "#ff0000" })
      .setPadding(4);

    //const client = new Client(BACKEND_URL);
    const client = new Client("ws://10.7.1.246:8080");

    try {
      this.room = await client.joinOrCreate("MainRoom", {});
      console.log("ROOM", this.room);

      // connection successful!
      connectionStatusText.destroy();
    } catch (e) {
      console.log(e);
      // couldn't connect
      connectionStatusText.text = "Could not connect with the server.";
    }
  }

  update(time, delta) {
    // skip loop if not connected yet.
    if (!this.currentPlayer) {
      return;
    }

    for (const entity in this.playerEntities) {
      this.playerEntities[entity].update();
    }
    for (const entity in this.monsterEntities) {
      this.monsterEntities[entity].update();
    }
    this.elapsedTime += delta;
    while (this.elapsedTime >= this.fixedTimeStep) {
      this.elapsedTime -= this.fixedTimeStep;
      this.fixedTick(time, this.fixedTimeStep);
    }

    this.debugFPS.text = `Frame rate: ${this.game.loop.actualFps}`;
  }

  fixedTick(time, delta) {
    this.currentTick++;

    // const currentPlayerRemote = this.room.state.players.get(this.room.sessionId);
    // const ticksBehind = this.currentTick - currentPlayerRemote.tick;
    // console.log({ ticksBehind });

    const velocity = 2;
    this.inputPayload.left = this.cursorKeys.left.isDown;
    this.inputPayload.right = this.cursorKeys.right.isDown;
    this.inputPayload.up = this.cursorKeys.up.isDown;
    this.inputPayload.down = this.cursorKeys.down.isDown;
    this.inputPayload.tick = this.currentTick;
    this.inputPayload.attack = this.currentPlayer.hasAttacked; // or this.cursorKeys.attackKey.isDown
    this.inputPayload.shoot = this.currentPlayer;
    this.inputPayload.timestamp = Date.now();

    if (
      this.currentPlayer.isPlayingHitAnimation ||
      !this.currentPlayer.canMove
    ) {
      this.inputPayload.left = false;
      this.inputPayload.right = false;
      this.inputPayload.up = false;
      this.inputPayload.down = false;
    }
    this.room.send(0, this.inputPayload);

    let moved = false;
    if (this.currentPlayer.canMove) {
      if (!this.currentPlayer.isPlayingHitAnimation) {
        if (this.inputPayload.left) {
          this.currentPlayer.x -= velocity;
          this.currentPlayer.setFlipX(true);
          this.currentPlayer.play("char1_walk", true);
          moved = true;
        } else if (this.inputPayload.right) {
          this.currentPlayer.x += velocity;
          this.currentPlayer.setFlipX(false);
          this.currentPlayer.play("char1_walk", true);
          moved = true;
        }

        if (this.inputPayload.up) {
          this.currentPlayer.y -= velocity;
          this.currentPlayer.play("char1_walk", true);
          moved = true;
        } else if (this.inputPayload.down) {
          this.currentPlayer.y += velocity;
          this.currentPlayer.play("char1_walk", true);
          moved = true;
        }

        if (!moved && !this.currentPlayer.isPlayingHitAnimation) {
          this.currentPlayer.play("char1_idle", true);
        }
      }
      if (this.currentPlayer.hasAttacked) {
        this.currentPlayer.play("char1_hit");
        this.time.delayedCall(22 * 30, () => {
          this.currentPlayer.checkIfHitEnemies = true;
          //this.currentPlayer.canMove = true;
          this.currentPlayer.isDuringAttack = false;
        });
      }

      this.currentPlayer.pastQueue.push({
        x: this.currentPlayer.x,
        y: this.currentPlayer.y,
        tick: this.currentTick,
      });
    }

    this.localRef.x = this.currentPlayer.x;
    this.localRef.y = this.currentPlayer.y;

    for (let sessionId in this.playerEntities) {
      // interpolate all player entities
      // (except the current player)
      if (sessionId === this.room.sessionId) {
        continue;
      }

      const entity = this.playerEntities[sessionId];
      this.handleEntityUpdate(entity);
    }

    this.currentPlayer.hasAttacked = false;

    for (let id in this.monsterEntities) {
      const entity = this.monsterEntities[id];
      if (this.currentPlayer.checkIfHitEnemies) {
        this.attackHitbox && this.attackHitbox.destroy();
        // this.currentPlayer.attackHitbox.flipX = this.currentPlayer.flipX;
        this.currentPlayer.attackHitbox.x = this.currentPlayer.x;
        this.currentPlayer.attackHitbox.y = this.currentPlayer.y;

        // this.currentPlayer.attackHitbox.flipX
        //   ? (this.currentPlayer.attackHitbox.x -= 20)
        //   : (this.currentPlayer.attackHitbox.x += 20);
        if (!this.currentPlayer.flipX) {
          this.currentPlayer.attackHitbox.x +=
            this.currentPlayer.displayWidth -
            this.currentPlayer.attackHitbox.width -
            70;
        }

        this.attackHitbox = this.add
          .rectangle(
            this.currentPlayer.attackHitbox.x,
            this.currentPlayer.attackHitbox.y,
            this.currentPlayer.attackHitbox.width,
            this.currentPlayer.attackHitbox.height
          )
          .setStrokeStyle(1, 0x00ff00)
          .setOrigin(0);

        this.currentPlayer.attackHitbox.displayWidth =
          this.currentPlayer.attackHitbox.width;
        this.currentPlayer.attackHitbox.displayHeight =
          this.currentPlayer.attackHitbox.height;

        // if (this.isColliding(this.currentPlayer.attackHitbox, entity)) {
        //   console.log("hit enemy");
        //   entity.hurt();
        // }
      }
    }
    this.currentPlayer.checkIfHitEnemies = false;
    for (let id in this.monsterEntities) {
      const monster = this.monsterEntities[id];
      if (monster.isAlive) this.handleEntityUpdate(monster);
    }
  }

  handleEntityUpdate(entity) {
    const { serverX, serverY } = entity.data.values;

    let moved = false;
    if (entity.x < serverX) {
      entity.setFlipX(false);
      !entity.isPlayingHitAnimation &&
        entity.canMove &&
        entity.play("char1_walk", true);
      moved = true;
    } else if (entity.x > serverX) {
      entity.setFlipX(true);
      !entity.isPlayingHitAnimation &&
        entity.canMove &&
        entity.play("char1_walk", true);
      moved = true;
    }

    if (entity.y != serverY) {
      !entity.isPlayingHitAnimation &&
        entity.canMove &&
        entity.play("char1_walk", true);
      moved = true;
    }

    if (!moved) {
      !entity.isPlayingHitAnimation &&
        entity.canMove &&
        entity.play("char1_idle", true);
    }

    // if (entity.canMove) {
    entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
    entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);

    // }

    if (entity.isAttacking) {
      entity.play("char1_hit", true);
      entity.isPlayingHitAnimation = true;
    }
    // console.log(entity.isAttacking, entity.isPlayingHitAnimation);
    entity.localRef && entity.localRef.setPosition(entity.x, entity.y);
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
}
