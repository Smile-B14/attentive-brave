// Copyright (c) 2026 The Attentive Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

type SightState = {
  sight: number
  updatedAt: number
}

const DECAY_PER_SECOND = 3.5
const GAIN_PER_PUMP = 3
const MAX_SIGHT = 180
const PUMP_COOLDOWN_MS = 150
const PUMP_STROKE_PX = 54
const STORAGE_KEY = 'attentiveSightState'

if (window.top === window.self && !document.querySelector('#attentive-brave')) {
  const host = document.createElement('div')
  host.id = 'attentive-brave'
  host.setAttribute('aria-label', 'Attentive Brave sight controls')
  const shadow = host.attachShadow({ mode: 'closed' })

  shadow.innerHTML = `
    <style>
      :host {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system,
          BlinkMacSystemFont, "Segoe UI", sans-serif;
        inset: 0;
        pointer-events: none;
        position: fixed;
        z-index: 2147483647;
      }

      * { box-sizing: border-box; }

      #dark-veil,
      #glare-veil {
        inset: 0;
        opacity: 0;
        pointer-events: none;
        position: absolute;
        transition: backdrop-filter 100ms linear, opacity 100ms linear;
        z-index: 1;
      }

      #dark-veil { background: #000; }
      #glare-veil { background: #fff; }
      #dark-veil.blackout { pointer-events: auto; }

      #air-layer {
        inset: 0;
        overflow: hidden;
        pointer-events: none;
        position: absolute;
        z-index: 3;
      }

      .air-particle {
        animation: air-to-eye 720ms cubic-bezier(.18,.72,.28,1) forwards;
        background: radial-gradient(circle at 35% 30%, #fff 0 10%,
          #8cecff 28%, #36b9ff 60%, transparent 66%);
        border-radius: 999px;
        filter: drop-shadow(0 0 7px #47caff);
        height: var(--size);
        left: var(--start-x);
        opacity: 0;
        position: absolute;
        top: var(--start-y);
        width: var(--size);
      }

      .air-particle.hot {
        background: radial-gradient(circle at 35% 30%, #fff 0 10%,
          #fff16b 28%, #ff8b25 60%, transparent 66%);
        filter: drop-shadow(0 0 8px #ff9d2e);
      }

      @keyframes air-to-eye {
        0% { opacity: 0; transform: translate(0, 0) scale(.4); }
        14% { opacity: .95; }
        78% { opacity: .72; }
        100% {
          opacity: 0;
          transform: translate(var(--travel-x), var(--travel-y)) scale(1.3);
        }
      }

      #hud {
        bottom: 16px;
        height: 190px;
        pointer-events: none;
        position: absolute;
        right: 16px;
        width: 206px;
        z-index: 6;
      }

      #eye-card {
        align-items: center;
        backdrop-filter: blur(16px);
        background: rgba(7, 11, 19, .68);
        border: 1px solid rgba(255, 255, 255, .13);
        border-radius: 19px;
        box-shadow: 0 12px 34px rgba(0, 0, 0, .28);
        display: flex;
        height: 78px;
        justify-content: center;
        left: 0;
        position: absolute;
        top: 22px;
        width: 116px;
      }

      #eye-shaker {
        align-items: center;
        display: flex;
        height: 64px;
        justify-content: center;
        width: 106px;
      }

      #eye-card.overpressure #eye-shaker {
        animation: overpressure-shake 90ms linear infinite;
      }

      @keyframes overpressure-shake {
        0% { transform: translate(calc(var(--shake) * -1), 0) rotate(-1deg); }
        25% { transform: translate(0, var(--shake)) rotate(1.2deg); }
        50% { transform: translate(var(--shake), calc(var(--shake) * -.45)) rotate(-.8deg); }
        75% { transform: translate(calc(var(--shake) * -.35), calc(var(--shake) * -1)) rotate(1deg); }
        100% { transform: translate(calc(var(--shake) * -1), 0) rotate(-1deg); }
      }

      #eye {
        filter: drop-shadow(0 0 11px rgba(71, 202, 255, .34));
        height: 62px;
        overflow: visible;
        transform-origin: 60px 35px;
        transition: transform 100ms linear;
        width: 104px;
      }

      #eye-outline {
        fill: rgba(235, 248, 255, .96);
        stroke: #b9efff;
        stroke-width: 3;
      }

      #iris { fill: #44ccff; transition: fill 100ms linear; }
      #pupil { fill: #071019; transition: r 100ms linear; }
      #eye-glint { fill: white; }

      .vein {
        fill: none;
        opacity: 0;
        stroke: #ff9d24;
        stroke-linecap: round;
        stroke-width: 2;
        transition: opacity 100ms linear;
      }

      .vein.yellow { stroke: #ffd84a; stroke-width: 1.5; }

      #percent {
        backdrop-filter: blur(14px);
        background: rgba(7, 11, 19, .76);
        border: 1px solid rgba(255, 255, 255, .12);
        border-radius: 99px;
        bottom: 29px;
        color: #bff4ff;
        font-size: 12px;
        font-variant-numeric: tabular-nums;
        font-weight: 850;
        left: 22px;
        letter-spacing: .03em;
        min-width: 72px;
        padding: 6px 9px;
        position: absolute;
        text-align: center;
        transition: opacity 120ms ease;
      }

      #percent.hidden { opacity: 0; }

      #pump-card {
        backdrop-filter: blur(16px);
        background: rgba(7, 11, 19, .7);
        border: 1px solid rgba(255, 255, 255, .13);
        border-radius: 21px;
        bottom: 0;
        box-shadow: 0 14px 38px rgba(0, 0, 0, .3);
        height: 190px;
        padding: 11px 9px 10px;
        pointer-events: none;
        position: absolute;
        right: 0;
        touch-action: none;
        user-select: none;
        width: 92px;
      }

      #pressure-track {
        background: rgba(255, 255, 255, .1);
        border-radius: 99px;
        height: 5px;
        left: 11px;
        overflow: hidden;
        position: absolute;
        right: 11px;
        top: 11px;
      }

      #pressure-fill {
        background: linear-gradient(90deg, #47caff, #a3f7ff);
        border-radius: inherit;
        height: 100%;
        transform: scaleX(0);
        transform-origin: left center;
      }

      #pump-ready-dot {
        background: #39505d;
        border-radius: 99px;
        box-shadow: 0 0 0 transparent;
        height: 7px;
        position: absolute;
        right: 12px;
        top: 23px;
        transition: background 80ms linear, box-shadow 80ms linear;
        width: 7px;
      }

      #pump-card.ready #pump-ready-dot {
        background: #70ebff;
        box-shadow: 0 0 10px #47d8f5;
      }

      #pump-stage {
        bottom: 9px;
        height: 145px;
        left: 8px;
        overflow: hidden;
        position: absolute;
        width: 74px;
      }

      #pump-handle {
        cursor: ns-resize;
        left: 4px;
        outline: none;
        pointer-events: auto;
        position: absolute;
        top: 0;
        width: 66px;
        will-change: transform;
        z-index: 2;
      }

      #grip {
        align-items: center;
        background: linear-gradient(180deg, #effcff, #75ddf5);
        border: 2px solid #d8f8ff;
        border-radius: 10px;
        box-shadow: 0 5px 14px rgba(34, 196, 237, .27);
        color: #08212b;
        display: flex;
        font-size: 8px;
        font-weight: 900;
        height: 28px;
        justify-content: center;
        letter-spacing: .09em;
      }

      #rod {
        background: linear-gradient(90deg, #50606e, #edfaff 48%, #536573);
        height: 72px;
        margin: 0 auto;
        width: 8px;
      }

      #cylinder {
        background: linear-gradient(90deg, #102532, #2a5267 48%, #102430);
        border: 2px solid #5fc7e2;
        border-radius: 12px 12px 17px 17px;
        bottom: 0;
        box-shadow: inset 0 0 13px rgba(94, 215, 245, .22),
          0 7px 18px rgba(0, 0, 0, .32);
        height: 66px;
        left: 13px;
        position: absolute;
        width: 48px;
        z-index: 3;
      }

      #cylinder::after {
        background: #65d7f1;
        border-radius: 99px;
        bottom: 9px;
        box-shadow: 0 0 9px #46c8ec;
        content: '';
        height: 6px;
        left: 9px;
        position: absolute;
        right: 9px;
      }

      #pump-card.returning #pump-handle {
        transition: transform 150ms cubic-bezier(.18,.9,.2,1);
      }

      #pump-card.cooldown #pump-handle { filter: saturate(.45); }

      @media (max-width: 600px) {
        #hud {
          bottom: 10px;
          right: 10px;
          transform: scale(.88);
          transform-origin: bottom right;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #dark-veil, #glare-veil, #eye, #pump-handle { transition-duration: 1ms !important; }
        .air-particle { animation-duration: 1ms; }
      }
    </style>

    <div id="dark-veil"></div>
    <div id="glare-veil"></div>
    <div id="air-layer"></div>

    <div id="hud">
      <div id="eye-card" aria-label="Sight eye">
        <div id="eye-shaker">
          <svg id="eye" viewBox="0 0 120 70" aria-hidden="true">
            <path id="eye-outline" d="M5 35 Q60 -5 115 35 Q60 75 5 35Z" />
            <path class="vein" d="M13 33 L27 31 L35 24" />
            <path class="vein yellow" d="M107 35 L93 32 L86 24" />
            <path class="vein" d="M20 46 L34 41 L42 47" />
            <path class="vein yellow" d="M100 47 L87 41 L79 48" />
            <circle id="iris" cx="60" cy="35" r="18" />
            <circle id="pupil" cx="60" cy="35" r="8" />
            <circle id="eye-glint" cx="67" cy="27" r="4" />
          </svg>
        </div>
      </div>

      <div id="percent" aria-live="polite">100%</div>

      <div id="pump-card" aria-label="Sight pump">
        <div id="pressure-track"><div id="pressure-fill"></div></div>
        <div id="pump-ready-dot"></div>
        <div id="pump-stage">
          <div id="pump-handle" role="slider" aria-label="Drag sight pump down and release" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
            <div id="grip">PUMP</div>
            <div id="rod"></div>
          </div>
          <div id="cylinder"></div>
        </div>
      </div>
    </div>
  `

  document.documentElement.appendChild(host)

  const darkVeil = shadow.querySelector<HTMLElement>('#dark-veil')!
  const glareVeil = shadow.querySelector<HTMLElement>('#glare-veil')!
  const percent = shadow.querySelector<HTMLElement>('#percent')!
  const eye = shadow.querySelector<SVGElement>('#eye')!
  const eyeCard = shadow.querySelector<HTMLElement>('#eye-card')!
  const iris = shadow.querySelector<SVGCircleElement>('#iris')!
  const pupil = shadow.querySelector<SVGCircleElement>('#pupil')!
  const veins = shadow.querySelectorAll<SVGPathElement>('.vein')
  const pumpCard = shadow.querySelector<HTMLElement>('#pump-card')!
  const pumpHandle = shadow.querySelector<HTMLElement>('#pump-handle')!
  const pressureFill = shadow.querySelector<HTMLElement>('#pressure-fill')!
  const airLayer = shadow.querySelector<HTMLElement>('#air-layer')!

  let state: SightState = { sight: 100, updatedAt: Date.now() }
  let pointerId: number | null = null
  let strokeStartY = 0
  let strokePx = 0
  let strokeReady = false
  let cooldownUntil = 0

  const clampSight = (value: number) => Math.min(MAX_SIGHT, Math.max(0, value))

  const isSightState = (value: unknown): value is SightState => {
    if (!value || typeof value !== 'object') {
      return false
    }
    const candidate = value as Partial<SightState>
    return (
      Number.isFinite(candidate.sight) && Number.isFinite(candidate.updatedAt)
    )
  }

  const sightAt = (now: number) => {
    const elapsedSeconds = Math.max(0, now - state.updatedAt) / 1000
    return clampSight(state.sight - elapsedSeconds * DECAY_PER_SECOND)
  }

  const saveSight = (sight: number) => {
    state = { sight: clampSight(sight), updatedAt: Date.now() }
    chrome.storage.local.set({ [STORAGE_KEY]: state })
  }

  const createAirBurst = (hot: boolean) => {
    const pumpRect = pumpCard.getBoundingClientRect()
    const eyeRect = eyeCard.getBoundingClientRect()
    const startX = pumpRect.left + pumpRect.width / 2
    const startY = pumpRect.top + 28
    const travelX = eyeRect.left + eyeRect.width / 2 - startX
    const travelY = eyeRect.top + eyeRect.height / 2 - startY

    for (let index = 0; index < 7; index++) {
      const particle = document.createElement('span')
      particle.className = `air-particle${hot ? ' hot' : ''}`
      particle.style.setProperty('--start-x', `${startX + index * 2 - 6}px`)
      particle.style.setProperty('--start-y', `${startY + index * 3}px`)
      particle.style.setProperty('--travel-x', `${travelX + index * 4 - 12}px`)
      particle.style.setProperty('--travel-y', `${travelY - index * 3}px`)
      particle.style.setProperty('--size', `${9 + (index % 3) * 3}px`)
      particle.style.animationDelay = `${index * 34}ms`
      airLayer.appendChild(particle)
      particle.addEventListener('animationend', () => particle.remove(), {
        once: true,
      })
    }
  }

  const setStroke = (value: number) => {
    strokePx = Math.min(PUMP_STROKE_PX, Math.max(0, value))
    const strokeProgress = strokePx / PUMP_STROKE_PX
    strokeReady = strokeProgress >= 0.96
    pumpHandle.style.transform = `translateY(${strokePx}px)`
    pumpHandle.setAttribute(
      'aria-valuenow',
      Math.round(strokeProgress * 100).toString(),
    )
    pressureFill.style.transform = `scaleX(${strokeProgress})`
    pumpCard.classList.toggle('ready', strokeReady)
  }

  const finishStroke = (canComplete: boolean) => {
    if (pointerId === null) {
      return
    }
    const completed = canComplete && strokeReady
    pointerId = null
    pumpCard.classList.remove('ready')
    pumpCard.classList.add('returning')
    pressureFill.style.transform = 'scaleX(0)'
    setStroke(0)

    if (completed) {
      cooldownUntil = performance.now() + PUMP_COOLDOWN_MS
      pumpCard.classList.add('cooldown')
      const nextSight = sightAt(Date.now()) + GAIN_PER_PUMP
      saveSight(nextSight)
      createAirBurst(nextSight > 100)
      window.setTimeout(
        () => pumpCard.classList.remove('cooldown'),
        PUMP_COOLDOWN_MS,
      )
    }

    window.setTimeout(() => pumpCard.classList.remove('returning'), 160)
  }

  pumpHandle.addEventListener('pointerdown', (event) => {
    if (
      pointerId !== null
      || pumpCard.classList.contains('returning')
      || performance.now() < cooldownUntil
    ) {
      return
    }
    pointerId = event.pointerId
    strokeStartY = event.clientY
    strokeReady = false
    pumpHandle.setPointerCapture(event.pointerId)
    setStroke(0)
    event.preventDefault()
  })

  pumpHandle.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) {
      return
    }
    setStroke(event.clientY - strokeStartY)
    event.preventDefault()
  })

  pumpHandle.addEventListener('pointerup', (event) => {
    if (event.pointerId === pointerId) {
      finishStroke(true)
    }
  })

  pumpHandle.addEventListener('pointercancel', (event) => {
    if (event.pointerId === pointerId) {
      finishStroke(false)
    }
  })

  pumpHandle.addEventListener('lostpointercapture', () => {
    if (pointerId !== null) {
      finishStroke(false)
    }
  })

  const render = () => {
    const sight = sightAt(Date.now())
    const blindness = sight <= 100 ? 1 - sight / 100 : 0
    const underBlur = sight < 40 ? ((40 - sight) / 40) * 16 : 0
    const pressure = sight > 100 ? (sight - 100) / 80 : 0
    const glareBlur = pressure * 12
    const blackout = sight <= 0.02

    darkVeil.style.opacity = blindness.toFixed(3)
    darkVeil.style.backdropFilter = `blur(${underBlur.toFixed(1)}px)`
    darkVeil.style.setProperty(
      '-webkit-backdrop-filter',
      `blur(${underBlur.toFixed(1)}px)`,
    )
    darkVeil.classList.toggle('blackout', blackout)

    glareVeil.style.opacity = pressure.toFixed(3)
    glareVeil.style.backdropFilter = `blur(${glareBlur.toFixed(1)}px)`
    glareVeil.style.setProperty(
      '-webkit-backdrop-filter',
      `blur(${glareBlur.toFixed(1)}px)`,
    )

    percent.textContent = `${Math.floor(sight)}%`
    percent.classList.toggle('hidden', blackout)
    percent.style.color = pressure > 0 ? '#ffd15c' : '#bff4ff'

    const aperture = sight <= 100 ? Math.max(0.07, sight / 100) : 1
    eye.style.transform = `scaleY(${aperture})`
    eyeCard.classList.toggle('overpressure', pressure > 0.01)
    eyeCard.style.setProperty('--shake', `${(1 + pressure * 4).toFixed(1)}px`)
    pupil.setAttribute('r', (8 - pressure * 5.5).toFixed(2))
    iris.style.fill =
      pressure > 0 ? `hsl(${195 - pressure * 150} 100% 60%)` : ''
    veins.forEach((vein) => {
      vein.style.opacity = Math.min(1, pressure * 1.35).toFixed(2)
    })

    window.requestAnimationFrame(render)
  }

  chrome.storage.local.get(STORAGE_KEY, (result) => {
    const storedState: unknown = result[STORAGE_KEY]
    if (isSightState(storedState)) {
      state = {
        sight: clampSight(storedState.sight),
        updatedAt: storedState.updatedAt,
      }
    } else {
      saveSight(100)
    }
  })

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') {
      return
    }
    const nextState: unknown = changes[STORAGE_KEY]?.newValue
    if (isSightState(nextState) && nextState.updatedAt >= state.updatedAt) {
      state = {
        sight: clampSight(nextState.sight),
        updatedAt: nextState.updatedAt,
      }
    }
  })

  window.requestAnimationFrame(render)
}
