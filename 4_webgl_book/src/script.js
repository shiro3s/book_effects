// --- Setup ---
const webglContainer = document.getElementById("webgl-container");
const cssContainer = document.getElementById("css-container"); // Get CSS container

const scene = new THREE.Scene();

const FOV = 75;

const camera = new THREE.PerspectiveCamera(
	FOV,
	window.innerWidth / window.innerHeight,
	0.1,
	10000,
); // Increase far plane for larger pixel units

const webglRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha:true to see CSS behind
webglRenderer.setSize(window.innerWidth, window.innerHeight);
webglRenderer.setPixelRatio(window.devicePixelRatio);

// webglRenderer.setClearColor(0xf0f0f0); // Clear color is less important now
webglContainer.appendChild(webglRenderer.domElement);

// Create CSS3DRenderer
const cssRenderer = new THREE.CSS3DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssContainer.appendChild(cssRenderer.domElement);

// --- Lighting (Optional for CSS3DRenderer, but keep for potential WebGL elements) ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
// Directional light won't affect CSS3DObjects

// --- Book & Pages Setup ---
// IMPORTANT: Match dimensions with CSS .page-html-content
const PAGE_WIDTH = 400; // in "pixels" (or world units matching pixels)
const PAGE_HEIGHT = 600;
const SHEET_THICKNESS = 5; // Adjust thickness in pixel units

const book = new THREE.Group();
scene.add(book);

const sheets = [];
let currentSheetIndex = 0;
let isAnimating = false;

// IDs of the HTML elements for page content
const pageContentIds = [
	{ front: "page1", back: "page2" },
	{ front: "page3", back: "page4" },
	{ front: "page5", back: "page6" },
];
const totalSheets = pageContentIds.length;

// Function to create a sheet using CSS3DObjects
function createSheet(frontHtmlId, backHtmlId, index) {
	const sheetGroup = new THREE.Group();

	// Get HTML elements
	const frontElement = document.getElementById(frontHtmlId);
	const backElement = document.getElementById(backHtmlId);

	if (!frontElement || !backElement) {
		console.error("HTML element not found for sheet", index);
		return; // Skip if elements are missing
	}

	// Create CSS3DObjects
	const frontObject = new THREE.CSS3DObject(frontElement);
	// Position object relative to the group origin (spine)
	// The origin of the CSS3DObject is its center, so offset by half width
	frontObject.position.x = PAGE_WIDTH / 2;
	// Rotation is applied to the group later

	const backObject = new THREE.CSS3DObject(backElement);
	backObject.position.x = PAGE_WIDTH / 2;
	// Rotate the CSS object itself for the back face
	backObject.rotation.y = Math.PI;

	// Add CSS objects to the sheet group
	sheetGroup.add(frontObject);
	sheetGroup.add(backObject);

	// Store references for easy access later
	sheetGroup.frontObject = frontObject;
	sheetGroup.backObject = backObject;

	// Position the sheet group slightly back
	sheetGroup.position.z = -index * SHEET_THICKNESS;

	// Initial rotation (all closed to the right)
	sheetGroup.rotation.y = 0;

	book.add(sheetGroup);
	sheets.push(sheetGroup);
}

// Create all sheets
pageContentIds.forEach((ids, index) => {
	createSheet(ids.front, ids.back, index);
});

/** 現在の本の状態に基づいて、表示すべきページ（面）のみを表示する関数 */
function updatePageVisibility() {

	sheets.forEach((sheet, i) => {
		// このシートが左ページか右ページかを判定
		const isRightPageSheet = i === currentSheetIndex;
		const isLeftPageSheet = i === currentSheetIndex - 1;

		// シートが開いているか閉じているかを判定 (誤差を許容)
		const isOpen = Math.abs(sheet.rotation.y + Math.PI) < 0.01;
		const isClosed = Math.abs(sheet.rotation.y) < 0.01;

		// デフォルトで両面を非表示にする
		if (sheet.frontObject)
			sheet.frontObject.element.style.visibility = "hidden";
		if (sheet.backObject) sheet.backObject.element.style.visibility = "hidden";

		// 表示すべき面だけを表示する
		// 左ページ（前のシートの裏面）
		if (isLeftPageSheet && isOpen && sheet.backObject) {
			sheet.backObject.element.style.visibility = "visible";
		}
		// 右ページ（現在のシートの表面）
		if (isRightPageSheet && isClosed && sheet.frontObject) {
			sheet.frontObject.element.style.visibility = "visible";
		}
	});
}

updatePageVisibility();

function turnSheet(targetSheetIndex, direction) {
	if (isAnimating) return;
	if (direction === "next" && targetSheetIndex >= totalSheets) return;
	if (direction === "prev" && targetSheetIndex < 0) return;

	isAnimating = true;

	const sheetToTurn = sheets[targetSheetIndex];
	if (!sheetToTurn) {
		isAnimating = false;
		return;
	}

	const targetRotation = direction === "next" ? -Math.PI : 0;
	const duration = 0.8;

	if (sheetToTurn.frontObject && sheetToTurn.backObject) {
		if (direction === "next") {
			// 'next' (開く) 時: frontが奥へ、backが手前へ来る
			sheetToTurn.frontObject.element.style.visibility = "hidden";
			sheetToTurn.backObject.element.style.visibility = "visible";
			// console.log(`Start 'next': Hide front ${targetSheetIndex}, Show back ${targetSheetIndex}`); // Debug
		} else {
			// direction === 'prev'
			// 'prev' (閉じる) 時: backが奥へ、frontが手前へ来る
			sheetToTurn.frontObject.element.style.visibility = "visible";
			sheetToTurn.backObject.element.style.visibility = "hidden";
			// console.log(`Start 'prev': Show front ${targetSheetIndex}, Hide back ${targetSheetIndex}`); // Debug
		}
	}

	gsap.to(sheetToTurn.rotation, {
		y: targetRotation,
		duration: duration,
		ease: "power2.inOut",
		onComplete: () => {
			isAnimating = false;

			// Update currentSheetIndex based on the completed action
			if (direction === "next") {
				// currentSheetIndex は右ページを示すIndexなので、
				// めくったシートのIndex + 1 になる
				currentSheetIndex = targetSheetIndex + 1;
			} else {
				// 閉じたシートのIndexが targetSheetIndex なので、
				// currentSheetIndex は targetSheetIndex に戻る
				currentSheetIndex = targetSheetIndex;
			}

			// --- Update Visibility Based on New State ---
			updatePageVisibility();

			updateButtons();
		},
	});
}

// --- Interaction ---
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

nextBtn.addEventListener("click", () => {
	if (!isAnimating && currentSheetIndex < totalSheets)
		turnSheet(currentSheetIndex, "next");
});

prevBtn.addEventListener("click", () => {
	if (!isAnimating && currentSheetIndex > 0)
		turnSheet(currentSheetIndex - 1, "prev");
});

function updateButtons() {
	prevBtn.disabled = isAnimating || currentSheetIndex === 0;
	nextBtn.disabled = isAnimating || currentSheetIndex === totalSheets;
}

updateButtons();

// --- Handle Window Resize ---
function handleResize() {
	const width = window.innerWidth;
	const height = window.innerHeight;

	// Update WebGL Renderer
	webglRenderer.setSize(width, height);

	// Update CSS3D Renderer
	cssRenderer.setSize(width, height);

	// Update Camera aspect ratio
	camera.aspect = width / height;

	// Adjust camera Z position (using pixel-based PAGE_WIDTH/HEIGHT)
	const padding = 1.1; // Adjust padding slightly
	const targetHeight = PAGE_HEIGHT * padding;
	const targetWidth = PAGE_WIDTH * padding; // Closed book width

	const distanceForHeight =
		targetHeight / (2 * Math.tan((FOV * Math.PI) / 180 / 2));
	const distanceForWidth =
		targetWidth / (2 * camera.aspect * Math.tan((FOV * Math.PI) / 180 / 2));
	camera.position.z = Math.max(distanceForHeight, distanceForWidth);

	camera.lookAt(book.position); // Ensure camera looks at the book

	// Update camera projection matrix
	camera.updateProjectionMatrix();
}
window.addEventListener("resize", handleResize, false);
handleResize(); // Initial call

// --- Render Loop ---
function animate() {
	requestAnimationFrame(animate);

	// Render the WebGL scene (optional background/effects)
	webglRenderer.render(scene, camera);

	// Render the CSS3D scene (HTML content)
	cssRenderer.render(scene, camera);
}
animate();
