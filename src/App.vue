<script setup lang="ts">
import * as THREE from "three";
import {onMounted, onUnmounted} from "vue";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";

// 初始化基础场景
const scene = new THREE.Scene();

// 新增角度限制函数
const clampAngle = (currentPos: THREE.Vector3, lightPos: THREE.Vector3, minAngle: number, maxAngle: number) => {
  // 转换为二维平面坐标（忽略Z轴）
  const dir = new THREE.Vector2(
    currentPos.x - lightPos.x,
    currentPos.y - lightPos.y // 使用Y轴代替Z轴
  ).normalize();

  // 计算当前角度（以度为单位）
  let angle = Math.atan2(dir.y, dir.x) * THREE.MathUtils.RAD2DEG;
  if (angle < 0) angle += 360;

  // 应用角度限制（示例：0°-5°）
  if (angle < minAngle) {
    angle = minAngle;
  } else if (angle > maxAngle) {
    angle = maxAngle;
  }

  // 转换为新的方向向量
  const rad = angle * THREE.MathUtils.DEG2RAD;
  const radius = dir.length();
  return new THREE.Vector3(
    lightPos.x + Math.cos(rad) * radius,
    lightPos.y + Math.sin(rad) * radius,
    lightPos.z // 保持Z轴不变
  );
}

// 在初始化时添加
const addDebugHelpers = () => {
  // 显示目标点轨迹
  const targetHelper = new THREE.AxesHelper(0.5)
  targetHelper.name = 'targetHelper'
  spotLight.target.add(targetHelper)

  // 显示射线落点
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.05),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  )
  sphere.name = 'rayPoint'
  scene.add(sphere)
}


// 添加射灯
const createSpotlight = ({scene,X,Y,Z,targetZ,targetY,targetX}:{
  scene:THREE.Scene
  X:number
  Y:number
  Z:number
  targetX:number
  targetY:number
  targetZ:number
}) => {
  const spotLight = new THREE.SpotLight(
    0xfff4e5,   // 暖白色 (16进制颜色)
    8,          // 光照强度
    10,         // 照射距离
    Math.PI/9,  // 照射角度 45度 (弧度制)
    0.5,       // 边缘衰减系数 (0-1)
    0.8         // 光强衰减系数
  )

  spotLight.position.set(X,Y,Z)
  spotLight.target.position.set(targetX,targetY,targetZ)
  spotLight.userData.originalX = X
  spotLight.userData.originalY = Y
  spotLight.userData.originalZ = Z
  spotLight.target.updateMatrixWorld()

  // 创建目标对象并添加到场景
  const target = new THREE.Object3D()
  target.position.set(targetX, targetY, targetZ)
  spotLight.target = target
  scene.add(target) // 新增这行

  // 阴影优化配置
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 2048;  // 阴影分辨率
  spotLight.shadow.mapSize.height = 2048;
  spotLight.shadow.bias = -0.001;        // 消除阴影瑕疵
  spotLight.shadow.normalBias = 0.05;    // 解决曲面阴影问题

  // 添加辅助线（调试用）
  const lightHelper = new THREE.SpotLightHelper(spotLight);
  scene.add(lightHelper);

  return spotLight;
}

const spotLight = createSpotlight({
  scene,
  X:1.8,
  Y:1.8,
  Z:0.2,
  targetX: 1,
  targetY: 1,
  targetZ: 0,
});

// 新增动画更新逻辑
const updateParallax = () => {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

  // 创建XY平面（法向量为Z轴方向）
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -spotLight.position.z);
  const intersection = new THREE.Vector3();

  if (raycaster.ray.intersectPlane(plane, intersection)) {
    // 保持Z轴不变
    intersection.z = spotLight.position.z;

    // 应用角度限制
    const clampedPos = clampAngle(
      intersection,
      spotLight.position,
      210,   // 最小角度
      330    // 最大角度
    );

    // 更新目标位置
    spotLight.target.position.lerp(clampedPos, 0.1);
    spotLight.target.updateMatrixWorld();
  }
  // 更新阴影
  spotLight.target.updateMatrixWorld()
  renderer.shadowMap.needsUpdate = true
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
  updateParallax() // 新增视差更新
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
  scene.add(spotLight);
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

onMounted(async () => {
  try {
    await initAll();
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
});
</script>

<template>
  
</template>

<style scoped>
</style>
