(() => {
	const pages = document.querySelectorAll<HTMLDivElement>(".page");
	for (let i = 0; i < pages.length; i++) {
		const page = pages[i];

		if (i % 2 === 0) page.style.zIndex = `${pages.length - i}`;
	}

	const handleLoad = () => {
		for (let i = 0; i < pages.length; i++) {
			pages[i].dataset.page = `${i + 1}`;

			pages[i].onclick = (event: Event) => {
				if (!(event.target instanceof HTMLElement)) return;

				const page = event.target.dataset.page;
				if (page && Number.parseInt(page) % 2 === 0) {
					event.target.classList.remove("flipped");
					event.target.previousElementSibling?.classList.remove("flipped");
				} else {
					event.target.classList.add("flipped");
					event.target.nextElementSibling?.classList.add("flipped");
				}
			};
		}
	};

	document.addEventListener("DOMContentLoaded", handleLoad);
})();
