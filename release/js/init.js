let scriptList = document.querySelectorAll("script");
if (typeof scriptList === "object") {
    for (let key in scriptList) {
        if (!scriptList.hasOwnProperty(key)) {
            continue;
        }
        if (scriptList[key].src.search("dataindex.js") !== -1) {
            chrome.runtime.sendMessage({
                "method": "dataIndex",
                "data": scriptList[key].src
            });
            break;
        }
    }
}