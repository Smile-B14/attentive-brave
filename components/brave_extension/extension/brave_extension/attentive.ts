// Copyright (c) 2026 The Attentive Brave Authors. All rights reserved.
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this file,
// You can obtain one at https://mozilla.org/MPL/2.0/.

type SightState = {
  sight: number
  updatedAt: number
  cranks: number
}

const DECAY_PER_SECOND = 3
const GAIN_PER_PUMP = 3
const MAX_SIGHT = 180
const PUMP_COOLDOWN_MS = 150
const FULL_CRANK_TURN = Math.PI * 2
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
        align-items: center;
        backdrop-filter: blur(6px);
        background: rgba(4, 9, 15, .2);
        border: 1px solid rgba(255, 255, 255, .08);
        border-radius: 18px;
        bottom: 12px;
        display: flex;
        gap: 5px;
        height: 90px;
        padding: 7px;
        pointer-events: none;
        position: absolute;
        right: 12px;
        transition: background 120ms ease, border-color 120ms ease;
        width: 184px;
        z-index: 6;
      }

      #hud.blackout {
        backdrop-filter: none;
        background: transparent;
        border-color: transparent;
      }

      #eye-card {
        align-items: center;
        display: flex;
        height: 58px;
        justify-content: center;
        position: relative;
        width: 90px;
      }

      #eye-shaker {
        align-items: center;
        display: flex;
        height: 56px;
        justify-content: center;
        width: 88px;
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
        height: 53px;
        overflow: visible;
        transform-origin: 60px 35px;
        transition: transform 100ms linear;
        width: 87px;
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
        background: rgba(4, 9, 15, .36);
        border-radius: 99px;
        bottom: 5px;
        color: #bff4ff;
        font-size: 11px;
        font-variant-numeric: tabular-nums;
        font-weight: 850;
        left: 17px;
        letter-spacing: .03em;
        min-width: 58px;
        padding: 3px 8px;
        position: absolute;
        text-align: center;
        transition: opacity 120ms ease;
      }

      #percent.hidden { opacity: 0; }

      #crank-count {
        background: rgba(4, 9, 15, .3);
        border-radius: 99px;
        color: rgba(215, 247, 255, .8);
        font-size: 9px;
        font-variant-numeric: tabular-nums;
        font-weight: 800;
        left: 18px;
        letter-spacing: .03em;
        min-width: 56px;
        padding: 2px 5px;
        position: absolute;
        text-align: center;
        top: 3px;
        transition: opacity 120ms ease;
      }

      #crank-count.hidden { opacity: 0; }

      #crank-wrap {
        height: 76px;
        position: relative;
        touch-action: none;
        user-select: none;
        width: 76px;
      }

      #crank-progress {
        border-radius: 50%;
        inset: 0;
        -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0);
        mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 0);
        pointer-events: none;
        position: absolute;
        z-index: 2;
      }

      #crank-wheel {
        background: radial-gradient(circle, rgba(55, 78, 92, .84) 0 15%,
          rgba(12, 24, 33, .82) 16% 42%, rgba(92, 210, 238, .7) 43% 49%,
          rgba(8, 17, 24, .7) 50% 67%, rgba(119, 225, 247, .78) 68% 74%,
          rgba(9, 17, 24, .74) 75%);
        border: 1px solid rgba(185, 242, 255, .5);
        border-radius: 50%;
        cursor: grab;
        height: 68px;
        left: 3px;
        outline: none;
        pointer-events: auto;
        position: absolute;
        top: 3px;
        width: 68px;
        will-change: transform;
        z-index: 1;
      }

      #crank-wheel:active { cursor: grabbing; }

      #crank-spoke {
        background: linear-gradient(90deg, #567482, #d5f7ff, #567482);
        border-radius: 99px;
        height: 5px;
        left: 11px;
        position: absolute;
        top: 31px;
        width: 44px;
      }

      #crank-knob {
        background: linear-gradient(145deg, #effcff, #5ed3ed);
        border: 1px solid #e3fbff;
        border-radius: 50%;
        box-shadow: 0 0 7px rgba(77, 217, 247, .55);
        height: 14px;
        position: absolute;
        right: 5px;
        top: 26px;
        width: 14px;
      }

      #crank-center {
        background: #b9f3ff;
        border: 2px solid #274553;
        border-radius: 50%;
        box-shadow: 0 0 7px rgba(93, 221, 250, .48);
        height: 12px;
        left: 27px;
        position: absolute;
        top: 27px;
        width: 12px;
      }

      #crank-wrap.cooldown #crank-wheel {
        filter: saturate(.4);
      }

      @media (max-width: 600px) {
        #hud {
          bottom: 8px;
          right: 8px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #dark-veil, #glare-veil, #eye { transition-duration: 1ms !important; }
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
      <div id="crank-count" aria-label="Completed crank turns">TURNS 0</div>

      <div id="crank-wrap" aria-label="Sight crank">
        <div id="crank-progress"></div>
        <div id="crank-wheel" role="slider" aria-label="Spin the sight crank in circles" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">
          <div id="crank-spoke"></div>
          <div id="crank-knob"></div>
          <div id="crank-center"></div>
        </div>
      </div>
    </div>
  `

  document.documentElement.appendChild(host)

  const darkVeil = shadow.querySelector<HTMLElement>('#dark-veil')!
  const glareVeil = shadow.querySelector<HTMLElement>('#glare-veil')!
  const hud = shadow.querySelector<HTMLElement>('#hud')!
  const percent = shadow.querySelector<HTMLElement>('#percent')!
  const crankCount = shadow.querySelector<HTMLElement>('#crank-count')!
  const eye = shadow.querySelector<SVGElement>('#eye')!
  const eyeCard = shadow.querySelector<HTMLElement>('#eye-card')!
  const iris = shadow.querySelector<SVGCircleElement>('#iris')!
  const pupil = shadow.querySelector<SVGCircleElement>('#pupil')!
  const eyeGlint = shadow.querySelector<SVGCircleElement>('#eye-glint')!
  const veins = shadow.querySelectorAll<SVGPathElement>('.vein')
  const crankWrap = shadow.querySelector<HTMLElement>('#crank-wrap')!
  const crankWheel = shadow.querySelector<HTMLElement>('#crank-wheel')!
  const crankProgress = shadow.querySelector<HTMLElement>('#crank-progress')!
  const airLayer = shadow.querySelector<HTMLElement>('#air-layer')!

  let state: SightState = { sight: 100, updatedAt: Date.now(), cranks: 0 }
  let pointerId: number | null = null
  let lastPointerAngle = 0
  let crankRotation = 0
  let automaticRotation = 0
  let turnProgress = 0
  let cooldownUntil = 0
  let lastFrameTime = performance.now()

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

  const saveSight = (sight: number, cranks = state.cranks) => {
    state = { sight: clampSight(sight), updatedAt: Date.now(), cranks }
    chrome.storage.local.set({ [STORAGE_KEY]: state })
  }

  const createAirBurst = (hot: boolean) => {
    const crankRect = crankWrap.getBoundingClientRect()
    const eyeRect = eyeCard.getBoundingClientRect()
    const startX = crankRect.left + crankRect.width / 2
    const startY = crankRect.top + crankRect.height / 2
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

  const updateCrankProgress = () => {
    const ratio = Math.min(1, Math.abs(turnProgress) / FULL_CRANK_TURN)
    const color = turnProgress < 0 ? '#ff845c' : '#74eaff'
    crankProgress.style.background = `conic-gradient(${color} ${ratio * 360}deg, transparent 0)`
    crankWheel.setAttribute('aria-valuenow', Math.round(ratio * 100).toString())
  }

  const completeCrankTurn = (clockwise: boolean) => {
    if (performance.now() < cooldownUntil) {
      return
    }
    cooldownUntil = performance.now() + PUMP_COOLDOWN_MS
    crankWrap.classList.add('cooldown')
    const nextSight =
      sightAt(Date.now()) + (clockwise ? GAIN_PER_PUMP : -GAIN_PER_PUMP)
    saveSight(nextSight, state.cranks + 1)
    if (clockwise) {
      createAirBurst(nextSight > 100)
    }
    window.setTimeout(
      () => crankWrap.classList.remove('cooldown'),
      PUMP_COOLDOWN_MS,
    )
  }

  const pointerAngle = (event: PointerEvent) => {
    const bounds = crankWheel.getBoundingClientRect()
    return Math.atan2(
      event.clientY - (bounds.top + bounds.height / 2),
      event.clientX - (bounds.left + bounds.width / 2),
    )
  }

  crankWheel.addEventListener('pointerdown', (event) => {
    if (pointerId !== null) {
      return
    }
    pointerId = event.pointerId
    lastPointerAngle = pointerAngle(event)
    crankWheel.setPointerCapture(event.pointerId)
    event.preventDefault()
  })

  crankWheel.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) {
      return
    }
    const bounds = crankWheel.getBoundingClientRect()
    const distance = Math.hypot(
      event.clientX - (bounds.left + bounds.width / 2),
      event.clientY - (bounds.top + bounds.height / 2),
    )
    if (distance < bounds.width * 0.24 || distance > bounds.width * 1.25) {
      return
    }

    const angle = pointerAngle(event)
    let delta = angle - lastPointerAngle
    if (delta > Math.PI) delta -= FULL_CRANK_TURN
    if (delta < -Math.PI) delta += FULL_CRANK_TURN
    lastPointerAngle = angle
    crankRotation += delta
    turnProgress += delta

    if (turnProgress >= FULL_CRANK_TURN && performance.now() >= cooldownUntil) {
      turnProgress -= FULL_CRANK_TURN
      completeCrankTurn(true)
    } else if (
      turnProgress <= -FULL_CRANK_TURN
      && performance.now() >= cooldownUntil
    ) {
      turnProgress += FULL_CRANK_TURN
      completeCrankTurn(false)
    }
    updateCrankProgress()
    event.preventDefault()
  })

  const finishCranking = (event: PointerEvent) => {
    if (event.pointerId === pointerId) {
      pointerId = null
    }
  }

  crankWheel.addEventListener('pointerup', finishCranking)
  crankWheel.addEventListener('pointercancel', finishCranking)

  crankWheel.addEventListener('lostpointercapture', () => {
    if (pointerId !== null) {
      pointerId = null
    }
  })

  const render = (frameTime: number) => {
    const sight = sightAt(Date.now())
    const blindness = sight <= 100 ? 1 - sight / 100 : 0
    const underBlur = sight < 40 ? ((40 - sight) / 40) * 16 : 0
    const pressure = sight > 100 ? (sight - 100) / 80 : 0
    const glareBlur = pressure * 12
    const blackout = sight <= 0.02
    const frameSeconds = Math.min(
      0.05,
      Math.max(0, frameTime - lastFrameTime) / 1000,
    )
    lastFrameTime = frameTime

    if (sight < 100) {
      automaticRotation -= frameSeconds * (0.55 + blindness * 2.2)
    }
    crankWheel.style.transform = `rotate(${crankRotation + automaticRotation}rad)`

    darkVeil.style.opacity = blindness.toFixed(3)
    darkVeil.style.backdropFilter = `blur(${underBlur.toFixed(1)}px)`
    darkVeil.style.setProperty(
      '-webkit-backdrop-filter',
      `blur(${underBlur.toFixed(1)}px)`,
    )
    darkVeil.classList.toggle('blackout', blackout)
    hud.classList.toggle('blackout', blackout)

    glareVeil.style.opacity = pressure.toFixed(3)
    glareVeil.style.backdropFilter = `blur(${glareBlur.toFixed(1)}px)`
    glareVeil.style.setProperty(
      '-webkit-backdrop-filter',
      `blur(${glareBlur.toFixed(1)}px)`,
    )

    percent.textContent = `${Math.floor(sight)}%`
    percent.classList.toggle('hidden', blackout)
    percent.style.color = pressure > 0 ? '#ffd15c' : '#bff4ff'
    crankCount.textContent = `TURNS ${state.cranks}`
    crankCount.classList.toggle('hidden', blackout)

    const aperture = sight <= 100 ? Math.max(0.012, sight / 100) : 1
    eye.style.transform = `scaleY(${aperture})`
    const eyeContentsOpacity = Math.min(1, Math.max(0, sight / 12))
    iris.style.opacity = eyeContentsOpacity.toFixed(2)
    pupil.style.opacity = eyeContentsOpacity.toFixed(2)
    eyeGlint.style.opacity = eyeContentsOpacity.toFixed(2)
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
        cranks: Number.isFinite(storedState.cranks)
          ? Math.max(0, Math.floor(storedState.cranks))
          : 0,
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
        cranks: Number.isFinite(nextState.cranks)
          ? Math.max(0, Math.floor(nextState.cranks))
          : state.cranks,
      }
    }
  })

  window.requestAnimationFrame(render)
}
