import makeWASocket, { useMultiFileAuthState } from "@whiskeysockets/baileys"
import pino from "pino"
import fs from "fs-extra"
import { createUser, ships, quest, raid, repair, pvp, bossFight, cooldown } from "./lenwy.js"

const OWNER = "6282210897853"
const DB_PATH = "./database.json"

if (!fs.existsSync(DB_PATH)) fs.writeJsonSync(DB_PATH, {})

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session")

    const sock = makeWASocket({
        logger: pino({ level: "silent" }),
        auth: state
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return

        const from = msg.key.remoteJid
        const sender = msg.key.participant || msg.key.remoteJid
        const senderNumber = sender.split("@")[0]

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        if (!text) return

        let users = await fs.readJson(DB_PATH)

        if (text === "!start") {
            if (!users[senderNumber]) {
                users[senderNumber] = createUser()
                await fs.writeJson(DB_PATH, users)
                return sock.sendMessage(from, { text: "⚓ Kamu resmi jadi Pirate!" })
            }
        }

        if (!users[senderNumber]) return
        const user = users[senderNumber]

        // PROFILE
        if (text === "!profile") {
            return sock.sendMessage(from, {
                text: `
💰 Gold: ${user.uang}
🎖 Level: ${user.level}
⚓ Crew: ${user.crew}
🚢 Kapal: ${user.kapal ? user.kapal.name : "Belum punya"}
`
            })
        }

        // QUEST
        if (text === "!quest") {
            if (cooldown(user)) return sock.sendMessage(from, { text: "Cooldown 10 detik." })
            const result = quest(user)
            await fs.writeJson(DB_PATH, users)
            return sock.sendMessage(from, { text: `🏴 Quest +${result.gold} Gold +${result.xp} XP` })
        }

        // RAID
        if (text === "!raid") {
            if (cooldown(user)) return sock.sendMessage(from, { text: "Cooldown 10 detik." })
            const result = raid(user)
            await fs.writeJson(DB_PATH, users)
            return sock.sendMessage(from, { text: result.win ? `🔥 Raid menang +${result.reward} Gold` : "💀 Raid gagal!" })
        }

        // REPAIR
        if (text === "!repair") {
            if (cooldown(user)) return sock.sendMessage(from, { text: "Cooldown 10 detik." })
            const result = repair(user)
            if (result.error) return sock.sendMessage(from, { text: result.error })
            await fs.writeJson(DB_PATH, users)
            return sock.sendMessage(from, { text: "🔧 Kapal diperbaiki!" })
        }

        // PVP
        if (text.startsWith("!pvp ")) {
            if (cooldown(user)) return sock.sendMessage(from, { text: "Cooldown 10 detik." })

            const target = text.split(" ")[1]
            if (!users[target]) return sock.sendMessage(from, { text: "Target tidak ditemukan." })

            const result = pvp(user, users[target])
            await fs.writeJson(DB_PATH, users)

            return sock.sendMessage(from, {
                text: result.winner === "attacker"
                    ? `⚔ Menang! Rampas ${result.steal} Gold`
                    : "💀 Kalah dalam PvP!"
            })
        }

        // LEADERBOARD
        if (text === "!top") {
            const sorted = Object.entries(users)
                .sort((a, b) => b[1].uang - a[1].uang)
                .slice(0, 5)

            let board = "🏆 TOP PIRATE LORD\n\n"
            sorted.forEach((u, i) => {
                board += `${i+1}. ${u[0]} - ${u[1].uang} Gold\n`
            })

            return sock.sendMessage(from, { text: board })
        }

        // BOSS
        if (text === "!boss") {
            if (cooldown(user)) return sock.sendMessage(from, { text: "Cooldown 10 detik." })
            const result = bossFight(user)
            await fs.writeJson(DB_PATH, users)
            return sock.sendMessage(from, { text: result.win ? `👹 Boss kalah! +${result.reward} Gold` : "💀 Boss terlalu kuat!" })
        }

        // BUY SHIP
        if (text.startsWith("!buy ")) {
            const shipName = text.split(" ")[1]
            const ship = ships[shipName]
            if (!ship) return
            if (user.uang < ship.price) return sock.sendMessage(from, { text: "Gold tidak cukup." })

            user.uang -= ship.price
            user.kapal = ship
            await fs.writeJson(DB_PATH, users)
            return sock.sendMessage(from, { text: `🚢 Membeli ${ship.name}` })
        }

        // RECRUIT CREW
        if (text === "!rekrut") {
            if (!user.kapal) return
            if (user.crew >= user.kapal.crewMax) return sock.sendMessage(from, { text: "Crew maksimal." })
            if (user.uang < 500) return sock.sendMessage(from, { text: "Gold tidak cukup." })

            user.uang -= 500
            user.crew++
            await fs.writeJson(DB_PATH, users)
            return sock.sendMessage(from, { text: "⚓ 1 Crew direkrut!" })
        }

        // OWNER CHEAT
        if (senderNumber === OWNER) {

            if (text.startsWith("!addgold ")) {
                const amount = parseInt(text.split(" ")[1])
                user.uang += amount
                await fs.writeJson(DB_PATH, users)
                return sock.sendMessage(from, { text: "💎 Gold ditambahkan." })
            }

            if (text === "!godmode") {
                user.uang = 999999
                user.level = 99
                user.crew = 999
                await fs.writeJson(DB_PATH, users)
                return sock.sendMessage(from, { text: "👑 GOD MODE AKTIF." })
            }
        }

    })
}

startBot()