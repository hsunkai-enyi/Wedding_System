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
    editorHeight: 800
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
                
                isDataLoaded = true;
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
        isDataLoaded = true;
    }

    // 背景載入資料（不阻塞事件綁定）
    loadDataFromCloud();

    function renderMap(data, guest) {
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

        const tableInfo = data.tables.find(t => t.id === guest.table);

        data.tables.forEach(t => {
            const pin = document.createElement('div');
            pin.className = 'map-editor-pin';
            const isGuestTable = (t.id === guest.table);
            const isMain = (t.type === '主桌');

            pin.style.position = 'absolute';
            pin.style.left = t.x + '%';
            pin.style.top = t.y + '%';
            pin.style.transform = 'translate(-50%, -50%)';
            pin.style.zIndex = isGuestTable ? '20' : '5';

            if (isGuestTable) {
                // 目標桌：固定大且清楚
                pin.style.width = 'clamp(44px, 11%, 62px)';
                pin.style.aspectRatio = '1 / 1';
                pin.style.height = 'auto';
                pin.style.borderRadius = '50%';
                pin.style.background = 'var(--primary)';
                pin.style.border = '2px solid #fff';
                pin.style.color = '#fff';
                pin.style.display = 'flex';
                pin.style.flexDirection = 'column';
                pin.style.alignItems = 'center';
                pin.style.justifyContent = 'center';
                pin.style.boxShadow = '0 0 0 5px rgba(223, 90, 119, 0.3), 0 4px 14px rgba(223, 90, 119, 0.45)';
                pin.style.animation = 'pulse 1.5s infinite';

                const nameDiv = document.createElement('div');
                nameDiv.style.fontWeight = 'bold';
                nameDiv.style.fontSize = 'clamp(0.45rem, 1.2vw, 0.65rem)';
                nameDiv.style.textAlign = 'center';
                nameDiv.style.width = '85%';
                nameDiv.style.whiteSpace = 'nowrap';
                nameDiv.style.overflow = 'hidden';
                nameDiv.style.textOverflow = 'ellipsis';
                nameDiv.style.lineHeight = '1.2';
                nameDiv.textContent = t.name;
                pin.appendChild(nameDiv);

                const youDiv = document.createElement('div');
                youDiv.style.fontSize = 'clamp(0.38rem, 1vw, 0.55rem)';
                youDiv.style.opacity = '0.9';
                youDiv.style.marginTop = '1px';
                youDiv.textContent = '▼ 您在這';
                pin.appendChild(youDiv);

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

        // Modal footer 顯示桌次說明（含閃爍圓點）
        if (modalTableLabel) {
            const seatText = guest.seat ? `<span style="color:var(--text-muted); font-size:0.9rem;">　第 <strong style="color:var(--primary); font-size:1.1rem;">${guest.seat}</strong> 號座位</span>` : '';
            modalTableLabel.innerHTML = `
                <div style="display:inline-flex; align-items:center; gap:0.6rem; background:#fdf0f2; border-radius:50px; padding:0.6rem 1.2rem; font-weight:600;">
                    <span style="
                        display:inline-block;
                        width:10px; height:10px;
                        border-radius:50%;
                        background:var(--primary);
                        box-shadow:0 0 0 0 rgba(223,90,119,0.7);
                        animation:pulse 1.5s infinite;
                        flex-shrink:0;
                    "></span>
                    <span>您的座位：<strong style="color:var(--primary);">${tableInfo ? tableInfo.name : '尚未分配'}</strong>${seatText}</span>
                </div>
            `;
        }
    }

    searchBtn.addEventListener('click', async () => {
        // 收起手機的虛擬鍵盤
        guestNameInput.blur();

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
            searchBtn.innerHTML = '座位查詢';
        }

        const name = guestNameInput.value.trim();
        if (!name) {
            alert('請輸入姓名');
            return;
        }

        const data = weddingData;
        const guest = data.guests.find(g => g.name === name);

        if (guest) {
            resName.textContent = guest.name;

            const tableInfo = data.tables.find(t => t.id === guest.table);
            resTable.textContent = tableInfo ? tableInfo.name : '尚未分配';

            if (guest.seat) {
                resSeat.textContent = guest.seat;
                resSeatWrapper.style.display = 'inline';
            } else {
                resSeatWrapper.style.display = 'none';
            }

            if (guest.babySeat === true) {
                resBabySeatWrapper.style.display = 'block';
            } else {
                resBabySeatWrapper.style.display = 'none';
            }

            if (guest.diet === '素食') {
                resDietWrapper.style.display = 'block';
            } else {
                resDietWrapper.style.display = 'none';
            }

            resultModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            // 顯示「查看地圖」按鈕
            if (data.tables.length > 0) {
                btnOpenMap.style.display = 'block';
                btnOpenMap.onclick = () => {
                    // 先隱藏結果層
                    resultModal.style.display = 'none';
                    renderMap(data, guest);
                    mapModal.style.display = 'block';
                    document.body.style.overflow = 'hidden';
                };
            } else {
                btnOpenMap.style.display = 'none';
            }
        } else {
            alert('找不到您的名字，請確認是否輸入錯誤。');
            resultModal.style.display = 'none';
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
            venueInfoModal.style.display = 'block';
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
                if (venueInfoModal.style.display !== 'block') {
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
