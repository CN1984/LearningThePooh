let loginTabId, runningWindowId, lastTypeUrl = {};

//检查用户积分
function checkPoints(callback) {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", "https://pc-api.xuexi.cn/open/api/score/today/queryrate", true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                let res = JSON.parse(xhr.responseText);
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
                chrome.browserAction.setBadgeText({"text": points.toString()});
                callback(res.data);
            } else {
                if (loginTabId) {
                    chrome.tabs.remove(loginTabId);
                }
                if (runningWindowId) {
                    chrome.windows.remove(runningWindowId);
                }
                chrome.tabs.create({"url": "https://pc.xuexi.cn/points/login.html?ref=https://pc.xuexi.cn/points/my-points.html"}, function (tab) {
                    loginTabId = tab.id;
                    chrome.tabs.update(tab.id, {"muted": true});
                    chrome.notifications.create({
                        "type": "basic",
                        "iconUrl": "img/128.png",
                        "title": chrome.i18n.getMessage("extLogin"),
                        "message": ""
                    }, function (notificationId) {
                        setTimeout(function () {
                            chrome.notifications.clear(notificationId);
                        }, 5000);
                    });
                })
            }
        }
    };
    xhr.send();
}

//自动积分
function autoEarnPoints(list, wait) {
    let type;
    let mode;
    let url;
    let newWait = 0;

    checkPoints(function (res) {
        for (let key in res) {
            if (!res.hasOwnProperty(key)) {
                continue;
            }
            switch (res[key].ruleId) {
                case 1:
                    if (res[key].currentScore < res[key].dayMaxScore) {
                        type = "article";
                        mode = "quantity";
                        newWait = 35 * 1000 + Math.floor(Math.random() * 25 * 1000);
                    }
                    break;
                case 2:
                    if (res[key].currentScore < res[key].dayMaxScore) {
                        type = "video";
                        mode = "quantity";
                        newWait = 35 * 1000 + Math.floor(Math.random() * 25 * 1000);
                    }
                    break;
                case 1002:
                    if (res[key].currentScore < res[key].dayMaxScore) {
                        type = "article";
                        mode = "duration";
                        newWait = 245 * 1000 + Math.floor(Math.random() * 25 * 1000);
                    }
                    break;
                case 1003:
                    if (res[key].currentScore < res[key].dayMaxScore) {
                        type = "video";
                        mode = "duration";
                        newWait = 305 * 1000 + Math.floor(Math.random() * 25 * 1000);
                    }
                    break;
            }
            if (type) {
                break;
            }
        }

        if (type) {
            if (mode === "duration" && lastTypeUrl.hasOwnProperty(type)) {
                url = lastTypeUrl[type];
            } else if (list[type].length) {
                url = list[type].pop();
            }
        }

        if (url) {
            setTimeout(function () {
                if (runningWindowId) {
                    chrome.windows.get(runningWindowId, {"populate": true}, function (window) {
                        if (typeof window !== "undefined") {
                            addUsedUrl(url);
                            lastTypeUrl[type] = url;
                            chrome.tabs.update(window.tabs[0].id, {"url": url, "muted": true});
                            autoEarnPoints(list, newWait);
                        }
                    });
                }
            }, wait);
        } else {
            if (runningWindowId) {
                chrome.windows.remove(runningWindowId);
            }
            chrome.tabs.create({"url": "https://pc.xuexi.cn/points/my-points.html"});
            chrome.notifications.create({
                "type": "basic",
                "iconUrl": "img/128.png",
                "title": chrome.i18n.getMessage("extFinish"),
                "message": ""
            }, function (notificationId) {
                setTimeout(function () {
                    chrome.notifications.clear(notificationId);
                }, 5000);
            });
        }
    });
}

//获取已使用网址
function getUsedUrl(callback) {
    chrome.storage.local.get("used_url", function (items) {
        let data = [];
        if (items.hasOwnProperty("used_url")) {
            data = items["used_url"];
        }
        callback(data);
    });
}

//添加已使用网址
function addUsedUrl(url) {
    let id = getUrlId(url);
    if (id) {
        chrome.storage.local.get("used_url", function (items) {
            let data = [];
            if (items.hasOwnProperty("used_url")) {
                data = items["used_url"];
            }
            if (data.indexOf(id) === -1) {
                data.push(id);
                if (data.length > 1000) {
                    data.slice(-1000);
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


//扩展按钮点击事件
chrome.browserAction.onClicked.addListener(function (tab) {
    let chromeVersion = (/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [0, 0])[1];
    if (chromeVersion < 44) {
        chrome.notifications.create({
            "type": "basic",
            "iconUrl": "img/128.png",
            "title": chrome.i18n.getMessage("extVersion"),
            "message": ""
        }, function (notificationId) {
            setTimeout(function () {
                chrome.notifications.clear(notificationId);
            }, 5000);
        });
    } else {
        //通过查询积分来判断是否登录
        checkPoints(function (res) {
            if (runningWindowId) {
                chrome.windows.get(runningWindowId, function (window) {
                    if (typeof window !== "undefined") {
                        chrome.windows.update(runningWindowId, {"focused": true, "state": "normal"});
                    }
                });
            } else {
                chrome.windows.create({
                    "url": "https://www.xuexi.cn",
                    "focused": true,
                    "type": "popup",
                    "top": 0,
                    "left": 0,
                    "width": 220,
                    "height": 1
                }, function (window) {
                    runningWindowId = window.id;
                    chrome.notifications.create({
                        "type": "basic",
                        "iconUrl": "img/128.png",
                        "title": chrome.i18n.getMessage("extWorking"),
                        "message": chrome.i18n.getMessage("extWarning")
                    }, function (notificationId) {
                        setTimeout(function () {
                            chrome.notifications.clear(notificationId);
                        }, 5000);
                    });
                })
            }
        });
    }
});

//标签页更新事件
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (tabId === loginTabId) {
        if (changeInfo.url === "https://pc.xuexi.cn/points/my-points.html") {
            chrome.windows.create({
                "url": "https://www.xuexi.cn",
                "focused": true,
                "type": "popup",
                "top": 0,
                "left": 0,
                "width": 220,
                "height": 1
            }, function (window) {
                chrome.tabs.remove(loginTabId);
                runningWindowId = window.id;
                chrome.notifications.create({
                    "type": "basic",
                    "iconUrl": "img/128.png",
                    "title": chrome.i18n.getMessage("extWorking"),
                    "message": chrome.i18n.getMessage("extWarning")
                }, function (notificationId) {
                    setTimeout(function () {
                        chrome.notifications.clear(notificationId);
                    }, 5000);
                });
            })
        }
    }
});

//标签页移除事件
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    if (tabId === loginTabId) {
        loginTabId = undefined;
    }
});

chrome.windows.onRemoved.addListener(function (windowId) {
    if (windowId === runningWindowId) {
        chrome.browserAction.setBadgeText({"text": ""});
        runningWindowId = undefined;
    }
});

//通信事件
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.method) {
        case "dataIndex":
            if (runningWindowId) {
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
                                                let type = getUrlType(url);
                                                let urlId = getUrlId(url);
                                                if (type && urlId && list[type].indexOf(url) === -1 && usedUrl.indexOf(urlId) === -1) {
                                                    list[type].push(url);
                                                }
                                            }
                                        }
                                    }
                                }
                                shuffle(list["article"]);
                                shuffle(list["video"]);
                                autoEarnPoints(list, 1000 + Math.floor(Math.random()* 1000));
                            });
                        }
                    }
                };
                xhr.send();
            }
            break;
        case "checkTab":
            if (runningWindowId) {
                if (sender.tab.windowId === runningWindowId) {
                    sendResponse({
                        runtime: 1
                    });
                }
            }
            break;
    }
});