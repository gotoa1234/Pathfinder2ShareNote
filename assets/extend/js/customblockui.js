var element = document.getElementById("page-mask-image");
var HomeBg = document.getElementById("home-page-image");    

if (element) {
    element.style.position = "fixed";
    element.style.top = "0";
    element.style.left = "0";
    element.style.width = "100%";
    element.style.height = "100%";
    element.style.opacity = "0.50";
    element.style.zIndex = "9999";
}

function showBlockUI() {
    var blockUI = document.getElementById('page-mask');
    blockUI.style.display = 'block';
}

function hideBlockUI() {
    var blockUI = document.getElementById('page-mask');
    blockUI.style.display = 'none';
}

if (HomeBg) {
    HomeBg.style.position = "fixed";
    HomeBg.style.top = "0";
    HomeBg.style.left = "0";
    HomeBg.style.width = "100%";
    HomeBg.style.height = "100%";
    HomeBg.style.opacity = "0.25";
    HomeBg.style.zIndex = "2";
}

function OpenHomeBg() {
    var bg = document.getElementById('home-page-bg');
    bg.style.display = 'block';
}

function CloseHomeBg() {
    var bg = document.getElementById('home-page-bg');
    bg.style.display = 'none';
}