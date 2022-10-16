import Phaser from "phaser";

import MainScene from "./scenes/MainScene";

const config = {
  type: Phaser.AUTO,
  fps: {
    target: 60,
    forceSetTimeOut: true,
    smoothStep: false,
  },
  width: 800,
  height: 600,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  pixelArt: true,
  scene: [MainScene],
};

const game = new Phaser.Game(config);
// game.loop.destroy();

// // create new loop
// game.loop = new Phaser.Core.TimeStep(game, {
//   target: 20,
//   forceSetTimeOut: true,
//   smoothStep: false,
// });
// game.loop.start(game.step.bind(game));
// // start new loop
