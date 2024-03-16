// Session Storage 存資料
function saveToSessionStorage(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
}

// 從 Session Storage 取資料
function getFromSessionStorage(key) {
    const storedValue = sessionStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : null;
}

// 從 Session Storage 取某筆資料
function getFromSessionStorageTargetItem(key, targetId) {
    var storedDatas = getFromSessionStorage(key);
    for (var i = 0; i < storedDatas.length; i++) {
        if (storedDatas[i].HtmlId === targetId) {
            return storedDatas[i];
        }
    }
    return null;
}

// 取得我的法術書，若不存在自動產生Key
function getFromSessionStorageSpellBooks() {
    var getData = getFromSessionStorage('mySpellBooks');
    if (getData == null) {
        getData = [];
        saveToSessionStorage('mySpellBooks', getData);
    }
    return getData;
}

// 從 Session Storage 刪除指定資料
function deleteFromSessionStorage(key) {
    sessionStorage.removeItem(key);    
}