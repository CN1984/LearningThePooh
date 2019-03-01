function randomInterval() {
    let timeout = 1000 + Math.floor(Math.random() * 1000);
    setTimeout(function () {
        let scrollYMax = document.body.scrollHeight - document.body.clientHeight;
        let scrollY = window.scrollY + Math.floor(Math.random() * 20);
        window.scrollTo(window.scrollX, scrollY < scrollYMax ? scrollY : 0);

        let playBtn = document.querySelector(".prism-big-play-btn");
        if (playBtn && playBtn.style.display === "block") {
            playBtn.click();
        }

        let video = document.querySelector('video');
        if (video && !video.muted){
            video.muted = true;
        }

        randomInterval();
    }, timeout)
}

chrome.runtime.sendMessage({"method": "checkTab"}, {}, function (response) {
    if (response.hasOwnProperty("runtime")) {
        if (response.runtime === 1) {
            randomInterval();
        }
    }
});