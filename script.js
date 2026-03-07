let cards = []
let currentSort = { key: "", order: "desc" }

fetch("data/card.json")
    .then(res => res.json())
    .then(data => {
        cards = data.cards
        displayCards(cards)
        setupSeriesFilter()

        createFilterButtons(
            ["アタッカー","ディフェンダー","フィニッシャー","マシン","アイテム","イベント","エネミー"],
            "attributeFilters"
        )
        createFilterButtons(
            ["LLR","LR","PR"],
            "rarityFilters"
        )
        createFilterButtons(
            ["剣","パンチ","銃"],
            "weaponFilters"
        )
        createFilterButtons(
            [
                "ツイゲキ","ゲキレツアタック","カウンター","タフネス","サクセンフェイズ",
                "ライダーキック","フォームチェンジ","コマンドラッシュ","ライダーソウル",
                "デッドリーアサルト","ライダーズクロス","クロマティックチェンジ","リベンジストライク"
            ],
            "abilityFilters"
        )
        createFilterButtons(
            ["通常カード","パラレルカード"],
            "cardTypeFilters"
        )
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


// ===== カード表示 =====
function displayCards(list) {
    const area = document.getElementById("cardList")
    area.innerHTML = ""

    const count = document.getElementById("resultCount")
    count.innerHTML = `<strong>${list.length}</strong>枚のカードが見つかりました`

    list.forEach(card => {
        const div = document.createElement("div")
        div.className = "card"
        div.innerHTML = `<img src="${card.image}" loading="lazy" alt="${card.name || ''}">`
        div.onclick = () => openModal(card.image)
        area.appendChild(div)
    })
}


// ===== シリーズフィルター =====
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


// ===== 検索ボックス =====
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

    // カードのステータス値を取得するヘルパー
    function getStatValue(card) {
        // card.stats.atk, card.atk, card.ATK など複数のパターンに対応
        const keys = {
            atk: ["atk","ATK","コウゲキ","attack"],
            def: ["def","DEF","ボウギョ","defense"],
            hp:  ["hp","HP","タイリョク","health"],
            spd: ["spd","SPD","スピード","speed"],
            hissatsu: ["hissatsu","必殺","ひっさつ","special"]
        }
        const candidates = keys[key] || []
        for (const k of candidates) {
            const v = card.stats?.[k] ?? card[k]
            if (v !== undefined && v !== null && v !== "") return Number(v)
        }
        return null
    }

    return [...list].sort((a, b) => {
        const va = getStatValue(a)
        const vb = getStatValue(b)

        // 値がないカードは末尾へ
        if (va === null && vb === null) return 0
        if (va === null) return 1
        if (vb === null) return -1

        return order === "desc" ? vb - va : va - vb
    })
}


// ===== フィルターモーダル =====
const filterModal = document.getElementById("filterModal")

document.getElementById("openFilter").onclick = () => {
    filterModal.style.display = "flex"
}
document.getElementById("closeFilter").onclick = () => {
    filterModal.style.display = "none"
}
document.getElementById("applyFilter").onclick = () => {
    applyFilters()
    filterModal.style.display = "none"
}
document.getElementById("resetFilter").onclick = () => {
    document.querySelectorAll(".filterButton.active").forEach(b => b.classList.remove("active"))
    document.querySelectorAll(".filterSeries:checked").forEach(c => c.checked = false)
    applyFilters()
}

// モーダル外クリックで閉じる
filterModal.onclick = (e) => {
    if (e.target === filterModal) filterModal.style.display = "none"
}


// ===== フィルター適用 =====
function applyFilters() {
    const attributes = [...document.querySelectorAll("#attributeFilters .active")].map(e => e.dataset.value)
    const rarities   = [...document.querySelectorAll("#rarityFilters .active")].map(e => e.dataset.value)
    const weapons    = [...document.querySelectorAll("#weaponFilters .active")].map(e => e.dataset.value)
    const abilities  = [...document.querySelectorAll("#abilityFilters .active")].map(e => e.dataset.value)
    const cardTypes  = [...document.querySelectorAll("#cardTypeFilters .active")].map(e => e.dataset.value)
    const series     = [...document.querySelectorAll(".filterSeries:checked")].map(e => e.value)
    const word       = document.getElementById("searchBox").value.toLowerCase()

    let result = cards.filter(card => {
        if (attributes.length && !attributes.includes(card.attribute)) return false
        if (rarities.length && !rarities.includes(card.rarity)) return false
        if (series.length && !series.includes(card.series)) return false

        if (weapons.length) {
            const text = JSON.stringify(card)
            if (!weapons.some(w => text.includes(w))) return false
        }

        if (cardTypes.length) {
            const isParallel = card.cardNumber && card.cardNumber.toLowerCase().endsWith("p")
            if (cardTypes.includes("通常カード") && isParallel) return false
            if (cardTypes.includes("パラレルカード") && !isParallel) return false
        }

        if (abilities.length) {
            const text = JSON.stringify(card)
            if (!abilities.some(a => text.includes(a))) return false
        }

        if (word) {
            const text = JSON.stringify(card).toLowerCase()
            if (!text.includes(word)) return false
        }

        return true
    })

    result = sortCards(result)
    displayCards(result)
}


// ===== カード拡大モーダル =====
const modal    = document.getElementById("modal")
const modalImg = document.getElementById("modalImg")
let showingBack  = false
let currentImage = ""

function openModal(image) {
    modal.style.display = "flex"
    modalImg.src = image
    currentImage = image
    showingBack  = false
}

modalImg.onclick = (e) => {
    e.stopPropagation()
    if (!showingBack) {
        modalImg.src = currentImage.replace(".jpg", "_b.jpg")
        showingBack = true
    } else {
        modalImg.src = currentImage
        showingBack = false
    }
}

modal.onclick = () => {
    modal.style.display = "none"
}