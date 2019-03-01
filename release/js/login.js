let scrollX = (document.body.clientWidth - document.documentElement.clientWidth)/2 - 30 + Math.floor(Math.random() * 60);
let scrollY = document.body.scrollHeight;

let redFlag = document.querySelector('.redflagbox');
if (redFlag) {
    let rect = redFlag.getBoundingClientRect();
    scrollY = rect.top + rect.height + window.scrollY - 30 + Math.floor(Math.random() * 60);
}

window.scrollTo(scrollX, scrollY);