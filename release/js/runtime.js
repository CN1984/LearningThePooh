window.addEventListener('load', function () {
    chrome.runtime.sendMessage({"method": 'checkTab'}, {}, function (response) {
        if (response.hasOwnProperty("runtime")) {
            if (response.runtime === 1) {
                window.scrollTo(0, 1);
                document.querySelector('.header').innerHTML += '<div style="position:fixed;left:0;top:0;z-index:1;width:200px;height:50px;color:#ffffff;background-color:#ce0000;font-size:12px;line-height:20px;padding:2px;">学习中...<br>请勿[最小化]或[关闭]窗口.</div>';
            }
        }
    });
});