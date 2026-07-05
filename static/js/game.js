// ============================================
// Web Game — Только клавиатурная навигация
// ============================================

const LEVELS_CONFIG = {
    1: {
        background: '/levels/level_1.jpg',
        items: [
            { id: 'pig', file: 'pig.png', x: 10.9, y: 53.7, color: 'red',
              canTake: false, canUse: true, useItem: 'hammer',
              resultItem: 'money', resultMessage: 'Вы разбили копилку и нашли деньги!' }
        ],
        cat: { x: 50, y: 88 }
    },
    2: {
        background: '/levels/level_2.jpg',
        items: [
            { id: 'coffee', file: 'coffee.png', x: 24.6, y: 39.7, color: 'red',
              canTake: true, canUse: false, consumable: true,
              useMessage: 'Вы выпили кофе. Бодрость восстановлена!' },
            { id: 'hammer', file: 'hammer.png', x: 73.9, y: 17.8, color: 'purple',
              canTake: true, canUse: true, consumedOnUse: true }
        ],
        cat: { x: 50, y: 88 }
    },
    3: {
        background: '/levels/level_3.jpg',
        items: [
            { id: 'chest', file: 'chest.png', x: 74.1, y: 64.5, color: 'red',
              canTake: false, canUse: true, useItem: 'key',
              resultMessage: 'Вы открыли сундук ключом!' }
        ],
        cat: { x: 50, y: 88 }
    },
    4: {
        background: '/levels/level_4.jpg',
        items: [
            { id: 'hamster', file: 'hamster.png', x: 77.4, y: 55.8, color: 'red',
              canTake: false, canUse: false,
              thought: 'хочу слушать музыку :( ',
              thoughtAfter: 'тун-ту-туу',
              afterItem: 'disk' },
            { id: 'bass', file: 'bass.png', x: 82.8, y: 56.3, color: 'purple',
              canTake: false, canUse: true, useItem: 'disk',
              resultItem: 'muscase', resultMessage: 'Вы включили музыку! Появился чемоданчик.' }
        ],
        cat: { x: 50, y: 88 }
    },
    5: {
        background: '/levels/level_5.jpg',
        items: [
            { id: 'monkey', file: 'monkey.png', x: 34.2, y: 50.0, color: 'red',
              canTake: false, canUse: true, useItem: 'money',
              thought: 'для покупки нужны деньги или бананы',
              thoughtAfter: 'хорошего дня!',
              resultItem: 'disk', resultMessage: 'Обезьяна обменяла деньги на диск!' }
        ],
        cat: { x: 50, y: 88 }
    }
};

const TOTAL_LEVELS = 5;
const INVENTORY_SIZE = 9;
const LOCK_CODE = '742';

let currentLevel = 1;
let inventory = [];
let selectedSlot = -1;
let gameState = {
    pigSmashed: false,
    chestOpen: false,
    bassActivated: false,
    monkeyPaid: false,
    lockOpened: false,
    gameFinished: false,
    catIntroShown: false,
    hamsterHappy: false,
    consumedItems: []  // ID предметов, которые больше не должны появляться
};

const levelBg = document.getElementById('level-background');
const itemsLayer = document.getElementById('items-layer');
const inventorySlots = document.getElementById('inventory-slots');
const logContent = document.getElementById('log-content');

const lockModal = document.getElementById('lock-modal');
const lockDisplay = document.getElementById('lock-display');
const msgModal = document.getElementById('msg-modal');
const msgText = document.getElementById('msg-text');

let lockInput = '';

// ============================================
// Инициализация
// ============================================
function init() {
    loadLevel(currentLevel);
    initInventory();
    initModals();
    setupKeyboard();

    log('Игра началась! Найдите предметы и решите загадки.');
    log('Используйте стрелки ← → на клавиатуре для перемещения между уровнями.');

    // Cat intro
    if (!gameState.catIntroShown) {
        setTimeout(() => {
            showCatThought('мне нужен друг');
            gameState.catIntroShown = true;
        }, 800);
    }
}

// ============================================
// Клавиатура — единственный способ навигации
// ============================================
function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        // Если открыто модальное окно — не переключаем уровни
        if (!lockModal.classList.contains('hidden')) {
            // Ввод цифр в замок с клавиатуры
            if (e.key >= '0' && e.key <= '9') {
                if (lockInput.length < 3) {
                    lockInput += e.key;
                    updateLockDisplay();
                }
            } else if (e.key === 'Enter') {
                checkLockCode();
            } else if (e.key === 'Escape' || e.key === 'Backspace') {
                closeLockModal();
            }
            return;
        }

        // Навигация между уровнями
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            navigate(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            navigate(1);
        }
    });
}

// ============================================
// Загрузка уровня
// ============================================
function loadLevel(levelNum) {
    const config = LEVELS_CONFIG[levelNum];
    if (!config) return;

    currentLevel = levelNum;

    levelBg.classList.remove('fade-in');
    void levelBg.offsetWidth;
    levelBg.src = config.background;
    levelBg.classList.add('fade-in');

    itemsLayer.innerHTML = '';

    // Предметы уровня
    config.items.forEach(item => {
        if (shouldShowItem(item)) {
            itemsLayer.appendChild(createItemElement(item));
        }
    });

    // muscase появляется после bass
    if (levelNum === 4 && gameState.bassActivated && !gameState.lockOpened) {
        const muscase = {
            id: 'muscase', file: 'muscase.png', x: 82.8, y: 35.0, color: 'purple',
            canTake: false, canUse: true, isLock: true
        };
        itemsLayer.appendChild(createItemElement(muscase));
    }

    // plush появляется после открытия сундука
    if (levelNum === 3 && gameState.chestOpen && !gameState.gameFinished) {
        const plush = {
            id: 'plush', file: 'plush.png', x: 74.1, y: 64.5, color: 'red',
            canTake: false, canUse: false, isPlush: true
        };
        itemsLayer.appendChild(createItemElement(plush));
    }

    // Cat
    if (config.cat) {
        itemsLayer.appendChild(createCatElement(config.cat));
    }

    log('Уровень ' + levelNum);
}

function shouldShowItem(item) {
    // Проверяем, был ли предмет уже использован/собран
    if (gameState.consumedItems.includes(item.id)) return false;
    // Специальные состояния
    if (item.id === 'pig' && gameState.pigSmashed) return false;
    if (item.id === 'monkey' && gameState.monkeyPaid) return false;
    if (item.id === 'muscase' && gameState.lockOpened) return false;
    if (item.id === 'plush' && gameState.gameFinished) return false;
    return true;
}

// ============================================
// Создание элементов
// ============================================
function createItemElement(item) {
    const wrapper = document.createElement('div');
    wrapper.className = 'item-wrapper';
    wrapper.style.left = item.x + '%';
    wrapper.style.top = item.y + '%';
    wrapper.style.transform = 'translate(-50%, -50%)';
    wrapper.dataset.itemId = item.id;

    const glow = document.createElement('div');
    glow.className = 'item-glow ' + (item.color || 'red');
    wrapper.appendChild(glow);

    const img = document.createElement('img');
    img.src = '/static/items/' + item.file;
    img.className = 'item-img';
    img.alt = item.id;
    img.draggable = false;
    wrapper.appendChild(img);

    // Облако мысли
    if (item.thought) {
        const thought = document.createElement('div');
        thought.className = 'thought-bubble';
        thought.id = 'thought-' + item.id;

        const currentThought = (item.id === 'hamster' && gameState.hamsterHappy) ? item.thoughtAfter :
                               (item.id === 'monkey' && gameState.monkeyPaid) ? item.thoughtAfter :
                               item.thought;

        thought.innerHTML = '<span class="thought-text">' + currentThought + '</span>';
        wrapper.appendChild(thought);
    }

    wrapper.addEventListener('click', (e) => {
        e.stopPropagation();
        handleItemClick(item, wrapper);
    });

    return wrapper;
}

function createCatElement(pos) {
    const wrapper = document.createElement('div');
    wrapper.className = 'cat-wrapper';
    wrapper.style.left = pos.x + '%';
    wrapper.style.top = pos.y + '%';
    wrapper.style.transform = 'translate(-50%, -50%)';
    wrapper.style.zIndex = '25';

    const img = document.createElement('img');
    img.src = '/static/cat.png';
    img.className = 'cat-img';
    img.alt = 'cat';
    img.draggable = false;
    wrapper.appendChild(img);

    // Облако мысли cat
    const thought = document.createElement('div');
    thought.className = 'thought-bubble cat-thought';
    thought.id = 'cat-thought';
    thought.style.display = 'none';
    thought.innerHTML = '<span class="thought-text"></span>';
    wrapper.appendChild(thought);

    // plush рядом с cat в конце игры
    if (gameState.gameFinished) {
        const plush = document.createElement('img');
        plush.src = '/static/items/plush.png';
        plush.className = 'plush-beside-cat';
        plush.alt = 'plush';
        wrapper.appendChild(plush);
    }

    return wrapper;
}

function showCatThought(text) {
    const bubble = document.getElementById('cat-thought');
    if (!bubble) return;
    const span = bubble.querySelector('.thought-text');
    if (span) span.textContent = text;
    bubble.style.display = 'block';
    setTimeout(() => { bubble.style.display = 'none'; }, 3000);
}

// ============================================
// Обработка кликов
// ============================================
function handleItemClick(item, element) {
    if (item.isLock) {
        openLockModal();
        return;
    }

    if (item.isPlush) {
        finishGame(element);
        return;
    }

    if (item.canTake && !item.useItem) {
        takeItem(item, element);
        return;
    }

    if (item.canUse && item.useItem) {
        const selectedItem = inventory[selectedSlot];
        if (selectedItem && selectedItem.id === item.useItem) {
            useItemOn(item, selectedItem, element);
        } else {
            const needName = getItemName(item.useItem);
            showMessage('Для взаимодействия нужен: ' + needName + '. Выберите его в инвентаре (клик по слоту).');
        }
        return;
    }

    if (item.canUse && !item.useItem) {
        useItem(item, element);
        return;
    }

    if (item.message) {
        showMessage(item.message);
    }
}

// ============================================
// Инвентарь
// ============================================
function takeItem(item, element) {
    if (inventory.length >= INVENTORY_SIZE) {
        showMessage('Инвентарь полон!');
        return;
    }

    element.classList.add('collecting');
    setTimeout(() => {
        inventory.push({
            id: item.id,
            file: item.file,
            name: getItemName(item.id),
            consumable: item.consumable || false,
            consumedOnUse: item.consumedOnUse || false
        });
        gameState.consumedItems.push(item.id);
        element.remove();
        updateInventory();
        log('Вы подобрали: ' + getItemName(item.id));
    }, 600);
}

function useItemOn(targetItem, usedItem, element) {
    if (usedItem.consumedOnUse || usedItem.consumable) {
        removeFromInventory(selectedSlot);
        selectedSlot = -1;
    }

    if (targetItem.id === 'pig') {
        gameState.pigSmashed = true;
        gameState.consumedItems.push('pig');
        element.classList.add('collecting');
        setTimeout(() => {
            element.remove();
            giveItem('money', 'money.png');
            log(targetItem.resultMessage || 'Копилка разбита!');
        }, 600);
        return;
    }

    if (targetItem.id === 'chest') {
        gameState.chestOpen = true;
        gameState.consumedItems.push('chest');
        showMessage(targetItem.resultMessage || 'Сундук открыт!');
        log('Сундук открыт ключом. Внутри игрушка!');
        setTimeout(() => loadLevel(currentLevel), 800);
        return;
    }

    if (targetItem.id === 'bass') {
        gameState.bassActivated = true;
        gameState.hamsterHappy = true;
        gameState.consumedItems.push('disk');  // диск использован
        showMessage(targetItem.resultMessage || 'Музыка заиграла!');
        log('Музыкальный центр включен. Появился чемоданчик!');
        const hamsterThought = document.getElementById('thought-hamster');
        if (hamsterThought) {
            const hamsterItem = LEVELS_CONFIG[4].items.find(i => i.id === 'hamster');
            if (hamsterItem && hamsterItem.thoughtAfter) {
                hamsterThought.querySelector('.thought-text').textContent = hamsterItem.thoughtAfter;
            }
        }
        setTimeout(() => loadLevel(currentLevel), 500);
        return;
    }

    if (targetItem.id === 'monkey') {
        gameState.monkeyPaid = true;
        gameState.consumedItems.push('monkey');
        gameState.consumedItems.push('money');  // деньги потрачены
        element.classList.add('collecting');
        setTimeout(() => {
            element.remove();
            giveItem('disk', 'disk.png');
            log(targetItem.resultMessage || 'Обмен совершен!');
            const monkeyThought = document.getElementById('thought-monkey');
            if (monkeyThought) {
                const monkeyItem = LEVELS_CONFIG[5].items.find(i => i.id === 'monkey');
                if (monkeyItem && monkeyItem.thoughtAfter) {
                    monkeyThought.querySelector('.thought-text').textContent = monkeyItem.thoughtAfter;
                }
            }
        }, 600);
        return;
    }
}

function useItem(item, element) {
    if (item.consumable) {
        showMessage(item.useMessage || 'Предмет использован.');
        const idx = inventory.findIndex(i => i.id === item.id);
        if (idx >= 0) {
            gameState.consumedItems.push(item.id);
            removeFromInventory(idx);
        }
    }
}

function finishGame(plushElement) {
    gameState.gameFinished = true;
    gameState.consumedItems.push('plush');
    plushElement.classList.add('collecting');
    setTimeout(() => {
        plushElement.remove();
        loadLevel(currentLevel);
        setTimeout(() => {
            showCatThought('ура, мой новый друг!');
            setTimeout(() => {
                showMessage('Поздравляем! Вы прошли игру! Кот нашёл друга!');
            }, 3500);
        }, 500);
    }, 600);
}

// ============================================
// Инвентарь UI
// ============================================
function initInventory() {
    inventorySlots.innerHTML = '';
    for (let i = 0; i < INVENTORY_SIZE; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.dataset.index = i;
        slot.addEventListener('click', () => selectSlot(i));
        inventorySlots.appendChild(slot);
    }
}

function updateInventory() {
    const slots = inventorySlots.querySelectorAll('.inventory-slot');
    slots.forEach((slot, i) => {
        slot.innerHTML = '';
        slot.classList.remove('filled', 'selected');
        if (inventory[i]) {
            slot.classList.add('filled');
            const img = document.createElement('img');
            img.src = '/static/items/' + inventory[i].file;
            img.alt = inventory[i].name;
            slot.appendChild(img);
        }
        if (i === selectedSlot) slot.classList.add('selected');
    });
}

function selectSlot(index) {
    if (selectedSlot === index) selectedSlot = -1;
    else if (inventory[index]) selectedSlot = index;
    else selectedSlot = -1;
    updateInventory();
}

function removeFromInventory(index) {
    inventory.splice(index, 1);
    if (selectedSlot === index) selectedSlot = -1;
    else if (selectedSlot > index) selectedSlot--;
    updateInventory();
}

function giveItem(id, file) {
    if (inventory.length >= INVENTORY_SIZE) {
        showMessage('Инвентарь полон!');
        return;
    }
    inventory.push({
        id: id, file: file, name: getItemName(id),
        consumable: false, consumedOnUse: false
    });
    updateInventory();
    log('Вы получили: ' + getItemName(id));
}

// ============================================
// Кодовый замок
// ============================================
function initModals() {
    document.querySelectorAll('.keypad-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const num = btn.dataset.num;
            if (num !== undefined) {
                if (lockInput.length < 3) {
                    lockInput += num;
                    updateLockDisplay();
                }
            } else if (btn.classList.contains('keypad-clear')) {
                lockInput = '';
                updateLockDisplay();
            } else if (btn.classList.contains('keypad-enter')) {
                checkLockCode();
            }
        });
    });
    document.getElementById('lock-close').addEventListener('click', closeLockModal);
    document.getElementById('msg-close').addEventListener('click', () => {
        msgModal.classList.add('hidden');
    });
}

function openLockModal() {
    lockInput = '';
    updateLockDisplay();
    lockModal.classList.remove('hidden');
}
function closeLockModal() {
    lockModal.classList.add('hidden');
    lockInput = '';
}
function updateLockDisplay() {
    let display = '';
    for (let i = 0; i < 3; i++) {
        display += (i < lockInput.length) ? lockInput[i] : '_';
        if (i < 2) display += ' ';
    }
    lockDisplay.textContent = display;
}
function checkLockCode() {
    if (lockInput === LOCK_CODE) {
        gameState.lockOpened = true;
        gameState.consumedItems.push('muscase');
        closeLockModal();
        showMessage('Код верный! Замок открыт. Вы получили ключ.');
        giveItem('key', 'key.png');
        loadLevel(currentLevel);
    } else {
        lockDisplay.classList.add('shake');
        setTimeout(() => lockDisplay.classList.remove('shake'), 500);
        showMessage('Неверный код. Попробуйте еще раз.');
        lockInput = '';
        setTimeout(updateLockDisplay, 600);
    }
}

// ============================================
// Сообщения и лог
// ============================================
function showMessage(text) {
    msgText.textContent = text;
    msgModal.classList.remove('hidden');
}
function log(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    const time = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    entry.innerHTML = '<span class="log-time">' + time + '</span>' + message;
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
}

// ============================================
// Навигация — только клавиатура
// ============================================
function navigate(direction) {
    const newLevel = currentLevel + direction;
    if (newLevel >= 1 && newLevel <= TOTAL_LEVELS) {
        loadLevel(newLevel);
    }
}

// ============================================
// Утилиты
// ============================================
function getItemName(id) {
    const names = {
        pig: 'Копилка', coffee: 'Кофе', hammer: 'Молоток',
        chest: 'Сундук', hamster: 'Хомяк', bass: 'Муз. центр',
        monkey: 'Обезьяна', money: 'Деньги', disk: 'Диск',
        key: 'Ключ', muscase: 'Чемоданчик', plush: 'Игрушка'
    };
    return names[id] || id;
}

document.addEventListener('DOMContentLoaded', init);
