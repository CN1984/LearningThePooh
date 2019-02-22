let loginTabId, runningTabId;

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
    let url;
    let newWait = 0;

    checkPoints(function (res) {
        for (let key in res) {
            switch (res[key].ruleId) {
                case 1:
                    if (res[key].currentScore < res[key].dayMaxScore) {
                        type = "article";
                        newWait = 60 * 1000 + 10000;
                    }
                    break;
                case 2:
                    if (res[key].currentScore < res[key].dayMaxScore) {
                        type = "video";
                        newWait = 60 * 1000 + 10000;
                    }
                    break;
                case 1002:
                    if (res[key].currentScore < res[key].dayMaxScore) {
                        type = "article";
                        newWait = 4 * 60 * 1000 + 10000;
                    }
                    break;
                case 1003:
                    if (res[key].currentScore < res[key].dayMaxScore) {
                        type = "video";
                        newWait = 5 * 60 * 1000 + 10000;
                    }
                    break;
            }
            if (type) {
                break;
            }
        }

        if (type && list[type].length) {
            url = list[type].pop();
        }

        if (url) {
            setTimeout(function () {
                if (runningTabId) {
                    chrome.tabs.get(runningTabId, function (tab) {
                        if (typeof tab !== "undefined") {
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
        case 'dataIndex':
            if (runningTabId) {
                let xhr = new XMLHttpRequest();
                xhr.open("GET", request.data, true);
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            let res = JSON.parse(xhr.responseText.substring(xhr.responseText.search('{'), xhr.responseText.length - 1));
                            let list = {
                                "article": [],
                                "video": []
                            };
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
                                        let valve = objFirst[index];
                                        if (valve.hasOwnProperty('art_id')) {
                                            list.article.push(valve['art_id']);
                                        } else if (valve.hasOwnProperty('programa_id') && valve['programa_id'] === '["学习电视台"]') {
                                            list.video.push(valve['static_page_url']);
                                        }
                                    }
                                }
                            }
                            autoEarnPoints(list, 0);
                        }
                    }
                };
                xhr.send();
            }
            break;
        case 'checkTab':
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