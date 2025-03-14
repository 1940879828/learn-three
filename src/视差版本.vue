<script setup lang="ts">
import * as THREE from "three";
import {onMounted, onUnmounted} from "vue";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls.js";
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

type ParallaxLayer = {
  obj: THREE.Object3D
  depthFactor: number
}
const layers: ParallaxLayer[] = []
let mouse = new THREE.Vector2()
const sensitivity = 0.3 // 鼠标灵敏度
const baseIntensity = 0.2 // 基础位移强度
// 初始化基础场景
const scene = new THREE.Scene();

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

const spotLight2 = createSpotlight({
  scene,
  X:0,
  Y:2,
  Z:1,
  targetX: 1,
  targetY: 1,
  targetZ: 0,
});

// 新增视差系统初始化
const initParallaxSystem = ({wall,rectangle,textMesh,spotLight}:{
  wall: THREE.Mesh,
  rectangle:THREE.Mesh,
  textMesh:THREE.Mesh,
  spotLight: THREE.SpotLight,
}) => {
  // 将现有对象分层
  layers.push(
    { obj: wall, depthFactor: 0 },      // 背景层（移动量30%）
    { obj: rectangle, depthFactor: 0.6 }, // 中间层（移动量60%）
    { obj: textMesh, depthFactor: 0.6 },
    { obj: spotLight, depthFactor: 0 } // 光源层（100%跟随）
  )

  // 初始化灯光投影更新
  spotLight.target = rectangle
  spotLight.target.updateMatrixWorld()

  // 添加鼠标追踪
  window.addEventListener('mousemove', onMouseMove)
}

// 鼠标事件处理
const onMouseMove = (event: MouseEvent) => {
  const rawX = (event.clientX / window.innerWidth) * 2 - 1
  const rawY = -(event.clientY / window.innerHeight) * 2 + 1
  mouse.x = rawX * sensitivity
  mouse.y = rawY * sensitivity
}

// 新增动画更新逻辑
const updateParallax = () => {
  layers.forEach(layer => {
    // 计算层位移
    const xOffset = mouse.x * baseIntensity * layer.depthFactor
    const yOffset = mouse.y * baseIntensity * layer.depthFactor

    // 应用偏移
    layer.obj.position.x = layer.obj.userData.originalX + xOffset
    layer.obj.position.y = layer.obj.userData.originalY + yOffset
  })

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

// 创建矩形
const createRectangle = () => {
  const width = 0.8;
  const height = 0.8;
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

  const rectX = 3
  const rectY = 1
  // 位置设置（墙面正前方）
  rectangle.position.set(
    rectX,                  // 保持与墙面X轴对齐
    rectY,                  // 保持与墙面Y轴对齐
    0.1       // Z轴偏移：厚度的一半，使矩形前表面紧贴墙面
  );
  rectangle.userData.originalX = rectX;  // 初始X
  rectangle.userData.originalY = rectY;  // 初始Y

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

// 加载中文自定义字体
const createChineseText = async () => {
  const loader = new FontLoader();
  // 使用Promise包装字体加载
  return new Promise<THREE.Mesh>((resolve, reject) => {
    loader.load('/helvetiker_bold.typeface.json',
      (font) => {
        const geometry = new TextGeometry('Hello World', {
          font: font,
          size: 0.05,
          depth: 0.01,
          curveSegments: 12,
          bevelEnabled: false
        });

        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          metalness: 1
        });

        const textMesh = new THREE.Mesh(geometry, material);
        const posX = 1;
        const posY = 1;

        textMesh.position.set(posX, posY, 0.2);
        textMesh.userData.originalX = posX;
        textMesh.userData.originalY = posY;

        textMesh.castShadow = true;
        textMesh.receiveShadow = true;

        // 将创建好的mesh通过Promise返回
        resolve(textMesh);
      },
      undefined,  // 添加progress回调占位
      (error) => {
        reject(new Error(`字体加载失败: ${error}`));
      }
    );
  });
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
  const rectangle = createRectangle();

  // 异步加载文字
  const textMesh = await createChineseText();

  // 添加坐标系和网格地板
  addAuxiliaryCoordinateSystem(scene)

  // 添加元素到场景
  scene.add(wall);
  scene.add(rectangle);
  scene.add(spotLight);
  scene.add(spotLight2);
  scene.add(textMesh);

  // 添加平行光源
  const light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(0, 50, 0)
  scene.add(light)
  const lightHelper = new THREE.DirectionalLightHelper(light);
  scene.add(lightHelper);

  // 在场景中添加环境光（柔和补光）
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 强度0.5
  scene.add(ambientLight);

  // 在场景中添加目标点标记
  addTargetPoint({x:1,y:1,z:0,scene})

  // 添加相机朝向辅助线
  addCameraHelper(scene)

  // 初始化视差系统
  initParallaxSystem({
    wall,
    rectangle,
    textMesh,
    spotLight
  });
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
