function autoScroll() {
    setTimeout(function () {
        let x = Math.floor(Math.random() * 2);
        window.scrollBy({
            left: x ? -100 + Math.floor(Math.random() * 200) : 0,
            top: x ? 0 : -100 + Math.floor(Math.random() * 200),
            behavior: "smooth"
        });
        autoScroll();
    }, 2000 + Math.floor(Math.random() * 58 * 1000));
}

chrome.runtime.sendMessage({"method": "checkTab"}, {}, function (response) {
    if (response && response.hasOwnProperty("runtime")) {
        if (response.runtime) {
            setTimeout(function () {
                document.querySelector(".content").click();
            }, 1000 + Math.floor(Math.random() * 3000));

            setTimeout(function () {
                window.scrollTo({
                    left: window.scrollX,
                    top: 400 + Math.floor(Math.random() * 200),
                    behavior: 'smooth'
                });
                autoScroll();
                chrome.runtime.sendMessage({"method": "useUrl"});
            }, 1000 + Math.floor(Math.random() * 3000))
        }
    }
});