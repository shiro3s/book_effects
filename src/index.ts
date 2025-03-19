type Flip = {
	page: HTMLElement;
	progress: number;
	target: number;
	dragging: boolean;
};

const BOOK_WIDTH = 830;
const BOOK_HEIGHT = 260;
const PAGE_WIDTH = 400;
const PAGE_HEIGHT = 250;
const FPS = 60;

const PAGE_Y = (BOOK_HEIGHT - PAGE_HEIGHT) / 2;
const CANVAS_PADDING = 60;

let currentPage = 0;
const mouse = { x: 0, y: 0 };

(() => {
	const book = <HTMLDivElement>document.getElementById("book");

  // NOTE: section内のhtmlが表示されていない?
	// biome-ignore lint:
	const pages = book.getElementsByTagName("section")!;
	const flips: Flip[] = [];

	for (let i = 0, len = pages.length; i < len; i++) {
		pages[i].style.zIndex = `${len - i}`;

		flips.push({
			page: pages[i],
			progress: 1,
			target: 1,
			dragging: false,
		});
	}

	const canvas = <HTMLCanvasElement>document.getElementById("pageflip-canvas");

	// biome-ignore lint:
	const context = canvas.getContext("2d")!;
	canvas.width = BOOK_WIDTH + CANVAS_PADDING * 2;
	canvas.height = BOOK_HEIGHT + CANVAS_PADDING * 2;
	canvas.style.top = `-${CANVAS_PADDING}px`;
	canvas.style.left = `-${CANVAS_PADDING}px`;

	const mouseMoveHandler = (event: MouseEvent) => {
		mouse.x = event.clientX - book.offsetLeft - BOOK_WIDTH / 2;
		mouse.y = event.clientY - book.offsetTop;
	};

	const mouseDownHandler = (event: MouseEvent) => {
		if (
			Math.abs(mouse.x) < PAGE_WIDTH &&
			0 < mouse.y &&
			mouse.y < BOOK_HEIGHT
		) {
			if (mouse.x < 0 && currentPage > 0) {
				flips[currentPage - 1].dragging = true;
			} else if (mouse.x > 0 && currentPage < flips.length - 1) {
				flips[currentPage].dragging = true;
			}
		}

		event.preventDefault();
	};

	const mouseUpHandler = (event: MouseEvent) => {
		for (let i = 0; i < flips.length; i++) {
			if (flips[i].dragging) {
				if (mouse.x < 0) {
					if (i === currentPage)
						currentPage = Math.min(currentPage + 1, flips.length);
					flips[i].target = -1;
				} else {
					if (i !== currentPage) currentPage = Math.max(currentPage - 1, 0);
					flips[i].target = 1;
				}
			}

			flips[i].dragging = false;
		}
	};


	const drawFoldedPager = (
		foldX: number,
		foldWidth: number,
		verticalOutdent: number,
		pagerShadowWidth: number,
	) => {
		context.beginPath();
		context.moveTo(foldX, 0);
		context.lineTo(foldX, PAGE_HEIGHT);
		context.quadraticCurveTo(
			foldX,
			PAGE_HEIGHT + verticalOutdent * 2,
			foldX - foldWidth,
			PAGE_HEIGHT + verticalOutdent,
		);
		context.lineTo(foldX - foldWidth, -verticalOutdent);
		context.quadraticCurveTo(foldX, -verticalOutdent * 2, foldX, 0);

		const foldGradient = context.createLinearGradient(
			foldX - pagerShadowWidth,
			0,
			foldX,
			0,
		);

		foldGradient.addColorStop(0.35, "#fafafa");
		foldGradient.addColorStop(0.73, "#eeeeee");
		foldGradient.addColorStop(0.9, "#fafafa");
		foldGradient.addColorStop(1.0, "#e2e2e2");
    
		context.fillStyle = foldGradient;
		context.fill();

		context.strokeStyle = "rgba(0,0,0,0.06)";
		context.lineWidth = 0.5;
		context.stroke();
	};

	const drawSharpShadow = (
		foldX: number,
		foldWidth: number,
		verticalOutdent: number,
		strength: number,
	) => {
		context.strokeStyle = `rgba(0, 0, 0, ${0.05 * strength})`;
		context.lineWidth = 30 * strength;
		context.beginPath();
		context.moveTo(foldX - foldWidth, -verticalOutdent * 0.5);
		context.lineTo(foldX - foldWidth, PAGE_HEIGHT + verticalOutdent * 0.5);
		context.stroke();
	};

	const drawDroppedShadow = (
		foldX: number,
		foldWidth: number,
		strength: number,
	) => {
		const rightShadowWidth =
			PAGE_WIDTH * 0.5 * Math.max(Math.min(strength, 0.5), 0);
		const rightShadowGradient = context.createLinearGradient(
			foldX,
			0,
			foldX + rightShadowWidth,
			0,
		);
		const rightOpacity = strength * 0.2 < 0.01 ? 0 : strength * 0.2;

		rightShadowGradient.addColorStop(0, `rgba(0, 0, 0, ${rightOpacity})`);
		rightShadowGradient.addColorStop(0.8, "rgba(0,0,0,0.0)");

		context.fillStyle = rightShadowGradient;
		context.beginPath();
		context.moveTo(foldX, 0);
		context.lineTo(foldX + rightShadowWidth, 0);
		context.lineTo(foldX + rightShadowWidth, PAGE_HEIGHT);
		context.lineTo(foldX, PAGE_HEIGHT);
		context.fill();

		const leftShadowWidth =
			PAGE_WIDTH * 0.5 * Math.max(Math.min(strength, 0.5), 0);
		const leftShadowGradient = context.createLinearGradient(
			foldX - foldWidth - leftShadowWidth,
			0,
			foldX - foldWidth,
			0,
		);
		leftShadowGradient.addColorStop(0, "rgba(0,0,0,0.0)");

		const leftOpacity = strength * 0.15 < 0.01 ? 0 : strength * 0.15;
		leftShadowGradient.addColorStop(1, `rgba(0, 0, 0, ${leftOpacity})`);

		context.fillStyle = leftShadowGradient;
		context.beginPath();
		context.moveTo(foldX - foldWidth - leftShadowWidth, 0);
		context.lineTo(foldX - foldWidth, 0);
		context.lineTo(foldX - foldWidth, PAGE_HEIGHT);
		context.lineTo(foldX - foldWidth - leftShadowWidth, PAGE_HEIGHT);
		context.fill();
	};

	const drawFlip = (flip: Flip) => {
		const strength = 1 - Math.abs(flip.progress);
		const foldWidth = PAGE_WIDTH * 0.5 * (1 - flip.progress);
		const foldX = PAGE_WIDTH * flip.progress + foldWidth;
		const verticalOutdent = 20 * strength;
		const pagerShadowWidth =
			PAGE_WIDTH * 0.5 * Math.max(Math.min(1 - flip.progress, 0.5), 0);

		flip.page.style.width = `${Math.min(foldX, 0)}px`;

		context?.save();

		// translateでページめくりを描画
		context?.translate(
			CANVAS_PADDING + BOOK_WIDTH / 2,
			PAGE_Y + CANVAS_PADDING,
		);

		drawFoldedPager(foldX, foldWidth, verticalOutdent, pagerShadowWidth);
		drawSharpShadow(foldX, foldWidth, verticalOutdent, strength);
		drawDroppedShadow(foldX, foldWidth, strength);

		context.restore();
	};

	const render = () => {
		context.clearRect(0, 0, canvas.width, canvas.height);

		for (let i = 0, len = flips.length; i < len; i++) {
			const flip = flips[i];

      if (flip.dragging) {
				const ratio = mouse.x / PAGE_WIDTH;
				flip.target = Math.max(Math.min(ratio, 1), -1);
			}

			flip.progress += (flip.target - flip.progress) * 0.2;
			if (flip.dragging || Math.abs(flip.progress) < 0.997) drawFlip(flip);
		}
	};

	setInterval(render, 1000 / FPS);
	document.addEventListener("mousemove", mouseMoveHandler, false);
	document.addEventListener("mousedown", mouseDownHandler, false);
	document.addEventListener("mouseup", mouseUpHandler, false);
})();
