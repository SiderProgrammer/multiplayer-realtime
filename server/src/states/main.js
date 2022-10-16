const schema = require("@colyseus/schema");
const Schema = schema.Schema;

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
  }
}

schema.defineTypes(MainRoomState, {
  mapWidth: "number",
  mapHeight: "number",
  players: { map: Player },
});

module.exports = { InputData, Player, MainRoomState };
