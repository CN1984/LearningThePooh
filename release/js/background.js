let loginTabId, runningTabId, lastTypeUrl = {};

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
                if (runningTabId) {
                    chrome.tabs.remove(runningTabId);
                }
                chrome.tabs.create({"url": "https://pc.xuexi.cn/points/login.html?ref=https://pc.xuexi.cn/points/my-points.html#ddlogin"}, function (tab) {
                    loginTabId = tab.id;
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
                        newWait = 60 * 1000 + 10000;
                    }
                    break;
                case 2:
                    if (res[key].currentScore < res[key].dayMaxScore) {
                        type = "video";
                        mode = "quantity";
                        newWait = 60 * 1000 + 10000;
                    }
                    break;
                case 1002:
                    if (res[key].currentScore < res[key].dayMaxScore) {
                        type = "article";
                        mode = "duration";
                        newWait = 4 * 60 * 1000 + 10000;
                    }
                    break;
                case 1003:
                    if (res[key].currentScore < res[key].dayMaxScore) {
                        type = "video";
                        mode = "duration";
                        newWait = 5 * 60 * 1000 + 10000;
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
                if (runningTabId) {
                    chrome.tabs.get(runningTabId, function (tab) {
                        if (typeof tab !== "undefined") {
                            addUsedUrl(url);
                            lastTypeUrl[type] = url;
                            chrome.tabs.update(runningTabId, {"url": url});
                            autoEarnPoints(list, newWait);
                        }
                    });
                }
            }, wait);
        } else {
            if (runningTabId) {
                chrome.tabs.remove(runningTabId);
            }
            chrome.tabs.create({"url": "https://pc.xuexi.cn/points/my-points.html"});
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


//扩展按钮点击事件
chrome.browserAction.onClicked.addListener(function (tab) {
    //通过查询积分来判断是否登录
    checkPoints(function (res) {
        if (runningTabId) {
            chrome.tabs.get(runningTabId, function (tab) {
                if (typeof tab !== "undefined") {
                    chrome.windows.update(tab.windowId, {"focused": true, "state": "normal"});
                    return false;
                }
            });
        }

        chrome.windows.create({
            "url": "https://www.xuexi.cn",
            "focused": true,
            "type": "popup",
            "top": 0,
            "left": 0,
            "width": 180,
            "height": 100
        }, function (window) {
            runningTabId = window.tabs[0].id;
        })
    });
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
                "width": 180,
                "height": 100
            }, function (window) {
                runningTabId = window.tabs[0].id;
                chrome.tabs.remove(loginTabId);
            })
        }
    }
});

//标签页移除事件
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
    if (tabId === loginTabId) {
        loginTabId = undefined;
    } else if (tabId === runningTabId) {
        chrome.browserAction.setBadgeText({"text": ""});
        runningTabId = undefined;
    }
});

//通信事件
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    switch (request.method) {
        case "dataIndex":
            if (runningTabId) {
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
                                autoEarnPoints(list, 0);
                            });
                        }
                    }
                };
                xhr.send();
            }
            break;
        case "checkTab":
            if (runningTabId) {
                if (sender.tab.id === runningTabId) {
                    sendResponse({
                        runtime: 1
                    });
                }
            }
            break;
    }
});