import Phaser from 'phaser';
import noise from 'noisejs';
import {EVENT_CHANGE_CONTROLS_VISIBILITY, EVENT_DRAW_MINIMAP, EVENT_DRAW_MINIMAP_CAMERA} from "./UserInterfaceScence";

const terrainTypes: { [type: string]: TerrainType } = {
  dirt: {
    raw: '06',
    trees: '12',
    forest: '13',
    mountains: '15',
    special1: '17',
    special2: '18',
  },
  grass: {
    raw: '05',
    trees: '11',
    forest: '12',
    mountains: '14',
    special1: '15',
    special2: '16',
  },
  mars: {
    raw: '07',
    trees: '12',
    forest: '13',
    mountains: '16',
    special1: '14',
    special2: '15',
  },
  sand: {
    raw: '07',
    trees: '12',
    forest: '14',
    mountains: '16',
    special1: '15',
    special2: '18',
  },
  stone: {
    raw: '07',
    trees: '13',
    forest: '12',
    mountains: '19',
    special1: '14',
    special2: '15',
  },
};

const typeProbabilities = Object.entries({
  'grass': 0.5,
  'sand': 0.5,
  'stone': 0.5,
  'dirt': 0.2,
  'mars': 0.1,
});

const variantProbabilities = Object.entries({
  'raw': 0.5,
  'trees': 0.5,
  'forest': 0.5,
  'mountains': 0.5,
  'special1': 0.05,
  'special2': 0.05,
});

interface TerrainType {
  readonly raw: string;
  readonly trees: string;
  readonly forest: string;
  readonly mountains: string;
  readonly special1: string;
  readonly special2: string;
}

const tileWidth = 120;
const tileHeight = 140;

const hexMagic = 0.75

const border = 10;

const mapSizeX = Math.floor(Math.random() * 20 + 200);
const mapSizeY = Math.floor((Math.random() * 10) * 2 + 200); // Ensure even number of rows for hex grid to work properly

const moveSpeed = 20;
const moveFriction = 0.9;

const zoomScaleMin = 0.5;
const zoomScaleMax = 5.0;

const worldWidth = (mapSizeX * (tileWidth + border) + tileWidth * 0.5) + border;
const worldHeight = (mapSizeY * 0.5 * (tileWidth * (1 + hexMagic) + border * 2) + 3 * border);

const minimapHeight = 200;
const minimapWidth = minimapHeight / worldHeight * worldWidth;

function getFrameName(tileValue: TileValue) {
  const variants: any = terrainTypes[tileValue.type];
  if (!variants) {
    console.warn(`Invalid terrain type: ${tileValue.type}`);

    return 'dirt_01.png';
  }

  const frameName = variants[tileValue.variant];
  if (!frameName) {
    console.warn(`Invalid terrain variant: ${tileValue.variant}`);

    return 'dirt_01.png';
  }

  return `${tileValue.type}_${frameName}.png`;
}

interface TileValue {
  readonly type: string;
  readonly variant: string;
}

type MapValue = TileValue | null;

export class GameScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  private isDragging: boolean = false;
  private isMinimapDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragVelocityX: number = 0;
  private dragVelocityY: number = 0;

  private map: MapValue[][] = generateMap();
  private sprites: (Phaser.GameObjects.Sprite | null)[][] = [];

  private minimap!: Phaser.Cameras.Scene2D.Camera;

  private spaceDown: boolean = false;
  private showControls: boolean = true;

  constructor() {
    super('ExperimentalMapScene');
  }

  preload() {
    this.load.atlasXML('hexagonTerrain', '/assets/kenney_hexagon-pack/Spritesheets/hexagonTerrain_sheet.png', '/assets/kenney_hexagon-pack/Spritesheets/hexagonTerrain_sheet.xml');
  }

  create() {
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight).setName('main');
    this.cameras.main.setScroll(worldWidth / 2, worldHeight / 2);

    this.minimap = this.cameras.add(10, 10, minimapWidth, minimapHeight).setName('mini');
    this.minimap.setBackgroundColor('#fff');
    this.minimap.setBounds(0, 0, worldWidth, worldHeight);
    this.minimap.setZoom(Math.max(minimapWidth / worldWidth, minimapHeight / worldHeight));

    this.game.events.emit(EVENT_DRAW_MINIMAP, {
      x: this.minimap.x,
      y: this.minimap.y,
      width: this.minimap.width,
      height: this.minimap.height,
    });

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const x = pointer.x;
      const y = pointer.y;

      if (x > this.minimap.x && x < this.minimap.x + this.minimap.width && y > this.minimap.y && y < this.minimap.y + this.minimap.height) {
        this.isMinimapDragging = true;
        this.input.setDefaultCursor('crosshair');
      } else {
        this.isDragging = true;
        this.input.setDefaultCursor('grab');
      }

      this.dragStartX = x;
      this.dragStartY = y;
      this.dragVelocityX = 0;
      this.dragVelocityY = 0;
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
      this.isMinimapDragging = false;

      this.input.setDefaultCursor('default');
    });

    this.input.on('wheel', (a: any, b: any, c: any, deltaY: number) => {
      const zoomFactor = this.cameras.main.zoom * 0.1;

      const newScale = this.cameras.main.zoom + (deltaY < 0 ? zoomFactor : -zoomFactor);

      this.cameras.main.setZoom(Math.min(Math.max(newScale, zoomScaleMin), zoomScaleMax));
    });

    for (let row = 0; row < mapSizeY; row++) {
      this.sprites.push([]);
      for (let col = 0; col < mapSizeX; col++) {
        const tileValue = this.map[row][col];

        if (!tileValue) {
          this.sprites[row].push(null);

          continue;
        }

        const frameName = getFrameName(tileValue);

        const sprite = this.add.sprite(0, 0, 'hexagonTerrain', frameName);

        sprite.setOrigin(0, 0);

        this.sprites[row].push(sprite);
      }
    }

    this.drawMap();
  }

  update(time: number, delta: number) {
    const adjustFactor = this.cameras.main.zoom;

    let camX = this.cameras.main.scrollX;
    let camY = this.cameras.main.scrollY;

    if (this.cursors.left.isDown) {
      camX -= moveSpeed / adjustFactor;
    } else if (this.cursors.right.isDown) {
      camX += moveSpeed / adjustFactor;
    }

    if (this.cursors.up.isDown) {
      camY -= moveSpeed / adjustFactor;
    } else if (this.cursors.down.isDown) {
      camY += moveSpeed / adjustFactor;
    }

    if (this.cursors.space.isDown) {
      this.spaceDown = true;
    } else if (this.spaceDown) {
      this.showControls = !this.showControls;
      this.spaceDown = false;
    }

    if (this.isMinimapDragging) {
      const pointer = this.input.activePointer;

      const relativeX = (pointer.x - this.minimap.x) / this.minimap.width;
      const relativeY = (pointer.y - this.minimap.y) / this.minimap.height;

      camX = relativeX * worldWidth - this.sys.canvas.width / 2;
      camY = relativeY * worldHeight - this.sys.canvas.height / 2;
    } else {
      if (this.isDragging) {
        const pointer = this.input.activePointer;
        const deltaX = pointer.x - this.dragStartX;
        const deltaY = pointer.y - this.dragStartY;

        // Update map position based on cursor drag
        camX -= deltaX / adjustFactor;
        camY -= deltaY / adjustFactor;

        // Update drag start position for the next frame
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;

        // Update drag velocity for inertia scrolling
        this.dragVelocityX = deltaX;
        this.dragVelocityY = deltaY;
      } else if (this.dragVelocityX !== 0 || this.dragVelocityY !== 0) {
        // Apply friction to slow down scrolling when not dragging
        this.dragVelocityX *= moveFriction;
        this.dragVelocityY *= moveFriction;

        // Update map position with velocity
        camX -= this.dragVelocityX / adjustFactor;
        camY -= this.dragVelocityY / adjustFactor;

        // Stop scrolling when velocity becomes very small
        if (Math.abs(this.dragVelocityX) < 0.1 && Math.abs(this.dragVelocityY) < 0.1) {
          this.dragVelocityX = 0;
          this.dragVelocityY = 0;
        }
      }
    }

    const mainCamera = this.cameras.main;

    mainCamera.setScroll(camX, camY);

    const mcwvx = mainCamera.worldView.x;
    const mcwvy = mainCamera.worldView.y;
    const mcww = mainCamera.worldView.width;
    const mcwh = mainCamera.worldView.height;

    this.game.events.emit(EVENT_DRAW_MINIMAP, {
      x: this.minimap.x,
      y: this.minimap.y,
      width: this.minimap.width,
      height: this.minimap.height,
    });
    this.game.events.emit(EVENT_DRAW_MINIMAP_CAMERA, {
      x: (mcwvx / worldWidth) * minimapWidth + this.minimap.x,
      y: (mcwvy / worldHeight) * minimapHeight + this.minimap.y,
      width: (mcww / worldWidth) * minimapWidth,
      height: (mcwh / worldHeight) * minimapHeight,
    });
    this.game.events.emit(EVENT_CHANGE_CONTROLS_VISIBILITY, this.showControls);
    this.minimap.setVisible(this.showControls);
  }

  private drawMap() {
    const offset = border;

    for (let row = 0; row < this.sprites.length; row++) {
      for (let col = 0; col < this.sprites[row].length; col++) {
        let tileX = offset + col * (tileWidth + border);
        let tileY = offset + row * (tileHeight * hexMagic + border);

        if (row % 2 === 1) {
          tileX += (tileWidth + border) * 0.5;
        }

        const tile = this.sprites[row][col];

        if (!tile) {
          continue;
        }

        tile.setPosition(tileX, tileY);
      }
    }
  }
}

function generateTemperatureMap(pn: any): number[][] {
  const temperatureMap: number[][] = [];

  for (let i = 0; i < mapSizeY; i++) {
    const row: number[] = [];

    for (let j = 0; j < mapSizeX; j++) {
      const temperature = pn.simplex2(j / 10, i / 10); // Adjust the scale as needed
      row.push(temperature);
    }

    temperatureMap.push(row);
  }

  return temperatureMap;
}

const types = [
  {type: 'grass', temperatureThreshold: 0.0},
  {type: 'sand', temperatureThreshold: -0.5},
  {type: 'stone', temperatureThreshold: -0.8},
  {type: 'dirt', temperatureThreshold: -0.9},
  {type: 'mars', temperatureThreshold: -1.0},
];

const variants = [
  {variant: 'raw', temperatureThreshold: 0.3},
  {variant: 'trees', temperatureThreshold: -0.5},
  {variant: 'forest', temperatureThreshold: -0.8},
  {variant: 'mountains', temperatureThreshold: -0.99},
  {variant: 'special1', temperatureThreshold: -0.995},
  {variant: 'special2', temperatureThreshold: -1.0},
];

const perlin = new noise.Noise(Math.random());
const variantPerlin = new noise.Noise(Math.random());

function getRandomElement<T>(array: T[]): T {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

function generateMap(): MapValue[][] {
  const temperatureMap = generateTemperatureMap(perlin);
  const variantTemperatureMap = generateTemperatureMap(variantPerlin);

  const map: MapValue[][] = [];

  for (let i = 0; i < mapSizeY; i++) {
    const row: MapValue[] = [];

    for (let j = 0; j < mapSizeX; j++) {
      const temperature = temperatureMap[i][j];
      let type = 'grass'; // Default type

      for (const t of types) {
        if (temperature >= t.temperatureThreshold) {
          type = t.type;
          break;
        }
      }

      const variantTemperature = variantTemperatureMap[i][j];
      let variant = 'raw'; // Default variant

      for (const v of variants) {
        if (variantTemperature >= v.temperatureThreshold) {
          variant = v.variant;
          break;
        }
      }

      row.push({type, variant});
    }

    map.push(row);
  }

  return map;
}