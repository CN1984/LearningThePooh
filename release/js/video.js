function autoScroll() {
    setTimeout(function () {
        window.scrollBy({
            left: 0,
            top: -50 + Math.floor(Math.random() * 100),
            behavior: "smooth"
        });
        autoScroll();
    }, 2000 + Math.floor(Math.random() * 58 * 1000));
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