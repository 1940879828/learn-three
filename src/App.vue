<script setup lang="ts">
import * as THREE from "three";
import {onMounted, onUnmounted, ref} from "vue";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import {createSpotlights} from "./lib/spotLightUtils.ts"

// 初始化基础场景
const scene = new THREE.Scene();
const spotlights = ref<THREE.SpotLight[]>([]);
const mousePos = ref(new THREE.Vector2());

const createSpotlightList = (scene:THREE.Scene) => {
  const startPos = new THREE.Vector3(0, 2,0.2)
  const direction = new THREE.Vector3(1, 0, 0)
  const targetOffset = new THREE.Vector3(0, -2, 0)
  const lights = createSpotlights({
    scene,
    startPosition: startPos,
    direction,
    count: 6,
    spacing: 2,
    targetOffset,
    color: 0xffffff
  })
  spotlights.value = lights;
}

// 新增角度限制函数
const clampAngle = (currentPos: THREE.Vector3, lightPos: THREE.Vector3, minAngle: number, maxAngle: number) => {
  // 转换为相对于灯光的位置
  const relativePos = currentPos.clone().sub(lightPos);

  // 转换为极坐标角度
  let angle = Math.atan2(relativePos.y, relativePos.x) * THREE.MathUtils.RAD2DEG;
  if (angle < 0) angle += 360;

  // 限制角度范围
  angle = THREE.MathUtils.clamp(angle, minAngle, maxAngle);

  // 转换回笛卡尔坐标
  const distance = relativePos.length();
  const newX = Math.cos(angle * THREE.MathUtils.DEG2RAD) * distance;
  const newY = Math.sin(angle * THREE.MathUtils.DEG2RAD) * distance;

  return new THREE.Vector3(
    lightPos.x + newX,
    lightPos.y + newY,
    lightPos.z
  );
}

// 在初始化时添加
const addDebugHelpers = () => {
  // 显示目标点轨迹
  const targetHelper = new THREE.AxesHelper(0.5)
  targetHelper.name = 'targetHelper'

  // 显示射线落点
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.05),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  )
  sphere.name = 'rayPoint'
  scene.add(sphere)
}

// 新增动画更新逻辑
const updateParallax = () => {
  if (!spotlights.value.length) return;

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mousePos.value, camera);

  // 创建XY平面（与所有灯光同一Z轴平面）
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const intersection = new THREE.Vector3();

  spotlights.value.forEach(spotLight => {
    if (raycaster.ray.intersectPlane(plane, intersection)) {
      // 保持Z轴与灯光一致
      intersection.z = spotLight.position.z;

      // 应用角度限制（示例：210°-330°）
      const clampedPos = clampAngle(
        intersection,
        spotLight.position,
        210,
        330
      );

      // 平滑移动目标点
      spotLight.target.position.lerp(clampedPos, 0.1);
      spotLight.target.updateMatrixWorld();
    }
  });

  renderer.shadowMap.needsUpdate = true;
}

// 添加坐标系辅助线
const addAuxiliaryCoordinateSystem = (scene:THREE.Scene) => {
  // 添加坐标系辅助线（参数为坐标轴长度）
  const axesHelper = new THREE.AxesHelper(5); // 创建 5 单位长度的坐标轴
  scene.add(axesHelper);
  // 添加网格辅助地面
  const gridHelper = new THREE.GridHelper(10, 10);
  scene.add(gridHelper);
}

// 初始化相机
const initCamera = () => {
  const camera = new THREE.PerspectiveCamera(
    75,// fov（视场角）：垂直视野角度（单位：度）
    window.innerWidth / window.innerHeight,// aspect（宽高比）：通常用屏幕宽高比
    0.1,// near（近裁剪面）：比这个距离近的物体不可见
    1000 // far（远裁剪面）：比这个距离远的物体不可见
  )
  camera.position.set(1,1,1);
  camera.lookAt(1, 1, 0)
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  return camera
}

// 初始化控制器
const initControls = ({camera}:{
  camera: THREE.PerspectiveCamera
}) => {
  // 初始化控制器
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(1, 1, 0) // 关键设置：将控制焦点锁定到指定坐标
  // 阻尼
  controls.enableDamping = true
  return controls
}

// 初始化渲染器
const initRenderer = () => {
  const renderer = new THREE.WebGLRenderer({
    // 抗锯齿
    antialias: true,
  })
  renderer.shadowMap.enabled = true; // 必须开启！
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 柔和阴影
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement);
  return renderer
}

// 渲染函数
const render = () => {
  requestAnimationFrame(render);
  updateParallax()
  renderer.render(scene, camera);
  controls.update()
}

// 创建黑色背景墙
const createWall = () => {
  const geometry = new THREE.PlaneGeometry(12, 3);
  geometry.translate(6,1.5,0)
  const material = new THREE.MeshStandardMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.2
  });
  const wall = new THREE.Mesh(geometry, material);
  wall.receiveShadow = true;
  const wallX = -1
  const wallY = 0
  wall.position.set(wallX, wallY, 0);
  wall.userData.originalX = wallX;  // 存储初始X位置
  wall.userData.originalY = wallY;   // 存储初始Y位置
  return wall;
};

// 在场景中添加相机朝向辅助线
const addCameraHelper = (scene:THREE.Scene) => {
  const cameraHelper = new THREE.CameraHelper(camera)
  scene.add(cameraHelper)
}

// ===============================main===================================

// 初始化相机
const camera = initCamera()

// 初始化渲染器
const renderer = initRenderer()

// 初始化控制器
const controls = initControls({camera})

// 将主要初始化逻辑封装成函数
const initAll = async () => {
  const wall = createWall();

  // 添加坐标系和网格地板
  addAuxiliaryCoordinateSystem(scene)

  // 添加元素到场景
  addDebugHelpers()
  scene.add(wall);
  // scene.add(spotLight);
  createSpotlightList(scene)
  // 添加平行光源
  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(0, 50, 0)
  scene.add(light)
  const lightHelper = new THREE.DirectionalLightHelper(light);
  scene.add(lightHelper);

  // 在场景中添加环境光（柔和补光）
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 强度0.5
  scene.add(ambientLight);


  // 添加相机朝向辅助线
  addCameraHelper(scene)
}

const onMouseMove = (event: MouseEvent) => {
  mousePos.value.x = (event.clientX / window.innerWidth) * 2 - 1;
  mousePos.value.y = -(event.clientY / window.innerHeight) * 2 + 1;
};


onMounted(async () => {
  try {
    await initAll();
    window.addEventListener('mousemove', onMouseMove);
    render();
  } catch (error) {
    console.error('初始化失败:', error);
  }
})

// 运行渲染器
render()

// 添加清理
onUnmounted(() => {
  scene?.clear();
  renderer?.dispose();
  window.removeEventListener('mousemove', onMouseMove);
});
</script>

<template>
  
</template>

<style scoped>
</style>
