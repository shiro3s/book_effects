const step = (sec: number) => new Promise((resolve) => {
	return setTimeout(resolve, sec)
});

(() => {
	const activePage = {
		index: 0
	}

	const rightPages = document.querySelectorAll<HTMLDivElement>(".right-pages .page");
	const leftPages = document.querySelectorAll<HTMLDivElement>(".left-pages .page");
	
	for (let i = 0; i < leftPages.length; i++) rightPages[i].style.zIndex = `${rightPages.length - i}`;


	const handleLoaded = () => {
		// right page click
		for (let i = 0; i < rightPages.length; i++) {
			rightPages[i].onclick = (event: Event) => {
				if (!(event.target instanceof HTMLElement)) return;

				const targetElem = event.target

				targetElem.style.pointerEvents = "none"
				targetElem.style.transitionTimingFunction = "ease-in"
				targetElem.classList.remove("--active");	

				setTimeout(() => {
					activePage.index += 1
					leftPages[activePage.index].style.transitionTimingFunction = "ease-out"
					leftPages[activePage.index].classList.add("--active");
					targetElem.style.pointerEvents = ""
				}, 800)
			}

			// left page click
			leftPages[i].onclick = (event: Event) => {
				if (!(event.target instanceof HTMLElement)) return;

				const targetElem = event.target

				targetElem.style.pointerEvents = "none"
				targetElem.style.transitionTimingFunction = "ease-in"
				targetElem.classList.remove("--active")

				setTimeout(() => {
					activePage.index -= 1;
					rightPages[activePage.index].style.transitionTimingFunction = "ease-out"
					rightPages[activePage.index].classList.add("--active")
					targetElem.style.pointerEvents = ""
				}, 800)
			}
		}
	}

	document.addEventListener("DOMContentLoaded", handleLoaded);
})();
