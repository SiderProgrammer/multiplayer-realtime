const schema = require("@colyseus/schema");
const Schema = schema.Schema;

class Monster extends Schema {
  constructor(id) {
    super();
    this.id = id;
    this.x = 0;
    this.y = 0;
    this.tick = 0;
    this.health = 100;
    this.inputQueue = [];
    this.actionQueue = [];
    this.pastQueue = [];
    this.isAttacking = false;
    this.canMove = true;
    this.isAlive = true;
  }

  hurt() {
    this.health -= 20;
    if (this.health <= 0) {
      this.isAlive = false;
      console.log("enemy die");
    }
  }
  isDead() {
    return this.isAlive;
  }
}

schema.defineTypes(Monster, {
  id: "number",
  x: "number",
  y: "number",
  health: "number",
  isAttacking: "boolean",
  canMove: "boolean",
  isAlive: "boolean",
});

const InputData = {
  left: false,
  right: false,
  up: false,
  down: false,
  tick: false,
};

class Player extends Schema {
  constructor(id) {
    super();
    this.id = id;
    this.x = 0;
    this.y = 0;
    this.tick = 0;
    this.health = 100;
    this.inputQueue = [];
    this.actionQueue = [];
    this.pastQueue = [];
    this.isAttacking = false;
    this.canMove = true;
    this.isStunned = false;
  }

  hurt() {
    this.health -= 20;
  }
}

schema.defineTypes(Player, {
  id: "string",
  x: "number",
  y: "number",
  health: "number",
  tick: "number",
  isAttacking: "boolean",
  canMove: "boolean",
});

class MainRoomState extends Schema {
  constructor() {
    super();
    this.mapWidth = 0;
    this.mapHeight = 0;
    this.players = new schema.MapSchema();
    this.monsters = new schema.MapSchema();
  }
}

schema.defineTypes(MainRoomState, {
  mapWidth: "number",
  mapHeight: "number",
  players: { map: Player },
  monsters: { map: Monster },
});

module.exports = { InputData, Player, MainRoomState, Monster };
