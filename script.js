let cards = []
let currentSort = { key: "", order: "desc" }

// ===== localStorage =====
function getOwned()       { return JSON.parse(localStorage.getItem("owned") || "[]") }
function getFavorites()   { return JSON.parse(localStorage.getItem("favorites") || "[]") }
function saveOwned(a)     { localStorage.setItem("owned", JSON.stringify(a)) }
function saveFavorites(a) { localStorage.setItem("favorites", JSON.stringify(a)) }
function isOwned(cn)      { return getOwned().includes(cn) }
function isFavorite(cn)   { return getFavorites().includes(cn) }

function getTierData() {
    const def = {
        rows: [
            { id:"SSS", label:"SSS", color:"#ff4b6e", cards:[] },
            { id:"SS",  label:"SS",  color:"#ff8c42", cards:[] },
            { id:"S",   label:"S",   color:"#f5c842", cards:[] },
            { id:"A",   label:"A",   color:"#7ed957", cards:[] },
            { id:"B",   label:"B",   color:"#00c8ff", cards:[] },
            { id:"C",   label:"C",   color:"#a78bfa", cards:[] },
            { id:"D",   label:"D",   color:"#6b7280", cards:[] },
        ],
        tray: []
    }
    const saved = localStorage.getItem("tierData")
    return saved ? JSON.parse(saved) : def
}
function saveTierData(d) { localStorage.setItem("tierData", JSON.stringify(d)) }


// ===== データ読み込み =====
fetch("data/card.json")
    .then(res => res.json())
    .then(data => {
        cards = data.cards
        displayCards(cards)
        setupSeriesFilter()
        setupSpdFilter()
        createFilterButtons(["アタッカー","ディフェンダー","フィニッシャー","マシン","アイテム","イベント","エネミー"], "attributeFilters")
        createFilterButtons(["LLR","LR","PR"], "rarityFilters")
        createFilterButtons(["剣","パンチ","銃"], "weaponFilters")
        createFilterButtons([
            "ツイゲキ","ゲキレツアタック","カウンター","タフネス","サクセンフェイズ",
            "ライダーキック","フォームチェンジ","コマンドラッシュ","ライダーソウル",
            "デッドリーアサルト","ライダーズクロス","クロマティックチェンジ","リベンジストライク"
        ], "abilityFilters")
        createFilterButtons(["通常カード","パラレルカード"], "cardTypeFilters")
        initTierTray()
    })


// ===== タブナビ =====
let currentPage = "pageCardList"

document.querySelectorAll(".navTab").forEach(tab => {
    tab.onclick = () => switchPage(tab.dataset.page)
})

function switchPage(pageId) {
    currentPage = pageId
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"))
    document.getElementById(pageId).classList.add("active")
    document.querySelectorAll(".navTab").forEach(t => {
        t.classList.toggle("active", t.dataset.page === pageId)
    })
    const isCardList = pageId === "pageCardList"
    document.getElementById("topBarCenter").style.display = isCardList ? "" : "none"
    document.getElementById("topBarRight").style.display  = isCardList ? "" : "none"
    document.getElementById("controlBar").style.display   = isCardList ? "" : "none"
    if (pageId === "pageOwned") renderOwnedPage()
    if (pageId === "pageFav")   renderFavPage()
    if (pageId === "pageTier")  renderTierTable()
}


// ===== フィルターボタン =====
function createFilterButtons(list, containerId) {
    const area = document.getElementById(containerId)
    list.forEach(name => {
        const btn = document.createElement("div")
        btn.className = "filterButton"
        btn.textContent = name
        btn.dataset.value = name
        btn.onclick = () => btn.classList.toggle("active")
        area.appendChild(btn)
    })
}


// ===== カード一覧表示 =====
function displayCards(list) {
    const area = document.getElementById("cardList")
    area.innerHTML = ""
    document.getElementById("resultCount").innerHTML = `<strong>${list.length}</strong>枚のカードが見つかりました`
    list.forEach(card => {
        const div = document.createElement("div")
        div.className = "card"
        const img = document.createElement("img")
        img.src = card.image; img.loading = "lazy"; img.alt = card.name || ""
        div.appendChild(img)
        if (isOwned(card.cardNumber)) {
            const b = document.createElement("span"); b.className = "card-badge card-badge-own"; b.textContent = "📦"; div.appendChild(b)
        }
        if (isFavorite(card.cardNumber)) {
            const b = document.createElement("span"); b.className = "card-badge card-badge-fav"; b.textContent = "⭐"; div.appendChild(b)
        }
        div.onclick = () => openModal(card.image)
        area.appendChild(div)
    })
}


// ===== 所持・お気に入りページ =====
function renderOwnedPage() {
    document.getElementById("ownedCount").textContent = getOwned().length
    document.getElementById("favCount").textContent   = getFavorites().length
    renderSubList("ownedCardList", getOwned(), "📦 所持カードがありません")
}
function renderFavPage() {
    renderSubList("favCardList2", getFavorites(), "⭐ お気に入りがありません")
}
function renderSubList(areaId, cardNumbers, emptyMsg) {
    const area = document.getElementById(areaId)
    area.innerHTML = ""
    if (cardNumbers.length === 0) {
        area.innerHTML = `<div class="profileEmpty">${emptyMsg}</div>`
        return
    }
    cardNumbers.forEach(cn => {
        const card = cards.find(c => c.cardNumber === cn)
        if (!card) return
        const div = document.createElement("div")
        div.className = "card"
        div.innerHTML = `<img src="${card.image}" loading="lazy" alt="${card.name || ''}">`
        div.onclick = () => openModal(card.image)
        area.appendChild(div)
    })
}


// ===== SPD / シリーズ フィルター =====
function setupSpdFilter() {
    const values = [...new Set(cards.map(c => c.stats?.spd).filter(v => v != null))].sort((a,b) => a-b)
    createFilterButtons(values.map(v => String(v)), "spdFilters")
}
function setupSeriesFilter() {
    const set = new Set()
    cards.forEach(c => { if (c.series) set.add(c.series) })
    const area = document.getElementById("seriesFilters")
    set.forEach(series => {
        const label = document.createElement("label")
        label.innerHTML = `<input type="checkbox" class="filterSeries" value="${series}"> ${series}`
        area.appendChild(label)
    })
}


// ===== 検索・並び替え =====
document.getElementById("searchBox").oninput = applyFilters
document.getElementById("sortKey").onchange = function() { currentSort.key = this.value; applyFilters() }
document.getElementById("sortOrder").onclick = function() {
    currentSort.order = currentSort.order === "desc" ? "asc" : "desc"
    this.dataset.order = currentSort.order
    this.querySelector(".sortOrderLabel").textContent = currentSort.order === "asc" ? "昇順" : "降順"
    applyFilters()
}

function sortCards(list) {
    if (!currentSort.key) return list
    const keyMap = { atk:["atk"], def:["def"], hp:["hp"], spd:["spd"], hissatsu:["hissatsu"] }
    function getVal(card) {
        for (const k of (keyMap[currentSort.key] || [])) {
            const v = card.stats?.[k] ?? card[k]
            if (v != null && v !== "") return Number(v)
        }
        return null
    }
    return [...list].sort((a,b) => {
        const va = getVal(a), vb = getVal(b)
        if (va === null && vb === null) return 0
        if (va === null) return 1; if (vb === null) return -1
        return currentSort.order === "desc" ? vb - va : va - vb
    })
}

function applyFilters() {
    const attributes = [...document.querySelectorAll("#attributeFilters .active")].map(e => e.dataset.value)
    const rarities   = [...document.querySelectorAll("#rarityFilters .active")].map(e => e.dataset.value)
    const weapons    = [...document.querySelectorAll("#weaponFilters .active")].map(e => e.dataset.value)
    const spds       = [...document.querySelectorAll("#spdFilters .active")].map(e => Number(e.dataset.value))
    const abilities  = [...document.querySelectorAll("#abilityFilters .active")].map(e => e.dataset.value)
    const cardTypes  = [...document.querySelectorAll("#cardTypeFilters .active")].map(e => e.dataset.value)
    const series     = [...document.querySelectorAll(".filterSeries:checked")].map(e => e.value)
    const word       = document.getElementById("searchBox").value.toLowerCase()
    let result = cards.filter(card => {
        if (attributes.length && !attributes.includes(card.attribute)) return false
        if (rarities.length && !rarities.includes(card.rarity)) return false
        if (spds.length && !spds.includes(card.stats?.spd)) return false
        if (series.length && !series.includes(card.series)) return false
        if (weapons.length && !weapons.some(w => (card.battleType||[]).includes(w))) return false
        if (cardTypes.length) {
            const isP = card.cardNumber?.toLowerCase().endsWith("p")
            if (cardTypes.includes("通常カード") && isP) return false
            if (cardTypes.includes("パラレルカード") && !isP) return false
        }
        if (abilities.length && !abilities.some(a => JSON.stringify(card).includes(a))) return false
        if (word && !JSON.stringify(card).toLowerCase().includes(word)) return false
        return true
    })
    displayCards(sortCards(result))
}


// ===== 絞り込みモーダル =====
const filterModal = document.getElementById("filterModal")
document.getElementById("openFilter").onclick  = () => { filterModal.style.display = "flex" }
document.getElementById("closeFilter").onclick = () => { filterModal.style.display = "none" }
document.getElementById("applyFilter").onclick = () => { applyFilters(); filterModal.style.display = "none" }
document.getElementById("resetFilter").onclick = () => {
    document.querySelectorAll(".filterButton.active").forEach(b => b.classList.remove("active"))
    document.querySelectorAll(".filterSeries:checked").forEach(c => c.checked = false)
    applyFilters()
}
filterModal.onclick = e => { if (e.target === filterModal) filterModal.style.display = "none" }


// ===== カード拡大モーダル =====
const modal    = document.getElementById("modal")
const modalImg = document.getElementById("modalImg")
let showingBack = false, currentImage = ""
function openModal(image) {
    modal.style.display = "flex"; modalImg.src = image; currentImage = image; showingBack = false
}
modalImg.onclick = e => {
    e.stopPropagation()
    showingBack = !showingBack
    modalImg.src = showingBack ? currentImage.replace(".jpg","_b.jpg") : currentImage
}
modal.onclick = () => { modal.style.display = "none" }


// ===== カード選択モード =====
let selectMode = null
let selectTemp = new Set()

function openSelectMode(mode) {
    selectMode = mode
    selectTemp = new Set(mode === "owned" ? getOwned() : getFavorites())
    switchPage("pageCardList")
    document.body.classList.add("select-mode")
    document.body.classList.toggle("select-fav", mode === "favorites")
    document.getElementById("selectBar").style.display    = "flex"
    document.getElementById("selectFooter").style.display = "block"
    document.getElementById("selectBarTitle").textContent = mode === "owned" ? "所持カードを選択" : "お気に入りを選択"
    updateSelectCount()
    renderSelectCards()
}
function exitSelectMode() {
    selectMode = null
    document.body.classList.remove("select-mode","select-fav")
    document.getElementById("selectBar").style.display    = "none"
    document.getElementById("selectFooter").style.display = "none"
    applyFilters()
}
function updateSelectCount() {
    document.getElementById("selectCount").textContent = `${selectTemp.size}枚`
}
function renderSelectCards() {
    const area = document.getElementById("cardList")
    area.innerHTML = ""
    cards.forEach(card => {
        const div = document.createElement("div")
        div.className = "card" + (selectTemp.has(card.cardNumber) ? " sel-active" : "")
        const img = document.createElement("img"); img.src = card.image; img.loading = "lazy"; div.appendChild(img)
        const check = document.createElement("span"); check.className = "sel-check"; check.textContent = "✓"; div.appendChild(check)
        div.onclick = () => {
            if (selectTemp.has(card.cardNumber)) { selectTemp.delete(card.cardNumber); div.classList.remove("sel-active") }
            else { selectTemp.add(card.cardNumber); div.classList.add("sel-active") }
            updateSelectCount()
        }
        area.appendChild(div)
    })
}
document.getElementById("cancelSelect").onclick = exitSelectMode
document.getElementById("selectDone").onclick = () => {
    const mode = selectMode
    if (mode === "owned") saveOwned([...selectTemp])
    else saveFavorites([...selectTemp])
    exitSelectMode()
    switchPage(mode === "owned" ? "pageOwned" : "pageFav")
}
document.getElementById("goSelectOwned").onclick = () => openSelectMode("owned")
document.getElementById("goSelectFav2").onclick  = () => openSelectMode("favorites")


// ===== ティア表 =====
let dragSrc  = null
let tierData = null
let traySearch = ""
let traySortKey = ""   // "atk"|"def"|"hp"|"spd"|"hissatsu"|""
let traySortOrder = "desc"

// トレイ絞り込み状態
const trayActiveFilters = {
    attributes: [], rarities: [], weapons: [], spds: [], series: []
}

function initTierTray() {
    tierData = getTierData()
    const allPlaced = new Set([
        ...tierData.rows.flatMap(r => r.cards),
        ...tierData.tray
    ])
    cards.forEach(card => {
        if (!allPlaced.has(card.cardNumber)) tierData.tray.push(card.cardNumber)
    })
    saveTierData(tierData)
}

function renderTierTable() {
    tierData = getTierData()
    renderTierRows()
    renderTierTray()

    // 検索
    document.getElementById("traySearchBox").oninput = function() {
        traySearch = this.value.toLowerCase()
        renderTierTray()
    }

    // 並び替えボタン（サイクル: none→atk→def→hp→spd→hissatsu→none）
    const sortKeys = ["atk","def","hp","spd","hissatsu"]
    const sortLabels = { "":"並び替え", atk:"ATK↓", def:"DEF↓", hp:"HP↓", spd:"SPD↓", hissatsu:"必殺↓" }
    const sortLabelsAsc = { atk:"ATK↑", def:"DEF↑", hp:"HP↑", spd:"SPD↑", hissatsu:"必殺↑" }
    const sortBtn = document.getElementById("traySort")
    sortBtn.onclick = () => {
        if (!traySortKey) {
            traySortKey = "atk"; traySortOrder = "desc"
        } else if (traySortOrder === "desc") {
            traySortOrder = "asc"
        } else {
            const idx = sortKeys.indexOf(traySortKey)
            if (idx < sortKeys.length - 1) { traySortKey = sortKeys[idx + 1]; traySortOrder = "desc" }
            else { traySortKey = ""; traySortOrder = "desc" }
        }
        document.getElementById("traySortLabel").textContent =
            traySortKey
                ? (traySortOrder === "desc" ? sortLabels[traySortKey] : sortLabelsAsc[traySortKey])
                : "並び替え"
        renderTierTray()
    }

    // 絞り込みモーダル初期化（一度だけ）
    if (!document.getElementById("trayAttributeFilters").dataset.init) {
        document.getElementById("trayAttributeFilters").dataset.init = "1"
        createTrayFilterButtons(["アタッカー","ディフェンダー","フィニッシャー","マシン","アイテム","イベント","エネミー"], "trayAttributeFilters", "attributes")
        createTrayFilterButtons(["LLR","LR","PR"], "trayRarityFilters", "rarities")
        createTrayFilterButtons(["剣","パンチ","銃"], "trayWeaponFilters", "weapons")
        const spdVals = [...new Set(cards.map(c => c.stats?.spd).filter(v => v != null))].sort((a,b) => a-b)
        createTrayFilterButtons(spdVals.map(v => String(v)), "traySpdFilters", "spds")
        // シリーズ
        const set = new Set(); cards.forEach(c => { if (c.series) set.add(c.series) })
        const area = document.getElementById("traySeriesFilters")
        set.forEach(series => {
            const label = document.createElement("label")
            label.innerHTML = `<input type="checkbox" class="trayFilterSeries" value="${series}"> ${series}`
            area.appendChild(label)
        })
    }
}

function createTrayFilterButtons(list, containerId, filterKey) {
    const area = document.getElementById(containerId)
    area.innerHTML = ""
    list.forEach(name => {
        const btn = document.createElement("div")
        btn.className = "filterButton"
        btn.textContent = name
        btn.dataset.value = name
        btn.onclick = () => btn.classList.toggle("active")
        area.appendChild(btn)
    })
}

// トレイ絞り込みモーダル
const trayFilterModal = document.getElementById("trayFilterModal")
document.getElementById("openTrayFilter").onclick = () => trayFilterModal.classList.add("open")
document.getElementById("closeTrayFilter").onclick = () => trayFilterModal.classList.remove("open")
trayFilterModal.onclick = e => { if (e.target === trayFilterModal) trayFilterModal.classList.remove("open") }
document.getElementById("resetTrayFilter").onclick = () => {
    document.querySelectorAll("#trayFilterModal .filterButton.active").forEach(b => b.classList.remove("active"))
    document.querySelectorAll(".trayFilterSeries:checked").forEach(c => c.checked = false)
    renderTierTray()
}
document.getElementById("applyTrayFilter").onclick = () => {
    trayFilterModal.classList.remove("open")
    renderTierTray()
}

function getTrayFilteredCards() {
    const attributes = [...document.querySelectorAll("#trayAttributeFilters .active")].map(e => e.dataset.value)
    const rarities   = [...document.querySelectorAll("#trayRarityFilters .active")].map(e => e.dataset.value)
    const weapons    = [...document.querySelectorAll("#trayWeaponFilters .active")].map(e => e.dataset.value)
    const spds       = [...document.querySelectorAll("#traySpdFilters .active")].map(e => Number(e.dataset.value))
    const series     = [...document.querySelectorAll(".trayFilterSeries:checked")].map(e => e.value)

    let result = tierData.tray.map(cn => cards.find(c => c.cardNumber === cn)).filter(Boolean)

    result = result.filter(card => {
        if (attributes.length && !attributes.includes(card.attribute)) return false
        if (rarities.length && !rarities.includes(card.rarity)) return false
        if (spds.length && !spds.includes(card.stats?.spd)) return false
        if (series.length && !series.includes(card.series)) return false
        if (weapons.length && !weapons.some(w => (card.battleType||[]).includes(w))) return false
        if (traySearch && !JSON.stringify(card).toLowerCase().includes(traySearch)) return false
        return true
    })

    // 並び替え
    if (traySortKey) {
        result.sort((a, b) => {
            const va = a.stats?.[traySortKey] ?? null
            const vb = b.stats?.[traySortKey] ?? null
            if (va === null && vb === null) return 0
            if (va === null) return 1; if (vb === null) return -1
            return traySortOrder === "desc" ? vb - va : va - vb
        })
    }
    return result
}

function renderTierRows() {
    const area = document.getElementById("tierRows")
    area.innerHTML = ""
    tierData.rows.forEach(row => {
        const rowEl = document.createElement("div")
        rowEl.className = "tierRow"
        rowEl.dataset.id = row.id
        const label = document.createElement("div")
        label.className = "tierLabel"
        label.textContent = row.label
        label.style.color = row.color
        label.style.background = row.color + "22"
        rowEl.appendChild(label)
        const cardsEl = document.createElement("div")
        cardsEl.className = "tierCards"
        row.cards.forEach(cn => {
            const card = cards.find(c => c.cardNumber === cn)
            if (card) cardsEl.appendChild(makeTierCard(card, row.id, true))
        })
        setupDropZone(cardsEl, row.id)
        rowEl.appendChild(cardsEl)
        area.appendChild(rowEl)
    })
}

function renderTierTray() {
    const area = document.getElementById("tierTrayCards")
    area.innerHTML = ""
    document.getElementById("trayCount").textContent = tierData.tray.length
    const filtered = getTrayFilteredCards()
    filtered.forEach(card => area.appendChild(makeTierCard(card, "tray", false)))
    setupDropZone(area, "tray")
}

function makeTierCard(card, fromId, showBack) {
    const div = document.createElement("div")
    div.className = "tierCard"
    div.draggable = true
    div.innerHTML = `<img src="${card.image}" loading="lazy" alt="${card.name || ''}">`

    // ティア行にあるカードは「×」ボタンでトレイに戻す＋左右移動ボタン
    if (showBack) {
        const backBtn = document.createElement("button")
        backBtn.className = "tierCardBack"
        backBtn.textContent = "✕"
        backBtn.onclick = e => {
            e.stopPropagation()
            moveCard(card.cardNumber, fromId, "tray")
        }
        div.appendChild(backBtn)

        const leftBtn = document.createElement("button")
        leftBtn.className = "tierCardMoveLeft"
        leftBtn.textContent = "◀"
        leftBtn.onclick = e => {
            e.stopPropagation()
            moveCardInRow(card.cardNumber, fromId, -1)
        }
        div.appendChild(leftBtn)

        const rightBtn = document.createElement("button")
        rightBtn.className = "tierCardMoveRight"
        rightBtn.textContent = "▶"
        rightBtn.onclick = e => {
            e.stopPropagation()
            moveCardInRow(card.cardNumber, fromId, 1)
        }
        div.appendChild(rightBtn)
    }

    // PC ドラッグ
    div.addEventListener("dragstart", e => {
        dragSrc = { cardNumber: card.cardNumber, fromId }
        div.classList.add("dragging")
        e.dataTransfer.effectAllowed = "move"
    })
    div.addEventListener("dragend", () => div.classList.remove("dragging"))

    // スマホ：タッチ開始と同時にドラッグ開始（長押し不要）
    div.addEventListener("touchstart", e => {
        e.preventDefault()
        const t0 = e.touches[0]
        const w = div.offsetWidth
        const h = div.offsetHeight

        if (navigator.vibrate) navigator.vibrate(15)

        const clone = div.cloneNode(true)
        clone.style.cssText = [
            "position:fixed","z-index:9998","pointer-events:none",
            "width:" + w + "px",
            "left:" + (t0.clientX - w / 2) + "px",
            "top:"  + (t0.clientY - h / 2) + "px",
            "opacity:0.85","transform:scale(1.08)",
            "border-radius:8px","box-shadow:0 8px 24px rgba(0,0,0,0.7)",
            "transition:none"
        ].join(";")
        document.body.appendChild(clone)
        div.style.opacity = "0.25"

        function onMove(ev) {
            ev.preventDefault()
            const mt = ev.touches[0]
            clone.style.left = (mt.clientX - w / 2) + "px"
            clone.style.top  = (mt.clientY - h / 2) + "px"
            document.querySelectorAll(".drag-over").forEach(z => z.classList.remove("drag-over"))
            clone.style.visibility = "hidden"
            const hit = document.elementFromPoint(mt.clientX, mt.clientY)
            clone.style.visibility = "visible"
            if (hit) {
                const zone = hit.closest(".tierCards") || hit.closest(".tierTrayCards")
                if (zone) zone.classList.add("drag-over")
            }
        }

        function onEnd(ev) {
            document.removeEventListener("touchmove", onMove)
            document.removeEventListener("touchend",  onEnd)
            clone.remove()
            div.style.opacity = ""
            document.querySelectorAll(".drag-over").forEach(z => z.classList.remove("drag-over"))
            const et = ev.changedTouches[0]
            const hit = document.elementFromPoint(et.clientX, et.clientY)
            if (hit) {
                const dropRow  = hit.closest(".tierCards")
                const dropTray = hit.closest(".tierTrayCards")
                if (dropRow) {
                    const row = dropRow.closest(".tierRow")
                    if (row) moveCard(card.cardNumber, fromId, row.dataset.id)
                } else if (dropTray) {
                    moveCard(card.cardNumber, fromId, "tray")
                }
            }
        }

        document.addEventListener("touchmove", onMove, { passive: false })
        document.addEventListener("touchend",  onEnd,  { passive: false })
    }, { passive: false })

    return div
}

function setupDropZone(el, toId) {
    el.addEventListener("dragover",  e => { e.preventDefault(); el.classList.add("drag-over") })
    el.addEventListener("dragleave", () => el.classList.remove("drag-over"))
    el.addEventListener("drop", e => {
        e.preventDefault()
        el.classList.remove("drag-over")
        if (!dragSrc) return
        moveCard(dragSrc.cardNumber, dragSrc.fromId, toId)
        dragSrc = null
    })
}

function moveCard(cardNumber, fromId, toId) {
    if (fromId === toId) return
    if (fromId === "tray") {
        tierData.tray = tierData.tray.filter(cn => cn !== cardNumber)
    } else {
        const row = tierData.rows.find(r => r.id === fromId)
        if (row) row.cards = row.cards.filter(cn => cn !== cardNumber)
    }
    if (toId === "tray") {
        tierData.tray.push(cardNumber)
    } else {
        const row = tierData.rows.find(r => r.id === toId)
        if (row) row.cards.push(cardNumber)
    }
    saveTierData(tierData)
    renderTierRows()
    renderTierTray()
}

// ティア行内の左右移動
function moveCardInRow(cardNumber, rowId, dir) {
    const row = tierData.rows.find(r => r.id === rowId)
    if (!row) return
    const idx = row.cards.indexOf(cardNumber)
    if (idx === -1) return
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= row.cards.length) return
    row.cards.splice(idx, 1)
    row.cards.splice(newIdx, 0, cardNumber)
    saveTierData(tierData)
    renderTierRows()
}

// リセット（確認ダイアログつき）
function showConfirm(message, onOk) {
    const overlay = document.createElement("div")
    overlay.className = "confirmOverlay"
    overlay.innerHTML = `
        <div class="confirmBox">
            <p>${message}</p>
            <div class="confirmBtns">
                <button class="confirmCancel">キャンセル</button>
                <button class="confirmOk">リセット</button>
            </div>
        </div>
    `
    overlay.querySelector(".confirmCancel").onclick = () => overlay.remove()
    overlay.querySelector(".confirmOk").onclick = () => { overlay.remove(); onOk() }
    document.body.appendChild(overlay)
}

document.getElementById("resetTier").onclick = () => {
    showConfirm("ティア表をリセットしますか？\n全カードがトレイに戻ります。", () => {
        tierData = getTierData()
        const allCards = [
            ...tierData.rows.flatMap(r => r.cards),
            ...tierData.tray
        ]
        tierData.rows.forEach(r => r.cards = [])
        tierData.tray = allCards
        saveTierData(tierData)
        renderTierRows()
        renderTierTray()
    })
}

// 画像保存モーダル
document.getElementById("closeImageModal").onclick = () => {
    document.getElementById("imageModal").style.display = "none"
}

document.getElementById("saveTierImage").onclick = async () => {
    const btn = document.getElementById("saveTierImage")
    btn.textContent = "生成中..."
    btn.disabled = true

    try {
        const data = getTierData()
        const rows = data.rows.filter(r => r.cards.length > 0)

        if (rows.length === 0) {
            alert("ティア行にカードがありません")
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>保存`
            btn.disabled = false
            return
        }

        // 1枚目のカード画像を読み込んで実サイズを取得
        const sampleCard = cards.find(c => c.cardNumber === rows[0].cards[0])
        const sampleImg  = await loadImage(sampleCard.image)
        const CARD_W = sampleImg.naturalWidth
        const CARD_H = sampleImg.naturalHeight

        const LABEL_W = Math.round(CARD_W * 0.7)
        const GAP     = Math.round(CARD_W * 0.06)
        const PAD     = Math.round(CARD_W * 0.1)
        const ROW_MIN_H = CARD_H + PAD * 2

        const maxCards = Math.max(...rows.map(r => r.cards.length))
        const canvasW  = LABEL_W + PAD + maxCards * (CARD_W + GAP) + PAD
        const canvasH  = rows.length * ROW_MIN_H

        const canvas  = document.createElement("canvas")
        canvas.width  = Math.max(canvasW, 400)
        canvas.height = canvasH
        const ctx = canvas.getContext("2d")

        // 背景
        ctx.fillStyle = "#080c14"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        let y = 0
        for (const row of rows) {
            const rowH = ROW_MIN_H

            // ラベル背景
            ctx.fillStyle = row.color + "33"
            ctx.fillRect(0, y, LABEL_W, rowH)

            // 右区切り線
            ctx.strokeStyle = row.color + "88"
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(LABEL_W, y)
            ctx.lineTo(LABEL_W, y + rowH)
            ctx.stroke()

            // 下区切り線
            ctx.strokeStyle = "rgba(255,255,255,0.1)"
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(0, y + rowH)
            ctx.lineTo(canvas.width, y + rowH)
            ctx.stroke()

            // ラベルテキスト
            ctx.fillStyle = row.color
            const fontSize = row.label.length > 2
                ? Math.round(LABEL_W * 0.35)
                : Math.round(LABEL_W * 0.5)
            ctx.font = `bold ${fontSize}px sans-serif`
            ctx.textAlign = "center"
            ctx.textBaseline = "middle"
            ctx.fillText(row.label, LABEL_W / 2, y + rowH / 2)

            // カード描画
            let x = LABEL_W + PAD
            for (const cn of row.cards) {
                const card = cards.find(c => c.cardNumber === cn)
                if (!card) { x += CARD_W + GAP; continue }

                try {
                    const img = await loadImage(card.image)
                    const r = Math.round(CARD_W * 0.06)
                    ctx.save()
                    ctx.beginPath()
                    ctx.moveTo(x + r, y + PAD)
                    ctx.lineTo(x + CARD_W - r, y + PAD)
                    ctx.quadraticCurveTo(x + CARD_W, y + PAD, x + CARD_W, y + PAD + r)
                    ctx.lineTo(x + CARD_W, y + PAD + CARD_H - r)
                    ctx.quadraticCurveTo(x + CARD_W, y + PAD + CARD_H, x + CARD_W - r, y + PAD + CARD_H)
                    ctx.lineTo(x + r, y + PAD + CARD_H)
                    ctx.quadraticCurveTo(x, y + PAD + CARD_H, x, y + PAD + CARD_H - r)
                    ctx.lineTo(x, y + PAD + r)
                    ctx.quadraticCurveTo(x, y + PAD, x + r, y + PAD)
                    ctx.closePath()
                    ctx.clip()
                    ctx.drawImage(img, x, y + PAD, CARD_W, CARD_H)
                    ctx.restore()
                } catch {
                    ctx.fillStyle = "#1a2535"
                    ctx.fillRect(x, y + PAD, CARD_W, CARD_H)
                }
                x += CARD_W + GAP
            }
            y += rowH
        }

        const dataUrl = canvas.toDataURL("image/png")
        document.getElementById("imageModalImg").src = dataUrl
        document.getElementById("imageModal").style.display = "flex"

    } catch(e) {
        alert("画像生成に失敗しました: " + e.message)
    }

    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>保存`
    btn.disabled = false
}

// 画像読み込みヘルパー
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload  = () => resolve(img)
        img.onerror = () => reject(new Error("画像読み込み失敗: " + src))
        img.src = src
    })
}


// ===== ティア段階設定 =====
const tierSettingsModal = document.getElementById("tierSettingsModal")
let editingRows = []

document.getElementById("openTierSettings").onclick = () => {
    tierData = getTierData()
    editingRows = tierData.rows.map(r => ({ ...r }))
    renderTierSettingsList()
    tierSettingsModal.classList.add("open")
}
document.getElementById("closeTierSettings").onclick = () => tierSettingsModal.classList.remove("open")
tierSettingsModal.onclick = e => { if (e.target === tierSettingsModal) tierSettingsModal.classList.remove("open") }

function renderTierSettingsList() {
    const area = document.getElementById("tierSettingsList")
    area.innerHTML = ""
    editingRows.forEach((row, i) => {
        const el = document.createElement("div")
        el.className = "tierSettingRow"
        el.innerHTML = `
            <input type="color" class="tierColorPick" value="${row.color}" data-i="${i}">
            <input type="text"  class="tierLabelInput" value="${row.label}" data-i="${i}" maxlength="6" placeholder="ラベル">
            <button class="tierDeleteBtn" data-i="${i}">✕</button>
        `
        area.appendChild(el)
    })
    area.querySelectorAll(".tierColorPick").forEach(el => {
        el.oninput = () => { editingRows[el.dataset.i].color = el.value }
    })
    area.querySelectorAll(".tierLabelInput").forEach(el => {
        el.oninput = () => { editingRows[el.dataset.i].label = el.value }
    })
    area.querySelectorAll(".tierDeleteBtn").forEach(el => {
        el.onclick = () => { editingRows.splice(Number(el.dataset.i), 1); renderTierSettingsList() }
    })
}

document.getElementById("addTierRow").onclick = () => {
    editingRows.push({ id: "tier_" + Date.now(), label: "NEW", color: "#888888", cards: [] })
    renderTierSettingsList()
}

document.getElementById("saveTierSettings").onclick = () => {
    tierData.rows = editingRows.map(er => {
        const existing = tierData.rows.find(r => r.id === er.id)
        return { ...er, cards: existing ? existing.cards : [] }
    })
    saveTierData(tierData)
    tierSettingsModal.classList.remove("open")
    renderTierTable()
}
