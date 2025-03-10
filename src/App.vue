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

// 初始化渲染器
const initRenderer = () => {
  const renderer = new THREE.WebGLRenderer({
    // 抗锯齿
    antialias: true,
  })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement);
  return renderer
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
    color: 0xcccccc,
    side: THREE.DoubleSide,
    roughness: 0.8,
    metalness: 0.2
  });
  const wall = new THREE.Mesh(geometry, material);
  wall.receiveShadow = true;
  wall.position.set(1, 1, 0);
  return wall;
};

// ===============================main===================================

// 初始化场景
const scene = new THREE.Scene();

// 添加墙壁
let wall = createWall();
scene.add(wall);

// 添加坐标系和网格地板
addAuxiliaryCoordinateSystem()


// 初始化相机
const camera = initCamera()

// 在场景中添加目标点标记
const targetMarker = new THREE.Mesh(
  new THREE.SphereGeometry(0.05),
  new THREE.MeshBasicMaterial({ color: 0xff0000 })
)
targetMarker.position.set(1, 1, 0)
scene.add(targetMarker)

// 添加相机朝向辅助线
const cameraHelper = new THREE.CameraHelper(camera)
scene.add(cameraHelper)

// 初始化渲染器
const renderer = initRenderer()

// 初始化控制器
const controls = initControls({camera})

// 添加平行光源
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(0, 50, 0)
scene.add(light)

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
