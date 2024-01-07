import * as Phaser from 'phaser';
import {GameScene} from "./scenes/GameScene";
import {UserInterfaceScence} from "./scenes/UserInterfaceScence";

let width;
let height;

if (window.innerWidth > window.innerHeight) {
  const base = window.innerWidth;

  width = base;
  height = base * 9 / 16;
} else {
  const base = window.innerHeight;

  width = base * 16 / 9;
  height = base;
}

export const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: width,
  height: height,

  // https://rexrainbow.github.io/phaser3-rex-notes/docs/site/scalemanager/
  scale: {

    // ignore aspect ratio:
    mode: Phaser.Scale.FIT,

    // keep aspect ratio:
    //mode: Phaser.Scale.FIT,
    //mode: Phaser.Scale.ENVELOP, // larger than Scale.FIT
    //mode: Phaser.Scale.HEIGHT_CONTROLS_WIDTH, // auto width
    //mode: Phaser.Scale.WIDTH_CONTROLS_HEIGHT, // auto height

    autoCenter: Phaser.Scale.CENTER_BOTH,
    //autoCenter: Phaser.Scale.CENTER_BOTH,
    //autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
    //autoCenter: Phaser.Scale.CENTER_VERTICALLY,

  },

  scene: [
    // Experminental
    new GameScene(),
    new UserInterfaceScence(),
  ],
};
