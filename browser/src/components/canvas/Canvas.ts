import { clearCanvasAction, drawImageAction, drawPixelAction, fillAction } from "../../Actions";
import { appState } from "../../state/appState";
import { rgbToHex } from "../../utils/color";
import { CanvasGrid } from "./CanvasGrid";
import { CanvasTextLayer } from "./CanvasTextLayer";
import { saveView } from "../../utils/storage";
import { Tools } from "../sidebar-right/SidebarRight";

export interface PixelData {
	p: number[];
	c: string;
}

export class Canvas {
	private canvas: HTMLCanvasElement;
	private readonly textLayer: CanvasTextLayer;
	private readonly grid: CanvasGrid;
	private ctx: CanvasRenderingContext2D;
	private pixelData: PixelData[] = [];

	private mouseDownX: number;
	private mouseDownY: number;

	private lastX: number;
	private lastY: number;

	constructor(container: HTMLElement) {
		this.canvas = document.createElement("canvas");
		this.canvas.setAttribute("id", "canvas-background-layer");
		container.appendChild(this.canvas);

		this.ctx = this.canvas.getContext("2d");
		this.canvas.width = appState.matrix.width * appState.matrix.pixelRatio;
		this.canvas.height = appState.matrix.height * appState.matrix.pixelRatio;
		this.textLayer = new CanvasTextLayer(container);
		this.grid = new CanvasGrid(container);

		this.resetCanvas();
		this.attachListeners();
	}

	private resetCanvas(): void {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	private attachListeners(): void {
		this.canvas.addEventListener("mousedown", this.onCanvasMouseDown);
		this.canvas.addEventListener("mouseup", this.onCanvasMouseUp);
		this.canvas.addEventListener("mousemove", this.onCanvasMouseMove);
	}

	// private restorePixelData(): void {
	// 	const pixelData = getStoredPixelData();

	// 	if (pixelData) {
	// 		pixelData.forEach((d: any) => {
	// 			this.drawPixel(d.p[0] * 10, d.p[1] * 10, d.c);
	// 		});

	// 		this.sendPixels();
	// 	}
	// }

	private readonly onCanvasMouseDown = (evt: MouseEvent): void => {
		if (appState.tools.selected === Tools.GRADIENT) {
			const { x, y } = this.getCoords(evt.clientX, evt.clientY);
			this.mouseDownX = x;
			this.mouseDownY = y;
		}
	};

	private readonly onCanvasMouseUp = (evt: MouseEvent): void => {
		const { x, y } = this.getCoords(evt.clientX, evt.clientY);
		this.useToolAt(x, y);
		this.sendPixels();
	};

	private readonly onCanvasMouseMove = (evt: MouseEvent): void => {
		if (evt.buttons !== 1) {
			return;
		}

		const { x, y } = this.getCoords(evt.clientX, evt.clientY);

		if (Math.floor(x / appState.matrix.pixelRatio) !== this.lastX || Math.floor(y / appState.matrix.pixelRatio) !== this.lastY) {
			this.useToolAt(x, y);

			// Don't update live for gradient
			if (appState.tools.selected !== Tools.GRADIENT) {
				this.sendPixels();
			}
		}

		this.lastX = Math.floor(x / appState.matrix.pixelRatio);
		this.lastY = Math.floor(y / appState.matrix.pixelRatio);
	};

	private getCoords(clientX: number, clientY: number) {
		const rect = this.canvas.getBoundingClientRect();

		return {
			x: clientX - rect.left,
			y: clientY - rect.top,
		};
	}

	private useToolAt(x: number, y: number): void {
		switch (appState.tools.selected) {
			case Tools.BRUSH:
				this.drawPixel(x, y);
				break;
			case Tools.ERASER:
				this.drawPixel(x, y, "rgb(0, 0, 0)");
				break;
			case Tools.FILL:
				this.fillCanvas();
				break;
			case Tools.GRADIENT:
				this.drawGradient(this.mouseDownX, this.mouseDownY, x, y);
				break;
		}
	}

	private drawGradient(startX: number, startY: number, endX: number, endY: number) {
		const gradient = this.ctx.createLinearGradient(startX, startY, endX, endY);
		gradient.addColorStop(0, appState.tools.color);
		gradient.addColorStop(1, appState.tools.gradientColor1);

		this.ctx.fillStyle = gradient;
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		this.pixelData = this.canvasToPixelData();
	}

	private fillCanvas(): void {
		this.ctx.fillStyle = appState.tools.color;
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		fillAction(appState.tools.color);
	}

	private drawPixel(x: number, y: number, colorParam?: string, sendToMatrix = true): void {
		const xFrom = Math.floor(x / appState.matrix.pixelRatio) * appState.matrix.pixelRatio;
		const yFrom = Math.floor(y / appState.matrix.pixelRatio) * appState.matrix.pixelRatio;
		const fillColor = colorParam || appState.tools.color;

		this.ctx.fillStyle = fillColor;
		this.ctx.fillRect(xFrom, yFrom, 10, 10);

		if (sendToMatrix) {
			const pixelToSend: PixelData = {
				p: [Math.floor(xFrom / appState.matrix.pixelRatio), Math.floor(yFrom / appState.matrix.pixelRatio)],
				c: fillColor,
			};

			this.pixelData.push(pixelToSend);
		}
	}

	private sendPixels() {
		drawPixelAction(this.pixelData).then(() => {
			this.pixelData = [];
		});
	}

	private readonly canvasToPixelData = (): PixelData[] => {
		const pixelData: PixelData[] = [];
		const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
		const oneRowLength = 4 * this.canvas.width;
		const jumpOnePixel = 4 * appState.matrix.pixelRatio;
		const jumpToNextRow = oneRowLength * (appState.matrix.pixelRatio - 1) + 4 * appState.matrix.pixelRatio;

		let x = 0;
		let y = 0;
		let increment = jumpOnePixel;

		for (let i = 0; i < imageData.data.length; i += increment) {
			const red = imageData.data[i];
			const green = imageData.data[i + 1];
			const blue = imageData.data[i + 2];
			const color = rgbToHex(red, green, blue);
			const pixel = {
				p: [x, y],
				c: color,
			};

			x++;

			if (x % appState.matrix.width === 0) {
				y++;
				x = 0;
				increment = jumpToNextRow;
			} else {
				increment = jumpOnePixel;
			}

			pixelData.push(pixel);
		}

		return pixelData;
	};

	public setPixels(data: PixelData[], sendToMatrix = true): void {
		data.forEach((d) => this.drawPixel(d.p[0] * 10, d.p[1] * 10, d.c, false));

		if (sendToMatrix) {
			drawImageAction(data);
		}
	}

	public drawImage(img: HTMLImageElement): void {
		this.ctx.fillStyle = "rgb(0, 0, 0)";
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
		this.ctx.drawImage(img, 0, 0, appState.matrix.width, appState.matrix.height);

		const imgData = this.ctx.getImageData(0, 0, appState.matrix.width, appState.matrix.height);
		const data = imgData.data;

		this.ctx.fillStyle = "rgb(0, 0, 0)";
		this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		let x = 0;
		let y = 0;

		for (let i = 0; i < data.length; i += 4) {
			const red = data[i];
			const green = data[i + 1];
			const blue = data[i + 2];

			const color = rgbToHex(red, green, blue);
			this.drawPixel(x * 10, y * 10, color);

			x++;

			if (x % appState.matrix.width === 0) {
				y++;
				x = 0;
			}
		}

		// this.sendPixels();
		drawImageAction(this.pixelData);
		this.pixelData = [];
	}

	public readonly getPixelData = (): PixelData[] => {
		return this.canvasToPixelData();
	};

	public readonly persistCanvas = (): void => {
		saveView(this.canvasToPixelData(), "No name implemented");
	};

	public clear(sendAction = true): void {
		this.resetCanvas();

		if (sendAction) {
			clearCanvasAction();
		}
	}
}
