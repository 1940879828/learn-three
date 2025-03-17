import * as THREE from "three";

// 单灯配置参数类型
type SpotlightConfig = {
  scene: THREE.Scene;
  position: THREE.Vector3;
  target: THREE.Vector3;
  intensity?: number;            // 可选参数：光照强度
  distance?: number;             // 可选参数：照射距离
  color?: THREE.ColorRepresentation; // 颜色参数
};
// 添加单个射灯
export const createSpotlight = (props:SpotlightConfig) => {
  const {scene, position, target, intensity = 8, distance = 10, color = 0xfff4e5} = props;
  const spotLight = new THREE.SpotLight(
    color,   // 暖白色 (16进制颜色)
    intensity,          // 光照强度
    distance,         // 照射距离
    Math.PI/9,  // 照射角度 45度 (弧度制)
    0.5,       // 边缘衰减系数 (0-1)
    0.8         // 光强衰减系数
  )

  spotLight.position.copy(position);
  const targetObject = new THREE.Object3D();
  targetObject.position.copy(target);
  scene.add(targetObject);
  spotLight.target = targetObject;

  // 存储原始位置
  spotLight.userData.originalPosition = position.clone()
  spotLight.target.userData.originalTarget = target.clone()

  // 阴影优化配置
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.set(2048,2048);  // 阴影分辨率
  spotLight.shadow.bias = -0.001;        // 消除阴影瑕疵
  spotLight.shadow.normalBias = 0.05;    // 解决曲面阴影问题

  // 添加辅助线（调试用）
  const lightHelper = new THREE.SpotLightHelper(spotLight);
  scene.add(lightHelper);

  scene.add(spotLight)
  return spotLight;
}

// 批量创建参数类型
type SpotlightsLayoutConfig = {
  scene: THREE.Scene;
  startPosition: THREE.Vector3;  // 起始坐标
  direction: THREE.Vector3;      // 排列方向
  count: number;                 // 灯具数量
  spacing: number;              // 灯具间距
  targetOffset: THREE.Vector3;  // 目标点相对偏移
  color?: THREE.ColorRepresentation;
};

// 添加一排射灯
export const createSpotlights = (props:SpotlightsLayoutConfig) => {
  const {scene, startPosition, direction, count, spacing, targetOffset, color} = props;
  const lights: THREE.SpotLight[] = []

  // 标准化方向向量
  const dirNormalized = direction.clone().normalize()
  for (let i = 0; i < count; i++) {
    // 灯具位置 起始位置+方向 * 间距 * 索引
    const position = startPosition.clone().add(dirNormalized.clone().multiplyScalar(spacing*i))
    console.log({position})

    // 计算目标点： 位置 + 相对偏移量
    const target = position.clone().add(targetOffset)

    // 创建灯具并手机
    const light = createSpotlight({
      scene,
      position,
      target,
      color,
    })

    lights.push(light)
  }

  return lights
}