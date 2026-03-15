let cards = []
let currentSort = { key: "", order: "desc" }

// ===== localStorage =====
function getOwned()     { return JSON.parse(localStorage.getItem("owned") || "[]") }
function getFavorites() { return JSON.parse(localStorage.getItem("favorites") || "[]") }
function saveOwned(a)     { localStorage.setItem("owned", JSON.stringify(a)) }
function saveFavorites(a) { localStorage.setItem("favorites", JSON.stringify(a)) }
function isOwned(cn)    { return getOwned().includes(cn) }
function isFavorite(cn) { return getFavorites().includes(cn) }

function getTierData() {
    const def = {
        rows: [
            { id: "SSS", label: "SSS", color: "#ff4b6e", cards: [] },
            { id: "SS",  label: "SS",  color: "#ff8c42", cards: [] },
            { id: "S",   label: "S",   color: "#f5c842", cards: [] },
            { id: "A",   label: "A",   color: "#7ed957", cards: [] },
            { id: "B",   label: "B",   color: "#00c8ff", cards: [] },
            { id: "C",   label: "C",   color: "#a78bfa", cards: [] },
            { id: "D",   label: "D",   color: "#6b7280", cards: [] },
        ],
        tray: []
    }
    const saved = localStorage.getItem("tierData")
    return saved ? JSON.parse(saved) : def
}
function saveTierData(data) { localStorage.setItem("tierData", JSON.stringify(data)) }


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

        // ティアのトレイ初期化（未配置カードを全部入れる）
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

    // トップバーの表示切り替え
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


// ===== 所持カードページ =====
function renderOwnedPage() {
    document.getElementById("ownedCount").textContent = getOwned().length
    document.getElementById("favCount").textContent   = getFavorites().length
    renderSubList("ownedCardList", getOwned(), "📦 所持カードがありません")
    renderSubList("favCardList",   getFavorites(), "⭐ お気に入りがありません")
}

// ===== お気に入りページ =====
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
document.getElementById("openFilter").onclick = () => { filterModal.style.display = "flex" }
document.getElementById("closeFilter").onclick = () => { filterModal.style.display = "none" }
document.getElementById("applyFilter").onclick = () => { applyFilters(); filterModal.style.display = "none" }
document.getElementById("resetFilter").onclick = () => {
    document.querySelectorAll(".filterButton.active").forEach(b => b.classList.remove("active"))
    document.querySelectorAll(".filterSeries:checked").forEach(c => c.checked = false)
    applyFilters()
}
filterModal.onclick = e => { if (e.target === filterModal) filterModal.style.display = "none" }


// ===== カード拡大モーダル =====
const modal = document.getElementById("modal")
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
    if (selectMode === "owned") saveOwned([...selectTemp])
    else saveFavorites([...selectTemp])
    exitSelectMode()
    const returnPage = selectMode === "owned" ? "pageOwned" : "pageFav"
    // selectModeはexitSelectMode後nullになるので先に判定不可 → 上で処理済み
}

// selectDoneの戻り先を正しく処理
document.getElementById("selectDone").onclick = () => {
    const mode = selectMode
    if (mode === "owned") saveOwned([...selectTemp])
    else saveFavorites([...selectTemp])
    exitSelectMode()
    switchPage(mode === "owned" ? "pageOwned" : "pageFav")
}

document.getElementById("goSelectOwned").onclick  = () => openSelectMode("owned")
document.getElementById("goSelectFav").onclick    = () => openSelectMode("favorites")
document.getElementById("goSelectFav2").onclick   = () => openSelectMode("favorites")


// ===== ティア表 =====
let dragSrc = null   // { cardNumber, fromId }  fromId: "tray" or row.id
let tierData = null

function initTierTray() {
    tierData = getTierData()
    // 全カードのうちどのティア行にも入っていないものをトレイに追加
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
    renderTierTray()
    renderTierRows()
}

function renderTierTray() {
    const area = document.getElementById("tierTrayCards")
    area.innerHTML = ""
    tierData.tray.forEach(cn => {
        const card = cards.find(c => c.cardNumber === cn)
        if (card) area.appendChild(makeTierCard(card, "tray"))
    })
    setupDropZone(area, "tray")
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
            if (card) cardsEl.appendChild(makeTierCard(card, row.id))
        })
        setupDropZone(cardsEl, row.id)
        rowEl.appendChild(cardsEl)
        area.appendChild(rowEl)
    })
}

function makeTierCard(card, fromId) {
    const div = document.createElement("div")
    div.className = "tierCard"
    div.draggable = true
    div.dataset.cardNumber = card.cardNumber
    div.dataset.fromId = fromId
    div.innerHTML = `<img src="${card.image}" loading="lazy" alt="${card.name || ''}">`

    // タップで拡大
    let pressTimer = null
    div.addEventListener("touchstart", () => { pressTimer = setTimeout(() => openModal(card.image), 500) }, { passive: true })
    div.addEventListener("touchend", () => clearTimeout(pressTimer))
    div.addEventListener("touchmove", () => clearTimeout(pressTimer))
    div.onclick = () => openModal(card.image)

    // ドラッグ（PC）
    div.addEventListener("dragstart", e => {
        dragSrc = { cardNumber: card.cardNumber, fromId }
        div.classList.add("dragging")
        e.dataTransfer.effectAllowed = "move"
    })
    div.addEventListener("dragend", () => div.classList.remove("dragging"))

    // タッチドラッグ（スマホ）
    div.addEventListener("touchstart", e => {
        startTouchDrag(e, div, card.cardNumber, fromId)
    }, { passive: false })

    return div
}

function setupDropZone(el, toId) {
    el.addEventListener("dragover", e => { e.preventDefault(); el.classList.add("drag-over") })
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
    // 元から削除
    if (fromId === "tray") {
        tierData.tray = tierData.tray.filter(cn => cn !== cardNumber)
    } else {
        const row = tierData.rows.find(r => r.id === fromId)
        if (row) row.cards = row.cards.filter(cn => cn !== cardNumber)
    }
    // 先に追加
    if (toId === "tray") {
        tierData.tray.push(cardNumber)
    } else {
        const row = tierData.rows.find(r => r.id === toId)
        if (row) row.cards.push(cardNumber)
    }
    saveTierData(tierData)
    renderTierTray()
    renderTierRows()
}


// ===== スマホ タッチドラッグ =====
let touchDragCard = null
let touchClone = null

function startTouchDrag(e, el, cardNumber, fromId) {
    const touch = e.touches[0]
    touchDragCard = { cardNumber, fromId }

    // クローン作成
    touchClone = el.cloneNode(true)
    touchClone.style.cssText = `
        position: fixed; z-index: 9998; pointer-events: none; opacity: 0.85;
        width: ${el.offsetWidth}px; transform: scale(1.1);
        left: ${touch.clientX - el.offsetWidth / 2}px;
        top:  ${touch.clientY - el.offsetHeight / 2}px;
        border-radius: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    `
    document.body.appendChild(touchClone)
    el.style.opacity = "0.3"

    const onMove = ev => {
        const t = ev.touches[0]
        touchClone.style.left = `${t.clientX - el.offsetWidth / 2}px`
        touchClone.style.top  = `${t.clientY - el.offsetHeight / 2}px`

        // ドロップ先ハイライト
        document.querySelectorAll(".tierCards, .tierTrayCards").forEach(z => z.classList.remove("drag-over"))
        touchClone.style.display = "none"
        const target = document.elementFromPoint(t.clientX, t.clientY)
        touchClone.style.display = ""
        const dropZone = target?.closest(".tierCards, .tierTrayCards")
        if (dropZone) dropZone.classList.add("drag-over")
    }

    const onEnd = ev => {
        document.removeEventListener("touchmove", onMove)
        document.removeEventListener("touchend", onEnd)
        touchClone.remove()
        el.style.opacity = ""
        document.querySelectorAll(".tierCards, .tierTrayCards").forEach(z => z.classList.remove("drag-over"))

        const t = ev.changedTouches[0]
        touchClone.style.display = "none"
        const target = document.elementFromPoint(t.clientX, t.clientY)
        touchClone.style.display = ""

        const dropZone = target?.closest(".tierCards")
        const trayZone = target?.closest(".tierTrayCards")
        if (dropZone) {
            const rowEl = dropZone.closest(".tierRow")
            const toId = rowEl?.dataset.id
            if (toId) moveCard(touchDragCard.cardNumber, touchDragCard.fromId, toId)
        } else if (trayZone) {
            moveCard(touchDragCard.cardNumber, touchDragCard.fromId, "tray")
        }
        touchDragCard = null
    }

    document.addEventListener("touchmove", onMove, { passive: false })
    document.addEventListener("touchend", onEnd)
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
    // ラベルのみ更新（カードはそのまま）
    tierData.rows = editingRows.map(er => {
        const existing = tierData.rows.find(r => r.id === er.id)
        return { ...er, cards: existing ? existing.cards : [] }
    })
    saveTierData(tierData)
    tierSettingsModal.classList.remove("open")
    renderTierTable()
}
