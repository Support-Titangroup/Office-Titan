import { auth, provider, db } from './firebase.js'
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth'
import { ref, set, onValue, onDisconnect, push } from 'firebase/database'
import Phaser from 'phaser'

let game = null
let playerNameplate, chatBubble, chatBubbleBg, chatBubbleTimer

// ─── Step 1: Login ───
document.getElementById('login-btn').addEventListener('click', async () => {
  try { await signInWithPopup(auth, provider) }
  catch (e) { console.error(e) }
})

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.currentUser = user
    document.getElementById('login-screen').style.display = 'none'
    if (!game) showCharacterSelect()
  } else {
    document.getElementById('login-screen').style.display = 'flex'
  }
})

// ─── Step 2: Character Select ───
function showCharacterSelect() {
  const screen = document.createElement('div')
  screen.id = 'char-select'
  screen.style.cssText = `
    position:fixed; inset:0; background:#1a1a2e;
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    font-family:sans-serif; z-index:998;
  `
  screen.innerHTML = `
    <h2 style="color:white; margin-bottom:24px;">สร้างตัวละครของคุณ</h2>
    <div style="margin-bottom:20px;">
      <label style="color:#aaa; font-size:13px;">ชื่อของคุณ</label><br>
      <input id="player-name" placeholder="ใส่ชื่อ..." maxlength="20" style="
        margin-top:8px; background:#2a2a3e; border:1px solid #4361ee;
        border-radius:8px; color:white; padding:10px 16px;
        font-size:15px; outline:none; width:260px;
      "/>
    </div>
    <div style="margin-bottom:28px;">
      <label style="color:#aaa; font-size:13px; display:block; margin-bottom:12px;">เลือกตัวละคร</label>
      <div style="display:flex; gap:16px;">
        <div class="char-btn" data-char="male" style="background:#2a2a3e; border:2px solid #4361ee; border-radius:12px; padding:16px; cursor:pointer; text-align:center;">
          <img src="/assets/characters/body/male/character_malePerson_idle.png" style="height:80px; object-fit:contain;">
          <div style="color:white; font-size:12px; margin-top:8px;">ชาย</div>
        </div>
        <div class="char-btn" data-char="female" style="background:#2a2a3e; border:2px solid #333; border-radius:12px; padding:16px; cursor:pointer; text-align:center;">
          <img src="/assets/characters/body/female/character_femalePerson_idle.png" style="height:80px; object-fit:contain;">
          <div style="color:white; font-size:12px; margin-top:8px;">หญิง</div>
        </div>
        <div class="char-btn" data-char="robot" style="background:#2a2a3e; border:2px solid #333; border-radius:12px; padding:16px; cursor:pointer; text-align:center;">
          <img src="/assets/characters/body/robot/character_robot_idle.png" style="height:80px; object-fit:contain;">
          <div style="color:white; font-size:12px; margin-top:8px;">หุ่นยนต์</div>
        </div>
      </div>
    </div>
    <button id="enter-btn" style="background:#4361ee; color:white; border:none; padding:12px 36px; border-radius:10px; font-size:15px; cursor:pointer;">
      เข้าสู่ออฟฟิศ →
    </button>
  `
  document.body.appendChild(screen)

  let selectedChar = 'male'
  document.querySelectorAll('.char-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.char-btn').forEach(b => b.style.borderColor = '#333')
      btn.style.borderColor = '#4361ee'
      selectedChar = btn.dataset.char
    })
  })

  document.getElementById('enter-btn').addEventListener('click', () => {
    const name = document.getElementById('player-name').value.trim() || 'ไม่ระบุชื่อ'
    window.playerName = name
    window.playerChar = selectedChar
    screen.remove()
    launchGame()
  })
}

// ─── Step 3: Launch Game ───
function launchGame() {
  const chatPanel = document.createElement('div')
  chatPanel.style.cssText = `
    position:fixed; right:0; top:0; width:220px; height:100vh;
    background:#1a1a2e; border-left:1px solid #333;
    display:flex; flex-direction:column; font-family:sans-serif; z-index:10;
  `
  chatPanel.innerHTML = `
    <div style="padding:10px 12px; font-size:13px; font-weight:600; color:#aaa; border-bottom:1px solid #333;">
      💬 ห้องแชท
    </div>
    <div id="chat-messages" style="flex:1; overflow-y:auto; padding:8px; display:flex; flex-direction:column; gap:6px;"></div>
    <div style="padding:8px; border-top:1px solid #333; display:flex; gap:6px;">
      <input id="chat-input" placeholder="พิมพ์ข้อความ..." style="
        flex:1; background:#2a2a3e; border:1px solid #444; border-radius:6px;
        color:white; padding:6px 8px; font-size:12px; outline:none;
      "/>
      <button id="chat-send" style="
        background:#4361ee; color:white; border:none; border-radius:6px;
        padding:6px 10px; font-size:12px; cursor:pointer;
      ">ส่ง</button>
    </div>
  `
  document.body.appendChild(chatPanel)

  const modal = document.createElement('div')
  modal.id = 'office-modal'
  modal.style.cssText = `
    display:none; position:fixed; inset:0; background:rgba(0,0,0,0.6);
    align-items:center; justify-content:center; z-index:100;
  `
  modal.innerHTML = `
    <div style="background:#1e1e3f; border:1px solid #4361ee; border-radius:12px;
      width:420px; max-height:80vh; overflow-y:auto; padding:20px; color:white;">
      <div style="display:flex; justify-content:space-between; margin-bottom:16px;">
        <span id="modal-title" style="font-weight:600; font-size:15px;"></span>
        <button onclick="document.getElementById('office-modal').style.display='none'"
          style="background:none;border:none;color:#aaa;font-size:18px;cursor:pointer;">✕</button>
      </div>
      <div id="modal-body"></div>
    </div>
  `
  document.body.appendChild(modal)
  game = new Phaser.Game(config)
}

// ─── Phaser Config ───
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth - 220,
  height: window.innerHeight,
  backgroundColor: '#1a1a2e',
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: { preload, create, update }
}

// ─── Helpers ───
function addChatMessage(name, text) {
  const messages = document.getElementById('chat-messages')
  const msg = document.createElement('div')
  msg.style.cssText = 'font-size:12px; color:#eee; line-height:1.4;'
  msg.innerHTML = `<span style="color:#4361ee; font-weight:600;">${name}</span> ${text}`
  messages.appendChild(msg)
  messages.scrollTop = messages.scrollHeight
}

function sendMessage(scene, text) {
  if (!text.trim()) return
  push(ref(db, 'messages'), {
    uid: window.currentUser.uid,  // ← เพิ่ม uid
    name: window.playerName,
    text: text,
    time: Date.now()
  })
  showChatBubble(scene, text)
}

function showChatBubble(scene, text) {
  if (chatBubbleBg) chatBubbleBg.destroy()
  if (chatBubble) chatBubble.destroy()
  if (chatBubbleTimer) chatBubbleTimer.remove()
  const shortText = text.length > 20 ? text.substring(0, 20) + '...' : text
  chatBubble = scene.add.text(0, 0, shortText, { fontSize: '11px', color: '#000', padding: { x: 6, y: 4 } }).setDepth(10)
  const bw = chatBubble.width + 4, bh = chatBubble.height + 4
  chatBubbleBg = scene.add.graphics().setDepth(9)
  chatBubbleBg.fillStyle(0xffffff, 0.95)
  chatBubbleBg.fillRoundedRect(0, 0, bw, bh, 6)
  chatBubbleTimer = scene.time.delayedCall(3000, () => {
    if (chatBubble) chatBubble.destroy()
    if (chatBubbleBg) chatBubbleBg.destroy()
    chatBubble = null; chatBubbleBg = null
  })
}

// ─── Phaser Scenes ───
function preload() {
  const char = window.playerChar || 'male'
  const prefix = char === 'male' ? 'character_malePerson'
               : char === 'female' ? 'character_femalePerson'
               : 'character_robot'
  this.load.image('body_idle', `/assets/characters/body/${char}/${prefix}_idle.png`)
  for (let i = 0; i < 8; i++)
    this.load.image(`body_walk${i}`, `/assets/characters/body/${char}/${prefix}_walk${i}.png`)
  this.load.image('body_kick', `/assets/characters/body/${char}/${prefix}_kick.png`)
}

function create() {
  const W = this.scale.width, H = this.scale.height
  const graphics = this.add.graphics()
  graphics.fillStyle(0x2d2b55)
  graphics.fillRect(0, 0, W, H)
  graphics.lineStyle(1, 0x3a3870, 0.5)
  for (let x = 0; x < W; x += 32) graphics.lineBetween(x, 0, x, H)
  for (let y = 0; y < H; y += 32) graphics.lineBetween(0, y, W, y)

  this.walkFrame = 0; this.walkTimer = 0
  this.isWalking = false; this.isKicking = false
  this.syncTimer = 0

  this.objects = [
    { x: 200, y: 250, emoji: '📋', label: 'Task Board', type: 'board' },
    { x: 400, y: 250, emoji: '📅', label: 'ปฏิทิน',    type: 'calendar' },
    { x: 600, y: 250, emoji: '🗄️', label: 'เอกสาร',   type: 'drive' },
  ]
  this.officeObjects = this.physics.add.staticGroup()
  this.objects.forEach(obj => {
    const body = this.officeObjects.create(obj.x, obj.y, null)
    body.setSize(32, 32); body.setVisible(false); body.refreshBody()
    const box = this.add.rectangle(obj.x, obj.y, 64, 64, 0x2a2a5a).setStrokeStyle(2, 0x4361ee).setInteractive({ cursor: 'pointer' })
    this.add.text(obj.x, obj.y - 8, obj.emoji, { fontSize: '24px' }).setOrigin(0.5)
    this.add.text(obj.x, obj.y + 22, obj.label, { fontSize: '10px', color: '#aaa' }).setOrigin(0.5)
    box.on('pointerdown', () => openModal(obj.type))
    box.on('pointerover', () => box.setFillColor(0x3a3a7a))
    box.on('pointerout',  () => box.setFillColor(0x2a2a5a))
  })

  const px = 300, py = 400
  this.bodySprite = this.add.image(px, py, 'body_idle').setScale(0.6).setDepth(5)
  this.player = this.physics.add.sprite(px, py, 'body_idle').setAlpha(0).setScale(0.6).setCollideWorldBounds(true)
  this.physics.add.collider(this.player, this.officeObjects)

  // ─── Multiplayer ───
  const uid = window.currentUser.uid
  const playerRef = ref(db, `players/${uid}`)
  onDisconnect(playerRef).remove()
  this.otherPlayers = {}

  onValue(ref(db, 'players'), (snapshot) => {
  const data = snapshot.val() || {}
  Object.entries(data).forEach(([id, p]) => {
    if (id === uid) return

    if (!this.otherPlayers[id]) {
      // หา texture key ตาม char ของคนนั้น
      const prefix = p.char === 'male' ? 'character_malePerson'
                   : p.char === 'female' ? 'character_femalePerson'
                   : 'character_robot'
      const textureKey = `idle_${p.char}`

      // โหลด texture ถ้ายังไม่มี
      if (!this.textures.exists(textureKey)) {
        this.load.image(textureKey, `/assets/characters/body/${p.char}/${prefix}_idle.png`)
        this.load.once('complete', () => {
          const sprite = this.add.image(p.x, p.y, textureKey).setScale(0.6).setDepth(5)
          const label = this.add.text(p.x, p.y, p.name, {
            fontSize: '12px', color: '#fff',
            backgroundColor: '#e74c3c',
            padding: { x: 6, y: 2 }
          }).setDepth(10).setOrigin(0.5, 1)
          this.otherPlayers[id] = { sprite, label }
        })
        this.load.start()
      } else {
        const sprite = this.add.image(p.x, p.y, textureKey).setScale(0.6).setDepth(5)
        const label = this.add.text(p.x, p.y, p.name, {
          fontSize: '12px', color: '#fff',
          backgroundColor: '#e74c3c',
          padding: { x: 6, y: 2 }
        }).setDepth(10).setOrigin(0.5, 1)
        this.otherPlayers[id] = { sprite, label }
      }
    } else {
      const op = this.otherPlayers[id]
      op.sprite.setPosition(p.x, p.y)
      op.sprite.setFlipX(p.flipX)
      op.label.setPosition(p.x, p.y - op.sprite.displayHeight / 2 - 8)
    }
  })

  Object.keys(this.otherPlayers).forEach(id => {
    if (!data[id]) {
      this.otherPlayers[id].sprite.destroy()
      this.otherPlayers[id].label.destroy()
      delete this.otherPlayers[id]
    }
  })
})
// ฟัง chat messages
onValue(ref(db, 'messages'), (snapshot) => {
  const data = snapshot.val() || {}
  const messages = document.getElementById('chat-messages')
  if (!messages) return
  
  const allMsgs = Object.entries(data)
    .map(([key, msg]) => ({ key, ...msg }))
    .sort((a, b) => a.time - b.time)
  
  // อัปเดต chat panel
  messages.innerHTML = ''
  allMsgs.slice(-50).forEach(msg => {
    const div = document.createElement('div')
    div.style.cssText = 'font-size:12px; color:#eee; line-height:1.4;'
    div.innerHTML = `<span style="color:#4361ee; font-weight:600;">${msg.name}</span> ${msg.text}`
    messages.appendChild(div)
  })
  messages.scrollTop = messages.scrollHeight

  // แสดง bubble บนหัวคนอื่น
  const latest = allMsgs[allMsgs.length - 1]
  if (!latest) return

  const now = Date.now()
  if (now - latest.time > 5000) return  // เก่ากว่า 5 วิ ไม่แสดง

  // หา otherPlayer ที่ส่งข้อความ
  Object.entries(this.otherPlayers).forEach(([id, op]) => {
  if (id === latest.uid) {
      // ลบ bubble เก่า
      if (op.bubble) { op.bubble.destroy(); op.bubbleBg?.destroy() }

      const shortText = latest.text.length > 20 ? latest.text.substring(0, 20) + '...' : latest.text
      op.bubble = this.add.text(0, 0, shortText, {
        fontSize: '11px', color: '#000', padding: { x: 6, y: 4 }
      }).setDepth(11)
      op.bubbleBg = this.add.graphics().setDepth(10)
      op.bubbleBg.fillStyle(0xffffff, 0.95)
      op.bubbleBg.fillRoundedRect(0, 0, op.bubble.width + 4, op.bubble.height + 4, 6)

      // ลบหลัง 3 วิ
      this.time.delayedCall(3000, () => {
        if (op.bubble) { op.bubble.destroy(); op.bubble = null }
        if (op.bubbleBg) { op.bubbleBg.destroy(); op.bubbleBg = null }
      })
    }
  })
})
  this.input.keyboard.disableGlobalCapture()
  this.keyE   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E)
  this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
  this.keyK   = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K)
  this.cursors = this.input.keyboard.createCursorKeys()

  playerNameplate = this.add.text(0, 0, window.playerName || 'คุณ', {
    fontSize: '12px', color: '#ffffff', backgroundColor: '#4361ee', padding: { x: 6, y: 2 }
  }).setDepth(10).setOrigin(0.5, 1)

  const input = document.getElementById('chat-input')
  const sendBtn = document.getElementById('chat-send')
  const scene = this
  sendBtn.addEventListener('click', () => { sendMessage(scene, input.value); input.value = '' })
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { sendMessage(scene, input.value); input.value = '' }
    e.stopPropagation()
  })
  addChatMessage('ระบบ', `ยินดีต้อนรับ ${window.playerName || ''}!`)
}

function update() {
  const speed = 300
  this.player.setVelocity(0)
  this.isWalking = false

  if (this.cursors.left.isDown)       { this.player.setVelocityX(-speed); this.bodySprite.setFlipX(true);  if (!this.isKicking) this.isWalking = true }
  else if (this.cursors.right.isDown) { this.player.setVelocityX(speed);  this.bodySprite.setFlipX(false); if (!this.isKicking) this.isWalking = true }
  else if (this.cursors.up.isDown)    { this.player.setVelocityY(-speed); if (!this.isKicking) this.isWalking = true }
  else if (this.cursors.down.isDown)  { this.player.setVelocityY(speed);  if (!this.isKicking) this.isWalking = true }

  if (this.isWalking && !this.isKicking) {
    this.walkTimer++
    if (this.walkTimer >= 6) { this.walkTimer = 0; this.walkFrame = (this.walkFrame + 1) % 8; this.bodySprite.setTexture(`body_walk${this.walkFrame}`) }
  } else if (!this.isKicking) {
    this.walkFrame = 0; this.walkTimer = 0; this.bodySprite.setTexture('body_idle')
  }

  this.bodySprite.setPosition(this.player.x, this.player.y)
  playerNameplate.setPosition(this.player.x, this.player.y - this.bodySprite.displayHeight / 2 - 8)

  if (chatBubble && chatBubbleBg) {
    const bx = this.player.x - chatBubble.width / 2 - 2
    const by = this.player.y - this.bodySprite.displayHeight / 2 - chatBubble.height - 40
    chatBubbleBg.setPosition(bx, by); chatBubble.setPosition(bx + 2, by + 2)
  }

  if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
    const near = this.objects.find(obj => Phaser.Math.Distance.Between(this.player.x, this.player.y, obj.x, obj.y) < 80)
    if (near) openModal(near.type)
  }
  if (Phaser.Input.Keyboard.JustDown(this.keyESC)) document.getElementById('office-modal').style.display = 'none'
  if (Phaser.Input.Keyboard.JustDown(this.keyK)) {
    this.isKicking = true
    this.bodySprite.setTexture('body_kick')
    this.time.delayedCall(1200, () => { this.isKicking = false; this.bodySprite.setTexture('body_idle') })
  }

  // ─── Sync position ───
  this.syncTimer++
  if (this.syncTimer >= 6) {
    this.syncTimer = 0
    set(ref(db, `players/${window.currentUser.uid}`), {
      name: window.playerName,
      char: window.playerChar,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      flipX: this.bodySprite.flipX
    })
  }
  // sync bubble คนอื่น
Object.values(this.otherPlayers).forEach(op => {
  if (op.bubble && op.bubbleBg && op.sprite) {
    const bx = op.sprite.x - op.bubble.width / 2 - 2
    const by = op.sprite.y - op.sprite.displayHeight / 2 - op.bubble.height - 40
    op.bubbleBg.setPosition(bx, by)
    op.bubble.setPosition(bx + 2, by + 2)
  }
})
}

// ─── Mock Data ───
const MOCK_TASKS = [
  { title: 'ออกแบบ UI Dashboard', tag: 'กำลังทำ',    color: '#4361ee' },
  { title: 'ประชุม Weekly Sync',  tag: 'รอดำเนินการ', color: '#f9ab00' },
  { title: 'ส่งรายงาน Q2',       tag: 'เร่งด่วน',    color: '#d93025' },
]
const MOCK_EVENTS = [
  { time: '10:00', title: 'Weekly Sync', who: 'ทีมพัฒนา' },
  { time: '14:00', title: 'Demo Day',    who: 'ผู้บริหาร' },
]
const MOCK_FILES = [
  { name: 'รายงาน Q2 2025.pdf',     icon: '📄' },
  { name: 'Design System v3.fig',   icon: '🎨' },
  { name: 'Meeting Notes Jun.docx', icon: '📝' },
]

window.openModal = function(type) {
  const modal = document.getElementById('office-modal')
  const title = document.getElementById('modal-title')
  const body  = document.getElementById('modal-body')
  modal.style.display = 'flex'
  if (type === 'board') {
    title.textContent = '📋 Task Board'
    body.innerHTML = MOCK_TASKS.map(t => `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #333;"><span style="width:8px;height:8px;border-radius:50%;background:${t.color};flex-shrink:0;"></span><span style="flex:1;font-size:13px;">${t.title}</span><span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${t.color}33;color:${t.color};">${t.tag}</span></div>`).join('')
  }
  if (type === 'calendar') {
    title.textContent = '📅 ตารางวันนี้'
    body.innerHTML = MOCK_EVENTS.map(e => `<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #333;align-items:center;"><div style="color:#4361ee;font-weight:600;min-width:44px;">${e.time}</div><div><div style="font-size:13px;">${e.title}</div><div style="font-size:11px;color:#aaa;">${e.who}</div></div></div>`).join('')
  }
  if (type === 'drive') {
    title.textContent = '🗄️ เอกสารล่าสุด'
    body.innerHTML = MOCK_FILES.map(f => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #333;"><span style="font-size:20px;">${f.icon}</span><span style="font-size:13px;">${f.name}</span></div>`).join('')
  }
}