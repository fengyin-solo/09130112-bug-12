import React, { useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { RootState } from '../store';

const PointLabel: React.FC<{ text: string; position: [number, number, number] }> = ({
  text,
  position,
}) => {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 128, 32);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 16);
    return new THREE.CanvasTexture(canvas);
  }, [text]);

  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  return (
    <sprite position={position}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  );
};

const MeasurementOverlay: React.FC = () => {
  const measurementPoints = useSelector((state: RootState) => state.viewer.measurementPoints);
  const lastMeasurement = useSelector((state: RootState) => state.viewer.lastMeasurement);
  const tool = useSelector((state: RootState) => state.viewer.tool);

  // 非测量工具不渲染任何对象；所有 hooks 都在此判断之前调用，保证切换工具时组件可正常卸载清理。
  if (tool !== 'measure' || measurementPoints.length === 0) return null;

  const linePoints = measurementPoints.map(
    (p): [number, number, number] => [p.x, p.y, p.z]
  );

  const lastPoint = measurementPoints[measurementPoints.length - 1];
  const labelText =
    lastMeasurement && measurementPoints.length >= 2
      ? `${lastMeasurement.value.toFixed(2)} ${lastMeasurement.unit}`
      : `点 ${measurementPoints.length}`;

  return (
    <group>
      {measurementPoints.map((point, index) => (
        <mesh key={index} position={[point.x, point.y, point.z]}>
          <sphereGeometry args={[2, 16, 16]} />
          <meshBasicMaterial color="#ff4d4f" />
        </mesh>
      ))}

      {measurementPoints.length >= 2 && (
        <Line points={linePoints} color="#ff4d4f" lineWidth={2} />
      )}

      <PointLabel
        text={labelText}
        position={[lastPoint.x, lastPoint.y + 5, lastPoint.z]}
      />
    </group>
  );
};

export default MeasurementOverlay;
