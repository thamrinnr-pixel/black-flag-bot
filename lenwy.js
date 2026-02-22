export const COOLDOWN = 10000

export const ships = {
    sloop: { name: "Sloop", price: 1000, hp: 100, atk: 20, def: 15, crewMax: 10 },
    brigantine: { name: "Brigantine", price: 3000, hp: 200, atk: 40, def: 30, crewMax: 20 }
}

export function createUser() {
    return {
        uang: 2000,
        level: 1,
        xp: 0,
        lastAction: 0,
        kapal: null,
        crew: 0
    }
}

export function cooldown(user) {
    const now = Date.now()
    if (now - user.lastAction < COOLDOWN) return true
    user.lastAction = now
    return false
}

export function totalPower(user) {
    if (!user.kapal) return 0
    return user.kapal.atk + (user.crew * 3)
}

export function quest(user) {
    const gold = Math.floor(Math.random() * 500) + 100
    const xp = Math.floor(Math.random() * 50) + 20

    user.uang += gold
    user.xp += xp

    if (user.xp >= 100) {
        user.level++
        user.xp = 0
    }

    return { gold, xp }
}

export function raid(user) {
    const power = totalPower(user)
    const chance = Math.random() * 100

    if (chance < power) {
        const reward = Math.floor(Math.random() * 1000) + 500
        user.uang += reward
        return { win: true, reward }
    }
    return { win: false }
}

export function repair(user) {
    if (!user.kapal) return { error: "Tidak punya kapal." }
    const cost = 300
    if (user.uang < cost) return { error: "Gold tidak cukup." }

    user.uang -= cost
    return { success: true }
}

export function pvp(attacker, defender) {
    const atkPower = totalPower(attacker)
    const defPower = totalPower(defender)

    if (atkPower > defPower) {
        const steal = Math.min(500, defender.uang)
        attacker.uang += steal
        defender.uang -= steal
        return { winner: "attacker", steal }
    }
    return { winner: "defender" }
}

export function bossFight(user) {
    const bossHP = 300
    const power = totalPower(user)

    if (power > bossHP / 2) {
        const reward = 2000
        user.uang += reward
        return { win: true, reward }
    }
    return { win: false }
}