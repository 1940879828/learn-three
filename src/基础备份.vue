<script setup lang="ts">
import * as THREE from "three";
import {onUnmounted} from "vue";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";

// 添加坐标系辅助线
const addAuxiliaryCoordinateSystem = () => {
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
  renderer.render(scene, camera);
  controls.update()
}

// 创建黑色背景墙
const createWall = () => {
  const geometry = new THREE.PlaneGeometry(2, 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x000000,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.2
  });
  const wall = new THREE.Mesh(geometry, material);
  wall.receiveShadow = true;
  wall.position.set(1, 1, 0);
  return wall;
};

// 创建矩形
const createRectangle = () => {
  const width = 1;
  const height = 1;
  const thickness = 0.05;
  // 创建立方体几何（带厚度）
  const geometry = new THREE.BoxGeometry(width, height, thickness);

  // 使用金属质感材质（与墙面区分）
  const material = new THREE.MeshStandardMaterial({
    color: 0x3a7ca5,      // 蓝色调
    roughness: 0.4,       // 比墙面更光滑
    metalness: 0.6,        // 更高金属度
    side: THREE.DoubleSide
  });

  const rectangle = new THREE.Mesh(geometry, material);

  // 位置设置（墙面正前方）
  rectangle.position.set(
    1,                  // 保持与墙面X轴对齐
    1,                  // 保持与墙面Y轴对齐
    0.1       // Z轴偏移：厚度的一半，使矩形前表面紧贴墙面
  );

  // 阴影设置
  rectangle.castShadow = true;    // 投射阴影
  rectangle.receiveShadow = true; // 接收阴影

  return rectangle;
};

// 在场景中添加目标点标记
const addTargetPoint = ({x,y,z,scene}:{x:number,y:number,z:number,scene: THREE.Scene}) => {
  const targetMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.05),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  )
  targetMarker.position.set(x,y,z)
  scene.add(targetMarker)
}

// 在场景中添加相机朝向辅助线
const addCameraHelper = (scene:THREE.Scene) => {
  const cameraHelper = new THREE.CameraHelper(camera)
  scene.add(cameraHelper)
}

// 添加射灯
const createSpotlight = () => {
  const spotLight = new THREE.SpotLight(
    0xfff4e5,   // 暖白色 (16进制颜色)
    8,          // 光照强度
    10,         // 照射距离
    Math.PI/9,  // 照射角度 45度 (弧度制)
    0.8,       // 边缘衰减系数 (0-1)
    0.8         // 光强衰减系数
  )

  spotLight.position.set(1.8,1.8,0.2)
  spotLight.target.position.set(1,1,0)
  spotLight.target.updateMatrixWorld()

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

// ===============================main===================================

// 初始化场景
const scene = new THREE.Scene();

// 添加墙壁
let wall = createWall();
scene.add(wall);

// 添加矩形
let rectangle = createRectangle();
scene.add(rectangle);

// 添加坐标系和网格地板
addAuxiliaryCoordinateSystem()

// 初始化相机
const camera = initCamera()

// 在场景中添加目标点标记
addTargetPoint({x:1,y:1,z:0,scene})

// 添加相机朝向辅助线
addCameraHelper(scene)

// 初始化渲染器
const renderer = initRenderer()

// 初始化控制器
const controls = initControls({camera})

// 添加平行光源
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(0, 50, 0)
scene.add(light)
const lightHelper = new THREE.DirectionalLightHelper(light);
scene.add(lightHelper);

// 在场景中添加环境光（柔和补光）
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 强度0.5
scene.add(ambientLight);

// 添加射灯
const spotLight = createSpotlight()
scene.add(spotLight)

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
