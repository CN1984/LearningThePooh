window.addEventListener("load", function () {
    chrome.runtime.sendMessage({"method": "checkTab"}, {}, function (response) {
        if (response.hasOwnProperty("runtime")) {
            if (response.runtime === 1) {
                document.querySelector(".header").innerHTML += '<div style="position:fixed;left:0;top:0;z-index:1;width:200px;height:50px;color:#ffffff;background-color:#ce0000;font-size:12px;line-height:20px;padding:2px;">学习中...<br>请勿[最小化]或[关闭]窗口.</div>';

                setInterval(function () {
                    window.scrollTo(window.scrollX, window.scrollY + 1);

                    let playBtn = document.querySelector(".prism-big-play-btn");
                    if (playBtn && playBtn.style.display === "block") {
                        playBtn.click();
                    }

                    let video = document.querySelector('video');
                    if (!video.muted){
                        document.querySelector('video').muted = true;
                    }
                }, 1000);
            }
        }
    });
});