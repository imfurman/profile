import * as THREE from "../vendor/three/three.module.min.js";
import { createCharacter } from "./character-model.js";

const stage = document.querySelector("#avatar-stage");
const canvas = document.querySelector("#avatar-canvas");
const toggle = document.querySelector("#motion-toggle");
const hint = document.querySelector("#scene-hint");
const action = document.querySelector("#character-action");

async function createPortrait() {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  // A restrained overhead perspective: the person stands below the visitor.
  camera.position.set(0.2, 7.6, 10.4);
  camera.lookAt(0, 1.35, 0);
  scene.add(new THREE.HemisphereLight(0xe9edf1, 0x817d78, 2));
  const key = new THREE.DirectionalLight(0xfff4e7, 3.0);
  key.position.set(-3, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {
    left: -3,
    right: 3,
    top: 5,
    bottom: -3,
    near: 0.5,
    far: 20,
  });
  key.shadow.radius = 4;
  key.shadow.blurSamples = 8;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.035;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd6e0ed, 0.6);
  fill.position.set(3, 4, -3);
  scene.add(fill);

  const { character, pose, update } = await createCharacter();
  const characterScale = character.scale.y;
  const flipPivot = new THREE.Group();
  flipPivot.position.y = 2.1;
  character.position.y = -2.1;
  character.rotation.y = -0.1;
  flipPivot.add(character);
  scene.add(flipPivot);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 18),
    new THREE.ShadowMaterial({ color: 0x484a4d, opacity: 0.1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.005;
  ground.receiveShadow = true;
  scene.add(ground);

  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  const touch = window.matchMedia("(pointer: coarse)");
  let paused = media.matches;
  let visible = true;
  let lost = false;
  let frameTime = 0;
  let elapsed = 0;
  let dirty = true;
  const target = new THREE.Vector2(0, 0);
  const gaze = new THREE.Vector2(0, 0);

  const flip = { active: false, time: 0, duration: 1.6 };
  const smooth = (t) => t * t * (3 - 2 * t);
  function finishFlip() {
    flip.active = false;
    flipPivot.position.y = 2.1;
    flipPivot.rotation.x = 0;
    character.scale.y = characterScale;
    pose(0);
    action.disabled = false;
    action.removeAttribute("aria-busy");
    dirty = true;
    updateControls();
  }
  function animateFlip(dt) {
    flip.time += dt;
    const progress = Math.min(flip.time / flip.duration, 1);
    if (progress < 0.14) {
      const crouch = Math.sin(((progress / 0.14) * Math.PI) / 2);
      character.scale.y = characterScale * (1 - crouch * 0.065);
      flipPivot.position.y = 2.1 - crouch * 0.1;
      pose(crouch * 0.18, -crouch * 0.18);
    } else if (progress < 0.9) {
      const air = (progress - 0.14) / 0.76;
      const tuck = Math.sin(Math.PI * air) ** 1.1;
      character.scale.y = characterScale;
      flipPivot.position.y = 2.1 + Math.sin(Math.PI * air) * 1.55;
      flipPivot.rotation.x = -Math.PI * 2 * smooth(air);
      pose(tuck, Math.sin(Math.PI * air) * 0.8);
    } else {
      const settle = Math.sin(((progress - 0.9) / 0.1) * Math.PI);
      flipPivot.rotation.x = -Math.PI * 2;
      flipPivot.position.y = 2.1 - settle * 0.08;
      character.scale.y = characterScale * (1 - settle * 0.045);
      pose(settle * 0.1, 0);
    }
    dirty = true;
    if (progress >= 1) {
      finishFlip();
      if (paused) renderer.setAnimationLoop(null);
    }
  }
  action.addEventListener("click", () => {
    if (flip.active || lost) return;
    flip.time = 0;
    flip.active = true;
    action.disabled = true;
    action.setAttribute("aria-busy", "true");
    hint.textContent = "↻";
    // A deliberate click permits one flip even when idle motion is paused.
    syncLoop();
  });

  function updateControls() {
    toggle.setAttribute("aria-pressed", String(paused));
    toggle.setAttribute(
      "aria-label",
      paused ? "Resume character animation" : "Pause character animation",
    );
    toggle.firstElementChild.textContent = paused ? "▷" : "Ⅱ";
    hint.textContent = paused
      ? "Paused · Click me to flip"
      : touch.matches
        ? "Tap me for a backflip"
        : "Move your cursor · Click me";
  }
  function render(time = 0) {
    // Frame-rate-independent damping; no catch-up jumps after returning to the tab.
    const dt = Math.min(Math.max((time - frameTime) / 1000, 0), 0.05);
    frameTime = time;
    if (!paused) {
      elapsed += dt;
      gaze.lerp(target, 1 - Math.exp(-dt * 6));
      character.rotation.y = -0.12 + gaze.x * 0.075;
    }
    if (flip.active) animateFlip(dt);
    update(gaze, elapsed);
    if (dirty || !paused || flip.active) {
      renderer.render(scene, camera);
      dirty = false;
    }
  }
  function syncLoop() {
    renderer.setAnimationLoop(null);
    frameTime = performance.now();
    if (!visible || document.hidden || lost) return;
    if (paused && !flip.active) {
      dirty = true;
      render(frameTime);
    } else renderer.setAnimationLoop(render);
  }
  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    const mobile = width < 761;
    // Keep the standing figure and its jump inside the responsive scene.
    camera.fov = mobile ? 32 : 30;
    camera.position.set(0.2, 7.6, 10.4);
    camera.lookAt(0, 2.15, 0);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    camera.updateMatrixWorld();
    const upper = new THREE.Vector3(-0.86, 4.76, 0).project(camera);
    const lower = new THREE.Vector3(0.88, 0.02, 0).project(camera);
    Object.assign(action.style, {
      left: `${((upper.x + 1) * width) / 2}px`,
      top: `${((1 - upper.y) * height) / 2}px`,
      width: `${((lower.x - upper.x) * width) / 2}px`,
      height: `${((upper.y - lower.y) * height) / 2}px`,
    });
    dirty = true;
    if (paused && !lost) render(performance.now());
  }
  function pointer(event) {
    if (paused || !visible) return;
    const rect = stage.getBoundingClientRect();
    // Relative to the head on screen; tracking also works outside the canvas.
    const headX = rect.left + rect.width * 0.5;
    const headY = rect.top + rect.height * 0.25;
    target.set(
      THREE.MathUtils.clamp(
        (event.clientX - headX) / (window.innerWidth * 0.45),
        -1,
        1,
      ),
      THREE.MathUtils.clamp(
        (headY - event.clientY) / (window.innerHeight * 0.55),
        -1,
        1,
      ),
    );
  }
  window.addEventListener("pointermove", pointer, { passive: true });
  window.addEventListener("pointerdown", pointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", () =>
    target.set(0, 0),
  );
  document.addEventListener("visibilitychange", syncLoop);
  toggle.addEventListener("click", () => {
    paused = !paused;
    if (paused && flip.active) finishFlip();
    updateControls();
    syncLoop();
  });
  media.addEventListener("change", () => {
    paused = media.matches;
    if (paused && flip.active) finishFlip();
    target.set(0, 0);
    updateControls();
    syncLoop();
  });
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      syncLoop();
    },
    { threshold: 0 },
  );
  observer.observe(stage);
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    lost = true;
    if (flip.active) finishFlip();
    syncLoop();
    stage.classList.remove("is-ready");
    canvas.hidden = true;
    action.hidden = true;
    toggle.hidden = true;
    hint.textContent = "A little digital me";
  });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
    dirty = true;
    resize();
    renderer.render(scene, camera);
    canvas.hidden = false;
    stage.classList.add("is-ready");
    toggle.hidden = false;
    action.hidden = false;
    updateControls();
    syncLoop();
  });
  resize();
  renderer.render(scene, camera);
  canvas.hidden = false;
  stage.classList.add("is-ready");
  toggle.hidden = false;
  action.hidden = false;
  updateControls();
  syncLoop();
}

try {
  if (stage && canvas) await createPortrait();
} catch (error) {
  // The illustrated portrait and all page content stay usable without WebGL.
  stage?.classList.remove("is-ready");
  if (toggle) toggle.hidden = true;
  if (canvas) canvas.hidden = true;
  if (action) action.hidden = true;
  console.warn(
    "The interactive portrait is unavailable; showing its static alternative.",
    error,
  );
}
