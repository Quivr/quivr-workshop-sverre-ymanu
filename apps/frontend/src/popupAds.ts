export type Rng = () => number

export type Palette = {
  frame: string
  header: string
  body: string
  headline: string
  cta: string
}

export type Ad = {
  site: string
  kicker: string
  headline: string
  body: string
  cta: string
  decline: string
  fineprint: string
  emoji: string
  palette: Palette
  /** Degrees. A slight lean makes it look more trustworthy. */
  tilt: number
}

const pick = <T>(rng: Rng, items: readonly T[]): T =>
  items[Math.min(Math.floor(rng() * items.length), items.length - 1)] as T

const int = (rng: Rng, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1))

const PALETTES: Palette[] = [
  {
    frame: 'border-fuchsia-500 bg-yellow-200',
    header: 'bg-fuchsia-600 text-white',
    body: 'text-black',
    headline: 'text-red-600',
    cta: 'bg-green-500 hover:bg-green-600 text-white',
  },
  {
    frame: 'border-lime-400 bg-black',
    header: 'bg-lime-400 text-black',
    body: 'text-lime-300',
    headline: 'text-yellow-300',
    cta: 'bg-red-600 hover:bg-red-700 text-white',
  },
  {
    frame: 'border-red-600 bg-white',
    header: 'bg-red-600 text-white',
    body: 'text-black',
    headline: 'text-blue-700',
    cta: 'bg-orange-500 hover:bg-orange-600 text-white',
  },
  {
    frame: 'border-cyan-400 bg-purple-900',
    header: 'bg-cyan-400 text-black',
    body: 'text-pink-200',
    headline: 'text-cyan-300',
    cta: 'bg-pink-500 hover:bg-pink-600 text-white',
  },
  {
    frame: 'border-orange-500 bg-sky-100',
    header: 'bg-orange-500 text-black',
    body: 'text-black',
    headline: 'text-purple-700',
    cta: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
]

const EMOJI = [
  '🐹',
  '💾',
  '🧻',
  '👤',
  '🐦',
  '🧀',
  '🎁',
  '💰',
  '🔥',
  '⚠️',
  '🦠',
  '👻',
  '🪙',
  '🍞',
  '🛸',
  '🧙',
]

const THINGS = [
  'hamster',
  'pigeon',
  'toaster',
  'goblin',
  'cheese',
  'towel',
  'shadow',
  'lecture hall',
  'grandma',
  'cactus',
  'ferret',
  'spreadsheet',
  'stapler',
  'sock',
]

const PRIZES = [
  'a free laptop (laptop not included)',
  '€4.000.000 in hamster inheritance',
  'one (1) slightly used shadow',
  'a lifetime supply of towels',
  'free RAM',
  'a haunted toaster',
  'unlimited bread',
  'a cursed USB stick',
  'a pigeon that knows your grades',
  'a complimentary goblin',
]

const GROUPS = [
  'Doctors',
  'Professors',
  'Landlords',
  'Pigeons',
  'Librarians',
  'Banks',
  'Cheese experts',
  'Your neighbours',
  'Goblins',
  'The Dean',
]

const PROBLEMS = [
  'viruses',
  'haunted cookies',
  'unpaid hamsters',
  'ghost processes',
  'suspicious toasters',
  'missing shadows',
  'moist files',
  'cursed pixels',
]

const DEVICES = [
  'laptop',
  'phone',
  'toaster',
  'student card',
  'browser',
  'fridge',
]

const PLACES = [
  'your lecture hall',
  'your postcode',
  'the library',
  'your cafeteria',
  'your group chat',
  'this very tab',
]

const SITE_WORDS = [
  'free',
  'mega',
  'claim',
  'win',
  'totally-legit',
  'bonus',
  'hot',
  'instant',
  'secret',
  'ultra',
  'definitely-safe',
  'cash',
  'lucky',
  'vip',
  'click',
]

const HEADLINES: ((rng: Rng) => string)[] = [
  rng =>
    `You are visitor #${int(rng, 900_000, 999_999)}! Claim ${pick(rng, PRIZES)}`,
  rng =>
    `${int(rng, 3, 19)} ${pick(rng, THINGS)}s in ${pick(rng, PLACES)} want to meet you`,
  rng =>
    `Local student finds one weird ${pick(rng, THINGS)} trick. ${pick(rng, GROUPS)} hate him!`,
  rng =>
    `WARNING: your ${pick(rng, DEVICES)} has ${int(rng, 3, 99)} ${pick(rng, PROBLEMS)}`,
  rng => `Congratulations! You won ${pick(rng, PRIZES)}`,
  rng =>
    `${pick(rng, GROUPS)} don't want you to know about this ${pick(rng, THINGS)}`,
  rng => `Is your ${pick(rng, THINGS)} spying on you? Find out now`,
  rng =>
    `Get paid €${int(rng, 40, 900)}/hour to pet a ${pick(rng, THINGS)} from home`,
]

const BODIES: ((rng: Rng) => string)[] = [
  rng =>
    `Act before the ${pick(rng, THINGS)} changes its mind. We cannot hold it for long.`,
  rng =>
    `Thousands of students in ${pick(rng, PLACES)} already did this. You are falling behind.`,
  rng =>
    `No credit card needed. Just your name, your mother's maiden name and your favourite ${pick(rng, THINGS)}.`,
  rng =>
    `Our scanner found something in ${pick(rng, PLACES)}. We will not say what. Click to see.`,
  rng =>
    `A man named Gary discovered this by accident. Gary is now a ${pick(rng, THINGS)}.`,
  rng => `Results may vary. Results may also be a ${pick(rng, THINGS)}.`,
]

const KICKERS: ((rng: Rng) => string)[] = [
  rng => `⏰ Offer ends in 00:0${int(rng, 1, 9)}`,
  rng => `🔥 ${int(rng, 2, 4)} left in stock!`,
  rng => `👀 ${int(rng, 40, 999)} people are looking at this right now`,
  rng => `✅ Verified by ${pick(rng, GROUPS)}`,
  () => '🚨 LAST CHANCE (again)',
  () => '⭐⭐⭐⭐⭐ "Life changing" - a bot',
]

const CTAS = [
  'CLAIM NOW!!!',
  'YES PLEASE',
  'DOWNLOAD (SAFE)',
  'CLICK HERE',
  'GET IT FREE',
  'UNLOCK',
  'FIX NOW',
  'I AM READY',
]

const DECLINES = [
  'No thanks, I like being poor',
  'No, I enjoy viruses',
  'Maybe later (never)',
  'I do not want free money',
  "I'm a boring person",
]

const FINEPRINT = [
  '*Terms apply. The terms are a hamster.',
  '*Not available in this timeline.',
  '*Side effects include owning a pigeon.',
  '*By viewing this ad you owe us a sock.',
  '*Gary is not a licensed professional.',
  '*Not a real site. Nothing here goes anywhere.',
]

/** A new, random ad every time. Fake sites use the reserved `.invalid` TLD and nothing is a link. */
export const generateAd = (rng: Rng): Ad => ({
  site: `${pick(rng, SITE_WORDS)}-${pick(rng, SITE_WORDS)}-${int(rng, 10, 9999)}.invalid`,
  kicker: pick(rng, KICKERS)(rng),
  headline: pick(rng, HEADLINES)(rng),
  body: pick(rng, BODIES)(rng),
  cta: pick(rng, CTAS),
  decline: pick(rng, DECLINES),
  fineprint: pick(rng, FINEPRINT),
  emoji: pick(rng, EMOJI),
  palette: pick(rng, PALETTES),
  tilt: int(rng, -30, 30) / 10,
})

export const FIRST_AD_MS = 20_000
const MIN_GAP_MS = 2_000
const MAX_GAP_MS = 5_000

/** Ads pile up on top of each other, up to this many. */
export const MAX_ADS = 6

export const nextGapMs = (random: number) =>
  MIN_GAP_MS + Math.floor(random * (MAX_GAP_MS - MIN_GAP_MS))

export type Position = { x: number; y: number }

/** Random spot as percentages. Used as `left`/`top` plus `translate(-x%, -y%)`, so the whole ad always stays on screen. */
export const pickPosition = (randomX: number, randomY: number): Position => ({
  x: Math.min(Math.max(randomX, 0), 1) * 100,
  y: Math.min(Math.max(randomY, 0), 1) * 100,
})
