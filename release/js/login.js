let redFlag = document.querySelector('.redflagbox');
if (redFlag) {
    let rect = redFlag.getBoundingClientRect();
    window.scrollTo((document.body.clientWidth - document.documentElement.clientWidth)/2, rect.top + rect.height + window.scrollY);
}