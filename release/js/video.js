window.scrollTo({
    left: window.scrollX,
    top: 0,
    behavior: 'smooth'
});

function autoScroll() {
    setTimeout(function () {
        let video = document.querySelector('video');
        if (video) {
            video.scrollIntoView({
                behavior: "smooth"
            });
        }
        fixScroll();
        autoPlay();
    }, 1000 + Math.floor(Math.random() * 3000))
}

function fixScroll() {
    setTimeout(function () {
        window.scrollBy({
            left: 0,
            top: -50 + Math.floor(Math.random() * 100),
            behavior: "smooth"
        })
    }, 1000 + Math.floor(Math.random() * 1000));
}

function autoPlay() {
    setTimeout(function () {
        let playBtn = document.querySelector(".prism-big-play-btn");
        if (playBtn && playBtn.style.display === "block") {
            playBtn.click();
        } else {
            playBtn = document.querySelector(".prism-play-btn");
            if (playBtn && !playBtn.classList.contains('playing')) {
                playBtn.click();
            }
        }
        autoPlay();
    }, 1000 + Math.floor(Math.random() * 1000));
}

chrome.runtime.sendMessage({"method": "checkTab"}, {}, function (response) {
    if (response && response.hasOwnProperty("runtime")) {
        if (response.runtime === 1) {
            autoScroll();
        }
    }
});