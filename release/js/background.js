let scoreTabId = 0, runningTabId = 0, scoreWindowId = 0, runningWindowIds = [], modeMenu = [], flashMode = 0,
    lastFlash = {}, indexUrls = {}, usedUrls = [], userId = 0, timeoutId = 0, accountLogin = 0, redirectPoints = 0;
let windowWidth = 360 + Math.floor(Math.random() * 120);
let windowHeight = 360 + Math.floor(Math.random() * 120);
let chromeVersion = (/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [0, 0])[1];
let firefoxVersion = (/Firefox\/([0-9]+)/.exec(navigator.userAgent) || [0, 0])[1];
let isMobile = !!(/Mobile/.exec(navigator.userAgent));
let urlMap = {
    "index": "https://www.xuexi.cn",
    "points": "https://pc.xuexi.cn/points/my-points.html",
    "scoreApi": "https://pc-api.xuexi.cn/open/api/score/today/queryrate",
    "indexApi": "https://www.xuexi.cn/lgdata/index.json",
    "account": "https://login.dingtalk.com/login/index.htm?goto=https%3A%2F%2Foapi.dingtalk.com%2Fconnect%2Foauth2%2Fsns_authorize%3Fappid%3Ddingoankubyrfkttorhpou%26response_type%3Dcode%26scope%3Dsnsapi_login%26redirect_uri%3Dhttps%3A%2F%2Fpc-api.xuexi.cn%2Fopen%2Fapi%2Fsns%2Fcallback"
};

if (!isMobile) {
    //生成运行模式菜单
    chrome.storage.local.get("flash_mode", function (items) {
        if (items.hasOwnProperty("flash_mode")) {
            flashMode = items["flash_mode"];
        }
        flashMode ? chrome.browserAction.setIcon({"path": "img/16w.png"}) : chrome.browserAction.setIcon({"path": "img/16.png"});
        modeMenu = [
            chrome.contextMenus.create({
                "contexts": ["browser_action"],
                "type": "radio",
                "title": chrome.i18n.getMessage("extSafeMode"),
                "checked": !flashMode,
                "onclick": function (info, tab) {
                    flashMode = 0;
                    chrome.browserAction.setIcon({"path": "img/16.png"});
                    chrome.storage.local.set({"flash_mode": flashMode});
                }
            }),
            chrome.contextMenus.create({
                "contexts": ["browser_action"],
                "type": "radio",
                "title": chrome.i18n.getMessage("extFlashMode"),
                "checked": !!flashMode,
                "onclick": function (info, tab) {
                    flashMode = 1;
                    chrome.browserAction.setIcon({"path": "img/16w.png"});
                    chrome.storage.local.set({"flash_mode": flashMode});
                }
            })
        ];
    });
    //生成登录方式菜单
    chrome.storage.local.get("account_login", function (items) {
        if (items.hasOwnProperty("account_login")) {
            accountLogin = items["account_login"];
        }
        loginMenu = [
            chrome.contextMenus.create({
                "contexts": ["browser_action"],
                "type": "separator"
            }),
            chrome.contextMenus.create({
                "contexts": ["browser_action"],
                "type": "radio",
                "title": chrome.i18n.getMessage("extAppLogin"),
                "checked": !accountLogin,
                "onclick": function (info, tab) {
                    accountLogin = 0;
                    chrome.storage.local.set({"account_login": accountLogin});
                }
            }),
            chrome.contextMenus.create({
                "contexts": ["browser_action"],
                "type": "radio",
                "title": chrome.i18n.getMessage("extAccountLogin"),
                "checked": !!accountLogin,
                "onclick": function (info, tab) {
                    accountLogin = 1;
                    chrome.storage.local.set({"account_login": accountLogin});
                }
            })
        ];
    });
}

//检查用户积分数据
function checkPointsData(callback) {
    if (scoreTabId) {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", urlMap.scoreApi);
        xhr.setRequestHeader("Pragma", "no-cache");
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                let res = JSON.parse(xhr.responseText);
                if (res.hasOwnProperty("code") && parseInt(res.code) === 200) {
                    if (checkScoreAPI(res)) {
                        let points = 0;
                        let ruleList = [1, 2, 9, 1002, 1003];
                        for (let key in res.data.dayScoreDtos) {
                            if (!res.data.dayScoreDtos.hasOwnProperty(key)) {
                                continue;
                            }
                            if (ruleList.indexOf(res.data.dayScoreDtos[key].ruleId) !== -1) {
                                points += res.data.dayScoreDtos[key].currentScore;
                            }
                        }
                        if (!isMobile) {
                            chrome.browserAction.setBadgeText({"text": points.toString()});
                        }
                        if (typeof callback === "function") {
                            callback(res.data);
                        }
                    } else {
                        notice(chrome.i18n.getMessage("extScoreApi"), chrome.i18n.getMessage("extUpdate"))
                    }
                } else {
                    if (runningTabId) {
                        chrome.tabs.remove(runningTabId);
                    }
                    if (runningWindowIds.length) {
                        closeWindow();
                    }
                    chrome.tabs.update(scoreTabId, {"active": true});
                    chrome.tabs.sendMessage(scoreTabId, {
                        "method": "redirect",
                        "data": getLoginUrl()
                    });
                }
            }
        };
        xhr.send();
    }
}

//检查积分接口数据结构
function checkScoreAPI(res) {
    if (res.hasOwnProperty("data")) {
        if (res.data.hasOwnProperty("dayScoreDtos") && res.data.hasOwnProperty("userId")) {
            let pass = 0;
            let ruleList = [1, 2, 9, 1002, 1003];
            for (let key in res.data.dayScoreDtos) {
                if (!res.data.dayScoreDtos.hasOwnProperty(key)) {
                    continue;
                }
                if (res.data.dayScoreDtos[key].hasOwnProperty("ruleId") && res.data.dayScoreDtos[key].hasOwnProperty("currentScore") && res.data.dayScoreDtos[key].hasOwnProperty("dayMaxScore")) {
                    if (ruleList.indexOf(res.data.dayScoreDtos[key].ruleId) !== -1) {
                        ++pass;
                    }
                }
            }
            if (pass === 5) {
                return true;
            }
        }
    }
    return false;
}

//检查首页内容数据
function checkIndexData(callback) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", urlMap.indexApi + "?_st=" + Math.floor(Date.now() / 6e4));
    xhr.setRequestHeader("Accept", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                let res = JSON.parse(xhr.responseText);
                let list = {
                    "article": [],
                    "video": []
                };
                let pass = {
                    "article": [],
                    "video": []
                };
                getUsedUrl(function (usedUrl) {
                    let linkArr = [];
                    getIndexLinks(res, linkArr);
                    if (linkArr.length) {
                        let link, urlId, type;
                        for (let key in linkArr) {
                            if (!linkArr.hasOwnProperty(key)) {
                                continue;
                            }
                            link = linkArr[key];
                            urlId = getUrlId(link);
                            type = getUrlType(link);
                            if (type && urlId && list[type].indexOf(link) === -1) {
                                if (usedUrl.indexOf(urlId + "|" + type.substring(0, 1)) === -1) {
                                    list[type].push(link);
                                } else {
                                    pass[type].push(link);
                                }
                            }
                        }
                        shuffle(list["article"]);
                        shuffle(list["video"]);
                        shuffle(pass["article"]);
                        shuffle(pass["video"]);

                        list["article"].concat(pass["article"]);
                        list["video"].concat(pass["video"]);

                        if (typeof callback === "function") {
                            callback(list);
                        }
                    } else {
                        notice(chrome.i18n.getMessage("extIndexApi"), chrome.i18n.getMessage("extUpdate"))
                    }
                });
            }
        }
    };
    xhr.send();
}

//自动积分
function autoEarnPoints(timeout) {
    let url;
    let newTime = 0;
    setTimeout(function () {
        checkPointsData(function (data) {
            let score = data.dayScoreDtos;
            if (flashMode) {
                let urlArticle;
                let urlVideo;
                let keepWindows;
                let maxArticleWindow = 3;
                let maxVideoWindow = 3;

                if (!Object.keys(lastFlash).length) {
                    lastFlash = {
                        "article": {
                            "currentScore": 0,
                            "windowIds": [],
                            "windowUrls": []
                        },
                        "video": {
                            "currentScore": 0,
                            "windowIds": [],
                            "windowUrls": []
                        }
                    };
                }

                for (let key in score) {
                    if (!score.hasOwnProperty(key)) {
                        continue;
                    }
                    switch (score[key].ruleId) {
                        case 1:
                            if (score[key].currentScore < score[key].dayMaxScore) {
                                if (indexUrls.article.length) {
                                    urlArticle = indexUrls.article.shift();
                                }
                                if (lastFlash.article.windowIds.length && (lastFlash.article.currentScore === score[key].currentScore || lastFlash.article.windowIds.length >= maxArticleWindow)) {
                                    let lastArticleWindowId = lastFlash.article.windowIds.pop();
                                    setTimeout(function () {
                                        closeWindow(lastArticleWindowId);
                                    }, 3000);
                                }
                            }
                            lastFlash.article.currentScore = score[key].currentScore;
                            break;
                        case 2:
                            if (score[key].currentScore < score[key].dayMaxScore) {
                                if (indexUrls.video.length) {
                                    urlVideo = indexUrls.video.shift();
                                }
                                if (lastFlash.video.windowIds.length && (lastFlash.video.currentScore === score[key].currentScore || lastFlash.video.windowIds.length >= maxVideoWindow)) {
                                    let lastVideoWindowId = lastFlash.video.windowIds.pop();
                                    setTimeout(function () {
                                        closeWindow(lastVideoWindowId);
                                    }, 3000);
                                }
                            }
                            lastFlash.video.currentScore = score[key].currentScore;
                            break;
                        case 1002:
                            if (score[key].currentScore < score[key].dayMaxScore) {
                                keepWindows = 1;
                                if (!urlArticle && lastFlash.article.windowIds.length < maxArticleWindow) {
                                    urlArticle = getLastTypeUrl("article", lastFlash.article.windowUrls.length);
                                    if (!urlArticle && indexUrls.article.length) {
                                        urlArticle = indexUrls.article.shift();
                                    }
                                }
                            }
                            break;
                        case 1003:
                            if (score[key].currentScore < score[key].dayMaxScore) {
                                keepWindows = 1;
                                if (!urlVideo && lastFlash.video.windowIds.length < maxVideoWindow) {
                                    urlVideo = getLastTypeUrl("video", lastFlash.video.windowUrls.length);
                                    if (!urlVideo && indexUrls.video.length) {
                                        urlVideo = indexUrls.video.shift();
                                    }
                                }
                            }
                            break;
                    }
                }

                if (urlArticle || urlVideo || keepWindows) {
                    if (urlArticle) {
                        setTimeout(function () {
                            if (scoreTabId) {
                                lastFlash.article.windowUrls.push(urlArticle);
                                createWindow(urlArticle, function (window) {
                                    runningWindowIds.push(window.id);
                                    lastFlash.article.windowIds.push(window.id);
                                });
                            }
                        }, Math.floor(Math.random() * 1000))
                    }

                    if (urlVideo) {
                        setTimeout(function () {
                            if (scoreTabId) {
                                lastFlash.video.windowUrls.push(urlVideo);
                                createWindow(urlVideo, function (window) {
                                    runningWindowIds.push(window.id);
                                    lastFlash.video.windowIds.push(window.id);
                                });
                            }
                        }, 1000 + Math.floor(Math.random() * 1000))
                    }

                    newTime = 40 * 1000 + Math.floor(Math.random() * 20 * 1000);
                    autoEarnPoints(newTime);
                } else {
                    closeWindow();
                }
            } else {
                let type;
                let mode;

                for (let key in score) {
                    if (!score.hasOwnProperty(key)) {
                        continue;
                    }
                    switch (score[key].ruleId) {
                        case 1:
                            if (score[key].currentScore < score[key].dayMaxScore) {
                                type = "article";
                                mode = "quantity";
                                newTime = 35 * 1000 + Math.floor(Math.random() * 85 * 1000);
                            }
                            break;
                        case 2:
                            if (score[key].currentScore < score[key].dayMaxScore) {
                                type = "video";
                                mode = "quantity";
                                newTime = 35 * 1000 + Math.floor(Math.random() * 85 * 1000);
                            }
                            break;
                        case 1002:
                            if (score[key].currentScore < score[key].dayMaxScore) {
                                type = "article";
                                mode = "duration";
                                newTime = 125 * 1000 + Math.floor(Math.random() * 55 * 1000);
                            }
                            break;
                        case 1003:
                            if (score[key].currentScore < score[key].dayMaxScore) {
                                type = "video";
                                mode = "duration";
                                newTime = 185 * 1000 + Math.floor(Math.random() * 55 * 1000);
                            }
                            break;
                    }
                    if (type) {
                        break;
                    }
                }

                if (type) {
                    if (mode === "duration") {
                        url = getLastTypeUrl(type, 0);
                    }

                    if (!url && indexUrls[type].length) {
                        url = indexUrls[type].shift();
                    }
                }

                if (!isMobile) {
                    if (url && scoreTabId && runningWindowIds.length) {
                        chrome.windows.get(runningWindowIds[0], {"populate": true}, function (window) {
                            if (typeof window !== "undefined") {
                                chrome.tabs.sendMessage(window.tabs[window.tabs.length - 1].id, {
                                    "method": "redirect",
                                    "data": url
                                });
                                autoEarnPoints(newTime);
                            }
                        });
                    } else {
                        closeWindow();
                    }
                } else {
                    if (url && scoreTabId && runningTabId) {
                        chrome.tabs.sendMessage(runningTabId, {
                            "method": "redirect",
                            "data": url
                        });
                        autoEarnPoints(newTime);
                    } else {
                        chrome.tabs.remove(runningTabId);
                        chrome.tabs.remove(scoreTabId);
                    }
                }
            }
        });
    }, timeout);
}

//获取已使用网址
function getUsedUrl(callback) {
    chrome.storage.local.get(function (items) {
        let data = [];
        if (items.hasOwnProperty("used_url_" + userId)) {
            data = items["used_url_" + userId];
        }
        if (typeof callback === "function") {
            callback(data);
        }
    });
}

//保存已使用网址
function addUsedUrl(url) {
    usedUrls.push(url);

    if (timeoutId) {
        clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(function () {
        timeoutId = 0;
        if (usedUrls.length) {
            getUsedUrl(function (data) {
                let url, id, type, t;
                while ((url = usedUrls.shift()) !== undefined) {
                    id = getUrlId(url);
                    type = getUrlType(url);
                    if (id && type) {
                        t = type.substring(0, 1);
                        if (data.indexOf(id + "|" + t) === -1) {
                            data.push(id + "|" + t);
                        }
                    }
                }
                if (data.length > 1000) {
                    data = data.slice(-1000);
                }
                chrome.storage.local.set({["used_url_" + userId]: data});
            });
        }
    }, 1000);
}

//返回网址中的类型
function getUrlType(url) {
    let type;
    if (url.indexOf("e43e220633a65f9b6d8b53712cba9caa") !== -1) {
        type = "article";
    } else if (url.indexOf("cf94877c29e1c685574e0226618fb1be") !== -1) {
        type = "video";
    }
    return type;
}

//返回网址中的ID
function getUrlId(url) {
    let id;
    let urlArr = url.split("/");
    if (urlArr.length > 3 && urlArr[3].length === 32) {
        id = urlArr[3];
    }
    return id;
}

//获取最后使用的网址
function getLastTypeUrl(type, index) {
    let urls = [];
    getUsedUrl(function (usedUrl) {
        let length = usedUrl.length ? usedUrl.length - 1 : 0;
        let urlArr = [];
        let urlId = "";
        let tHash = "";
        for (let i = length; i >= 0; --i) {
            if (!usedUrl.hasOwnProperty(i)) {
                continue;
            }
            urlArr = usedUrl[i].split("|");
            if (urlArr.hasOwnProperty(1) && urlArr[1] === type.substring(0, 1)) {
                urlId = urlArr[0];
                tHash = urlArr[1] === "a" ? "e43e220633a65f9b6d8b53712cba9caa" : "cf94877c29e1c685574e0226618fb1be";
                urls.push(urlMap.index + "/" + urlId + "/" + tHash + ".html");
            }

            if (urls.length >= index + 1) {
                break;
            }
        }
    });
    return urls.hasOwnProperty(index) ? urls[index] : undefined;
}

//打乱数组
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

//通知
function notice(title, message = "") {
    if (!isMobile) {
        chrome.notifications.create({
            "type": "basic",
            "iconUrl": "img/128.png",
            "title": title,
            "message": message
        }, function (notificationId) {
            setTimeout(function () {
                chrome.notifications.clear(notificationId);
            }, 5000);
        });
    } else {
        alert(title + (message ? "\n" + message : ""));
    }
}

//创建窗口
function createWindow(url, callback) {
    chrome.windows.create({
        "url": url,
        "type": "popup",
        "top": 0,
        "left": 0,
        "width": windowWidth,
        "height": windowHeight
    }, function (window) {
        if (firefoxVersion) {
            chrome.windows.update(window.id, {
                "top": 0,
                "left": 0,
            });
        }
        chrome.tabs.update(window.tabs[window.tabs.length - 1].id, {"muted": true});
        if (typeof callback === "function") {
            callback(window);
        }
    })
}

//关闭窗口
function closeWindow(windowId) {
    if (windowId) {
        chrome.windows.get(windowId, function (window) {
            if (window) {
                chrome.windows.remove(windowId);
            }
        });
    } else {
        if (runningWindowIds.length) {
            while ((windowId = runningWindowIds.shift()) !== undefined) {
                chrome.windows.remove(windowId);
            }
        }
        if (scoreWindowId) {
            chrome.windows.remove(scoreWindowId);
        }
        notice(chrome.i18n.getMessage("extFinish"));
    }
}

//递归获取链接数组
function getIndexLinks(res, linkArr = []) {
    for (let key in res) {
        if (!res.hasOwnProperty(key)) {
            continue;
        }
        if (typeof res[key] === "string") {
            if (key === "link") {
                linkArr.push(res[key]);
            }
        } else if (typeof res[key] === "object" && res[key] !== null) {
            getIndexLinks(res[key], linkArr);
        }
    }
}

//获取登录链接
function getLoginUrl() {
    return !isMobile ? (accountLogin ? urlMap.account : urlMap.points) : urlMap.account;
}

//扩展按钮点击事件
chrome.browserAction.onClicked.addListener(function (tab) {
    if (chromeVersion < 45 && firefoxVersion < (isMobile ? 55 : 48)) {
        notice(chrome.i18n.getMessage("extVersion"));
    } else {
        if (!isMobile) {
            if (scoreTabId) {
                if (runningWindowIds.length) {
                    for (let key in runningWindowIds) {
                        if (!runningWindowIds.hasOwnProperty(key)) {
                            continue;
                        }
                        chrome.windows.update(runningWindowIds[key], {"focused": true, "state": "normal"});
                    }
                } else {
                    chrome.windows.update(scoreWindowId, {"focused": true, "state": "normal"});
                }
            } else {
                lastFlash = {};
                indexUrls = {};
                usedUrls = [];
                userId = 0;
                createWindow(getLoginUrl(), function (window) {
                    scoreWindowId = window.id;
                    scoreTabId = window.tabs[window.tabs.length - 1].id;
                });
            }
        } else {
            if (scoreTabId) {
                if (runningTabId) {
                    chrome.tabs.update(runningTabId, {"active": true});
                } else {
                    chrome.tabs.update(scoreTabId, {"active": true});
                }
            } else {
                lastFlash = {};
                indexUrls = {};
                usedUrls = [];
                userId = 0;
                chrome.tabs.create({"url": getLoginUrl()}, function (tab) {
                    scoreTabId = tab.id;
                });
            }
        }
    }
});

//标签页更新事件
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (tabId === scoreTabId) {
        if (changeInfo.hasOwnProperty("url") && changeInfo.url.indexOf("my-study") !== -1) {
            redirectPoints = 1;
        }
        if (changeInfo.hasOwnProperty("status") && changeInfo.status === "complete" && redirectPoints) {
            redirectPoints = 0;
            setTimeout(function () {
                chrome.tabs.sendMessage(tabId, {
                    "method": "redirect",
                    "data": urlMap.points
                });
            }, Math.floor(Math.random() * 3000));
        }
    }
});

//标签页移除事件
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    if (tabId === runningTabId) {
        runningTabId = 0;
    } else if (tabId === scoreTabId) {
        scoreTabId = 0;
    }
});

//窗口移除事件
if (!isMobile) {
    chrome.windows.onRemoved.addListener(function (windowId) {
        let windowsIndex = runningWindowIds.indexOf(windowId);
        if (windowsIndex !== -1) {
            runningWindowIds.splice(windowsIndex, 1);
        } else if (windowId === scoreWindowId) {
            scoreWindowId = 0;
            chrome.browserAction.setBadgeText({"text": ""});
            chrome.contextMenus.update(modeMenu[0], {"enabled": true});
            chrome.contextMenus.update(modeMenu[1], {"enabled": true});
        }
    });
}

//通信事件
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.method) {
        case "checkTab":
            if (runningWindowIds.indexOf(sender.tab.windowId) !== -1 || sender.tab.id === runningTabId || sender.tab.id === scoreTabId) {
                sendResponse({
                    "runtime": (flashMode ? 2 : 1)
                });
            }
            break;
        case "startRun":
            if (!Object.keys(indexUrls).length) {
                if (!isMobile) {
                    if (!runningWindowIds.length) {
                        checkPointsData(function (data) {
                            userId = data.userId;
                            createWindow(urlMap.index, function (window) {
                                runningWindowIds.push(window.id);
                                checkIndexData(function (list) {
                                    indexUrls = list;
                                    chrome.contextMenus.update(modeMenu[0], {"enabled": false});
                                    chrome.contextMenus.update(modeMenu[1], {"enabled": false});
                                    notice(chrome.i18n.getMessage("extWorking"), chrome.i18n.getMessage("extWarning"));
                                    autoEarnPoints(1000 + Math.floor(Math.random() * 1000));
                                });
                            });
                        });
                    }
                } else {
                    if (!runningTabId) {
                        checkPointsData(function (data) {
                            userId = data.userId;
                            chrome.tabs.create({"url": urlMap.index}, function (tab) {
                                runningTabId = tab.id;
                                checkIndexData(function (list) {
                                    indexUrls = list;
                                    autoEarnPoints(1000 + Math.floor(Math.random() * 1000));
                                });
                            });
                        });
                    }
                }
            }
            break;
        case "useUrl":
            addUsedUrl(sender.tab.url);
            break;
    }
});