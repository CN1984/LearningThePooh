function autoScroll() {
    setTimeout(function () {
        let scrollYMax = document.body.scrollHeight - document.documentElement.clientHeight;
        if (window.scrollY < scrollYMax - 600) {
            window.scrollBy({
                left: 0,
                top: 200 + Math.floor(Math.random() * 200),
                behavior: 'smooth'
            });
            autoScroll();
        }
    }, 1000 + Math.floor(Math.random() * 3000))
}

chrome.runtime.sendMessage({"method": "checkTab"}, {}, function (response) {
    if (response && response.hasOwnProperty("runtime")) {
        if (response.runtime) {
            setTimeout(function () {
                window.scrollTo({
                    left: window.scrollX,
                    top: 400 + Math.floor(Math.random() * 200),
                    behavior: 'smooth'
                });
                autoScroll();
            }, 1000 + Math.floor(Math.random() * 3000))
        }
    }
});