let cards = []
let currentSort = { key: "", order: "desc" }

// ===== localStorage =====
function getOwned()     { return JSON.parse(localStorage.getItem("owned") || "[]") }
function getFavorites() { return JSON.parse(localStorage.getItem("favorites") || "[]") }
function saveOwned(arr)     { localStorage.setItem("owned", JSON.stringify(arr)) }
function saveFavorites(arr) { localStorage.setItem("favorites", JSON.stringify(arr)) }
function isOwned(cn)    { return getOwned().includes(cn) }
function isFavorite(cn) { return getFavorites().includes(cn) }

// ===== データ読み込み =====
fetch("data/card.json")
    .then(res => res.json())
    .then(data => {
        cards = data.cards
        displayCards(cards)
        setupSeriesFilter()
        updateProfileBtn()

        createFilterButtons(
            ["アタッカー","ディフェンダー","フィニッシャー","マシン","アイテム","イベント","エネミー"],
            "attributeFilters"
        )
        createFilterButtons(["LLR","LR","PR"], "rarityFilters")
        createFilterButtons(["剣","パンチ","銃"], "weaponFilters")
        createFilterButtons([
            "ツイゲキ","ゲキレツアタック","カウンター","タフネス","サクセンフェイズ",
            "ライダーキック","フォームチェンジ","コマンドラッシュ","ライダーソウル",
            "デッドリーアサルト","ライダーズクロス","クロマティックチェンジ","リベンジストライク"
        ], "abilityFilters")
        createFilterButtons(["通常カード","パラレルカード"], "cardTypeFilters")
        setupSpdFilter()
    })


// ===== フィルターボタン作成 =====
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


// ===== カード表示（メイン一覧） =====
function displayCards(list) {
    const area = document.getElementById("cardList")
    area.innerHTML = ""
    document.getElementById("resultCount").innerHTML =
        `<strong>${list.length}</strong>枚のカードが見つかりました`

    list.forEach(card => {
        const div = document.createElement("div")
        div.className = "card"

        const img = document.createElement("img")
        img.src = card.image
        img.loading = "lazy"
        img.alt = card.name || ""
        div.appendChild(img)

        if (isOwned(card.cardNumber)) {
            const b = document.createElement("span")
            b.className = "card-badge card-badge-own"
            b.textContent = "📦"
            div.appendChild(b)
        }
        if (isFavorite(card.cardNumber)) {
            const b = document.createElement("span")
            b.className = "card-badge card-badge-fav"
            b.textContent = "⭐"
            div.appendChild(b)
        }

        div.onclick = () => openModal(card.image)
        area.appendChild(div)
    })
}


// ===== SPD / シリーズ フィルター =====
function setupSpdFilter() {
    const values = [...new Set(
        cards.map(c => c.stats?.spd).filter(v => v != null)
    )].sort((a, b) => a - b)
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


// ===== 検索 =====
document.getElementById("searchBox").oninput = applyFilters


// ===== 並び替え =====
document.getElementById("sortKey").onchange = function () {
    currentSort.key = this.value
    applyFilters()
}
document.getElementById("sortOrder").onclick = function () {
    if (currentSort.order === "desc") {
        currentSort.order = "asc"
        this.dataset.order = "asc"
        this.querySelector(".sortOrderLabel").textContent = "昇順"
    } else {
        currentSort.order = "desc"
        this.dataset.order = "desc"
        this.querySelector(".sortOrderLabel").textContent = "降順"
    }
    applyFilters()
}

function sortCards(list) {
    if (!currentSort.key) return list
    const key = currentSort.key
    const order = currentSort.order
    const keyMap = {
        atk: ["atk","ATK"], def: ["def","DEF"],
        hp: ["hp","HP"], spd: ["spd","SPD"],
        hissatsu: ["hissatsu","必殺"]
    }
    function getVal(card) {
        for (const k of (keyMap[key] || [])) {
            const v = card.stats?.[k] ?? card[k]
            if (v != null && v !== "") return Number(v)
        }
        return null
    }
    return [...list].sort((a, b) => {
        const va = getVal(a), vb = getVal(b)
        if (va === null && vb === null) return 0
        if (va === null) return 1
        if (vb === null) return -1
        return order === "desc" ? vb - va : va - vb
    })
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


// ===== フィルター適用 =====
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
        if (weapons.length) {
            if (!weapons.some(w => (card.battleType || []).includes(w))) return false
        }
        if (cardTypes.length) {
            const isP = card.cardNumber?.toLowerCase().endsWith("p")
            if (cardTypes.includes("通常カード") && isP) return false
            if (cardTypes.includes("パラレルカード") && !isP) return false
        }
        if (abilities.length) {
            const text = JSON.stringify(card)
            if (!abilities.some(a => text.includes(a))) return false
        }
        if (word && !JSON.stringify(card).toLowerCase().includes(word)) return false
        return true
    })

    displayCards(sortCards(result))
}


// ===== カード拡大モーダル =====
const modal    = document.getElementById("modal")
const modalImg = document.getElementById("modalImg")
let showingBack = false, currentImage = ""

function openModal(image) {
    modal.style.display = "flex"
    modalImg.src = image
    currentImage = image
    showingBack = false
}
modalImg.onclick = e => {
    e.stopPropagation()
    showingBack = !showingBack
    modalImg.src = showingBack
        ? currentImage.replace(".jpg", "_b.jpg")
        : currentImage
}
modal.onclick = () => { modal.style.display = "none" }


// ===== プロフィールページ =====
const profilePage = document.getElementById("profilePage")
let currentProfileTab = "owned"

function updateProfileBtn() {
    const hasData = getOwned().length > 0 || getFavorites().length > 0
    document.getElementById("openProfile").classList.toggle("has-data", hasData)
}

function openProfilePage() {
    document.getElementById("ownedCount").textContent = getOwned().length
    document.getElementById("favCount").textContent   = getFavorites().length
    profilePage.classList.add("open")
    renderProfileTab(currentProfileTab)
}

function closeProfilePage() {
    profilePage.classList.remove("open")
}

function renderProfileTab(tab) {
    currentProfileTab = tab

    // タブのアクティブ切り替え
    document.querySelectorAll(".profileTab").forEach(t => {
        t.classList.toggle("active", t.dataset.tab === tab)
    })

    // 選択ボタンの表示切り替え
    document.getElementById("goSelectOwned").style.display = tab === "owned"     ? "" : "none"
    document.getElementById("goSelectFav").style.display   = tab === "favorites" ? "" : "none"

    const list = tab === "owned" ? getOwned() : getFavorites()
    const area = document.getElementById("profileCardList")
    area.innerHTML = ""

    if (list.length === 0) {
        area.innerHTML = `<div class="profileEmpty">
            ${tab === "owned"
                ? "📦 所持カードがありません<br>下のボタンから登録しよう"
                : "⭐ お気に入りがありません<br>下のボタンから登録しよう"}
        </div>`
        return
    }

    list.forEach(cn => {
        const card = cards.find(c => c.cardNumber === cn)
        if (!card) return
        const div = document.createElement("div")
        div.className = "card"
        div.innerHTML = `<img src="${card.image}" loading="lazy" alt="${card.name || ''}">`
        div.onclick = () => openModal(card.image)
        area.appendChild(div)
    })
}

document.getElementById("openProfile").onclick = openProfilePage
document.getElementById("closeProfile").onclick = closeProfilePage
document.querySelectorAll(".profileTab").forEach(tab => {
    tab.onclick = () => renderProfileTab(tab.dataset.tab)
})


// ===== カード選択モード（メイン一覧を使用） =====
let selectMode = null   // "owned" or "favorites" or null
let selectTemp = new Set()

function openSelectMode(mode) {
    selectMode = mode
    selectTemp = new Set(mode === "owned" ? getOwned() : getFavorites())

    // プロフィールを閉じてメイン一覧へ
    closeProfilePage()

    // bodyにクラスを付与
    document.body.classList.add("select-mode")
    document.body.classList.toggle("select-fav", mode === "favorites")

    // バーとフッターを表示
    document.getElementById("selectBar").style.display = "flex"
    document.getElementById("selectFooter").style.display = "block"
    document.getElementById("selectBarTitle").textContent =
        mode === "owned" ? "所持カードを選択" : "お気に入りを選択"
    updateSelectCount()

    // カードを選択モードで再描画
    renderSelectCards()
}

function exitSelectMode() {
    selectMode = null
    document.body.classList.remove("select-mode", "select-fav")
    document.getElementById("selectBar").style.display    = "none"
    document.getElementById("selectFooter").style.display = "none"
    // 通常表示に戻す
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

        const img = document.createElement("img")
        img.src = card.image
        img.loading = "lazy"
        img.alt = card.name || ""
        div.appendChild(img)

        // チェックマーク
        const check = document.createElement("span")
        check.className = "sel-check"
        check.textContent = "✓"
        div.appendChild(check)

        div.onclick = () => {
            if (selectTemp.has(card.cardNumber)) {
                selectTemp.delete(card.cardNumber)
                div.classList.remove("sel-active")
            } else {
                selectTemp.add(card.cardNumber)
                div.classList.add("sel-active")
            }
            updateSelectCount()
        }

        area.appendChild(div)
    })
}

// キャンセル
document.getElementById("cancelSelect").onclick = exitSelectMode

// 完了
document.getElementById("selectDone").onclick = () => {
    if (selectMode === "owned") saveOwned([...selectTemp])
    else saveFavorites([...selectTemp])
    updateProfileBtn()
    exitSelectMode()
    // プロフィールを開き直して反映
    openProfilePage()
}

// プロフィールの「選択ボタン」
document.getElementById("goSelectOwned").onclick = () => openSelectMode("owned")
document.getElementById("goSelectFav").onclick   = () => openSelectMode("favorites")
