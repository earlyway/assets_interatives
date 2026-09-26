import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const TURNS = 5
const FOV = 28
const BASE_YAW = 0

const canvas = document.querySelector('#view')
const titleEl = document.querySelector('#hero-title')
const copyEl = document.querySelector('#copy')
const hintEl = document.querySelector('#hint')
const progressEl = document.querySelector('#progress')
const loaderEl = document.querySelector('#loader')
const loaderPct = document.querySelector('#loader-pct')

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
      loaderEl.classList.add('hide')
    })
  },
  (event) => {
    if (!event.total) return
    const pct = Math.round((event.loaded / event.total) * 100)
    loaderPct.textContent = String(pct).padStart(2, '0')
  },
  () => {
    loaderPct.textContent = '파일을 열 수 없습니다'
  },
)

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

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

window.addEventListener('resize', resize)

rafId = requestAnimationFrame(tick)

function tick(now) {
  try {
    const dt = Math.min(0.2, (now - last) / 1000)
    last = now
    targetP = scrollTarget()
    const k = 1 - Math.exp(-5.2 * dt)
    progress += (targetP - progress) * k
    if (Math.abs(targetP - progress) < 0.0004) progress = targetP

    update(progress)
    renderer.render(scene, camera)
  } catch (err) {
    if (!window.__err) window.__err = String(err && err.stack ? err.stack : err)
  }
  rafId = requestAnimationFrame(tick)
}

function update(p) {
  const narrow = window.innerWidth < 860
  const spinT = range(p, 0, 0.56)
  const zoomT = smoother(spinT)
  const titleIn = smoother(range(p, 0.54, 0.68))
  const titleOut = smoother(range(p, 0.76, 0.88))
  const splitT = smoother(range(p, 0.74, 1))
  const textIn = smoother(range(p, 0.8, 0.96))
  const hint = 1 - smoother(range(p, 0.02, 0.1))
  const titleFocus = titleIn * (1 - splitT)

  const margin = lerp(lerp(2.2, narrow ? 1.42 : 1.46, zoomT), narrow ? 1.95 : 1.36, splitT)
  const width = Math.max(dims.x, dims.z)
  const dist = frameDistance(FOV, camera.aspect, width, dims.y, margin)

  pivot.rotation.y = BASE_YAW + spinT * Math.PI * 2 * TURNS
  const ndcX = narrow ? 0 : -0.36 * splitT
  const ndcY = (narrow ? 0.34 * splitT : 0) + titleFocus * 0.18
  const halfH = Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * dist
  const halfW = halfH * camera.aspect
  pivot.position.set(ndcX * halfW, ndcY * halfH, 0)
  camera.clearViewOffset()

  camera.position.set(0, dims.y * 0.02, dist)
  camera.lookAt(0, 0, 0)

  const titleOpacity = titleIn * (1 - titleOut)
  const titleLift = (1 - titleIn) * 28
  titleEl.style.opacity = String(titleOpacity)
  titleEl.style.transform = `translate3d(-50%, ${titleLift}px, 0)`

  copyEl.style.opacity = String(textIn)
  const copyShift = (1 - textIn) * 36
  if (narrow) {
    copyEl.style.transform = `translate3d(0, ${copyShift}px, 0)`
  } else {
    copyEl.style.transform = `translate3d(${copyShift}px, -50%, 0)`
  }

  hintEl.style.opacity = String(hint)
  progressEl.style.transform = `scaleX(${p})`
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
