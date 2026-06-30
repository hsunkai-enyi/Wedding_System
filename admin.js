// ==========================================
// 雲端資料庫設定區：請在此放入您發佈的 Google Apps Script 網址
// ==========================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwPOHNwJgpDtrpTdWvWm3wHN8hgntUhyCjb4qqN0s7VZEMdlne40RVfjFyp4HXCCar-/exec";

window.handlePhoneInput = function (e) {
    if (!e || !e.target) return;
    const input = e.target;
    const selectionStart = input.selectionStart;
    const oldLength = input.value.length;

    let digits = input.value.replace(/\D/g, '');
    digits = digits.slice(0, 10);

    let formatted = digits;
    if (digits.length > 4 && digits.length <= 7) {
        formatted = digits.slice(0, 4) + '-' + digits.slice(4);
    } else if (digits.length > 7) {
        formatted = digits.slice(0, 4) + '-' + digits.slice(4, 7) + '-' + digits.slice(7);
    }

    input.value = formatted;

    let newLength = input.value.length;
    let newCursorPos = selectionStart + (newLength - oldLength);
    input.setSelectionRange(newCursorPos, newCursorPos);
};

document.addEventListener('DOMContentLoaded', () => {
    // --- Login Protection ---
    const loginOverlay = document.getElementById('adminLoginOverlay');
    const passwordInput = document.getElementById('adminPasswordInput');
    const loginBtn = document.getElementById('btnLoginSubmit');
    const aside = document.querySelector('.admin-sidebar');
    const main = document.querySelector('.admin-main');

    function checkAuth() {
        if (sessionStorage.getItem('isAdminAuth')) {
            if (loginOverlay) loginOverlay.style.display = 'none';
            if (aside) aside.style.display = 'flex';
            if (main) main.style.display = 'block';
            return true;
        }
        return false;
    }

    if (!checkAuth()) {
        loginBtn.addEventListener('click', () => {
            const pass = passwordInput.value;
            const customPass = localStorage.getItem('weddingAdminPassword');
            const validPasses = ['admin123', '1234'];
            if (customPass) validPasses.push(customPass);

            if (validPasses.includes(pass)) {
                sessionStorage.setItem('isAdminAuth', 'true');
                checkAuth();
                renderGuests();
            } else {
                alert('密碼錯誤！');
                passwordInput.value = '';
            }
        });
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') loginBtn.click();
        });
    }

    // --- Password Change Logic ---
    const btnChangePassword = document.getElementById('btnChangePassword');
    if (btnChangePassword) {
        btnChangePassword.addEventListener('click', () => {
            const currentCustom = localStorage.getItem('weddingAdminPassword');
            const newPass = prompt(`請輸入新的後台管理密碼：\n(若要恢復預設，請清除內容)\n\n目前狀態: ${currentCustom ? '已自訂密碼' : '使用預設密碼'}`);
            if (newPass !== null) { // User didn't click Cancel
                if (newPass.trim() === '') {
                    localStorage.removeItem('weddingAdminPassword');
                    alert('已恢復預設密碼！');
                } else {
                    localStorage.setItem('weddingAdminPassword', newPass.trim());
                    alert('密碼已成功更新！請牢記新密碼。');
                }
            }
        });
    }

    // --- Data Model Migration & Initialization ---
    let guests = JSON.parse(localStorage.getItem('weddingGuests')) || [];
    let mapUrl = localStorage.getItem('weddingMap') || '';
    let tables = JSON.parse(localStorage.getItem('weddingTables')) || [];
    let mainTableSize = parseInt(localStorage.getItem('weddingMainTableSize')) || 110;
    let guestTableSize = parseInt(localStorage.getItem('weddingGuestTableSize')) || 90;
    let categories = JSON.parse(localStorage.getItem('weddingCategories')) || ["男方親友", "女方親友", "男方朋友", "女方朋友", "工作人員", "其他", "未分類"];
    let weddingInfo = JSON.parse(localStorage.getItem('weddingInfo')) || {
        groomName: "莊勛凱",
        brideName: "楊恩懿",
        weddingDate: "2026-10-25",
        weddingTimeDesc: "17:30 迎賓入席 ｜ 18:30 晚宴開席",
        venueName: "茹曦酒店 ILLUME TAIPEI",
        venueHall: "5F 斯賓諾莎廳",
        venueAddress: "台北市松山區敦化北路100號",
        googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=茹曦酒店+ILLUME+TAIPEI",
        hotelMapUrl: "illume_map.jpg",
        parkingInfo: "賓客免費停車\n請利用茹曦酒店停車場，因車位有限，停滿為止\n⚠️ 提醒：車位限高 1.75 米"
    };
    // 飯店地圖獨立儲存（避免 base64 圖片擐爆 weddingInfo JSON）
    const _rawHotelMap = localStorage.getItem('weddingHotelMap') || '';
    let hotelMapData = (_rawHotelMap.startsWith('data:') || _rawHotelMap.startsWith('http')) ? _rawHotelMap : '';

    window.handleCustomCategory = function (selectEl) {
        if (selectEl.value === '＋ 自訂新分類') {
            // 建立一個臨時的輸入框來取代 prompt，避免 LINE 瀏覽器阻擋
            let input = document.createElement('input');
            input.type = 'text';
            input.placeholder = '輸入新分類 (按Enter儲存)';
            input.style.cssText = selectEl.style.cssText;
            input.style.width = selectEl.offsetWidth + 'px';

            selectEl.style.display = 'none';
            selectEl.parentNode.insertBefore(input, selectEl.nextSibling);
            input.focus();

            const finishCustom = () => {
                let newCat = input.value.trim();
                if (newCat) {
                    if (!categories.includes(newCat)) {
                        categories.push(newCat);
                        saveData();
                    }
                    renderCategorySelects();
                    if (typeof renderCategoriesManager === 'function') renderCategoriesManager();
                    selectEl.value = newCat;
                } else {
                    selectEl.value = categories[0] || '未分類';
                }
                input.remove();
                selectEl.style.display = '';
            };

            input.onblur = finishCustom;
            input.onkeydown = function (e) {
                if (e.key === 'Enter') finishCustom();
                if (e.key === 'Escape') {
                    input.value = '';
                    finishCustom();
                }
            };
            return selectEl.value;
        }
        return selectEl.value;
    };

    function renderCategorySelects() {
        const addCat = document.getElementById('addGuestCategory');
        if (!addCat) return;

        // 判斷當前 HTML 是快取的 <input list> 還是最新的 <select>
        if (addCat.tagName === 'SELECT') {
            let options = categories.map(c => `<option value="${c}">${c}</option>`).join('');
            options += `<option value="＋ 自訂新分類" style="color:var(--primary); font-weight:bold;">＋ 自訂新分類...</option>`;

            let oldVal = addCat.value;
            addCat.innerHTML = options;

            if (oldVal && (categories.includes(oldVal) || oldVal === '＋ 自訂新分類')) {
                addCat.value = oldVal;
            } else if (categories.length > 0) {
                addCat.value = categories[0];
            }

            addCat.onchange = function () {
                window.handleCustomCategory(this);
            };
        } else if (addCat.tagName === 'INPUT') {
            // 兼容舊版快取 HTML
            const datalistId = addCat.getAttribute('list');
            if (datalistId) {
                let datalist = document.getElementById(datalistId);
                if (!datalist) {
                    datalist = document.createElement('datalist');
                    datalist.id = datalistId;
                    document.body.appendChild(datalist);
                }
                datalist.innerHTML = categories.map(c => `<option value="${c}">`).join('');
            }
        }
    }
    renderCategorySelects();

    // Migrate old guests to have id
    guests = guests.map(g => {
        if (!g.id) g.id = 'g_' + Math.random().toString(36).substr(2, 9);
        if (g.babySeat === '是') g.babySeat = true; // normalise boolean
        if (g.babySeat === '否' || g.babySeat === '0') g.babySeat = false;
        if (!g.diet) g.diet = '葷食';
        if (!g.category) g.category = '未分類';
        return g;
    });

    // Migrate old tables
    tables = tables.map(t => {
        if (!t.name) t.name = t.id; // old t.id was the name
        if (!t.type || t.type === '一般') t.type = '客桌';
        if (!t.seatsCount) t.seatsCount = 10;
        return t;
    });

    function saveData() {
        try {
            localStorage.setItem('weddingGuests', JSON.stringify(guests));
            localStorage.setItem('weddingMap', mapUrl);
            localStorage.setItem('weddingTables', JSON.stringify(tables));
            localStorage.setItem('weddingCategories', JSON.stringify(categories));
            localStorage.setItem('weddingMainTableSize', mainTableSize);
            localStorage.setItem('weddingGuestTableSize', guestTableSize);
            localStorage.setItem('weddingInfo', JSON.stringify(weddingInfo));
            if (hotelMapData) {
                localStorage.setItem('weddingHotelMap', hotelMapData);
            }
        } catch (e) {
            console.error('localStorage 儲存失敗:', e);
            if (e.name === 'QuotaExceededError') {
                alert('⚠️ 儲存空間不足！請嘗試上傳較小的圖片（建議 500KB 以下）。');
            }
        }

        let editorNode = document.getElementById('mapEditor');
        if (editorNode && editorNode.clientWidth > 0) {
            localStorage.setItem('weddingEditorWidth', editorNode.clientWidth);
            localStorage.setItem('weddingEditorHeight', editorNode.clientHeight);
        }
    }

    // --- Publish to Cloud Logic ---
    const btnPublish = document.getElementById('btnPublish');
    if (btnPublish) {
        btnPublish.addEventListener('click', async () => {
            if (GOOGLE_SCRIPT_URL === "在此放入您的網址") {
                alert("⚠️ 請先開啟 admin.js 與 app.js，將程式碼開頭的 GOOGLE_SCRIPT_URL 替換為您的 Apps Script 網址，才能啟動雲端連線功能！");
                return;
            }

            btnPublish.disabled = true;
            let originalText = btnPublish.innerHTML;
            btnPublish.innerHTML = "⏳ 正在發佈中...";

            let payload = {
                weddingGuests: JSON.stringify(guests),
                weddingMap: mapUrl,
                weddingTables: JSON.stringify(tables),
                weddingMainTableSize: mainTableSize,
                weddingGuestTableSize: guestTableSize,
                weddingEditorWidth: localStorage.getItem('weddingEditorWidth') || 800,
                weddingEditorHeight: localStorage.getItem('weddingEditorHeight') || 800,
                weddingMapAspectW: localStorage.getItem('weddingMapAspectW') || 0,
                weddingMapAspectH: localStorage.getItem('weddingMapAspectH') || 0,
                weddingCategories: JSON.stringify(categories),
                weddingInfo: JSON.stringify(weddingInfo),
                weddingHotelMap: hotelMapData
            };

            try {
                // 利用 no-cors 送出 POST，雖然拿不到回應內容，但可以確保跨域請求被送出
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(payload)
                });
                alert("✅ 成功！已經將最新排位資料發佈到儲存點，賓客現在可以看到最新資訊了！");
            } catch (e) {
                alert("❌ 發佈失敗，請檢查網路狀態或網址設定：" + e.toString());
            } finally {
                btnPublish.disabled = false;
                btnPublish.innerHTML = originalText;
            }
        });
    }

    // --- Navigation Logic ---
    btnNavMap.addEventListener('click', () => {
        btnNavMap.classList.add('active');
        btnNavList.classList.remove('active');
        btnNavInfo.classList.remove('active');
        viewVenueLayout.style.display = 'block';
        viewListManage.style.display = 'none';
        viewWeddingInfo.style.display = 'none';
        renderMapEditor();
    });

    const btnNavInfo = document.getElementById('btnNavInfo');
    const viewWeddingInfo = document.getElementById('viewWeddingInfo');

    btnNavInfo.addEventListener('click', () => {
        btnNavInfo.classList.add('active');
        btnNavList.classList.remove('active');
        btnNavMap.classList.remove('active');
        viewWeddingInfo.style.display = 'block';
        viewListManage.style.display = 'none';
        viewVenueLayout.style.display = 'none';
        renderWeddingInfoForm();
    });

    function renderWeddingInfoForm() {
        document.getElementById('infoGroomName').value = weddingInfo.groomName || '';
        document.getElementById('infoBrideName').value = weddingInfo.brideName || '';
        document.getElementById('infoWeddingDate').value = weddingInfo.weddingDate || '';
        document.getElementById('infoWeddingTimeDesc').value = weddingInfo.weddingTimeDesc || '';
        document.getElementById('infoVenueName').value = weddingInfo.venueName || '';
        document.getElementById('infoVenueHall').value = weddingInfo.venueHall || '';
        document.getElementById('infoVenueAddress').value = weddingInfo.venueAddress || '';
        document.getElementById('infoGoogleMapsUrl').value = weddingInfo.googleMapsUrl || '';
        // 飯店地圖：如果已上傳 base64，顯示提示；否則顯示原本網址
        if (hotelMapData && hotelMapData.startsWith('data:')) {
            document.getElementById('infoHotelMapUrl').value = '已上傳圖片（可重新選擇替換）';
        } else {
            document.getElementById('infoHotelMapUrl').value = weddingInfo.hotelMapUrl || '';
        }
        document.getElementById('infoParkingInfo').value = weddingInfo.parkingInfo || '';
    }

    document.getElementById('btnSaveWeddingInfo').addEventListener('click', () => {
        weddingInfo.groomName = document.getElementById('infoGroomName').value;
        weddingInfo.brideName = document.getElementById('infoBrideName').value;
        weddingInfo.weddingDate = document.getElementById('infoWeddingDate').value;
        weddingInfo.weddingTimeDesc = document.getElementById('infoWeddingTimeDesc').value;
        weddingInfo.venueName = document.getElementById('infoVenueName').value;
        weddingInfo.venueHall = document.getElementById('infoVenueHall').value;
        weddingInfo.venueAddress = document.getElementById('infoVenueAddress').value;
        weddingInfo.googleMapsUrl = document.getElementById('infoGoogleMapsUrl').value;
        // 飯店地圖：只在使用者手動輸入網址時才更新，上傳圖片由 hotelMapData 獨立處理
        const hotelMapInputVal = document.getElementById('infoHotelMapUrl').value;
        if (hotelMapInputVal && !hotelMapInputVal.startsWith('已')) {
            weddingInfo.hotelMapUrl = hotelMapInputVal;
            hotelMapData = ''; // 改用網址，清除本地圖片
            localStorage.removeItem('weddingHotelMap');
        }
        weddingInfo.parkingInfo = document.getElementById('infoParkingInfo').value;
        saveData();
        updateAdminUI();
        alert('婚禮資訊已儲存！別忘了點擊左下角的「儲存並發佈」讓賓客看到更新喔！');
    });

    btnNavList.addEventListener('click', () => {
        btnNavList.classList.add('active');
        btnNavMap.classList.remove('active');
        btnNavInfo.classList.remove('active');
        viewListManage.style.display = 'block';
        viewVenueLayout.style.display = 'none';
        viewWeddingInfo.style.display = 'none';
        renderTablesList(); // refresh
    });

    subBtnGuestList.addEventListener('click', () => {
        subBtnGuestList.classList.add('active');
        subBtnTableGraphics.classList.remove('active');
        viewGuestList.style.display = 'block';
        viewTableGraphics.style.display = 'none';
        toolbarGuest.style.display = 'flex';
        toolbarTable.style.display = 'none';
        renderGuests();
    });

    subBtnTableGraphics.addEventListener('click', () => {
        subBtnTableGraphics.classList.add('active');
        subBtnGuestList.classList.remove('active');
        viewTableGraphics.style.display = 'block';
        viewGuestList.style.display = 'none';
        toolbarTable.style.display = 'flex';
        toolbarGuest.style.display = 'none';
        renderTablesList();
    });

    // --- Guest List Logic ---
    const btnShowAddGuest = document.getElementById('btnShowAddGuest');
    const addGuestForm = document.getElementById('addGuestForm');
    const btnCancelGuest = document.getElementById('btnCancelGuest');
    const btnSubmitGuest = document.getElementById('btnSubmitGuest');
    const addGuestName = document.getElementById('addGuestName');
    const addGuestPhone = document.getElementById('addGuestPhone');
    const addGuestCategory = document.getElementById('addGuestCategory');
    const addGuestBaby = document.getElementById('addGuestBaby');
    const guestTableTbody = document.querySelector('#guestTable tbody');
    const filterGuestCategory = document.getElementById('filterGuestCategory');
    const filterUnseatedOnly = document.getElementById('filterUnseatedOnly');
    const guestStatsBar = document.getElementById('guestStatsBar');
    const configSlotCategoryFilter = document.getElementById('configSlotCategoryFilter');
    let currentConfigSlotFilter = 'ALL';

    const btnManageCategories = document.getElementById('btnManageCategories');
    const categoryModal = document.getElementById('categoryModal');
    const closeCategoryModal = document.getElementById('btnCloseCategoryModal');
    const categoryTagList = document.getElementById('categoryTagList');
    const newCategoryInput = document.getElementById('newCategoryInput');
    const btnAddCategory = document.getElementById('btnAddCategory');
    const btnSaveCategories = document.getElementById('btnSaveCategories');

    let tempCategories = [...categories];

    if (btnManageCategories) {
        btnManageCategories.addEventListener('click', () => {
            tempCategories = [...categories];
            renderCategoryTags();
            categoryModal.style.display = 'flex';
        });
    }

    if (closeCategoryModal) {
        closeCategoryModal.addEventListener('click', () => categoryModal.style.display = 'none');
    }

    function renderCategoryTags() {
        if (!categoryTagList) return;
        categoryTagList.innerHTML = tempCategories.map((c, i) => `
            <div class="category-tag-item" style="display:flex; align-items:center; gap:0.5rem; background:#fff; border:1px solid var(--border-dark); padding:0.4rem 0.8rem; border-radius:50px; font-size:0.9rem; font-weight:600; color:var(--text-main);">
                <span>${c}</span>
                ${c !== '未分類' ? `<span onclick="removeTempCategory(${i})" style="cursor:pointer; color:var(--primary); font-size:1.1rem; line-height:1;">×</span>` : ''}
            </div>
        `).join('');
    }

    window.removeTempCategory = (idx) => {
        tempCategories.splice(idx, 1);
        renderCategoryTags();
    };

    if (btnAddCategory) {
        btnAddCategory.addEventListener('click', () => {
            const val = newCategoryInput.value.trim();
            if (val && !tempCategories.includes(val)) {
                tempCategories.push(val);
                newCategoryInput.value = '';
                renderCategoryTags();
            }
        });
    }

    if (newCategoryInput) {
        newCategoryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') btnAddCategory.click();
        });
    }

    if (btnSaveCategories) {
        btnSaveCategories.addEventListener('click', () => {
            if (!tempCategories.includes('未分類')) tempCategories.push('未分類');
            categories = [...tempCategories];
            localStorage.setItem('weddingCategories', JSON.stringify(categories));
            renderCategorySelects();
            renderGuests();
            categoryModal.style.display = 'none';
            alert('分類設定已儲存！');
        });
    }

    filterGuestCategory.addEventListener('change', renderGuests);
    filterUnseatedOnly.addEventListener('change', renderGuests);

    if (configSlotCategoryFilter) {
        configSlotCategoryFilter.addEventListener('change', (e) => {
            currentConfigSlotFilter = e.target.value;
            if (activeTableId) renderTableConfig(activeTableId);
        });
    }

    btnShowAddGuest.addEventListener('click', () => {
        addGuestForm.style.display = 'block';
    });
    btnCancelGuest.addEventListener('click', () => {
        addGuestForm.style.display = 'none';
        addGuestName.value = '';
        if (addGuestPhone) addGuestPhone.value = '';
        addGuestCategory.value = '';
        addGuestBaby.checked = false;
        document.querySelector('input[name="addGuestDiet"][value="葷食"]').checked = true;
    });

    btnSubmitGuest.addEventListener('click', () => {
        const n = addGuestName.value.trim();
        const p = addGuestPhone ? addGuestPhone.value.trim() : '';
        if (!n) return alert('請輸入姓名');

        let newCat = addGuestCategory.value.trim() || '未分類';
        if (newCat && newCat !== '未分類' && !categories.includes(newCat)) {
            categories.push(newCat);
            localStorage.setItem('weddingCategories', JSON.stringify(categories));
            renderCategorySelects();
        }

        const dietVal = document.querySelector('input[name="addGuestDiet"]:checked').value;
        const isBaby = addGuestBaby.checked;

        guests.push({
            id: 'g_' + Date.now(),
            name: n,
            phone: p,
            category: newCat,
            diet: dietVal,
            babySeat: isBaby,
            table: '',
            seat: ''
        });

        saveData();
        renderGuests();
        
        addGuestName.value = '';
        if (addGuestPhone) addGuestPhone.value = '';
        addGuestBaby.checked = false;
        document.querySelector('input[name="addGuestDiet"][value="葷食"]').checked = true;
        // 一般儲存後，隱藏表單
        addGuestForm.style.display = 'none';
        btnShowAddGuest.style.display = 'block';
    });

    const btnSubmitAndNext = document.getElementById('btnSubmitAndNext');
    if (btnSubmitAndNext) {
        btnSubmitAndNext.addEventListener('click', () => {
            const n = addGuestName.value.trim();
            const p = addGuestPhone ? addGuestPhone.value.trim() : '';
            if (!n) return alert('請輸入姓名');

            let newCat = addGuestCategory.value.trim() || '未分類';
            if (newCat && newCat !== '未分類' && !categories.includes(newCat)) {
                categories.push(newCat);
                localStorage.setItem('weddingCategories', JSON.stringify(categories));
                renderCategorySelects();
            }

            const dietVal = document.querySelector('input[name="addGuestDiet"]:checked').value;
            const isBaby = addGuestBaby.checked;

            guests.push({
                id: 'g_' + Date.now(),
                name: n,
                phone: p,
                category: newCat,
                diet: dietVal,
                babySeat: isBaby,
                table: '',
                seat: ''
            });

            saveData();
            renderGuests();
            
            // 清空姓名與特定欄位，但保留電話與分類
            addGuestName.value = '';
            addGuestBaby.checked = false;
            document.querySelector('input[name="addGuestDiet"][value="葷食"]').checked = true;
            addGuestName.focus(); // 自動聚焦，方便繼續打字
        });
    }

    window.updateGuest = (gid, field, el) => {
        let guest = guests.find(g => g.id === gid);
        if (!guest) return;

        let val;
        if (el.type === 'checkbox') val = el.checked;
        else val = el.value.trim();

        if (field === 'name' && !val) {
            alert('姓名不能為空');
            el.value = guest.name; // revert
            return;
        }

        if (field === 'category') {
            if (val === '＋ 自訂新分類') {
                val = window.handleCustomCategory(el);
            } else {
                val = val || '未分類';
            }
        }

        guest[field] = val;
        saveData();

        if (field === 'diet') {
            el.style.background = (val === '素食') ? '#e8f5e9' : 'var(--btn-light)';
            el.style.color = (val === '素食') ? '#2e7d32' : 'var(--text-muted)';
            el.style.fontWeight = (val === '素食') ? 'bold' : 'normal';
        }

        if (field === 'category') renderGuests(); // Re-render to update filter dropdown
        if (activeTableId && field === 'name') renderTableConfig(activeTableId);
    };

    window.assignTableFromList = (gid, el) => {
        const guest = guests.find(g => g.id === gid);
        const newTableId = el.value;
        const oldTableId = guest.table;

        if (newTableId === oldTableId) return;

        if (newTableId === "") {
            guest.table = '';
            guest.seat = '';
            saveData();
            renderGuests();
            if (activeTableId) renderTableConfig(activeTableId);
            return;
        }

        const tbl = tables.find(t => t.id === newTableId);
        if (!tbl) return;

        let occupiedList = guests.filter(g => g.table === tbl.id);
        if (occupiedList.length >= tbl.seatsCount && oldTableId !== tbl.id) {
            alert(`【${tbl.name}】座位數量已經滿了喔 (${tbl.seatsCount}人)！`);
            el.value = oldTableId || ''; // revert
            return;
        }

        let emptySeat = 1;
        while (occupiedList.some(g => String(g.seat) === String(emptySeat))) {
            emptySeat++;
        }

        guest.table = tbl.id;
        guest.seat = String(emptySeat);
        saveData();
        renderGuests();
        if (activeTableId) renderTableConfig(activeTableId);
    };

    function renderGuests() {
        const currentFilter = filterGuestCategory.value;
        const unseatedOnly = filterUnseatedOnly.checked;
        const uniqueCategories = [...new Set(guests.map(g => g.category || '未分類'))].filter(c => c !== '未分類');

        let filterHtml = '<option value="ALL">所有嘉賓 (' + guests.length + '人)</option>';
        filterHtml += '<option value="未分類">未分類</option>';
        uniqueCategories.forEach(c => {
            filterHtml += `<option value="${c}">${c}</option>`;
        });
        filterGuestCategory.innerHTML = filterHtml;
        if (filterGuestCategory.querySelector(`option[value="${currentFilter}"]`)) {
            filterGuestCategory.value = currentFilter;
        } else {
            filterGuestCategory.value = 'ALL';
        }

        const totalGuests = guests.length;
        const seatedGuests = guests.filter(g => g.table).length;
        const unseatedGuests = totalGuests - seatedGuests;

        guestStatsBar.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(223, 90, 119, 0.1); color: var(--primary);">📝</div>
                <div class="stat-info">
                    <div class="label">總賓客人數</div>
                    <div class="value">${totalGuests}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon" style="background: rgba(46, 125, 50, 0.1); color: #2e7d32;">✅</div>
                <div class="stat-info">
                    <div class="label">已安排座位</div>
                    <div class="value">${seatedGuests}</div>
                </div>
            </div>
            <div class="stat-card" style="${unseatedGuests > 0 ? 'border: 1px solid var(--primary); background: #fdf0f2;' : ''}">
                <div class="stat-icon" style="background: ${unseatedGuests > 0 ? 'var(--primary)' : 'rgba(180, 83, 9, 0.1)'}; color: ${unseatedGuests > 0 ? '#white' : '#b45309'};">⚠️</div>
                <div class="stat-info">
                    <div class="label">尚未安排</div>
                    <div class="value" style="${unseatedGuests > 0 ? 'color: var(--primary);' : ''}">${unseatedGuests}</div>
                </div>
            </div>
        `;

        guestTableTbody.innerHTML = '';
        guests.filter(g => {
            if (unseatedOnly && g.table) return false;
            if (filterGuestCategory.value === 'ALL') return true;
            return (g.category || '未分類') === filterGuestCategory.value;
        }).forEach((g, index) => {
            // Build table options grouped by table type
            let groupedTables = {};
            tables.forEach(tbl => {
                let cat = tbl.type || '客桌';
                if (!groupedTables[cat]) groupedTables[cat] = [];
                groupedTables[cat].push(tbl);
            });
            let tableOptionsHtml = '<option value="">尚未安排座位</option>';
            Object.keys(groupedTables).forEach(cat => {
                tableOptionsHtml += `<optgroup label="${cat}">`;
                groupedTables[cat].forEach(tbl => {
                    let occupied = guests.filter(gu => gu.table === tbl.id).length;
                    let isFull = occupied >= tbl.seatsCount;
                    let selected = (g.table === tbl.id) ? 'selected' : '';
                    let text = `${tbl.name} (${occupied}/${tbl.seatsCount})`;
                    tableOptionsHtml += `<option value="${tbl.id}" ${selected} ${isFull && !selected ? 'disabled' : ''}>${text}</option>`;
                });
                tableOptionsHtml += `</optgroup>`;
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <input type="text" value="${g.name}" onchange="updateGuest('${g.id}', 'name', this)" style="width:100px; padding:0.4rem; border:1px solid transparent; border-radius:6px; outline:none; background:transparent; font-size:1rem; color:var(--text-main); font-weight:500;">
                </td>
                <td>
                    <input type="text" value="${g.phone || ''}" placeholder="09XX-XXX-XXX" onchange="updateGuest('${g.id}', 'phone', this)" maxlength="12" oninput="window.handlePhoneInput(event);" style="width:110px; padding:0.4rem; border:1px solid transparent; border-radius:6px; outline:none; background:transparent; font-size:0.9rem; color:var(--text-main);">
                </td>
                <td>
                    <select onchange="updateGuest('${g.id}', 'category', this)" style="width:110px; padding:0.3rem 0.5rem; border:1px solid transparent; border-radius:6px; outline:none; background:transparent; font-size:0.9rem; color:var(--text-main); font-weight:600;">
                        ${categories.includes(g.category || '未分類') ? '' : `<option value="${g.category}" selected>${g.category}</option>`}
                        ${categories.map(c => `<option value="${c}" ${(g.category || '未分類') === c ? 'selected' : ''}>${c}</option>`).join('')}
                        <option value="＋ 自訂新分類" style="color:var(--primary); font-weight:bold;">＋ 自訂新分類...</option>
                    </select>
                </td>
                <td>
                    <select onchange="updateGuest('${g.id}', 'diet', this)" style="border:1px solid transparent; border-radius:12px; padding:0.3rem 0.6rem; outline:none; cursor:pointer; ${g.diet === '素食' ? 'background:#e8f5e9; color:#2e7d32; font-weight:bold;' : 'background:var(--btn-light); color:var(--text-muted);'}">
                        <option value="葷食" ${g.diet === '葷食' ? 'selected' : ''}>葷食</option>
                        <option value="素食" ${g.diet === '素食' ? 'selected' : ''}>素食 🥦</option>
                    </select>
                </td>
                <td>
                    <label style="cursor:pointer; display:inline-flex; align-items:center; justify-content:center; gap:0.4rem; margin:0; padding:0.3rem 0.8rem; border-radius:12px; transition:0.2s; ${g.babySeat ? 'background:#fdf0f2; color:var(--primary); font-weight:bold;' : 'background:var(--btn-light); color:var(--text-muted);'}">
                        <input type="checkbox" ${g.babySeat ? 'checked' : ''} onchange="updateGuest('${g.id}', 'babySeat', this); this.parentElement.style.background=this.checked?'#fdf0f2':'var(--btn-light)'; this.parentElement.style.color=this.checked?'var(--primary)':'var(--text-muted)'; this.parentElement.style.fontWeight=this.checked?'bold':'normal';" style="margin:0; cursor:pointer;">
                        👶
                    </label>
                </td>
                <td>
                    <select onchange="assignTableFromList('${g.id}', this)" style="max-width:160px; padding:0.3rem 0.5rem; border:1px solid transparent; border-radius:6px; outline:none; background:transparent; font-size:0.9rem; color:var(--text-main); font-weight:500;">
                        ${tableOptionsHtml}
                    </select>
                </td>
                <td><button class="btn-outline" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;" onclick="deleteGuest('${g.id}')">刪除</button></td>
            `;
            guestTableTbody.appendChild(tr);
        });
    }

    window.deleteGuest = (gid) => {
        if (confirm('確定要刪除這位貴賓嗎？')) {
            guests = guests.filter(g => g.id !== gid);
            saveData();
            renderGuests();
            if (activeTableId) renderTableConfig(activeTableId);
        }
    };

    // --- Excel Import Logic ---
    const btnImportExcel = document.getElementById('btnImportExcel');
    const excelUpload = document.getElementById('excelUpload');

    btnImportExcel.addEventListener('click', () => excelUpload.click());
    excelUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                let addedCount = 0;
                // Start from row 1, assuming row 0 is header
                for (let i = 1; i < json.length; i++) {
                    const row = json[i];
                    if (row && row[0]) {
                        const name = String(row[0]).trim();
                        // 嘗試抓取電話，如果第二欄看起來像電話(包含數字)就當作電話
                        let phone = String(row[1] || '').trim();
                        let dietStr, babyStr, catStr;
                        
                        // 相容舊版邏輯：判斷第二欄是不是填了素食或嬰兒椅
                        if (['素食', '素', '葷食', '葷', '是', 'Y', '1'].includes(phone)) {
                            // 代表這份是舊格式 (沒有電話欄位)
                            dietStr = String(row[1] || '').trim();
                            babyStr = String(row[2] || '').trim();
                            catStr = String(row[3] || '').trim();
                            phone = ''; // 舊格式沒有電話
                        } else {
                            // 新格式 (有電話欄位)
                            dietStr = String(row[2] || '').trim();
                            babyStr = String(row[3] || '').trim();
                            catStr = String(row[4] || '').trim();
                        }

                        let isVeg = (dietStr === '素食' || dietStr === '素' || babyStr === '素食' || babyStr === '素');
                        let isBaby = (dietStr === '是' || dietStr === 'Y' || dietStr === '1' || babyStr === '是' || babyStr === 'Y' || babyStr === '1');
                        let cat = catStr || '未分類';

                        if (name) {
                            guests.push({
                                id: 'g_' + Math.random().toString(36).substr(2, 9),
                                name: name,
                                phone: phone,
                                category: cat,
                                diet: isVeg ? '素食' : '葷食',
                                babySeat: isBaby,
                                table: '', seat: ''
                            });
                            addedCount++;
                        }
                    }
                }
                saveData();
                renderGuests();
                alert(`成功匯入 ${addedCount} 筆名單！`);
            } catch (e) {
                alert('解析 Excel 失敗，請確認格式格式是否正確。(需要第一欄為姓名)');
            }
        };
        reader.readAsArrayBuffer(file);
        excelUpload.value = ''; // reset
    });

    // --- Table Graphics Logic ---
    let activeTableId = null;
    const tableConfigCard = document.getElementById('tableConfigCard');
    const configTableNameSelect = document.getElementById('configTableNameSelect');
    const configTableNameInput = document.getElementById('configTableNameInput');
    const configTableType = document.getElementById('configTableType');
    const configTableSeats = document.getElementById('configTableSeats');
    const slotGrid = document.getElementById('slotGrid');

    const tableSelectorArea = document.getElementById('tableSelectorArea');
    const btnBigAddTable = document.getElementById('btnBigAddTable');
    const btnAddTable = document.getElementById('btnAddTable');

    function createNewTable() {
        const newId = 't_' + Date.now();
        // 加入些微的位移，防止多張新桌子產生時完全重疊在一起
        const offset = (tables.length * 4) % 30;
        tables.push({
            id: newId,
            name: '新桌次 ' + (tables.length + 1),
            type: '客桌',
            seatsCount: 10,
            x: 35 + offset,
            y: 35 + offset
        });
        saveData();
        renderTablesList();
        selectTable(newId);
    }
    btnBigAddTable.addEventListener('click', createNewTable);
    btnAddTable.addEventListener('click', createNewTable);

    configTableType.addEventListener('change', updateActiveTable);

    configTableNameSelect.addEventListener('change', () => {
        if (configTableNameSelect.value === '自定義...') {
            configTableNameInput.style.display = 'block';
            configTableNameInput.value = '';
            configTableNameInput.focus();
        } else {
            configTableNameInput.style.display = 'none';
            updateActiveTable();
        }
    });

    configTableNameInput.addEventListener('blur', updateActiveTable);
    configTableSeats.addEventListener('change', updateActiveTable);

    function updateActiveTable() {
        if (!activeTableId) return;
        const tbl = tables.find(t => t.id === activeTableId);
        if (!tbl) return;

        let nameVal = configTableNameSelect.value;
        if (nameVal === '自定義...') {
            nameVal = configTableNameInput.value.trim();
        }
        tbl.name = nameVal || '未命名桌次';
        tbl.type = configTableType.value;

        let newSeatCount = parseInt(configTableSeats.value, 10);
        if (newSeatCount !== tbl.seatsCount) {
            // Check if shrinking loses seated guests
            if (newSeatCount < tbl.seatsCount) {
                if (!confirm(`減少座次將會移除原本排在 ${newSeatCount} 號以後的賓客，確定嗎？`)) {
                    configTableSeats.value = tbl.seatsCount; // abort
                    return;
                }
                // boot out guests > newSeatCount
                guests.forEach(g => {
                    if (g.table === tbl.id && parseInt(g.seat) > newSeatCount) {
                        g.table = ''; g.seat = '';
                    }
                });
            }
            tbl.seatsCount = newSeatCount;
        }

        saveData();
        renderTablesList();
        renderTableConfig(activeTableId);
    }

    function renderTablesList() {
        // Find existing list container, clear it and redraw, inject btnBigAddTable at bottom
        let listContainer = document.getElementById('tableListContainer');
        listContainer.style.display = 'flex';
        listContainer.innerHTML = '';

        tables.forEach(t => {
            const card = document.createElement('div');
            card.id = 'table_card_' + t.id; // 為卡片加上專屬 ID，供捲動定位使用
            card.className = 'card';
            card.style.cursor = 'pointer';
            card.style.transition = '0.2s';
            if (activeTableId === t.id) {
                card.style.borderColor = 'var(--primary)';
                card.style.boxShadow = '0 4px 15px rgba(223, 90, 119, 0.15)';
            }

            // Calc occupancy
            let occupied = guests.filter(g => g.table === t.id).length;

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:700; font-size:1.1rem; color:var(--text-main); margin-bottom:0.3rem;">${t.name}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);"><span class="badge" style="padding:0.2rem 0.6rem;">${t.type}</span> ${occupied} / ${t.seatsCount} 人</div>
                    </div>
                    <button class="table-delete-btn" title="刪除此桌次" style="font-size: 1.2rem; cursor: pointer; border: none; background: transparent; padding: 0.5rem; opacity: 0.6; transition: 0.2s;">🗑️</button>
                </div>
            `;
            card.onclick = () => selectTable(t.id);

            const delBtn = card.querySelector('.table-delete-btn');
            delBtn.onmouseover = () => delBtn.style.opacity = '1';
            delBtn.onmouseout = () => delBtn.style.opacity = '0.6';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                guests.forEach(g => {
                    if (g.table === t.id) {
                        g.table = ''; g.seat = '';
                    }
                });
                tables = tables.filter(tbl => tbl.id !== t.id);
                if (activeTableId === t.id) {
                    activeTableId = null;
                    tableConfigCard.style.opacity = '0.5';
                    tableConfigCard.style.pointerEvents = 'none';
                }
                saveData();
                renderTablesList();
            };

            listContainer.appendChild(card);
        });

        listContainer.appendChild(btnBigAddTable); // move add button to end of list
    }

    function selectTable(tid) {
        activeTableId = tid;
        renderTablesList();
        renderTableConfig(tid);

        // 自動將左邊列表選中的桌次卡片捲動到畫面的正中央，省去使用者尋找或肉眼對比的痛苦
        setTimeout(() => {
            const el = document.getElementById('table_card_' + tid);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
    }

    function renderTableConfig(tid) {
        tableConfigCard.style.opacity = '1';
        tableConfigCard.style.pointerEvents = 'auto';

        const tbl = tables.find(t => t.id === tid);
        if (!tbl) return;

        // Handle name select
        const nameOpts = Array.from(configTableNameSelect.options).map(o => o.value);
        if (nameOpts.includes(tbl.name) && tbl.name !== '自定義...') {
            configTableNameSelect.value = tbl.name;
            configTableNameInput.style.display = 'none';
        } else {
            configTableNameSelect.value = '自定義...';
            configTableNameInput.style.display = 'block';
            configTableNameInput.value = tbl.name;
        }

        // Handle type select
        const opts = Array.from(configTableType.options).map(o => o.value);
        if (opts.includes(tbl.type)) {
            configTableType.value = tbl.type;
        } else {
            configTableType.value = '一般';
        }

        configTableSeats.value = tbl.seatsCount;

        // Setup Slot Filter Options
        const uniqueCat = [...new Set(guests.map(g => g.category || '未分類'))].filter(c => c !== '未分類');
        let slotFilterHtml = '<option value="ALL">顯示所有未入座嘉賓</option>';
        slotFilterHtml += '<option value="未分類">未分類</option>';
        uniqueCat.forEach(c => {
            slotFilterHtml += `<option value="${c}">${c}</option>`;
        });
        if (configSlotCategoryFilter) {
            configSlotCategoryFilter.innerHTML = slotFilterHtml;
            configSlotCategoryFilter.value = currentConfigSlotFilter;
        }

        // Render slots
        slotGrid.innerHTML = '';
        for (let i = 1; i <= tbl.seatsCount; i++) {
            const slot = document.createElement('div');
            slot.className = 'seat-slot';
            slot.innerHTML = `<span class="slot-num">${i}</span>`;

            const selectWrapper = document.createElement('div');
            selectWrapper.style.flex = '1';

            // Who is currently in this seat?
            const currentGuest = guests.find(g => g.table === tbl.id && String(g.seat) === String(i));

            if (currentGuest) {
                const filledDiv = document.createElement('div');
                filledDiv.className = 'slot-filled-content';
                let babyHtml = currentGuest.babySeat ? `<div class="baby-icon" title="嬰兒座椅">👶</div>` : '';
                filledDiv.innerHTML = `
                    <div style="flex:1; text-align:center;">${currentGuest.name}</div>
                    <span class="btn-clear" title="移除">✕</span>
                    ${babyHtml}
                `;
                filledDiv.querySelector('.btn-clear').addEventListener('click', () => {
                    currentGuest.table = '';
                    currentGuest.seat = '';
                    saveData();
                    renderTableConfig(tid);
                    renderTablesList();
                });
                selectWrapper.appendChild(filledDiv);
            } else {
                const searchWrapper = document.createElement('div');
                searchWrapper.style.position = 'relative';
                searchWrapper.style.width = '100%';

                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.placeholder = '🔍 點擊搜尋 / 選擇嘉賓';
                searchInput.style.width = '100%';
                searchInput.style.border = 'none';
                searchInput.style.background = 'transparent';
                searchInput.style.outline = 'none';
                searchInput.style.textAlign = 'center';
                searchInput.style.color = 'var(--text-muted)';
                searchInput.style.fontSize = '0.9rem';
                searchInput.style.padding = '0.2rem 0';

                const dropdown = document.createElement('div');
                dropdown.style.display = 'none';
                dropdown.style.position = 'absolute';
                dropdown.style.top = '100%';
                dropdown.style.left = '0';
                dropdown.style.right = '0';
                dropdown.style.maxHeight = '220px';
                dropdown.style.overflowY = 'auto';
                dropdown.style.background = '#fff';
                dropdown.style.border = '1px solid var(--border-dark)';
                dropdown.style.borderRadius = '12px';
                dropdown.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                dropdown.style.zIndex = '100';
                dropdown.style.textAlign = 'left';
                dropdown.style.marginTop = '0.5rem';

                let allEligibleGuests = guests; // 不再只過濾未入座的
                if (currentConfigSlotFilter !== 'ALL') {
                    allEligibleGuests = allEligibleGuests.filter(g => (g.category || '未分類') === currentConfigSlotFilter);
                }

                function renderDropdownList(filterText = '') {
                    dropdown.innerHTML = '';
                    let filtered = allEligibleGuests;
                    if (filterText) {
                        const ft = filterText.toLowerCase();
                        filtered = allEligibleGuests.filter(g => g.name.toLowerCase().includes(ft) || (g.category || '').toLowerCase().includes(ft));
                    }
                    if (filtered.length === 0) {
                        dropdown.innerHTML = '<div style="padding:0.8rem; color:#999; text-align:center; font-size:0.85rem;">找不到結果</div>';
                        return;
                    }
                    filtered.forEach(g => {
                        const item = document.createElement('div');
                        item.style.padding = '0.6rem 1rem';
                        item.style.cursor = 'pointer';
                        item.style.borderBottom = '1px solid #f9f9f9';
                        item.style.fontSize = '0.9rem';
                        item.style.display = 'flex';
                        item.style.alignItems = 'center';
                        item.style.justifyContent = 'space-between';

                        let leftHtml = `<div style="display:flex; align-items:center; gap:0.5rem;"><span style="font-weight:700; color:var(--text-main);">${g.name}</span>`;
                        if (g.babySeat) leftHtml += `<span title="嬰兒座椅" style="font-size:0.9rem;">👶</span>`;
                        leftHtml += `</div>`;

                        let rightHtml = `<div style="display:flex; align-items:center; gap:0.4rem;">`;
                        if (g.table) {
                            const tInfo = tables.find(t => t.id === g.table);
                            if (tInfo) rightHtml += `<span style="font-size:0.75rem; color:#d05035; background:#ffebee; padding:0.2rem 0.5rem; border-radius:10px; font-weight:600;">已在 ${tInfo.name}</span>`;
                        }
                        rightHtml += `<span style="font-size:0.75rem; color:#777; background:#f4f6fa; padding:0.2rem 0.5rem; border-radius:10px;">${g.category || '未分類'}</span></div>`;

                        item.innerHTML = `${leftHtml}${rightHtml}`;

                        item.addEventListener('mouseover', () => item.style.background = '#fdf0f2');
                        item.addEventListener('mouseout', () => item.style.background = '#fff');
                        item.addEventListener('mousedown', (e) => { // mousedown prevents blur from firing first
                            e.preventDefault();
                            g.table = tbl.id;
                            g.seat = String(i);
                            saveData();
                            renderTableConfig(tid);
                            renderTablesList();
                        });
                        dropdown.appendChild(item);
                    });
                }

                searchInput.addEventListener('focus', () => {
                    searchInput.style.color = 'var(--primary)';
                    searchInput.style.borderBottom = '1px solid var(--primary)';
                    renderDropdownList(searchInput.value);
                    dropdown.style.display = 'block';
                });
                searchInput.addEventListener('blur', () => {
                    searchInput.style.color = 'var(--text-muted)';
                    searchInput.style.borderBottom = 'none';
                    searchInput.value = ''; // Reset input on blur
                    dropdown.style.display = 'none';
                });
                searchInput.addEventListener('input', (e) => {
                    renderDropdownList(e.target.value);
                });

                searchWrapper.appendChild(searchInput);
                searchWrapper.appendChild(dropdown);
                selectWrapper.appendChild(searchWrapper);
            }

            slot.appendChild(selectWrapper);
            slotGrid.appendChild(slot);
        }
    }

    // btnDeleteTable has been dynamically moved to individual cards

    // --- Venue Map Logic ---
    const mapUrlInput = document.getElementById('mapUrlInput');
    const btnSaveMap = document.getElementById('btnSaveMap');
    const mapUploadInput = document.getElementById('mapUploadInput');
    const btnUploadMap = document.getElementById('btnUploadMap');
    const adminMapImg = document.getElementById('adminMapImg');
    const mapEditor = document.getElementById('mapEditor');

    const btnBackToMapFromConfig = document.getElementById('btnBackToMapFromConfig');
    const btnMapAddTable = document.getElementById('btnMapAddTable');
    const btnMapAutoLayout = document.getElementById('btnMapAutoLayout');
    const btnMapUndo = document.getElementById('btnMapUndo');

    // --- Layout Undo Logic ---
    let tablesUndoStack = [];

    function pushLayoutUndo() {
        tablesUndoStack.push(JSON.parse(JSON.stringify(tables)));
        if (tablesUndoStack.length > 30) tablesUndoStack.shift();

        if (btnMapUndo) {
            btnMapUndo.disabled = false;
            btnMapUndo.style.opacity = '1';
            btnMapUndo.style.cursor = 'pointer';
        }
    }

    if (btnMapUndo) {
        btnMapUndo.addEventListener('click', () => {
            if (tablesUndoStack.length > 0) {
                tables = tablesUndoStack.pop();
                saveData();
                renderMapEditor();
                renderTablesList();

                if (tablesUndoStack.length === 0) {
                    btnMapUndo.disabled = true;
                    btnMapUndo.style.opacity = '0.5';
                    btnMapUndo.style.cursor = 'not-allowed';
                }
            }
        });
    }

    const btnMapTidyUp = document.getElementById('btnMapTidyUp');
    if (btnMapTidyUp) {
        btnMapTidyUp.addEventListener('click', () => {
            if (tables.length < 3) {
                alert('至少需要 3 張桌子才能進行等距分配喔！');
                return;
            }

            pushLayoutUndo(); // 紀錄前一次狀態

            // 由於採用 % 作為單位，設定容錯為 1% (約代表在同一視角直線區間內)
            const GROUP_TOLERANCE = 1.0;

            // 1. 水平整理 (找出相同 Y 軸的陣列，整理 X 之間距)
            let processedRowIds = new Set();
            let rows = [];

            tables.forEach(t1 => {
                if (processedRowIds.has(t1.id)) return;
                let group = [t1];
                processedRowIds.add(t1.id);

                tables.forEach(t2 => {
                    if (!processedRowIds.has(t2.id) && Math.abs(t1.y - t2.y) <= GROUP_TOLERANCE) {
                        group.push(t2);
                        processedRowIds.add(t2.id);
                    }
                });
                if (group.length >= 3) rows.push(group);
            });

            // 均分群組間距並切齊中線
            rows.forEach(row => {
                row.sort((a, b) => a.x - b.x);
                let first = row[0];
                let last = row[row.length - 1];
                let span = last.x - first.x;
                let gap = span / (row.length - 1);

                let avgY = row.reduce((sum, t) => sum + t.y, 0) / row.length;

                for (let i = 1; i < row.length - 1; i++) {
                    row[i].x = first.x + gap * i;
                    row[i].y = avgY;
                }
                first.y = avgY;
                last.y = avgY;
            });

            // 2. 垂直整理 (找出相同 X 軸的陣列，整理 Y 之間距)
            let processedColIds = new Set();
            let cols = [];

            tables.forEach(t1 => {
                if (processedColIds.has(t1.id)) return;
                let group = [t1];
                processedColIds.add(t1.id);

                tables.forEach(t2 => {
                    if (!processedColIds.has(t2.id) && Math.abs(t1.x - t2.x) <= GROUP_TOLERANCE) {
                        group.push(t2);
                        processedColIds.add(t2.id);
                    }
                });
                if (group.length >= 3) cols.push(group);
            });

            cols.forEach(col => {
                col.sort((a, b) => a.y - b.y);
                let first = col[0];
                let last = col[col.length - 1];
                let span = last.y - first.y;
                let gap = span / (col.length - 1);

                let avgX = col.reduce((sum, t) => sum + t.x, 0) / col.length;

                for (let i = 1; i < col.length - 1; i++) {
                    col[i].y = first.y + gap * i;
                    col[i].x = avgX;
                }
                first.x = avgX;
                last.x = avgX;
            });

            saveData();
            renderMapEditor();
            alert('📏 已經將同一線上的桌子間距調整至完全等分囉！');
        });
    }

    // UI Slider Elements
    const sliderGapX = document.getElementById('sliderGapX');
    const sliderGapY = document.getElementById('sliderGapY');
    const labelGapX = document.getElementById('labelGapX');
    const labelGapY = document.getElementById('labelGapY');

    const sliderSizeMain = document.getElementById('sliderSizeMain');
    const sliderSizeGuest = document.getElementById('sliderSizeGuest');
    const labelSizeMain = document.getElementById('labelSizeMain');
    const labelSizeGuest = document.getElementById('labelSizeGuest');

    if (sliderGapX && labelGapX) {
        sliderGapX.addEventListener('input', (e) => {
            labelGapX.textContent = (e.target.value - 90) + 'px';
        });
    }
    if (sliderGapY && labelGapY) {
        sliderGapY.addEventListener('input', (e) => {
            labelGapY.textContent = (e.target.value - 90) + 'px';
        });
    }

    if (sliderSizeMain && labelSizeMain) {
        sliderSizeMain.value = mainTableSize;
        labelSizeMain.textContent = mainTableSize + 'px';
        sliderSizeMain.addEventListener('input', (e) => {
            mainTableSize = parseInt(e.target.value);
            labelSizeMain.textContent = mainTableSize + 'px';
            saveData();
            renderMapEditor();
        });
    }

    if (sliderSizeGuest && labelSizeGuest) {
        sliderSizeGuest.value = guestTableSize;
        labelSizeGuest.textContent = guestTableSize + 'px';
        sliderSizeGuest.addEventListener('input', (e) => {
            guestTableSize = parseInt(e.target.value);
            labelSizeGuest.textContent = guestTableSize + 'px';
            saveData();
            renderMapEditor();
        });
    }

    btnBackToMapFromConfig.addEventListener('click', () => {
        btnNavMap.click();
    });

    btnMapAutoLayout.addEventListener('click', () => {
        if (tables.length === 0) {
            alert('目前沒有建立任何桌次！請先新增桌次。');
            return;
        }
        if (!confirm('✨ 這將會自動幫您把所有桌子排列整齊（主桌在前、客桌在後對稱排列），確定要自動排序嗎？')) return;

        pushLayoutUndo(); // 記下自動排版前的狀態

        let mainTables = tables.filter(t => t.type === '主桌');
        let guestTables = tables.filter(t => t.type !== '主桌');

        // 先將名稱以自然排序法整理
        mainTables.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant', { numeric: true }));
        guestTables.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant', { numeric: true }));

        // 取得當前地圖的「真實像素尺寸」，進行絕對精準的像素級貼合運算 (不受螢幕長寬比影響)
        let rect = mapEditor.getBoundingClientRect();
        let mapW = rect.width || 800;
        let mapH = rect.height || 600;

        let mode = parseInt(document.getElementById('autoLayoutMode').value, 10);
        let cols = mode * 2;
        let totalRows = Math.ceil(guestTables.length / cols);

        // 主桌固定在絕對座標 Y: 110px (讓舞台有寬敞空間)
        mainTables.forEach((t, i) => {
            t.y = (110 / mapH) * 100;
            if (mainTables.length === 1) {
                t.x = 50;
            } else if (mainTables.length === 2) {
                let off = (100 / mapW) * 100;
                t.x = (i === 0) ? 50 - off : 50 + off;
            } else {
                let spacing = 80 / (mainTables.length - 1);
                t.x = 10 + i * spacing;
            }
        });

        // 建立緊湊的像素級 X 軸避讓陣列 (精準保留紅毯尺寸，絕不走位)
        let offsets_px = [];
        let gapX_px = sliderGapX ? parseInt(sliderGapX.value, 10) : 110;
        for (let i = mode - 1; i >= 0; i--) {
            // 中心紅毯避讓寬度為半徑45px + 預留紅毯60px = 105px 起跳
            offsets_px.push(-(105 + i * gapX_px));
        }
        for (let i = 0; i < mode; i++) {
            offsets_px.push(105 + i * gapX_px);
        }

        let xPositions = offsets_px.map(px => (((mapW / 2) + px) / mapW) * 100);

        let spacingY_px = sliderGapY ? parseInt(sliderGapY.value, 10) : 105;
        let startY_px = 110 + spacingY_px + 20; // 第一排客桌依照設定的 Y 間距加一點點緩衝

        // 自動推算能塞下所有桌子的地圖最小高度
        let neededH = startY_px + (totalRows + 1) * spacingY_px;
        if (neededH > mapH && !mapUrl) {
            mapEditor.style.minHeight = neededH + "px";
            mapH = neededH; // 更新為撐開後的新高度
            // 重新校正主桌 Y 以對應新高度
            mainTables.forEach(t => t.y = (110 / mapH) * 100);
        }

        guestTables.forEach((t, i) => {
            let row = Math.floor(i / cols);
            let col = i % cols;

            t.x = xPositions[col];

            let currentY_px = startY_px + row * spacingY_px;
            t.y = (currentY_px / mapH) * 100;
        });

        saveData();
        renderMapEditor();
    });

    btnMapAddTable.addEventListener('click', () => {
        createNewTable();
        renderMapEditor(); // 只重新繪製地圖，不自動跳轉畫面
    });

    function renderMapEditor() {
        const stageEl = document.querySelector('#mapEditor .map-stage');
        const aisleEl = document.querySelector('#mapEditor .map-aisle');

        if (mapUrl) {
            if (!mapUrl.startsWith('data:image')) {
                mapUrlInput.value = mapUrl;
            }
            adminMapImg.src = mapUrl;
            adminMapImg.style.display = 'block';
            // 債測圖片自然比例，同步儲存讓前台可以使用相同的座標系
            adminMapImg.onload = function () {
                const w = this.naturalWidth;
                const h = this.naturalHeight;
                if (w > 0 && h > 0) {
                    mapEditor.style.aspectRatio = `${w} / ${h}`;
                    localStorage.setItem('weddingMapAspectW', w);
                    localStorage.setItem('weddingMapAspectH', h);
                }
            };
            // 如果圖片已稿存則自然比例可能已存在，頑句套用
            const storedW = localStorage.getItem('weddingMapAspectW');
            const storedH = localStorage.getItem('weddingMapAspectH');
            if (storedW && storedH) {
                mapEditor.style.aspectRatio = `${storedW} / ${storedH}`;
            }
            if (stageEl) stageEl.style.display = 'none';
            if (aisleEl) aisleEl.style.display = 'none';
        } else {
            mapUrlInput.value = '';
            adminMapImg.style.display = 'none';
            mapEditor.style.aspectRatio = '1 / 1'; // 沒有底圖時回到正方
            localStorage.removeItem('weddingMapAspectW');
            localStorage.removeItem('weddingMapAspectH');
            if (stageEl) stageEl.style.display = 'block';
            if (aisleEl) aisleEl.style.display = 'flex';
        }

        // Render table pins
        document.querySelectorAll('.map-editor-pin').forEach(p => p.remove());
        tables.forEach(t => {
            const pin = document.createElement('div');
            pin.className = 'map-editor-pin';

            let occupiedCount = 0;
            let seatStatuses = [];
            for (let i = 1; i <= t.seatsCount; i++) {
                let hasGuest = guests.some(g => g.table === t.id && String(g.seat) === String(i));
                seatStatuses.push(hasGuest);
                if (hasGuest) occupiedCount++;
            }

            let isMain = (t.type === '主桌');
            let currentSize = isMain ? mainTableSize : guestTableSize;

            let bgColor = isMain ? 'var(--primary)' : '#ffffff';
            let textColor = isMain ? '#ffffff' : 'var(--text-main)';
            let borderColor = isMain ? 'var(--primary)' : '#e0e0e0';
            let shadow = isMain ? '0 4px 15px rgba(223, 90, 119, 0.4)' : '0 4px 10px rgba(0,0,0,0.1)';

            pin.style.position = 'absolute';
            pin.style.width = currentSize + 'px';
            pin.style.height = currentSize + 'px';
            pin.style.borderRadius = '50%';
            pin.style.background = bgColor;
            pin.style.border = `2px solid ${borderColor}`;
            pin.style.color = textColor;
            pin.style.display = 'flex';
            pin.style.flexDirection = 'column';
            pin.style.alignItems = 'center';
            pin.style.justifyContent = 'center';
            pin.style.cursor = 'grab';
            pin.style.transform = 'translate(-50%, -50%)';
            pin.style.zIndex = '10';
            pin.style.boxShadow = shadow;

            let nameDiv = document.createElement('div');
            nameDiv.style.fontWeight = 'bold';
            nameDiv.style.fontSize = '0.9rem';
            nameDiv.style.textAlign = 'center';
            nameDiv.style.width = '80%';
            nameDiv.style.whiteSpace = 'nowrap';
            nameDiv.style.overflow = 'hidden';
            nameDiv.style.textOverflow = 'ellipsis';
            nameDiv.textContent = t.name;

            let countDiv = document.createElement('div');
            countDiv.style.fontSize = '0.7rem';
            countDiv.style.marginTop = '2px';
            countDiv.style.opacity = '0.8';
            countDiv.textContent = `${occupiedCount}/${t.seatsCount}`;

            pin.appendChild(nameDiv);
            pin.appendChild(countDiv);

            // 內建專屬的刪除按鈕
            let delBtn = document.createElement('div');
            delBtn.innerHTML = '✕';
            delBtn.style.position = 'absolute';
            delBtn.style.top = '-5px';
            delBtn.style.right = '-5px';
            delBtn.style.width = '24px';
            delBtn.style.height = '24px';
            delBtn.style.background = 'white';
            delBtn.style.color = '#e53935';
            delBtn.style.border = '2px solid #e53935';
            delBtn.style.borderRadius = '50%';
            delBtn.style.display = 'flex';
            delBtn.style.alignItems = 'center';
            delBtn.style.justifyContent = 'center';
            delBtn.style.fontSize = '12px';
            delBtn.style.fontWeight = 'bold';
            delBtn.style.cursor = 'pointer';
            delBtn.style.zIndex = '40';
            delBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
            delBtn.title = '刪除此桌次';

            // 阻擋觸發拖曳與選取跳轉事件
            delBtn.addEventListener('mousedown', (e) => e.stopPropagation());
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                pushLayoutUndo(); // 紀錄刪除前的狀態
                guests.forEach(g => { if (g.table === t.id) { g.table = ''; g.seat = ''; } });
                tables = tables.filter(tbl => tbl.id !== t.id);
                if (activeTableId === t.id) {
                    activeTableId = null;
                    tableConfigCard.style.opacity = '0.5';
                    tableConfigCard.style.pointerEvents = 'none';
                }
                saveData();
                renderTablesList();
                renderMapEditor();
            });

            pin.appendChild(delBtn);

            for (let i = 0; i < t.seatsCount; i++) {
                let dot = document.createElement('div');
                let angle = (i * 360 / t.seatsCount);

                let isFilled = seatStatuses[i];
                let dotBg = isFilled ? '#fbc02d' : '#ffffff';
                let dotBorder = isFilled ? 'none' : '1px solid #ccc';
                let dotRadius = 4;

                dot.style.position = 'absolute';
                dot.style.left = '50%';
                dot.style.top = '50%';
                dot.style.width = (dotRadius * 2) + 'px';
                dot.style.height = (dotRadius * 2) + 'px';
                dot.style.borderRadius = '50%';
                dot.style.background = dotBg;
                dot.style.border = dotBorder;
                dot.style.transform = `translate(-50%, -50%) rotate(${angle}deg) translateY(-${currentSize / 2}px)`;

                pin.appendChild(dot);
            }

            pin.style.left = t.x + '%';
            pin.style.top = t.y + '%';

            // 自訂浮動提示框：hover 時立即顯示完整桌名與人數
            let tooltip = document.createElement('div');
            tooltip.textContent = `${t.name}（${occupiedCount}/${t.seatsCount}人）`;
            tooltip.style.cssText = 'position:absolute; bottom:calc(100% + 8px); left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:#fff; padding:5px 12px; border-radius:8px; font-size:0.78rem; font-weight:600; white-space:nowrap; pointer-events:none; opacity:0; transition:opacity 0.15s; z-index:50;';
            pin.appendChild(tooltip);
            pin.addEventListener('mouseenter', () => tooltip.style.opacity = '1');
            pin.addEventListener('mouseleave', () => tooltip.style.opacity = '0');

            if (activeTableId === t.id) {
                pin.style.boxShadow = '0 0 0 4px rgba(223, 90, 119, 0.5), ' + shadow;
                pin.style.transform = 'translate(-50%, -50%) scale(1.05)';
                pin.style.zIndex = '30';
                pin.style.borderColor = 'var(--primary)';
            }

            makeDraggable(pin, t);
            mapEditor.appendChild(pin);
        });
    }

    btnSaveMap.addEventListener('click', () => {
        const inputVal = mapUrlInput.value.trim();
        if (inputVal !== '已從電腦上傳圖片') {
            mapUrl = inputVal;
        }
        saveData();
        renderMapEditor();
        alert('地圖更新成功');
    });

    if (btnUploadMap && mapUploadInput) {
        btnUploadMap.addEventListener('click', () => {
            mapUploadInput.click();
        });

        // 場地佈局圖上傳
        const btnUploadLayout = document.getElementById('btnUploadLayout');
        const fileInputLayout = document.getElementById('fileInputLayout');
        if (btnUploadLayout && fileInputLayout) {
            btnUploadLayout.addEventListener('click', () => fileInputLayout.click());
            fileInputLayout.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                if (file.size > 3 * 1024 * 1024) {
                    alert('圖片太大囉！請上傳 3MB 以下的圖片。');
                    fileInputLayout.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = (evt) => {
                    mapUrl = evt.target.result;
                    mapUrlInput.value = '已從電腦上傳圖片';
                    saveData();
                    renderMapEditor();
                    alert('場地佈局圖上傳成功！');
                };
                reader.readAsDataURL(file);
                fileInputLayout.value = '';
            });
        }

        // 舊的上傳邏輯 (相容性)
        mapUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 3 * 1024 * 1024) {
                alert('圖片太大囉！請上傳 3MB 以下的圖片。');
                mapUploadInput.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (evt) => {
                mapUrl = evt.target.result;
                mapUrlInput.value = '已從電腦上傳圖片';
                saveData();
                renderMapEditor();
                alert('圖片上傳成功！');
            };
            reader.readAsDataURL(file);
            mapUploadInput.value = '';
        });
    }

    // 飯店位置示意圖上傳
    const btnUploadHotelMap = document.getElementById('btnUploadHotelMap');
    const fileInputHotelMap = document.getElementById('fileInputHotelMap');
    const infoHotelMapUrl = document.getElementById('infoHotelMapUrl');
    if (btnUploadHotelMap && fileInputHotelMap) {
        btnUploadHotelMap.addEventListener('click', () => fileInputHotelMap.click());
        fileInputHotelMap.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (file.size > 3 * 1024 * 1024) {
                alert('圖片太大囉！請上傳 3MB 以下的圖片。');
                fileInputHotelMap.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (evt) => {
                hotelMapData = evt.target.result;
                infoHotelMapUrl.value = '已上傳圖片（可重新選擇替換）';
                try {
                    localStorage.setItem('weddingHotelMap', hotelMapData);
                    alert('飯店位置示意圖上傳成功！');
                } catch (e) {
                    alert('⚠️ 圖片太大，儲存失敗！請壓縮圖片到 500KB 以下再重新上傳。');
                    hotelMapData = '';
                }
            };
            reader.readAsDataURL(file);
            fileInputHotelMap.value = '';
        });
    }

    function updateAdminUI() {
        if (document.getElementById('adminHeaderNames')) {
            document.getElementById('adminHeaderNames').textContent = `${weddingInfo.groomName} ♡ ${weddingInfo.brideName}`;
        }
    }
    updateAdminUI();

    function makeDraggable(element, tRecord) {
        const snapGuideX = document.getElementById('snapGuideX');
        const snapGuideY = document.getElementById('snapGuideY');

        let isDragging = false;
        let hasMoved = false;
        const SNAP_THRESHOLD = 1.0; // 降低吸附距離，從 2.0 降至 1.0 讓手感不那麼生硬

        element.addEventListener('mousedown', (e) => {
            pushLayoutUndo(); // 記錄拖曳前的初始座標
            isDragging = true;
            hasMoved = false;
            element.style.cursor = 'grabbing';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            hasMoved = true;
            const rect = mapEditor.getBoundingClientRect();
            let rawX = ((e.clientX - rect.left) / rect.width) * 100;
            let rawY = ((e.clientY - rect.top) / rect.height) * 100;

            rawX = Math.max(0, Math.min(100, rawX));
            rawY = Math.max(0, Math.min(100, rawY));

            let snappedX = rawX;
            let snappedY = rawY;
            let showGuideX = false;
            let showGuideY = false;

            let minDiffX = SNAP_THRESHOLD;
            let minDiffY = SNAP_THRESHOLD;

            // 如果按下 Alt 鍵，可以暫時取消吸附功能
            if (!e.altKey) {
                // 1. 中心軸吸附
                let diffCenter = Math.abs(rawX - 50);
                if (diffCenter < minDiffX) {
                    minDiffX = diffCenter;
                    snappedX = 50;
                    showGuideX = true;
                }

                // 2. 尋找「最靠近」的桌子來吸附 (避免太多桌子時亂跳)
                tables.forEach(other => {
                    if (other.id === tRecord.id) return;

                    let diffX = Math.abs(rawX - other.x);
                    if (diffX < minDiffX) {
                        minDiffX = diffX;
                        snappedX = other.x;
                        showGuideX = true;
                    }

                    let diffY = Math.abs(rawY - other.y);
                    if (diffY < minDiffY) {
                        minDiffY = diffY;
                        snappedY = other.y;
                        showGuideY = true;
                    }
                });
            }

            element.style.left = snappedX + '%';
            element.style.top = snappedY + '%';
            tRecord.x = snappedX;
            tRecord.y = snappedY;

            if (showGuideX && snapGuideX) {
                snapGuideX.style.display = 'block';
                snapGuideX.style.left = snappedX + '%';
            } else if (snapGuideX) snapGuideX.style.display = 'none';

            if (showGuideY && snapGuideY) {
                snapGuideY.style.display = 'block';
                snapGuideY.style.top = snappedY + '%';
            } else if (snapGuideY) snapGuideY.style.display = 'none';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                element.style.cursor = 'grab';
                saveData();
            }
        });

        element.addEventListener('click', (e) => {
            if (!hasMoved) {
                activeTableId = tRecord.id;
                renderMapEditor();
                // 自動跳轉回桌次圖形，並選取這張桌子
                btnNavList.click();
                subBtnTableGraphics.click();
                selectTable(activeTableId);
            }
        });
    }

    // Initial boot
    renderGuests();
    if (tables.length > 0) selectTable(tables[0].id);
    else renderTablesList();
});
