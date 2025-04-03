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
const SHEET_THICKNESS = 1; // Adjust thickness in pixel units

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

	// console.log(frontElement)

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

	// (Optional) Add transparent WebGL planes for occlusion if needed
	// const planeMaterial = new THREE.MeshBasicMaterial({
	//     color: 0x000000,
	//     opacity: 0,
	//     transparent: true,
	//     side: THREE.DoubleSide
	// });
	// const planeGeometry = new THREE.PlaneGeometry(PAGE_WIDTH, PAGE_HEIGHT);
	// const webglPlane = new THREE.Mesh(planeGeometry, planeMaterial);
	// sheetGroup.add(webglPlane); // Add this *behind* CSS objects if used

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

sheets.forEach((sheet, index) => {
    if (sheet.backObject) {
        // 各シートの裏面を初期状態で非表示にする
        sheet.backObject.element.style.visibility = 'hidden';
        // console.log(`Initially hiding back of sheet ${index}`); // デバッグ用
    }
});


// Position the book slightly for better view?
// book.position.x = -PAGE_WIDTH / 2; // Example: Center the spine
// book.position.y = -PAGE_HEIGHT / 2; // Example: Center vertically? Adjust camera instead.

// --- Animation Logic (turnSheet) ---
// (No changes needed in the animation logic itself)
function turnSheet(targetSheetIndex, direction) {
	if (isAnimating) return;
	if (direction === "next" && targetSheetIndex >= totalSheets) return;
	if (direction === "prev" && targetSheetIndex < 0) return;

	isAnimating = true;

	const sheetToTurn = sheets[targetSheetIndex];
    console.log(targetSheetIndex)
	const targetRotation = direction === "next" ? -Math.PI : 0;
	const duration = 0.8;

    console.log(sheetToTurn.backObject)

     // --- Generalized Visibility Control ---
    // 対象シートに裏面が存在するか確認
    if (sheetToTurn.backObject) {
        if (direction === 'next') {
            // 'next' (開く) アニメーション開始前に裏面を表示
            // console.log(`Showing back of sheet ${targetSheetIndex} for 'next' turn`); // デバッグ用
            sheetToTurn.backObject.element.style.visibility = 'visible';
        }
        // 'prev' (閉じる) 場合は onComplete で非表示にする
    }

	// No renderOrder needed for CSS3D objects typically

	gsap.to(sheetToTurn.rotation, {
		y: targetRotation,
		duration: duration,
		ease: "power2.inOut",
		onComplete: () => {
			isAnimating = false;

            // --- Generalized Visibility Control (onComplete) ---
            // 対象シートに裏面が存在するか確認
            if (sheetToTurn.backObject) {
                if (direction === 'prev') {
                    // 'prev' (閉じる) アニメーション完了時に裏面を非表示
                    // console.log(`Hiding back of sheet ${targetSheetIndex} after 'prev' turn complete`); // デバッグ用
                    sheetToTurn.backObject.element.style.visibility = 'hidden';
                }
            }

			updateButtons();
		},
	});
}

// --- Interaction ---
// (No changes needed)
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

nextBtn.addEventListener("click", () => {
	if (!isAnimating && currentSheetIndex < totalSheets) {
		turnSheet(currentSheetIndex, "next");
		currentSheetIndex++;
	}
});

prevBtn.addEventListener("click", () => {
	if (!isAnimating && currentSheetIndex > 0) {
		currentSheetIndex--;
		turnSheet(currentSheetIndex, "prev");
	}
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
