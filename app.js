// ==========================================
// 雲端資料庫設定區：請在此放入您發佈的 Google Apps Script 網址
// ==========================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPOHNwJgpDtrpTdWvWm3wHN8hgntUhyCjb4qqN0s7VZEMdlne40RVfjFyp4HXCCar-/exec";

// 全域變數快取雲端資料
let weddingData = {
    guests: [],
    mapUrl: '',
    tables: [],
    mainTableSize: 110,
    guestTableSize: 90,
    editorWidth: 800,
    editorHeight: 800,
    weddingInfo: {
        groomName: "莊勛凱",
        brideName: "楊恩懿",
        weddingDate: "2026-10-25",
        weddingTimeDesc: "17:30 迎賓入席 ｜ 18:30 晚宴開席",
        venueName: "茹曦酒店 ILLUME TAIPEI",
        venueHall: "5F 斯賓諾莎廳",
        venueAddress: "台北市松山區敦化北路100號",
        parkingInfo: "賓客免費停車\n請利用茹曦酒店停車場，因車位有限，停滿為止\n⚠️ 提醒：車位限高 1.75 米"
    }
};
let isDataLoaded = false;

document.addEventListener('DOMContentLoaded', async () => {
    const searchBtn = document.getElementById('searchBtn');
    const guestNameInput = document.getElementById('guestName');
    const resultModal = document.getElementById('resultModal');
    const resName = document.getElementById('resName');
    const resTable = document.getElementById('resTable');
    const resSeatWrapper = document.getElementById('resSeatWrapper');
    const resSeat = document.getElementById('resSeat');
    const resBabySeatWrapper = document.getElementById('resBabySeatWrapper');
    const resDietWrapper = document.getElementById('resDietWrapper');
    const btnOpenMap = document.getElementById('btnOpenMap');
    const mapModal = document.getElementById('mapModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const mapContainer = document.getElementById('mapContainer');
    const seatMapImage = document.getElementById('seatMapImage');
    const modalTableLabel = document.getElementById('modalTableLabel');

    // 啟動時先抓取遠端資料
    async function loadDataFromCloud() {
        if(GOOGLE_SCRIPT_URL === "在此放入您的網址") {
            console.log("未設定 GOOGLE_SCRIPT_URL，退回讀取本地 localStorage");
            fallbackToLocal();
            return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6秒超時機制

        const loadingHint = document.getElementById('loadingHint');

        try {
            if (loadingHint) loadingHint.style.display = 'block';
            
            // 加上 t 參數避免瀏覽器快取舊資料
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?t=${Date.now()}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await response.json();
            
            if (data && Object.keys(data).length > 0) {
                weddingData.guests = data.weddingGuests ? JSON.parse(data.weddingGuests) : [];
                weddingData.mapUrl = data.weddingMap || '';
                weddingData.tables = data.weddingTables ? JSON.parse(data.weddingTables) : [];
                weddingData.mainTableSize = parseInt(data.weddingMainTableSize) || 110;
                weddingData.guestTableSize = parseInt(data.weddingGuestTableSize) || 90;
                weddingData.editorWidth = parseInt(data.weddingEditorWidth) || 800;
                weddingData.editorHeight = parseInt(data.weddingEditorHeight) || 800;
                
                // 儲存雲端傳回的正確地圖比例至本地
                if (data.weddingMapAspectW) localStorage.setItem('weddingMapAspectW', data.weddingMapAspectW);
                if (data.weddingMapAspectH) localStorage.setItem('weddingMapAspectH', data.weddingMapAspectH);
                if (data.weddingInfo) {
                    weddingData.weddingInfo = JSON.parse(data.weddingInfo);
                } else {
                    const storedInfo = localStorage.getItem('weddingInfo');
                    if (storedInfo) weddingData.weddingInfo = JSON.parse(storedInfo);
                }
                weddingData.hotelMapData = data.weddingHotelMap || '';
                
                isDataLoaded = true;
                updateWeddingUI();
            } else {
                fallbackToLocal();
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                console.error("雲端資料連線超時，使用本地資料");
            } else {
                console.error("無法取得雲端資料", e);
            }
            fallbackToLocal();
        } finally {
            clearTimeout(timeoutId);
            if (loadingHint) loadingHint.style.display = 'none';
        }
    }

    function fallbackToLocal() {
        const storedGuests = localStorage.getItem('weddingGuests');
        const storedMap = localStorage.getItem('weddingMap');
        const storedTables = localStorage.getItem('weddingTables');
        weddingData.guests = storedGuests ? JSON.parse(storedGuests) : [];
        weddingData.mapUrl = storedMap || '';
        weddingData.tables = storedTables ? JSON.parse(storedTables) : [];
        weddingData.mainTableSize = parseInt(localStorage.getItem('weddingMainTableSize')) || 110;
        weddingData.guestTableSize = parseInt(localStorage.getItem('weddingGuestTableSize')) || 90;
        weddingData.editorWidth = parseInt(localStorage.getItem('weddingEditorWidth')) || 800;
        weddingData.editorHeight = parseInt(localStorage.getItem('weddingEditorHeight')) || 800;
        const storedInfo = localStorage.getItem('weddingInfo');
        if (storedInfo) weddingData.weddingInfo = JSON.parse(storedInfo);
        isDataLoaded = true;
        updateWeddingUI();
    }

    function updateWeddingUI() {
        const info = weddingData.weddingInfo;
        if (!info) return;

        // Update titles and names
        const names = `${info.groomName} ♡ ${info.brideName}`;
        if (document.getElementById('pageTitle')) document.getElementById('pageTitle').textContent = `${names} 婚禮座位查詢`;
        if (document.getElementById('envelopeNames')) document.getElementById('envelopeNames').textContent = names;
        
        // Update meta description
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
            metaDesc.setAttribute('content', `${info.groomName}與${info.brideName}的婚禮喜帖，查詢您的專屬座位。`);
        }
        if (document.getElementById('groomNameCard')) document.getElementById('groomNameCard').textContent = info.groomName;
        if (document.getElementById('brideNameCard')) document.getElementById('brideNameCard').textContent = info.brideName;

        // Update Card Info
        if (document.getElementById('weddingDateCard')) {
            const d = info.weddingDate.replace(/-/g, ' · ');
            document.getElementById('weddingDateCard').textContent = d;
        }
        if (document.getElementById('venueNameCard')) document.getElementById('venueNameCard').textContent = info.venueName;
        if (document.getElementById('venueHallCard')) document.getElementById('venueHallCard').textContent = info.venueHall;

        // Update Detail Modal
        if (document.getElementById('weddingDateDetail')) {
            const d = new Date(info.weddingDate);
            const days = ['日', '一', '二', '三', '四', '五', '六'];
            const dateStr = `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日（星期${days[d.getDay()]}）`;
            document.getElementById('weddingDateDetail').textContent = dateStr;
        }
        if (document.getElementById('weddingTimeDetail')) document.getElementById('weddingTimeDetail').textContent = info.weddingTimeDesc;
        if (document.getElementById('venueNameDetail')) document.getElementById('venueNameDetail').textContent = info.venueName;
        if (document.getElementById('venueHallDetail')) document.getElementById('venueHallDetail').textContent = info.venueHall;
        if (document.getElementById('venueAddressDetail')) document.getElementById('venueAddressDetail').textContent = info.venueAddress;
        if (document.getElementById('btnGoogleMaps')) document.getElementById('btnGoogleMaps').href = info.googleMapsUrl || '#';
        // 飯店地圖：優先用獨立儲存的 base64 圖片，否則用 weddingInfo 裡的網址
        if (document.getElementById('hotelMapImage')) {
            const rawCloud = weddingData.hotelMapData || '';
            const cloudHotelMap = (rawCloud.startsWith('data:') || rawCloud.startsWith('http')) ? rawCloud : '';
            const rawLocal = localStorage.getItem('weddingHotelMap') || '';
            // 過濾掉無效的提示文字（e.g. "已上傳圖片"、"已從電腦上傳圖片"）
            const localHotelMap = (rawLocal.startsWith('data:') || rawLocal.startsWith('http')) ? rawLocal : '';
            
            let infoUrl = info.hotelMapUrl || '';
            let validInfoUrl = (infoUrl.startsWith('data:') || infoUrl.startsWith('http') || infoUrl.endsWith('.jpg') || infoUrl.endsWith('.png') || infoUrl.endsWith('.jpeg')) ? infoUrl : '';
            
            const finalSrc = cloudHotelMap || localHotelMap || validInfoUrl || 'illume_map.jpg';
            document.getElementById('hotelMapImage').src = finalSrc;
        }
        if (document.getElementById('parkingInfoDetail')) {
            document.getElementById('parkingInfoDetail').innerHTML = info.parkingInfo.replace(/\n/g, '<br>');
        }
    }

    // 更新倒數計時器邏輯
    window.updateCountdown = function() {
        const info = weddingData.weddingInfo;
        if (!info || !info.weddingDate) return;
        
        const targetDate = new Date(info.weddingDate + 'T00:00:00').getTime();
        const diff = targetDate - Date.now();
        
        if (diff <= 0) { 
            ['cd-days','cd-hours','cd-mins'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.textContent = '00';
            }); 
            return; 
        }
        
        const d = Math.floor(diff / 86400000);
        const h = Math.floor(diff % 86400000 / 3600000);
        const m = Math.floor(diff % 3600000 / 60000);
        
        if (document.getElementById('cd-days')) document.getElementById('cd-days').textContent = String(d).padStart(2,'0');
        if (document.getElementById('cd-hours')) document.getElementById('cd-hours').textContent = String(h).padStart(2,'0');
        if (document.getElementById('cd-mins')) document.getElementById('cd-mins').textContent = String(m).padStart(2,'0');
    };
    
    // 每分鐘更新一次即可，不需每秒
    setInterval(window.updateCountdown, 60000);
    window.updateCountdown();

    // 背景載入資料（不阻塞事件綁定）
    loadDataFromCloud();

    function renderMap(data, groupGuests) {
        const stageEl = mapContainer.querySelector('.map-stage');
        const aisleEl = mapContainer.querySelector('.map-aisle');

        if (data.mapUrl) {
            seatMapImage.src = data.mapUrl;
            seatMapImage.style.display = 'block';
            if (stageEl) stageEl.style.display = 'none';
            if (aisleEl) aisleEl.style.display = 'none';
        } else {
            seatMapImage.style.display = 'none';
            if (stageEl) stageEl.style.display = 'block';
            if (aisleEl) aisleEl.style.display = 'flex';
        }

        // 清除舊標記
        mapContainer.querySelectorAll('.map-editor-pin').forEach(p => p.remove());

        // 優先使用圖片的自然比例（與後台完全一致），沒有圖片時用 1:1
        const mapAspectW = parseInt(localStorage.getItem('weddingMapAspectW')) || 0;
        const mapAspectH = parseInt(localStorage.getItem('weddingMapAspectH')) || 0;
        if (data.mapUrl && mapAspectW > 0 && mapAspectH > 0) {
            mapContainer.style.aspectRatio = `${mapAspectW} / ${mapAspectH}`;
        } else {
            // 無底圖或未儲存比例：使用後台編輯器的寬高比 (預設 1:1)
            mapContainer.style.aspectRatio = `${data.editorWidth} / ${data.editorHeight}`;
        }
        mapContainer.style.height = 'auto';

        const targetTableIds = [...new Set(groupGuests.map(g => g.table).filter(id => id))];
        const colorPalette = ['#df5a77', '#4a90e2', '#f5a623', '#4caf50', '#9c27b0'];

        data.tables.forEach(t => {
            const pin = document.createElement('div');
            pin.className = 'map-editor-pin';
            const tableIndex = targetTableIds.indexOf(t.id);
            const isGuestTable = tableIndex !== -1;
            const isMain = (t.type === '主桌');

            pin.style.position = 'absolute';
            pin.style.left = t.x + '%';
            pin.style.top = t.y + '%';
            pin.style.transform = 'translate(-50%, -50%)';
            pin.style.zIndex = isGuestTable ? '20' : '5';

            if (isGuestTable) {
                const pinColor = colorPalette[tableIndex % colorPalette.length];
                
                // 目標桌：固定大且清楚 (稍微縮小，避免手機過大)
                pin.style.width = 'clamp(38px, 9.5%, 52px)';
                pin.style.aspectRatio = '1 / 1';
                pin.style.height = 'auto';
                pin.style.borderRadius = '50%';
                pin.style.background = pinColor;
                pin.style.border = '2px solid #fff';
                pin.style.color = '#fff';
                pin.style.display = 'flex';
                pin.style.flexDirection = 'column';
                pin.style.alignItems = 'center';
                pin.style.justifyContent = 'center';
                pin.style.boxShadow = `0 0 0 5px ${pinColor}4D, 0 4px 14px ${pinColor}73`;
                pin.style.animation = 'pulse 1.5s infinite';

                const youDiv = document.createElement('div');
                youDiv.style.fontWeight = 'bold';
                youDiv.style.fontSize = 'clamp(0.6rem, 1.4vw, 0.78rem)';
                youDiv.style.textAlign = 'center';
                youDiv.style.lineHeight = '1.3';
                youDiv.style.letterSpacing = '0.05em';
                youDiv.innerHTML = '您的<br>桌次';
                pin.appendChild(youDiv);

                pin.title = t.name;
            } else {
                // 其他桌：小點位置參考，hover 可看桌名
                if (isMain) {
                    // 主桌：較大紅點，醒目
                    pin.style.width = '18px';
                    pin.style.height = '18px';
                    pin.style.borderRadius = '50%';
                    pin.style.background = '#e53935';
                    pin.style.border = '2px solid #fff';
                    pin.style.boxShadow = '0 2px 6px rgba(229,57,53,0.5)';
                } else {
                    // 一般桌：鋼藍色，易辨識且不搶主角
                    pin.style.width = '12px';
                    pin.style.height = '12px';
                    pin.style.borderRadius = '50%';
                    pin.style.background = '#4a90d9';
                    pin.style.border = '1.5px solid #2c6fad';
                    pin.style.boxShadow = '0 1px 4px rgba(74,144,217,0.4)';
                }
                pin.title = t.name;
            }

            mapContainer.appendChild(pin);
        });

        if (modalTableLabel) {
            let labelHtml = '';
            targetTableIds.forEach((tid, index) => {
                const pinColor = colorPalette[index % colorPalette.length];
                const tableInfo = data.tables.find(tbl => tbl.id === tid);
                const tName = tableInfo ? tableInfo.name : '尚未分配';
                
                labelHtml += `
                    <div style="display:inline-flex; align-items:center; gap:0.6rem; background:#fdf0f2; border-radius:50px; padding:0.6rem 1.2rem; font-weight:600; margin: 0.2rem;">
                        <span style="display:inline-block; width:10px; height:10px; background:${pinColor}; border-radius:50%; box-shadow:0 0 0 0 ${pinColor}B3; animation:pulse 1.5s infinite; flex-shrink:0;"></span>
                        <span style="color:var(--text-main); font-size:1.05rem;">您的桌次：<strong style="color:${pinColor};">${tName}</strong></span>
                    </div>
                `;
            });
            modalTableLabel.innerHTML = labelHtml;
        }
    }

    searchBtn.addEventListener('click', async () => {
        // 收起手機的虛擬鍵盤，並給予短暫延遲讓畫面平順縮回，避免卡頓與殘影
        guestNameInput.blur();
        await new Promise(resolve => setTimeout(resolve, 350));

        if (!isDataLoaded) {
            // 資料尚未載入完：等候最多 6 秒
            searchBtn.disabled = true;
            searchBtn.innerHTML = '⏳ 查詢中...';
            await new Promise(resolve => {
                const check = setInterval(() => {
                    if (isDataLoaded) { clearInterval(check); resolve(); }
                }, 200);
                setTimeout(() => { clearInterval(check); resolve(); }, 6000);
            });
            searchBtn.disabled = false;
            searchBtn.innerHTML = '桌次查詢';
        }

        const name = guestNameInput.value.trim();
        const searchErrorHint = document.getElementById('searchErrorHint');
        if (searchErrorHint) searchErrorHint.style.display = 'none';

        if (!name) {
            if (searchErrorHint) {
                searchErrorHint.textContent = '⚠️ 請輸入您的姓名或電話末3碼';
                searchErrorHint.style.display = 'block';
            }
            return;
        }
        const data = weddingData;
        
        // 搜尋邏輯：完全符合姓名，或是電話末端符合輸入的數字
        let matchedGuests = data.guests.filter(g => 
            g.name === name || 
            (g.phone && g.phone.endsWith(name))
        );

        if (matchedGuests.length === 0) {
            const searchErrorHint = document.getElementById('searchErrorHint');
            if (searchErrorHint) {
                searchErrorHint.textContent = '❌ 找不到相符資料，請確認是否輸入正確';
                searchErrorHint.style.display = 'block';
            }
            return;
        }

        // 為了支援「攜家帶眷」，如果匹配到的賓客有 phone，找出所有相同 phone 的家人加入群組
        let groupGuests = [...matchedGuests];
        
        matchedGuests.forEach(mg => {
            if (mg.phone) {
                const family = data.guests.filter(g => g.phone === mg.phone);
                family.forEach(fg => {
                    if (!groupGuests.find(g => g.id === fg.id)) {
                        groupGuests.push(fg);
                    }
                });
            }
        });

        // 整理群組顯示
        const resName = document.getElementById('resName');
        const resGroupList = document.getElementById('resGroupList');
        
        if (groupGuests.length > 1) {
            resName.textContent = `${groupGuests[0].name} 等 ${groupGuests.length} 位`;
        } else {
            resName.textContent = groupGuests[0].name;
        }

        resGroupList.innerHTML = '';
        groupGuests.forEach(g => {
            const tableInfo = data.tables.find(t => t.id === g.table);
            const tableName = tableInfo ? tableInfo.name : '尚未分配';
            
            let badges = '';
            if (g.babySeat) badges += `<span style="font-size:1.1rem;" title="兒童安全座椅">👶</span> `;
            if (g.diet === '素食') badges += `<span style="font-size:1.1rem;" title="素食餐點">🥗</span> `;

            const itemHtml = `
                <div style="background: #fdf0f2; border-radius: 12px; padding: 0.8rem 1rem; border: 1px solid rgba(223, 90, 119, 0.2); display: flex; align-items: center; justify-content: space-between;">
                    <div style="font-weight:bold; font-size:1.1rem; color:var(--text-main); display:flex; align-items:center; gap:0.4rem;">
                        👤 ${g.name} ${badges ? `<span style="margin-left:0.2rem;">${badges}</span>` : ''}
                    </div>
                    <div style="color:var(--text-muted); font-size:0.95rem; display:flex; align-items:center;">
                        📍 <span style="color:var(--primary); font-weight:600;">【${tableName}】</span>
                    </div>
                </div>
            `;
            resGroupList.insertAdjacentHTML('beforeend', itemHtml);
        });

        const searchModal = document.getElementById('searchModal');
        if (searchModal) searchModal.style.display = 'none';

        resultModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // 顯示「查看地圖」按鈕
        if (data.tables.length > 0) {
            btnOpenMap.style.display = 'block';
            btnOpenMap.onclick = () => {
                // 先隱藏結果層
                resultModal.style.display = 'none';
                renderMap(data, groupGuests);
                mapModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            };
        } else {
            btnOpenMap.style.display = 'none';
        }
    });

    // 關閉 Modal (包含查座位與地圖)
    const btnCloseResultModal = document.getElementById('btnCloseResultModal');
    if(btnCloseResultModal) {
        btnCloseResultModal.addEventListener('click', () => {
            resultModal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }

    resultModal.addEventListener('click', (e) => {
        if(e.target === resultModal) {
            resultModal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    // 關閉 Map Modal
    function closeMapModal() {
        mapModal.style.display = 'none';
        // 如果地圖關掉，其實可以回到結果彈窗，或者直接關掉遮罩
        document.body.style.overflow = '';
    }
    btnCloseModal.addEventListener('click', closeMapModal);
    mapModal.addEventListener('click', (e) => {
        if (e.target === mapModal) closeMapModal(); // 點背景關閉
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeMapModal();
            if(resultModal.style.display === 'flex') {
                resultModal.style.display = 'none';
                document.body.style.overflow = '';
            }
        }
    });

    // 支援 Enter 鍵查詢
    guestNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchBtn.click();
    });

    // 📍 婚宴資訊 Modal 邏輯
    const btnShowVenue = document.getElementById('btnShowVenue');
    const venueInfoModal = document.getElementById('venueInfoModal');
    const btnCloseVenueModal = document.getElementById('btnCloseVenueModal');

    if (btnShowVenue && venueInfoModal && btnCloseVenueModal) {
        btnShowVenue.addEventListener('click', () => {
            venueInfoModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });

        const closeVenueModal = () => {
            venueInfoModal.style.display = 'none';
            document.body.style.overflow = '';
        };

        btnCloseVenueModal.addEventListener('click', closeVenueModal);

        venueInfoModal.addEventListener('click', (e) => {
            if (e.target === venueInfoModal) closeVenueModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && venueInfoModal.style.display === 'block') closeVenueModal();
        });
        // 飯店位置示意圖彈窗邏輯
        const btnShowHotelMap = document.getElementById('btnShowHotelMap');
        const hotelMapModal = document.getElementById('hotelMapModal');
        const btnCloseHotelMap = document.getElementById('btnCloseHotelMap');
        
        if (btnShowHotelMap && hotelMapModal && btnCloseHotelMap) {
            btnShowHotelMap.addEventListener('click', () => {
                hotelMapModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            });
            
            const closeHotelMap = () => {
                hotelMapModal.style.display = 'none';
                // 注意：如果底層的婚宴資訊彈窗還在，可能不需要恢復捲動，
                // 但因為飯店圖通常是最高層，關掉它時我們檢查一下婚宴資訊是否還在。
                if (venueInfoModal.style.display === 'none' || venueInfoModal.style.display === '') {
                    document.body.style.overflow = '';
                }
            };
            
            btnCloseHotelMap.addEventListener('click', closeHotelMap);
            hotelMapModal.addEventListener('click', (e) => {
                if (e.target === hotelMapModal) closeHotelMap();
            });
        }
    }
});
