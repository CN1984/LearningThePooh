chrome.runtime.sendMessage({"method": "checkTab"}, {}, function (response) {
    if (response.hasOwnProperty("runtime")) {
        if (response.runtime === 1) {
            setInterval(function () {
                let scrollYMax = document.body.scrollHeight - document.body.clientHeight;
                let scrollY = window.scrollY + Math.floor(Math.random() * 20) + 1;
                window.scrollTo(window.scrollX, scrollY < scrollYMax ? scrollY : 0);

                let playBtn = document.querySelector(".prism-big-play-btn");
                if (playBtn && playBtn.style.display === "block") {
                    playBtn.click();
                }

                let video = document.querySelector('video');
                if (video && !video.muted){
                    video.muted = true;
                }
            }, 1000);
        }
    }
});