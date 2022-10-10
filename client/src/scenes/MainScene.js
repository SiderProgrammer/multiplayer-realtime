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
  }

  async create() {
    this.cursorKeys = this.input.keyboard.createCursorKeys();
    this.debugFPS = this.add.text(4, 4, "", { color: "#ff0000" });

    await this.connect();

    this.room.state.players.onAdd = (player, sessionId) => {
      const entity = this.add.image(player.x, player.y, "logo").setScale(0.2);
      entity.health = 100;
      entity.healthbar = new HealthBar(this, entity.x, 100, entity.health);

      entity.hurt = () => {
        entity.health -= 20;
        entity.healthbar.health = entity.health;
        entity.healthbar.update();
      };

      this.playerEntities[sessionId] = entity;

      // is current player
      if (sessionId === this.room.sessionId) {
        this.currentPlayer = entity;

        this.localRef = this.add.rectangle(0, 0, entity.width, entity.height);
        this.localRef.setStrokeStyle(1, 0x00ff00);

        this.remoteRef = this.add.rectangle(0, 0, entity.width, entity.height);
        this.remoteRef.setStrokeStyle(1, 0xff0000);

        player.onChange = () => {
          this.remoteRef.x = player.x;
          this.remoteRef.y = player.y;
          if (player.health < entity.health) {
            //entity.health = player.health;
            entity.hurt();
          }
        };
      } else {
        // listening for server updates
        player.onChange = () => {
          //
          // we're going to LERP the positions during the render loop.
          //
          entity.setData("serverX", player.x);
          entity.setData("serverY", player.y);
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
    this.hasAttacked = true;
  }

  async connect() {
    // add connection status text
    const connectionStatusText = this.add
      .text(0, 0, "Trying to connect with the server...")
      .setStyle({ color: "#ff0000" })
      .setPadding(4);

    const client = new Client(BACKEND_URL);

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
    this.inputPayload.attack = this.hasAttacked;

    this.room.send(0, this.inputPayload);

    if (this.inputPayload.left) {
      this.currentPlayer.x -= velocity;
    } else if (this.inputPayload.right) {
      this.currentPlayer.x += velocity;
    }

    if (this.inputPayload.up) {
      this.currentPlayer.y -= velocity;
    } else if (this.inputPayload.down) {
      this.currentPlayer.y += velocity;
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
      const { serverX, serverY } = entity.data.values;

      entity.x = Phaser.Math.Linear(entity.x, serverX, 0.2);
      entity.y = Phaser.Math.Linear(entity.y, serverY, 0.2);

      if (this.hasAttacked) {
        entity.hurt();
      }
    }

    this.hasAttacked = false;
  }
}
