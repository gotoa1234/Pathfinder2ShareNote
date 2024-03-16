//初始化
async function indexedDBUtilInitinalize() {
    return new Promise((resolve, reject) => {
        try {
            showBlockUI();
            fetchDataAndStoreInIndexedDB().then(() => {
                hideBlockUI();                
                getDb_Data_All().then(function (result) {
                    if (result.length === 0) {
                        console.log('查無資料');
                    } else {
                        saveToSessionStorage('globalSpellBooks', result);
                    }
                }).catch(function (error)
                {
                    console.log('Books 資料異常' + error);
                });

                resolve('Init Success.');
            }).catch(error => {
                console.error("Error in fetchDataAndStoreInIndexedDB():", error);
                hideBlockUI();
                reject(error);
            });
        } catch (error) {
            console.error("Error in indexedDBUtilInitinalize():", error);
            hideBlockUI();
            reject(error);
        }
    });
}

//設定檔
async function getFunctionProperties() {
    return {
        fileVersion: 1,
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
                    if (count === 0) { // 資料空，重新抓資料
                        resolve({ empty: true });
                    } else {// 不異動
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
    return new Promise(function (resolve, reject) {
        // 首先，執行所有非同步操作並等待它們完成
        Promise.all([getFunctionProperties()])
            .then(function (results) {
                var config = results[0];
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
                        var countRequest = objectStore.count();

                        countRequest.onsuccess = function () {
                            var count = countRequest.result;
                            if (count === 0) { // 資料空，重新抓資料
                                // 3-1. 新增資料
                                getSpellModelFile().then(function (spellModelJson) {
                                    // 新增資料
                                    var transaction2 = db.transaction([config.storeName], 'readwrite');
                                    var objectStore2 = transaction2.objectStore(config.storeName);
                                    // 新增資料
                                    for (let index = 0; index < spellModelJson.length; index++) {
                                        var item = spellModelJson[index];
                                        var newItem = {
                                            SpellClass: item.SpellClass,
                                            SpellLevel: item.SpellLevel,
                                            Name: item.Name,
                                            HtmlId: item.HtmlId
                                        };
                                        objectStore2.add(newItem);
                                    }
                                    saveToSessionStorage('globalSpellBooks', spellModelJson);
                                    debugger;
                                }).catch(function (error) {
                                    console.error("Error fetching spell model file:", error);
                                });
                            } else {// 不異動
                                resolve({ versionChanged: false, empty: false });
                            }
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

//實現查詢IndexedDB 內的索引資料
async function getDb_Name_Level_SpellClass_Data(searchSpellLevel, searchSpellClass, searchName) {
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
    return new Promise(function (resolve, reject) {
        var config;

        // 執行所有非同步操作並等待它們完成
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
                                value.SpellClass === searchSpellClass) {
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

//實現查詢IndexedDB 內的全部資料
async function getDb_Data_All() {
    return new Promise(function (resolve, reject) {
        var config;
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
                    var transaction = db.transaction([config.storeName], 'readonly');
                    var objectStore = transaction.objectStore(config.storeName);

                    // 取出所有資料
                    var request2 = objectStore.getAll();
                    request2.onsuccess = function (event) {
                        var allData = event.target.result;
                        resolve(allData);
                    };
                };
            })
            .catch(function (error) {
                console.error("Error fetching data and storing in IndexedDB:", error);
                reject("Error fetching data and storing in IndexedDB");
            });
    });
}