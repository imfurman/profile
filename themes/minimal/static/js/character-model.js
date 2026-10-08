import * as THREE from "../vendor/three/three.module.min.js";
import { GLTFLoader } from "../vendor/three/addons/GLTFLoader.js";

// Authored, skinned Quaternius assets. Provenance and the original CC0 licenses
// live alongside the models. The preparation script simplifies the outfit;
// palette, eyewear and skeletal motion are configured here.
export async function createCharacter(loadAsset) {
  const loader = new GLTFLoader();
  const load =
    loadAsset ??
    ((name) =>
      loader.loadAsync(
        new URL(`../models/portrait/${name}.glb?v=7`, import.meta.url).href,
      ));
  const [headAsset, outfitAsset, hairAsset, beardAsset] = await Promise.all(
    ["head", "outfit", "hair", "beard"].map(load),
  );
  const character = new THREE.Group();
  const figure = new THREE.Group();
  figure.add(outfitAsset.scene);
  const neutral = outfitAsset.animations.find(
    (clip) => clip.name === "Idle_Neutral",
  );
  const mixer = new THREE.AnimationMixer(outfitAsset.scene);
  mixer.clipAction(neutral).play();
  mixer.update(0);
  figure.updateMatrixWorld(true);
  // Make the authored IK feet follow the knees during our short backflip.
  for (const side of ["L", "R"]) {
    outfitAsset.scene
      .getObjectByName(`LowerLeg${side}`)
      .attach(outfitAsset.scene.getObjectByName(`Foot${side}`));
  }
  character.add(figure);
  character.scale.setScalar(2.45);

  const material = (color, roughness = 0.85) =>
    new THREE.MeshStandardMaterial({ color, roughness });
  const skin = material("#d5ad91");
  const fabric = material("#444e5c");
  const shirt = material("#f1eee5");
  const shoes = material("#303235");
  const hair = material("#282624");
  const metal = new THREE.MeshStandardMaterial({
    color: "#747571",
    metalness: 0.65,
    roughness: 0.35,
  });

  outfitAsset.scene.traverse((node) => {
    if (!node.isMesh) return;
    const name = node.material.name;
    node.material =
      name === "Skin"
        ? skin
        : name === "White"
          ? shirt
          : name === "Black"
            ? shoes
            : fabric;
    node.geometry.deleteAttribute("color");
    // Average duplicated export vertices to soften the stock low-poly shading.
    const positions = node.geometry.attributes.position;
    const normals = node.geometry.attributes.normal;
    const sums = new Map();
    const keys = [];
    for (let i = 0; i < positions.count; i++) {
      const key = [positions.getX(i), positions.getY(i), positions.getZ(i)]
        .map((v) => v.toFixed(5))
        .join(",");
      keys.push(key);
      if (!sums.has(key)) sums.set(key, new THREE.Vector3());
      sums.get(key).add(new THREE.Vector3().fromBufferAttribute(normals, i));
    }
    for (const normal of sums.values()) normal.normalize();
    for (let i = 0; i < normals.count; i++) {
      const normal = sums.get(keys[i]);
      normals.setXYZ(i, normal.x, normal.y, normal.z);
    }
  });

  const head = outfitAsset.scene.getObjectByName("Head");
  const details = new THREE.Group();
  figure.add(details);
  // Bake the separate authored face in its rest pose, then bind it as one
  // rigid head to the suit rig. This avoids mismatched skeleton proportions.
  headAsset.scene.updateMatrixWorld(true);
  headAsset.scene.traverse((node) => {
    if (!node.isMesh) return;
    const geometry = node.geometry.clone();
    const point = new THREE.Vector3();
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      node.getVertexPosition(i, point).applyMatrix4(node.matrixWorld);
      geometry.attributes.position.setXYZ(i, point.x, point.y, point.z);
    }
    const face = new THREE.Mesh(
      geometry,
      node.material.name === "MI_Superhero_Male"
        ? skin
        : node.material.name === "MI_Eyes"
          ? node.material
          : hair,
    );
    face.name = node.name;
    details.add(face);
  });
  for (const asset of [hairAsset, beardAsset]) {
    asset.scene.traverse((node) => {
      if (node.isMesh) node.material = hair;
    });
    details.add(asset.scene);
  }

  function line(points, radius) {
    const path = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(path, 24, radius, 8, false),
      metal,
    );
    details.add(mesh);
  }
  // Thin round frames, scaled to the authored face, without opaque fake lenses.
  for (const side of [-1, 1]) {
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.034, 0.00155, 10, 64),
      metal,
    );
    rim.position.set(side * 0.036, 1.701, 0.092);
    rim.scale.y = 0.94;
    details.add(rim);
    line(
      [
        [side * 0.069, 1.704, 0.089],
        [side * 0.083, 1.705, 0.055],
        [side * 0.085, 1.7, -0.009],
      ],
      0.0016,
    );
  }
  line(
    [
      [-0.003, 1.706, 0.094],
      [0, 1.71, 0.098],
      [0.003, 1.706, 0.094],
    ],
    0.00155,
  );
  details.position.set(0, 0.018, 0.052);
  figure.updateMatrixWorld(true);
  head.attach(details);

  const bones = [];
  const inverse = new THREE.Quaternion();
  for (const asset of [outfitAsset]) {
    asset.scene.traverse((bone) => {
      if (!bone.isBone) return;
      bone.parent.getWorldQuaternion(inverse).invert();
      bones.push({
        bone,
        rest: bone.quaternion.clone(),
        x: new THREE.Vector3(1, 0, 0).applyQuaternion(inverse),
        y: new THREE.Vector3(0, 1, 0).applyQuaternion(inverse),
        z: new THREE.Vector3(0, 0, 1).applyQuaternion(inverse),
      });
    });
  }
  figure.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = false;
    // Skinning changes the bounds during the flip; the small scene never needs culling.
    node.frustumCulled = false;
  });
  const rotation = new THREE.Quaternion();
  const eyeMesh = details.getObjectByName("Eyes");
  const eyePositions = eyeMesh.geometry.attributes.position;
  const eyeRest = eyePositions.array.slice();
  const eyePoint = new THREE.Vector3();
  const eyeRotation = new THREE.Quaternion();
  function turn(part, axis, angle) {
    part.bone.quaternion.premultiply(
      rotation.setFromAxisAngle(part[axis], angle),
    );
  }
  let tucked = 0,
    armSwing = 0;
  function pose(tuck, arms = tuck) {
    tucked = tuck;
    armSwing = arms;
  }
  function update(gaze, elapsed) {
    const breath = Math.sin(elapsed * 1.65);
    for (const part of bones) {
      const name = part.bone.name;
      part.bone.quaternion.copy(part.rest);
      if (name.startsWith("UpperArm")) {
        turn(part, "x", -armSwing * 2.15 + 0.015 * breath);
      } else if (name.startsWith("LowerArm")) {
        turn(part, "x", -tucked * 0.8);
      } else if (name.startsWith("UpperLeg")) {
        turn(part, "x", -tucked * 1.18);
      } else if (name.startsWith("LowerLeg")) {
        turn(part, "x", tucked * 1.8);
      } else if (name === "Chest") {
        turn(part, "x", 0.005 * breath + tucked * 0.16);
      } else if (name === "Neck") {
        turn(part, "x", -0.04 - gaze.y * 0.055);
        turn(part, "y", gaze.x * 0.08);
      } else if (name === "Head") {
        turn(part, "x", -0.2 - gaze.y * 0.17);
        turn(part, "y", gaze.x * 0.38);
        turn(part, "z", -gaze.x * 0.018);
      }
    }
    // Move the authored eyes within their sockets while retaining their skin weights.
    eyeRotation.setFromEuler(new THREE.Euler(-gaze.y * 0.11, gaze.x * 0.15, 0));
    for (let i = 0; i < eyePositions.count; i++) {
      const x = eyeRest[i * 3],
        y = eyeRest[i * 3 + 1],
        z = eyeRest[i * 3 + 2];
      const centerX = Math.sign(x) * 0.0335;
      eyePoint
        .set(x - centerX, y - 1.6985, z - 0.065)
        .applyQuaternion(eyeRotation);
      eyePositions.setXYZ(
        i,
        eyePoint.x + centerX,
        eyePoint.y + 1.6985,
        eyePoint.z + 0.065,
      );
    }
    eyePositions.needsUpdate = true;
  }
  update(new THREE.Vector2(), 0);
  return { character, pose, update };
}
