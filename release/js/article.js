window.scrollTo({
    left: window.scrollX,
    top: 0,
    behavior: 'smooth'
});

function autoScroll() {
    setTimeout(function () {
        let scrollYMax = document.body.scrollHeight - document.body.clientHeight;
        if (window.scrollY < scrollYMax) {
            window.scrollBy({
                left: 0,
                top: 50 + Math.floor(Math.random() * 150),
                behavior: 'smooth'
            });
            autoScroll();
        }
    }, 1000 + Math.floor(Math.random() * 3000))
}

chrome.runtime.sendMessage({"method": "checkTab"}, {}, function (response) {
    if (response && response.hasOwnProperty("runtime")) {
        if (response.runtime === 1) {
            autoScroll();
        }
    }
});