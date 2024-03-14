//初始化
async function indexedDBUtilInitinalize()
{    
    showBlockUI();   
    checkIndexedDB().then(function (result) {
        if (result.versionChanged || result.empty) {
            //需要更新
            console.log('working');
            fetchDataAndStoreInIndexedDB().then(function () {
                hideBlockUI();
            }).catch(function (error) {
                console.error("Error fetchDataAndStoreInIndexedDB():", error);
                hideBlockUI();
            });
        }
        else
        {
           hideBlockUI();
        }
    })
    .catch(function (error) {
        console.error("Error checking IndexedDB:", error);
        hideBlockUI();
    });
}

//設定檔
async function getFunctionProperties() {
    const fileVersion = await getVersionFile();
    return {
        fileVersion: fileVersion,
        dbName: 'pathfinderShareNote-database',
        storeName: 'magicStore'
    };
}

//取得SpellModel的Json資料
async function getSpellModelFile() {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'assets/extend/jsonFile/SpellModel.json', true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function () {            
            var uint8Array = new Uint8Array(this.response);
            // 資料轉為字串
            var jsonString = new TextDecoder().decode(uint8Array);
            // 解析為json格式
            var jsonObject = JSON.parse(jsonString);
            // 返回資料
            resolve(jsonObject);
        };
        xhr.send();
    });
}

async function getVersionFile() {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'assets/extend/jsonfile/Version.json', true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function () {
            var uint8Array = new Uint8Array(this.response);            
            var jsonString = new TextDecoder().decode(uint8Array);            
            var jsonObject = JSON.parse(jsonString);            
            resolve(jsonObject.Version);
        };
        xhr.send();
    });
}

async function checkIndexedDB() {
    var config = await getFunctionProperties();

    return new Promise(function (resolve, reject) {
        var request = indexedDB.open(config.dbName);

        // 1. 無法開啟返回錯誤
        request.onerror = function (event) {
            reject("Error opening IndexedDB: " + event.target.errorCode);
        };

        // 2. 成功開啟進行檢查
        request.onsuccess = function (event) {
            var db = event.target.result;
            var dbCurrentVersion = db.version;

            if (dbCurrentVersion !== config.fileVersion ||
                dbCurrentVersion === 1) {
                // 版本異動，需要重抓資料
                resolve({ versionChanged: true });
            } else {
                // 版本沒變化，檢查是否空
                var transaction = db.transaction([config.storeName], 'readonly');
                var objectStore = transaction.objectStore(config.storeName);
                var countRequest = objectStore.count();

                countRequest.onsuccess = function () {
                    var count = countRequest.result;
                    if (count === 0) {
                        // 資料空，重新抓資料
                        resolve({ empty: true });
                    } else {
                        // 不異動
                        resolve({ versionChanged: false, empty: false });
                    }
                };

                countRequest.onerror = function () {
                    reject("Error counting objects in IndexedDB.");
                };
            }
        };
    });
}

async function fetchDataAndStoreInIndexedDB() {
    var config = await getFunctionProperties();
    var spellModelJson = await getSpellModelFile();

    return new Promise(function (resolve, reject) {
        var config;
        var spellModelJson;

        // 首先，執行所有非同步操作並等待它們完成
        Promise.all([getFunctionProperties(), getSpellModelFile()])
            .then(function (results) {
                config = results[0];
                spellModelJson = results[1];

                var request = indexedDB.open(config.dbName, config.fileVersion);

                request.onerror = function (event) {
                    reject("Error opening fetchDataAndStoreInIndexedDB(): " + event.target.errorCode);
                };

                request.onupgradeneeded = function (event) {
                    var db = event.target.result;

                    if (db.objectStoreNames.contains(config.storeName)) {
                        db.deleteObjectStore(config.storeName);
                    }

                    // 更新數據庫結構
                    var objectStore = db.createObjectStore(config.storeName, { autoIncrement: true });
                    objectStore.createIndex('Name_SpellLevel_SpellClass', ["Name", "SpellLevel", "SpellClass"], { unique: false });
                    objectStore.createIndex('SpellLevel_SpellClass', ["SpellLevel", "SpellClass"], { unique: false });
                };

                request.onsuccess = function (event) {
                    var db = event.target.result;

                    if (db.objectStoreNames.contains([config.storeName])) {
                        var transaction = db.transaction([config.storeName], 'readwrite');
                        var objectStore = transaction.objectStore(config.storeName);

                        // 3-1. 删除之前存储的数据
                        var clearRequest = objectStore.clear();

                        // 3-2. 新增資料
                        for (let index = 0; index < spellModelJson.length; index++) {
                            var item = spellModelJson[index];
                            var newItem = {
                                SpellClass: item.SpellClass,
                                SpellLevel: item.SpellLevel,                                
                                Name: item.Name,
                                HtmlId: item.HtmlId
                            };
                            objectStore.add(newItem);
                        }

                        // 3-3. 刪除資料內容時的訊息
                        clearRequest.onsuccess = function () {
                            console.info("Clear Database Successful.");
                        };

                        // 3-4. 刪除資料內容失敗時的訊息
                        clearRequest.onerror = function (event) {
                            console.error('Clear Database error:', event.target.errorCode);
                        };
                    }

                    // 所有操作完成後，解析 Promise
                    resolve("fetchDataAndStoreInIndexedDB completed successfully");
                };

                request.onerror = function (event) {
                    console.error('Database error:', event.target.errorCode);
                    reject("Error fetching data and storing in IndexedDB");
                };
            })
            .catch(function (error) {
                console.error("Error fetching data and storing in IndexedDB:", error);
                reject("Error fetching data and storing in IndexedDB");
            });
    });
}

//實現查詢IndexedDB 內的索引資料 TODO: 尚未完整，只是範例
async function getDb_Name_Level_SpellClass_Data(searchSpellLevel, searchSpellClass, searchName) {
    var config = await getFunctionProperties();

    return new Promise(function (resolve, reject) {
        var config;

        // 首先，執行所有非同步操作並等待它們完成
        Promise.all([getFunctionProperties()])
            .then(function (results) {
                config = results[0];                

                var request = indexedDB.open(config.dbName, config.fileVersion);

                request.onerror = function (event) {
                    reject("Error opening getDbData(): " + event.target.errorCode);
                };

                request.onsuccess = function (event) {
                    var db = event.target.result;
                    // 開始交易
                    var transaction = db.transaction([config.storeName], 'readwrite');
                    var objectStore = transaction.objectStore(config.storeName);
                    
                    // 查詢資料（使用索引）
                    var index = objectStore.index("Name_SpellLevel_SpellClass");
                    var request2 = index.openCursor();
                    var foundEntries = []; // 收集符合條件的字串

                    request2.onsuccess = function (event) {
                        var cursor = event.target.result;
                        if (cursor) {
                            var value = cursor.value;
                            if (value.SpellLevel === searchSpellLevel &&
                                value.SpellClass === searchSpellClass &&
                                value.Name.includes(searchName)) {
                                foundEntries.push(value);
                            }
                            cursor.continue();
                        } else {
                            resolve(foundEntries);
                        }
                    };
                };
            })
            .catch(function (error) {
                console.error("Error fetching data and storing in IndexedDB:", error);
                reject("Error fetching data and storing in IndexedDB");
            });
    });
}

//實現查詢IndexedDB 內的索引資料
async function getDb_Level_SpellClass_Data(searchSpellLevel, searchSpellClass) {
    var config = await getFunctionProperties();

    return new Promise(function (resolve, reject) {
        var config;

        // 首先，執行所有非同步操作並等待它們完成
        Promise.all([getFunctionProperties()])
            .then(function (results) {
                config = results[0];

                var request = indexedDB.open(config.dbName, config.fileVersion);

                request.onerror = function (event) {
                    reject("Error opening getDbData(): " + event.target.errorCode);
                };

                request.onsuccess = function (event) {
                    var db = event.target.result;
                    // 開始交易
                    var transaction = db.transaction([config.storeName], 'readwrite');
                    var objectStore = transaction.objectStore(config.storeName);
                    
                    // 查詢資料（使用索引）
                    var index = objectStore.index("SpellLevel_SpellClass");
                    var request2 = index.openCursor();

                    var foundEntries = []; // 收集符合條件的字串

                    request2.onsuccess = function (event) {
                        var cursor = event.target.result;
                        if (cursor) {
                            var value = cursor.value;
                            if (value.SpellLevel === searchSpellLevel &&
                                value.SpellClass === searchSpellClass ) {
                                foundEntries.push(value);
                            }
                            cursor.continue();
                        } else {
                            resolve(foundEntries);
                        }
                    };
                };
            })
            .catch(function (error) {
                console.error("Error fetching data and storing in IndexedDB:", error);
                reject("Error fetching data and storing in IndexedDB");
            });
    });
}