import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { wheelSectors } from "./wheel-model";
import type { WheelEntry } from "./wheel-model";

export const GAME_COLORS = [
  "#f9ca31",
  "#f0546b",
  "#2bc58c",
  "#67cde5",
  "#d48ce9",
  "#ff9c45",
  "#f7edc6",
  "#5f8ced",
];
export type WheelScene = {
  setInteraction: (mode: "orbit" | "spin", locked: boolean) => void;
  move: (degrees: number, seconds: number, reducedMotion: boolean) => void;
  dispose: () => void;
  resetView: () => void;
  readView: () => WheelView;
};
export type WheelView = { x: number; y: number; z: number };

function faceTexture(people: WheelEntry[]) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 2048;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  const count = Math.max(people.length, 1);
  const center = 1024;
  const radius = 1015;
  const sectors = wheelSectors(
    people.length ? people : [{ id: "empty", name: "SORTE" }],
  );
  for (let index = 0; index < count; index++) {
    const sector = sectors[index];
    const start = -Math.PI / 2 + (sector.start * Math.PI) / 180;
    const step = ((sector.end - sector.start) * Math.PI) / 180;
    context.beginPath();
    context.moveTo(center, center);
    context.arc(center, center, radius, start, start + step);
    context.closePath();
    context.fillStyle = GAME_COLORS[index % GAME_COLORS.length];
    context.fill();
    context.strokeStyle = "#fff8e8";
    context.lineWidth = 5;
    context.stroke();
    context.save();
    context.translate(center, center);
    context.rotate(start + step / 2 + Math.PI / 2);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#252034";
    context.font = '600 25px "Outfit"';
    if (count <= 48)
      context.fillText(String(index + 1).padStart(2, "0"), 0, -945);
    const person = people[index];
    const name = (
      person?.id.startsWith("visual-group-")
        ? person.name.replace(/\s/g, "")
        : (person?.name.split(" ")[0] ?? "SORTE")
    ).toLocaleUpperCase("pt-BR");
    if (count <= 32) {
      const letters = [...name.slice(0, 11)];
      const size = count > 24 ? 57 : count > 18 ? 66 : 79;
      const line = Math.min(78, 575 / Math.max(letters.length, 1));
      context.font = `900 ${size}px "Barlow Condensed"`;
      context.lineJoin = "round";
      context.lineWidth = 6;
      context.strokeStyle = "#fffaf1";
      context.fillStyle = "#16152b";
      letters.forEach((letter, letterIndex) => {
        context.strokeText(letter, 0, -830 + letterIndex * line);
        context.fillText(letter, 0, -830 + letterIndex * line);
      });
    } else {
      context.font = `900 ${count > 48 ? 27 : 40}px "Barlow Condensed"`;
      context.fillStyle = "#17203d";
      if (count <= 80)
        context.fillText(
          count > 48 ? String(index + 1) : name.slice(0, 8),
          0,
          -780,
        );
    }
    context.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function hubTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff9df";
  context.fillRect(0, 0, 512, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createWheelScene(
  host: HTMLElement,
  people: WheelEntry[],
  initial: number,
  availability: (available: boolean) => void,
  initialView: WheelView | null = null,
  onDragPlay: (direction: 1 | -1) => void = () => {},
): WheelScene {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.5 : 2),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  camera.position.set(0, 0, 8.8);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = false;
  controls.minAzimuthAngle = -0.7;
  controls.maxAzimuthAngle = 0.7;
  controls.minPolarAngle = Math.PI / 2 - 0.55;
  controls.maxPolarAngle = Math.PI / 2 + 0.15;
  controls.rotateSpeed = 0.55;
  controls.saveState();
  if (initialView) {
    camera.position.set(initialView.x, initialView.y, initialView.z);
    controls.update();
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.03);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.7;
  room.dispose();
  pmrem.dispose();
  const rig = new THREE.Group();
  rig.rotation.x = -0.52;
  scene.add(rig);
  const disc = new THREE.Group();
  disc.rotation.z = (-initial * Math.PI) / 180;
  rig.add(disc);
  const gold = new THREE.MeshStandardMaterial({
    color: "#eebc53",
    metalness: 0.78,
    roughness: 0.22,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: "#c8d6e7",
    metalness: 0.92,
    roughness: 0.2,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: "#151e4a",
    metalness: 0.65,
    roughness: 0.32,
  });
  const face = faceTexture(people);
  const hub = hubTexture();
  const circle = (
    radius: number,
    depth: number,
    material: THREE.Material,
    parent: THREE.Group,
    z: number,
  ) => {
    const geometry = new THREE.CylinderGeometry(radius, radius, depth, 128);
    geometry.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = z;
    parent.add(mesh);
    return mesh;
  };
  circle(2.53, 0.27, dark, rig, -0.1);
  circle(2.49, 0.21, chrome, rig, 0.03);
  circle(2.36, 0.15, gold, disc, 0.14);
  // Printed labels retain their contrast while the physical rim receives the studio reflections.
  const top = new THREE.Mesh(
    new THREE.CircleGeometry(2.35, 128),
    new THREE.MeshBasicMaterial({ map: face, toneMapped: false }),
  );
  top.position.z = 0.225;
  disc.add(top);
  const ring = (
    radius: number,
    tube: number,
    material: THREE.Material,
    z: number,
    parent = rig,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 12, 160),
      material,
    );
    mesh.position.z = z;
    parent.add(mesh);
    return mesh;
  };
  ring(2.5, 0.037, gold, 0.14);
  ring(2.38, 0.025, chrome, 0.23);
  ring(2.58, 0.018, gold, -0.06);
  const bulbMaterial = new THREE.MeshStandardMaterial({
    color: "#fff5c9",
    emissive: "#ffcf75",
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  const bulbGeometry = new THREE.SphereGeometry(0.033, 10, 8);
  const bulbs: THREE.Mesh[] = [];
  for (let index = 0; index < 64; index++) {
    const theta = (index / 64) * Math.PI * 2;
    const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial.clone());
    bulb.position.set(Math.cos(theta) * 2.445, Math.sin(theta) * 2.445, 0.19);
    rig.add(bulb);
    bulbs.push(bulb);
  }
  const pegGeometry = new THREE.CylinderGeometry(0.016, 0.022, 0.14, 8);
  pegGeometry.rotateX(Math.PI / 2);
  const pegSectors = wheelSectors(
    people.length
      ? people
      : Array.from({ length: 16 }, (_, index) => ({
          id: String(index),
          name: "",
        })),
  );
  for (const sector of pegSectors.slice(0, 80)) {
    const theta = Math.PI / 2 - (sector.start * Math.PI) / 180;
    const peg = new THREE.Mesh(pegGeometry, chrome);
    peg.position.set(Math.cos(theta) * 2.34, Math.sin(theta) * 2.34, 0.3);
    disc.add(peg);
  }
  circle(0.66, 0.16, gold, rig, 0.32);
  ring(0.66, 0.038, gold, 0.42);
  const badge = new THREE.Mesh(
    new THREE.CircleGeometry(0.61, 80),
    new THREE.MeshBasicMaterial({ map: hub, toneMapped: false }),
  );
  badge.position.z = 0.412;
  rig.add(badge);
  function renderScene() {
    renderer.render(scene, camera);
    const center = badge.getWorldPosition(new THREE.Vector3()).project(camera);
    const right = new THREE.Vector3(0.59, 0, badge.position.z)
      .applyMatrix4(rig.matrixWorld)
      .project(camera);
    const top = new THREE.Vector3(0, 0.59, badge.position.z)
      .applyMatrix4(rig.matrixWorld)
      .project(camera);
    const toPixels = (point: THREE.Vector3) => ({
      x: (point.x * 0.5 + 0.5) * host.clientWidth,
      y: (-point.y * 0.5 + 0.5) * host.clientHeight,
    });
    const c = toPixels(center),
      r = toPixels(right),
      t = toPixels(top);
    const shell = host.parentElement;
    shell?.style.setProperty("--hub-x", `${c.x}px`);
    shell?.style.setProperty("--hub-y", `${c.y}px`);
    shell?.style.setProperty(
      "--hub-width",
      `${Math.hypot(r.x - c.x, r.y - c.y) * 2}px`,
    );
    shell?.style.setProperty(
      "--hub-height",
      `${Math.hypot(t.x - c.x, t.y - c.y) * 2}px`,
    );
    shell?.style.setProperty(
      "--hub-rotation",
      `${Math.atan2(r.y - c.y, r.x - c.x)}rad`,
    );
  }
  const pointer = new THREE.Group();
  pointer.position.set(0, 2.62, 0.46);
  rig.add(pointer);
  const pointerShape = new THREE.Shape();
  pointerShape.moveTo(-0.14, 0.16);
  pointerShape.lineTo(0.14, 0.16);
  pointerShape.lineTo(0.045, -0.3);
  pointerShape.lineTo(0, -0.4);
  pointerShape.lineTo(-0.045, -0.3);
  pointerShape.closePath();
  const pointerMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pointerShape, {
      depth: 0.07,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 3,
    }),
    gold,
  );
  pointer.add(pointerMesh);
  const screw = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), chrome);
  screw.position.set(0, 0.055, 0.1);
  pointer.add(screw);
  const keyLight = new THREE.DirectionalLight("#fff2cc", 2);
  keyLight.position.set(-3, 5, 7);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight("#8ceeff", 1);
  fillLight.position.set(4, -2, 5);
  scene.add(fillLight);
  scene.add(new THREE.AmbientLight("#b6c5ff", 0.35));
  let frame = 0;
  let current = initial;
  let motion: {
    from: number;
    to: number;
    start: number;
    milliseconds: number;
    reduced: boolean;
  } | null = null;
  let disposed = false;
  let contextAvailable = true;
  let inputMode: "orbit" | "spin" = "orbit";
  let inputLocked = false;
  let gesture: {
    id: number;
    angle: number;
    from: number;
    x: number;
    y: number;
  } | null = null;
  const raycaster = new THREE.Raycaster();
  const wheelPoint = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    rig.updateWorldMatrix(true, false);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(
      rig.matrixWorld,
    );
    const origin = new THREE.Vector3(0, 0, 0.225).applyMatrix4(rig.matrixWorld);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      normal,
      origin,
    );
    const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    return hit ? rig.worldToLocal(hit) : null;
  };
  const cancelGesture = () => {
    if (!gesture) return;
    const cancelled = gesture;
    gesture = null;
    current = cancelled.from;
    if (renderer.domElement.hasPointerCapture(cancelled.id))
      renderer.domElement.releasePointerCapture(cancelled.id);
    renderer.domElement.classList.remove("dragging-wheel");
    disc.rotation.z = (-current * Math.PI) / 180;
    if (contextAvailable && !disposed) renderScene();
  };
  const dragStart = (event: PointerEvent) => {
    if (
      inputMode !== "spin" ||
      inputLocked ||
      motion ||
      gesture ||
      !contextAvailable ||
      event.button !== 0
    )
      return;
    const point = wheelPoint(event);
    if (!point) return;
    const radius = Math.hypot(point.x, point.y);
    if (radius < 1.7 || radius > 2.65) return;
    event.preventDefault();
    gesture = {
      id: event.pointerId,
      angle: Math.atan2(point.y, point.x),
      from: current,
      x: event.clientX,
      y: event.clientY,
    };
    renderer.domElement.setPointerCapture(event.pointerId);
    renderer.domElement.classList.add("dragging-wheel");
  };
  const dragMove = (event: PointerEvent) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    const point = wheelPoint(event);
    if (!point || Math.hypot(point.x, point.y) < 0.5) return;
    const angle = Math.atan2(point.y, point.x);
    const delta = Math.atan2(
      Math.sin(angle - gesture.angle),
      Math.cos(angle - gesture.angle),
    );
    current -= (delta * 180) / Math.PI;
    gesture.angle = angle;
    disc.rotation.z = (-current * Math.PI) / 180;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(drawFrame);
  };
  const dragEnd = (event: PointerEvent) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    dragMove(event);
    const delta = current - gesture.from;
    const distance = Math.hypot(
      event.clientX - gesture.x,
      event.clientY - gesture.y,
    );
    if (Math.abs(delta) < 8 || distance < 18) {
      cancelGesture();
      return;
    }
    gesture = null;
    renderer.domElement.classList.remove("dragging-wheel");
    if (renderer.domElement.hasPointerCapture(event.pointerId))
      renderer.domElement.releasePointerCapture(event.pointerId);
    inputLocked = true;
    onDragPlay(delta >= 0 ? 1 : -1);
  };
  renderer.domElement.addEventListener("pointerdown", dragStart);
  renderer.domElement.addEventListener("pointermove", dragMove);
  renderer.domElement.addEventListener("pointerup", dragEnd);
  renderer.domElement.addEventListener("pointercancel", cancelGesture);
  renderer.domElement.addEventListener("lostpointercapture", cancelGesture);
  const drawFrame = (time: number) => {
    if (disposed || !contextAvailable) return;
    if (motion) {
      const progress = Math.min((time - motion.start) / motion.milliseconds, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      current = motion.from + (motion.to - motion.from) * eased;
      disc.rotation.z = (-current * Math.PI) / 180;
      pointer.rotation.z = motion.reduced
        ? 0
        : Math.sin(((current * Math.PI) / 180) * people.length) *
          0.08 *
          (1 - progress);
      bulbs.forEach((bulb, index) => {
        const material = bulb.material;
        if (material instanceof THREE.MeshStandardMaterial)
          material.emissiveIntensity = motion!.reduced
            ? 1.5
            : 1.2 + Math.sin(time * 0.009 + index * 0.6) * 0.55;
      });
      if (progress === 1) {
        motion = null;
        pointer.rotation.z = 0;
      }
    }
    renderScene();
    if (motion && !document.hidden) frame = requestAnimationFrame(drawFrame);
  };
  const resize = () => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height || disposed || !contextAvailable) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderScene();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const cameraChanged = () => {
    if (!disposed && contextAvailable) renderScene();
  };
  controls.addEventListener("change", cameraChanged);
  const keyboardOrbit = (event: KeyboardEvent) => {
    if (inputMode !== "orbit") return;
    const steps: Record<string, [number, number]> = {
      ArrowLeft: [-0.12, 0],
      ArrowRight: [0.12, 0],
      ArrowUp: [0, -0.12],
      ArrowDown: [0, 0.12],
    };
    const step = steps[event.key];
    if (!step) return;
    event.preventDefault();
    const spherical = new THREE.Spherical().setFromVector3(
      camera.position.clone().sub(controls.target),
    );
    spherical.theta = THREE.MathUtils.clamp(
      spherical.theta + step[0],
      controls.minAzimuthAngle,
      controls.maxAzimuthAngle,
    );
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi + step[1],
      controls.minPolarAngle,
      controls.maxPolarAngle,
    );
    camera.position.setFromSpherical(spherical).add(controls.target);
    controls.update();
  };
  host.addEventListener("keydown", keyboardOrbit);
  const visibility = () => {
    cancelAnimationFrame(frame);
    if (!document.hidden) frame = requestAnimationFrame(drawFrame);
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    contextAvailable = false;
    cancelAnimationFrame(frame);
    availability(false);
  };
  const contextRestored = () => {
    if (!disposed) {
      contextAvailable = true;
      resize();
      frame = requestAnimationFrame(drawFrame);
      availability(true);
    }
  };
  document.addEventListener("visibilitychange", visibility);
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  renderer.domElement.addEventListener("webglcontextrestored", contextRestored);
  return {
    setInteraction(mode, locked) {
      cancelGesture();
      inputMode = mode;
      inputLocked = locked;
      controls.enabled = mode === "orbit";
    },
    readView() {
      return {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
      };
    },
    resetView() {
      controls.reset();
      cameraChanged();
    },
    move(degrees, seconds, reduced) {
      if (disposed) return;
      cancelAnimationFrame(frame);
      if (!seconds || Math.abs(degrees - current) < 0.001) {
        current = degrees;
        motion = null;
        disc.rotation.z = (-degrees * Math.PI) / 180;
        pointer.rotation.z = 0;
        if (contextAvailable) renderScene();
        return;
      }
      motion = {
        from: current,
        to: degrees,
        start: performance.now(),
        milliseconds: seconds * 1000,
        reduced,
      };
      frame = requestAnimationFrame(drawFrame);
    },
    dispose() {
      cancelGesture();
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.removeEventListener("change", cameraChanged);
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", dragStart);
      renderer.domElement.removeEventListener("pointermove", dragMove);
      renderer.domElement.removeEventListener("pointerup", dragEnd);
      renderer.domElement.removeEventListener("pointercancel", cancelGesture);
      renderer.domElement.removeEventListener(
        "lostpointercapture",
        cancelGesture,
      );
      host.removeEventListener("keydown", keyboardOrbit);
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      renderer.domElement.removeEventListener(
        "webglcontextrestored",
        contextRestored,
      );
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          const items = Array.isArray(object.material)
            ? object.material
            : [object.material];
          items.forEach((material) => materials.add(material));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      face.dispose();
      hub.dispose();
      environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
