export class UserInterfaceScence extends Phaser.Scene {
  constructor() {
    super({key: 'ExpermientalUIScene', active: true});
  }

  create() {
    const minimapBorder = this.add.rectangle(0, 0, 0, 0, 0xffffff, 0.0);

    minimapBorder.setOrigin(0, 0);
    minimapBorder.setStrokeStyle(5, 0xffffff);

    const cameraBorder = this.add.rectangle(0, 0, 0, 0, 0xffffff, 0.5);

    cameraBorder.setOrigin(0, 0);
    cameraBorder.setStrokeStyle(1, 0xffffff);

    this.game.events.on(EVENT_CHANGE_CONTROLS_VISIBILITY, function (controlsVisible: boolean) {
      minimapBorder.setVisible(controlsVisible);
      cameraBorder.setVisible(controlsVisible);
    }, this);

    this.game.events.on(EVENT_DRAW_MINIMAP, function (props: DrawMinimapProps) {
      minimapBorder.setPosition(props.x, props.y);
      minimapBorder.setSize(props.width, props.height);
    }, this);

    this.game.events.on(EVENT_DRAW_MINIMAP_CAMERA, function (props: DrawMinimapProps) {
      cameraBorder.setPosition(props.x, props.y);
      cameraBorder.setSize(props.width, props.height);
    }, this);
  }
}

export const EVENT_CHANGE_CONTROLS_VISIBILITY = 'changeControlsVisibility';
export const EVENT_DRAW_MINIMAP = 'drawMinimap';
export const EVENT_DRAW_MINIMAP_CAMERA = 'drawMinimapCamera';

export interface DrawMinimapProps {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}
