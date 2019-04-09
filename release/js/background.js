let loginTabId = 0, runningWindowIds = [], flashMode = 0, lastFlash = {}, modeMenu = [];
let windowWidth = 320 + Math.floor(Math.random() * 160);
let windowHeight = 320 + Math.floor(Math.random() * 160);
let chromeVersion = (/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [0, 0])[1];
let firefoxVersion = (/Firefox\/([0-9]+)/.exec(navigator.userAgent) || [0, 0])[1];
let isMobile = !!(/Mobile/.exec(navigator.userAgent));

//生成运行模式菜单
if (!isMobile) {
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
}

//检查用户积分
function checkPoints(callback) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "https://pc-api.xuexi.cn/open/api/score/today/queryrate", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            let res = JSON.parse(xhr.responseText);
            if (res.hasOwnProperty("code") && parseInt(res.code) === 200) {
                let points = 0;
                let ruleList = [1, 2, 9, 1002, 1003];
                for (let key in res.data) {
                    if (!res.data.hasOwnProperty(key)) {
                        continue;
                    }
                    if (ruleList.indexOf(res.data[key].ruleId) !== -1) {
                        points += res.data[key].currentScore;
                    }
                }
                if (!isMobile) {
                    chrome.browserAction.setBadgeText({"text": points.toString()});
                }
                if (typeof callback === "function") {
                    callback(res.data);
                }
            } else {
                if (loginTabId) {
                    chrome.tabs.remove(loginTabId);
                }
                if (runningWindowIds.length) {
                    closeWindow();
                }
                chrome.tabs.create({"url": "https://pc.xuexi.cn/points/login.html?ref=https://pc.xuexi.cn/points/my-points.html"}, function (tab) {
                    if (!isMobile) {
                        chrome.tabs.update(tab.id, {"muted": true});
                        notice(chrome.i18n.getMessage("extLogin"));
                    }
                    loginTabId = tab.id;
                });
            }
        }
    };
    xhr.send();
}

//自动积分
function autoEarnPoints(list, wait) {
    let url;
    let newWait = 0;
    setTimeout(function () {
        if (runningWindowIds.length || loginTabId) {
            checkPoints(function (res) {
                if (flashMode) {
                    let urlArticle;
                    let urlVideo;
                    let keepWindows;
                    let maxArticleWindow = 3;
                    let maxVideoWindow = 3;

                    if (!lastFlash.hasOwnProperty("article")) {
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

                    for (let key in res) {
                        if (!res.hasOwnProperty(key)) {
                            continue;
                        }
                        switch (res[key].ruleId) {
                            case 1:
                                if (res[key].currentScore < res[key].dayMaxScore) {
                                    if (list.article.length) {
                                        urlArticle = list.article.pop();
                                    }
                                    if (lastFlash.article.windowIds.length && (lastFlash.article.currentScore === res[key].currentScore || lastFlash.article.windowIds.length >= maxArticleWindow)) {
                                        let lastArticleWindowId = lastFlash.article.windowIds[lastFlash.article.windowIds.length - 1];
                                        lastFlash.article.windowIds = lastFlash.article.windowIds.slice(0, -1);
                                        setTimeout(function () {
                                            closeWindow(lastArticleWindowId);
                                        }, 3000);
                                    }
                                }
                                lastFlash.article.currentScore = res[key].currentScore;
                                break;
                            case 2:
                                if (res[key].currentScore < res[key].dayMaxScore) {
                                    if (list.video.length) {
                                        urlVideo = list.video.pop();
                                    }
                                    if (lastFlash.video.windowIds.length && (lastFlash.video.currentScore === res[key].currentScore || lastFlash.video.windowIds.length >= maxVideoWindow)) {
                                        let lastVideoWindowId = lastFlash.video.windowIds[lastFlash.video.windowIds.length - 1];
                                        lastFlash.video.windowIds = lastFlash.video.windowIds.slice(0, -1);
                                        setTimeout(function () {
                                            closeWindow(lastVideoWindowId);
                                        }, 3000);
                                    }
                                }
                                lastFlash.video.currentScore = res[key].currentScore;
                                break;
                            case 1002:
                                if (res[key].currentScore < res[key].dayMaxScore) {
                                    keepWindows = 1;
                                    if (!urlArticle && lastFlash.article.windowIds.length < maxArticleWindow) {
                                        urlArticle = getLastTypeUrl("article", lastFlash.article.windowUrls.length);
                                        if (!urlArticle && list.article.length) {
                                            urlArticle = list.article.pop();
                                        }
                                    }
                                }
                                break;
                            case 1003:
                                if (res[key].currentScore < res[key].dayMaxScore) {
                                    keepWindows = 1;
                                    if (!urlVideo && lastFlash.video.windowIds.length < maxVideoWindow) {
                                        urlVideo = getLastTypeUrl("video", lastFlash.video.windowUrls.length);
                                        if (!urlVideo && list.video.length) {
                                            urlVideo = list.video.pop();
                                        }
                                    }
                                }
                                break;
                        }
                    }

                    if (urlArticle || urlVideo || keepWindows) {
                        if (urlArticle) {
                            setTimeout(function () {
                                if (runningWindowIds.length) {
                                    addUsedUrl(urlArticle);
                                    lastFlash.article.windowUrls.push(urlArticle);
                                    createWindow(urlArticle, function (window) {
                                        lastFlash.article.windowIds.push(window.id);
                                    });
                                }
                            }, Math.floor(Math.random() * 1000))
                        }

                        if (urlVideo) {
                            setTimeout(function () {
                                if (runningWindowIds.length) {
                                    addUsedUrl(urlVideo);
                                    lastFlash.video.windowUrls.push(urlVideo);
                                    createWindow(urlVideo, function (window) {
                                        lastFlash.video.windowIds.push(window.id);
                                    });
                                }
                            }, 1000 + Math.floor(Math.random() * 1000))
                        }

                        newWait = 40 * 1000 + Math.floor(Math.random() * 20 * 1000);
                        autoEarnPoints(list, newWait);
                    } else {
                        closeWindow();
                    }
                } else {
                    let type;
                    let mode;

                    for (let key in res) {
                        if (!res.hasOwnProperty(key)) {
                            continue;
                        }
                        switch (res[key].ruleId) {
                            case 1:
                                if (res[key].currentScore < res[key].dayMaxScore) {
                                    type = "article";
                                    mode = "quantity";
                                    newWait = 35 * 1000 + Math.floor(Math.random() * 85 * 1000);
                                }
                                break;
                            case 2:
                                if (res[key].currentScore < res[key].dayMaxScore) {
                                    type = "video";
                                    mode = "quantity";
                                    newWait = 35 * 1000 + Math.floor(Math.random() * 85 * 1000);
                                }
                                break;
                            case 1002:
                                if (res[key].currentScore < res[key].dayMaxScore) {
                                    type = "article";
                                    mode = "duration";
                                    newWait = 125 * 1000 + Math.floor(Math.random() * 55 * 1000);
                                }
                                break;
                            case 1003:
                                if (res[key].currentScore < res[key].dayMaxScore) {
                                    type = "video";
                                    mode = "duration";
                                    newWait = 185 * 1000 + Math.floor(Math.random() * 55 * 1000);
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

                        if (!url && list[type].length) {
                            url = list[type].pop();
                        }
                    }

                    if (!isMobile) {
                        if (url && runningWindowIds.length) {
                            chrome.windows.get(runningWindowIds[0], {"populate": true}, function (window) {
                                if (typeof window !== "undefined") {
                                    addUsedUrl(url);
                                    chrome.tabs.update(window.tabs[window.tabs.length - 1].id, {
                                        "url": url,
                                        "muted": true
                                    });
                                    autoEarnPoints(list, newWait);
                                }
                            });
                        } else {
                            closeWindow();
                        }
                    } else {
                        if (url && loginTabId) {
                            addUsedUrl(url);
                            chrome.tabs.update(loginTabId, {"url": url});
                            autoEarnPoints(list, newWait);
                        } else {
                            chrome.tabs.remove(loginTabId);
                        }
                    }
                }
            });
        }
    }, wait);
}

//获取已使用网址
function getUsedUrl(callback) {
    chrome.storage.local.get("used_url", function (items) {
        let data = [];
        if (items.hasOwnProperty("used_url")) {
            data = items["used_url"];
        }
        if (typeof callback === "function") {
            callback(data);
        }
    });
}

//添加已使用网址
function addUsedUrl(url) {
    let id = getUrlId(url);
    let type = getUrlType(url);
    let t = type ? type.substring(0, 1) : "";
    if (id && t) {
        chrome.storage.local.get("used_url", function (items) {
            let data = [];
            if (items.hasOwnProperty("used_url")) {
                data = items["used_url"];
            }
            if (data.indexOf(id + "|" + t) === -1) {
                let idIndex = data.indexOf(id);
                if (idIndex === -1) {
                    data.push(id + "|" + t);
                    if (data.length > 1000) {
                        data = data.slice(-1000);
                    }
                } else {
                    data[idIndex] = id + "|" + t;
                }
            }
            chrome.storage.local.set({"used_url": data});
        })
    }
}

//返回网址中的类型
function getUrlType(url) {
    let type;
    if (url.search("e43e220633a65f9b6d8b53712cba9caa") !== -1) {
        type = "article";
    } else if (url.search("cf94877c29e1c685574e0226618fb1be") !== -1) {
        type = "video";
    }
    return type;
}

//返回网址中的ID
function getUrlId(url) {
    let id;
    str = url.substring(21, 53);
    if (str.length === 32) {
        id = str;
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
                urls.push("https://www.xuexi.cn/" + urlId + "/" + tHash + ".html");
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
    var currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
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
        alert(title);
    }
}

//创建窗口
function createWindow(url, callback) {
    chrome.windows.create({
        "url": url ? url : "https://www.xuexi.cn",
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
        runningWindowIds.push(window.id);
        if (!url) {
            lastFlash = {};
            chrome.contextMenus.update(modeMenu[0], {"enabled": false});
            chrome.contextMenus.update(modeMenu[1], {"enabled": false});
            notice(chrome.i18n.getMessage("extWorking"), chrome.i18n.getMessage("extWarning"));
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
    } else if (runningWindowIds.length) {
        while (windowId = runningWindowIds.pop()) {
            chrome.windows.remove(windowId);
        }
        notice(chrome.i18n.getMessage("extFinish"));
    }
}

//扩展按钮点击事件
chrome.browserAction.onClicked.addListener(function (tab) {
    if (chromeVersion < 45 && firefoxVersion < (isMobile ? 55 : 48)) {
        notice(chrome.i18n.getMessage("extVersion"));
    } else {
        checkPoints(function (res) {
            if (!isMobile) {
                if (runningWindowIds.length) {
                    for (let key in runningWindowIds) {
                        if (!runningWindowIds.hasOwnProperty(key)) {
                            continue;
                        }
                        chrome.windows.update(runningWindowIds[key], {"focused": true, "state": "normal"});
                    }
                } else {
                    createWindow();
                }
            } else {
                if (loginTabId) {
                    chrome.tabs.update(loginTabId, {"active": true});
                } else {
                    chrome.tabs.create({"url": "https://www.xuexi.cn"}, function (tab) {
                        loginTabId = tab.id;
                    });
                }
            }
        });
    }
});

//标签页更新事件
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (tabId === loginTabId) {
        if (changeInfo.url === "https://pc.xuexi.cn/points/my-points.html") {
            if (!isMobile) {
                chrome.tabs.remove(loginTabId);
                createWindow();
            } else {
                chrome.tabs.update(loginTabId, {"url": "https://www.xuexi.cn"});
            }
        }
    }
});

//标签页移除事件
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    if (tabId === loginTabId) {
        loginTabId = 0;
    }
});

//窗口移除事件
if (!isMobile) {
    chrome.windows.onRemoved.addListener(function (windowId) {
        let windowsIndex = runningWindowIds.indexOf(windowId);
        if (windowsIndex !== -1) {
            runningWindowIds.splice(windowsIndex, 1);
        }

        if (runningWindowIds.length === 0) {
            chrome.browserAction.setBadgeText({"text": ""});
            chrome.contextMenus.update(modeMenu[0], {"enabled": true});
            chrome.contextMenus.update(modeMenu[1], {"enabled": true});
        }
    });
}

//通信事件
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.method) {
        case "dataIndex":
            let xhr = new XMLHttpRequest();
            xhr.open("GET", request.data, true);
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        let res = JSON.parse(xhr.responseText.substring(xhr.responseText.search("{"), xhr.responseText.length - 1));
                        let list = {
                            "article": [],
                            "video": []
                        };
                        getUsedUrl(function (usedUrl) {
                            for (let key in res) {
                                if (!res.hasOwnProperty(key)) {
                                    continue;
                                }
                                let obj = res[key];
                                let objFirst = obj[Object.keys(obj)[0]];
                                if (typeof objFirst === "object" && objFirst.length) {
                                    for (let index in objFirst) {
                                        if (!objFirst.hasOwnProperty(index)) {
                                            continue;
                                        }

                                        let url;
                                        let valve = objFirst[index];

                                        if (valve.hasOwnProperty("art_id")) {
                                            url = valve["art_id"];
                                        } else if (valve.hasOwnProperty("static_page_url")) {
                                            url = valve["static_page_url"];
                                        }

                                        if (url) {
                                            let urlId = getUrlId(url);
                                            let type = getUrlType(url);
                                            let t = type ? type.substring(0, 1) : "";
                                            if (type && urlId && list[type].indexOf(url) === -1) {
                                                if (usedUrl.indexOf(urlId + "|" + t) === -1) {
                                                    if (usedUrl.indexOf(urlId) === -1) {
                                                        list[type].push(url);
                                                    } else {
                                                        addUsedUrl(url);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            shuffle(list["article"]);
                            shuffle(list["video"]);
                            autoEarnPoints(list, 1000 + Math.floor(Math.random() * 1000));
                        });
                    }
                }
            };
            xhr.send();
            break;
        case "checkTab":
            if (runningWindowIds.indexOf(sender.tab.windowId) !== -1 || loginTabId === sender.tab.id) {
                sendResponse({
                    runtime: (flashMode ? 2 : 1)
                });
            }
            break;
    }
});