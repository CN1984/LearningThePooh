window.addEventListener("load", function () {
    document.getElementById("qr").addEventListener("click", function () {
        chrome.runtime.sendMessage({"method": "chooseLogin"}, {}, function (response) {
            window.location.replace("https://pc.xuexi.cn/points/my-points.html");
        });
    });
    document.getElementById("dd").addEventListener("click", function () {
        chrome.runtime.sendMessage({"method": "chooseLogin"}, {}, function (response) {
            window.location.replace("https://login.dingtalk.com/login/index.htm?goto=https%3A%2F%2Foapi.dingtalk.com%2Fconnect%2Foauth2%2Fsns_authorize%3Fappid%3Ddingoankubyrfkttorhpou%26response_type%3Dcode%26scope%3Dsnsapi_login%26redirect_uri%3Dhttps%3A%2F%2Fpc-api.xuexi.cn%2Fopen%2Fapi%2Fsns%2Fcallback");
        });
    });
});
