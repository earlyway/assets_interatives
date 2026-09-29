import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const TURNS = 5
const FOV = 28
const BASE_YAW = 0

const FORM_POSES = [
  { yaw: 0, pitch: 0.02, margin: 1.62, look: 0.02 },
  { yaw: Math.PI * 0.5, pitch: 0.1, margin: 1.48, look: 0.04 },
  { yaw: 0.2, pitch: 0.08, margin: 1.58, look: 0 },
]

const canvas = document.querySelector('#view')
const titleEl = document.querySelector('#hero-title')
const typeEl = document.querySelector('#type-title')
const copyEl = document.querySelector('#copy')
const formArticles = [...document.querySelectorAll('#form-copy article')]
const hintEl = document.querySelector('#hint')
const progressEl = document.querySelector('#progress')
const loaderEl = document.querySelector('#loader')
const loaderPct = document.querySelector('#loader-pct')
const openKicker = document.querySelector('#open-kicker')
const openIndex = document.querySelector('#open-index')
const nav = document.querySelector('#nav')
const navLinks = [...nav.querySelectorAll('a')]

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
})
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.12

const scene = new THREE.Scene()
scene.background = new THREE.Color('#000000')

const camera = new THREE.PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.01, 50)
camera.position.set(0, 0, 3)

scene.environment = createStudioEnvironment(renderer)
scene.environmentIntensity = 1.15

const hemi = new THREE.HemisphereLight('#f4f6f8', '#1a1c20', 0.18)
scene.add(hemi)

const key = new THREE.DirectionalLight('#f7f7f5', 2.7)
key.position.set(2.2, 3.4, 2.6)
scene.add(key)

const fill = new THREE.DirectionalLight('#d5dbe3', 0.25)
fill.position.set(-2.4, 1.2, 1.4)
scene.add(fill)

const rim = new THREE.DirectionalLight('#d7e2ee', 2.4)
rim.position.set(-3.2, 2.2, -2.8)
scene.add(rim)

const pivot = new THREE.Group()
scene.add(pivot)

let dims = new THREE.Vector3(0.4, 1, 0.4)

const loader = new GLTFLoader()
loader.load(
  '/assets/clean.glb',
  (gltf) => {
    const model = gltf.scene
    uprightAndCenter(model)
    pivot.add(model)

    model.traverse((obj) => {
      if (!obj.isMesh) return
      obj.castShadow = false
      obj.receiveShadow = false
      const list = Array.isArray(obj.material) ? obj.material : [obj.material]
      list.forEach((mat) => {
        if (!mat) return
        mat.envMapIntensity = 1.2
        if (mat.specularColor) mat.specularColor.setRGB(1, 1, 1)
      })
    })

    const box = new THREE.Box3().setFromObject(pivot)
    dims = box.getSize(new THREE.Vector3())

    document.fonts.ready.then(() => {
      fitTypeTitle()
      loaderEl.classList.add('hide')
    })
  },
  (event) => {
    if (!event.total) return
    const pct = Math.round((event.loaded / event.total) * 100)
    loaderPct.textContent = String(pct)
  },
  () => {
    loaderPct.textContent = '—'
  },
)

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

navLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault()
    const to = Number(link.dataset.to)
    const max = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo({ top: max * to, behavior: 'smooth' })
  })
})

const pointer = { x: 0, y: 0 }
const pointerPrev = { x: 0, y: 0 }
const pointerSmooth = { x: 0, y: 0 }
const lean = { x: 0, y: 0 }
const cursorEl = document.querySelector('#cursor')
const cursorPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
const cursorTarget = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
const fineQuery = window.matchMedia('(pointer: fine)')
let finePointer = fineQuery.matches
let stillFor = 1
let clock = 0
let cursorReady = false
let cursorOnLink = false
let cursorScale = 1

document.documentElement.classList.toggle('fine-pointer', finePointer)
fineQuery.addEventListener('change', () => {
  finePointer = fineQuery.matches
  document.documentElement.classList.toggle('fine-pointer', finePointer)
})

window.addEventListener('pointermove', (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1
  pointer.y = (event.clientY / window.innerHeight) * 2 - 1
  cursorTarget.x = event.clientX
  cursorTarget.y = event.clientY
  cursorReady = true
})

navLinks.forEach((link) => {
  link.addEventListener('pointerenter', () => {
    cursorOnLink = true
  })
  link.addEventListener('pointerleave', () => {
    cursorOnLink = false
  })
})

let targetP = 0
let progress = 0
let last = performance.now()
let rafId = 0

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelAnimationFrame(rafId)
    renderer.dispose()
  })
}

window.addEventListener('scroll', () => {
  targetP = scrollTarget()
}, { passive: true })

window.addEventListener('resize', () => {
  resize()
  fitTypeTitle()
})

fitTypeTitle()
rafId = requestAnimationFrame(tick)

function tick(now) {
  try {
    const dt = Math.min(0.2, (now - last) / 1000)
    last = now
    targetP = scrollTarget()
    const k = 1 - Math.exp(-5.2 * dt)
    progress += (targetP - progress) * k
    if (Math.abs(targetP - progress) < 0.0004) progress = targetP

    const pointerK = 1 - Math.exp(-4 * dt)
    pointerSmooth.x += (pointer.x - pointerSmooth.x) * pointerK
    pointerSmooth.y += (pointer.y - pointerSmooth.y) * pointerK

    clock += dt
    const moved = Math.hypot(pointer.x - pointerPrev.x, pointer.y - pointerPrev.y)
    pointerPrev.x = pointer.x
    pointerPrev.y = pointer.y
    if (moved > 0.0015) stillFor = 0
    else stillFor += dt
    const leaning = finePointer && stillFor < 0.08
    const leanK = 1 - Math.exp(-2.4 * dt)
    lean.x += ((leaning ? pointer.x : 0) - lean.x) * leanK
    lean.y += ((leaning ? pointer.y : 0) - lean.y) * leanK

    if (finePointer) {
      const cursorK = 1 - Math.exp(-8 * dt)
      cursorPos.x += (cursorTarget.x - cursorPos.x) * cursorK
      cursorPos.y += (cursorTarget.y - cursorPos.y) * cursorK
      cursorScale += ((cursorOnLink ? 14 / 8 : 1) - cursorScale) * cursorK
      cursorEl.style.opacity = cursorReady ? '1' : '0'
      cursorEl.style.transform = `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0) scale(${cursorScale})`
    }

    update(progress)
    renderer.render(scene, camera)
  } catch (err) {
    if (!window.__err) window.__err = String(err && err.stack ? err.stack : err)
  }
  rafId = requestAnimationFrame(tick)
}

function update(p) {
  const narrow = window.innerWidth < 860
  const turn = range(p, 0.08, 0.4)
  const formU = range(p, 0.4, 0.62)
  const weights = formWeights(formU)
  const pose = blendPoses(weights)

  const turnTitleIn = smoother(range(p, 0.336, 0.4))
  const turnTitleOut = smoother(range(p, 0.4, 0.425))
  const closeTitle = smoother(range(p, 0.93, 0.98))
  const titleOpacity = Math.min(1, turnTitleIn * (1 - turnTitleOut) + closeTitle)
  const lift = turnTitleIn * (1 - smoother(range(p, 0.43, 0.47)))

  const formHold = smoother(range(p, 0.4, 0.44)) * (1 - smoother(range(p, 0.62, 0.68)))
  const captionGate = smoother(range(p, 0.405, 0.45)) * (1 - smoother(range(p, 0.575, 0.615)))
  const typeAmt = smoother(range(p, 0.62, 0.67)) * (1 - smoother(range(p, 0.7, 0.74)))
  const specAmt = smoother(range(p, 0.74, 0.82)) * (1 - smoother(range(p, 0.88, 0.92)))
  const openChrome = 1 - smoother(range(p, 0.04, 0.1))
  const hint = 1 - smoother(range(p, 0.012, 0.05))
  const formLight = smoother(range(p, 0.4, 0.45)) * (1 - smoother(range(p, 0.58, 0.62)))
  const openInfluence = 1 - smoother(range(p, 0.04, 0.08))
  const idle = Math.sin((clock * Math.PI * 2) / 40) * THREE.MathUtils.degToRad(2) * openInfluence
  const yawLean = -lean.x * THREE.MathUtils.degToRad(10) * openInfluence
  const pitchLean = lean.y * THREE.MathUtils.degToRad(6) * openInfluence

  pivot.rotation.y = BASE_YAW + turn * Math.PI * 2 * TURNS + idle + yawLean
  pivot.rotation.x = pitchLean
  pivot.rotation.z = 0

  const margin = marginAt(p, pose.margin, narrow)
  const width = Math.max(dims.x, dims.z)
  const dist = frameDistance(FOV, camera.aspect, width, dims.y, margin)
  const halfH = Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * dist
  const halfW = halfH * camera.aspect

  let ndcX = lean.x * 0.04 * openInfluence
  let ndcY = -lean.y * 0.04 * openInfluence + lift * (narrow ? 0.2 : 0.26)
  ndcY -= weights[2] * formHold * (narrow ? 0.04 : 0.1)
  if (narrow) ndcY += specAmt * 0.28 + captionGate * 0.08
  else ndcX += specAmt * -0.46

  pivot.position.set(ndcX * halfW, ndcY * halfH, 0)

  const orbitYaw = pose.yaw * formHold
  const orbitPitch = pose.pitch * formHold
  const lookY = pose.look * dims.y * formHold
  const cp = Math.cos(orbitPitch)
  camera.position.set(
    Math.sin(orbitYaw) * dist * cp,
    Math.sin(orbitPitch) * dist + dims.y * 0.02,
    Math.cos(orbitYaw) * dist * cp,
  )
  camera.lookAt(0, lookY, 0)

  const openLight = openInfluence * (finePointer ? 1 : 0)
  key.position.set(
    2.2 + pointerSmooth.x * 0.65 * formLight + lean.x * 0.22 * openLight,
    3.4 - pointerSmooth.y * 0.4 * formLight - lean.y * 0.14 * openLight,
    2.6,
  )

  titleEl.style.opacity = String(titleOpacity)
  titleEl.style.transform = `translate3d(-50%, ${(1 - titleOpacity) * 18}px, 0)`

  typeEl.style.opacity = String(typeAmt)

  formArticles.forEach((article, index) => {
    article.style.opacity = String(weights[index] * captionGate)
  })

  copyEl.style.opacity = String(specAmt)
  const copyShift = (1 - specAmt) * 28
  if (narrow) copyEl.style.transform = `translate3d(0, ${copyShift}px, 0)`
  else copyEl.style.transform = `translate3d(${copyShift}px, -50%, 0)`

  openKicker.style.opacity = String(openChrome)
  openIndex.style.opacity = String(openChrome)
  nav.style.opacity = String(1 - openChrome)
  nav.style.pointerEvents = openChrome > 0.55 ? 'none' : 'auto'

  const stops = [0, 0.08, 0.4, 0.74]
  let active = 0
  stops.forEach((stop, index) => {
    if (p >= stop - 0.001) active = index
  })
  navLinks.forEach((link, index) => link.classList.toggle('is-on', index === active))

  hintEl.style.opacity = String(hint)
  progressEl.style.transform = `scaleX(${p})`
}

function marginAt(p, poseMargin, narrow) {
  const openM = narrow ? 2.35 : 2.22
  const nearM = narrow ? 1.55 : 1.68
  const typeM = narrow ? 2.85 : 3.35
  const specM = narrow ? 3.1 : 1.72
  const closeM = narrow ? 2.7 : 3.05
  const turnM = lerp(openM, nearM, smoother(range(p, 0.08, 0.34)))

  const gates = [
    [1 - smoother(range(p, 0.06, 0.14)), openM],
    [smoother(range(p, 0.06, 0.14)) * (1 - smoother(range(p, 0.36, 0.44))), turnM],
    [smoother(range(p, 0.38, 0.46)) * (1 - smoother(range(p, 0.58, 0.66))), poseMargin],
    [smoother(range(p, 0.6, 0.68)) * (1 - smoother(range(p, 0.7, 0.78))), typeM],
    [smoother(range(p, 0.72, 0.8)) * (1 - smoother(range(p, 0.86, 0.93))), specM],
    [smoother(range(p, 0.9, 0.97)), closeM],
  ]

  let sum = 0
  let acc = 0
  gates.forEach(([weight, margin]) => {
    sum += weight
    acc += weight * margin
  })
  if (sum < 0.001) return openM
  return acc / sum
}

function formWeights(u) {
  const centers = [0.14, 0.46, 0.78]
  const raw = centers.map((center) => smoother(1 - clamp01(Math.abs(u - center) / 0.34)))
  const sum = raw.reduce((total, weight) => total + weight, 0) || 1
  return raw.map((weight) => weight / sum)
}

function blendPoses(weights) {
  const pose = { yaw: 0, pitch: 0, margin: 0, look: 0 }
  FORM_POSES.forEach((item, index) => {
    const weight = weights[index]
    pose.yaw += item.yaw * weight
    pose.pitch += item.pitch * weight
    pose.margin += item.margin * weight
    pose.look += item.look * weight
  })
  return pose
}

function fitTypeTitle() {
  typeEl.style.fontSize = '100px'
  const width = typeEl.scrollWidth
  if (!width) return
  const target = window.innerWidth * (window.innerWidth < 860 ? 0.9 : 0.94)
  typeEl.style.fontSize = `${(100 * target) / width}px`
}

function createStudioEnvironment(renderer) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    vertexShader: `
      varying vec3 vDirection;
      void main() {
        vDirection = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDirection;

      float panel(vec3 direction, vec3 axis, float size) {
        return smoothstep(1.0 - size, 1.0, dot(direction, axis));
      }

      void main() {
        vec3 direction = normalize(vDirection);
        vec3 color = vec3(0.015);

        vec3 key = normalize(vec3(0.42, 0.78, 0.72));
        color += vec3(1.0, 0.95, 0.88) * panel(direction, key, 0.18) * 9.0;
        color += vec3(1.0, 0.96, 0.9) * panel(direction, key, 0.46) * 1.15;

        vec3 rim = normalize(vec3(-0.82, 0.28, -0.5));
        color += vec3(0.72, 0.82, 1.0) * panel(direction, rim, 0.12) * 8.0;

        vec3 fill = normalize(vec3(-0.35, 0.05, 0.78));
        color += vec3(0.86, 0.9, 0.98) * panel(direction, fill, 0.38) * 0.85;

        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })

  const environmentScene = new THREE.Scene()
  environmentScene.add(new THREE.Mesh(new THREE.SphereGeometry(20, 48, 24), material))

  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(environmentScene, 0.04).texture
  pmrem.dispose()
  material.dispose()
  environmentScene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose()
  })

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.setSize(window.innerWidth, window.innerHeight)
  return environment
}

function uprightAndCenter(model) {
  model.updateMatrixWorld(true)
  let box = new THREE.Box3().setFromObject(model)
  let size = box.getSize(new THREE.Vector3())

  if (size.z >= size.y && size.z >= size.x) {
    model.rotation.x = -Math.PI / 2
  } else if (size.x > size.y && size.x >= size.z) {
    model.rotation.z = Math.PI / 2
  }

  model.updateMatrixWorld(true)
  box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  model.position.sub(center)
  model.updateMatrixWorld(true)
}

function frameDistance(fovDeg, aspect, width, height, margin) {
  const v = THREE.MathUtils.degToRad(fovDeg)
  const distH = (height * margin * 0.5) / Math.tan(v / 2)
  const h = 2 * Math.atan(Math.tan(v / 2) * aspect)
  const distW = (width * margin * 0.5) / Math.tan(h / 2)
  return Math.max(distH, distW, 0.4)
}

function resize() {
  const w = window.innerWidth
  const h = window.innerHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.setSize(w, h)
}

function scrollTarget() {
  const max = document.documentElement.scrollHeight - window.innerHeight
  if (max <= 0) return 0
  return clamp01(window.scrollY / max)
}

function range(p, a, b) {
  return clamp01((p - a) / (b - a))
}

function smoother(t) {
  const x = clamp01(t)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v))
}
