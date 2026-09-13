import React, { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useSelector, useDispatch } from 'react-redux';
import { SeismicData } from '../types';
import { RootState, AppDispatch } from '../store';
import { seismicAPI } from '../services/api';

interface SliceRendererProps {
  seismicData: SeismicData;
}

interface SliceTextureData {
  texture: THREE.Texture;
  timestamp: number;
}

const SliceRenderer: React.FC<SliceRendererProps> = ({ seismicData }) => {
  const dispatch = useDispatch<AppDispatch>();
  const slices = useSelector((state: RootState) => state.viewer.slices);

  const [sliceTextures, setSliceTextures] = useState<Record<string, SliceTextureData>>({});
  const [loadingSlices, setLoadingSlices] = useState<Record<string, boolean>>({});

  const width = (seismicData.num_crosslines || 100) * 10;
  const height = (seismicData.num_depths || 100) * 10;
  const depth = (seismicData.num_inlines || 100) * 10;

  const loadSliceTexture = async (
    sliceType: string, sliceIndex: number, colormap: string, minValue: number | null, maxValue: number | null) => {
    const cacheKey = `${sliceType}-${sliceIndex}-${colormap}-${minValue}-${maxValue}`;
    const cached = sliceTextures[cacheKey];
    
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.texture;
    }

    if (loadingSlices[cacheKey]) {
      return null;
    }

    setLoadingSlices(prev => ({ ...prev, [cacheKey]: true }));

    try {
      const response = await seismicAPI.getSliceImage(seismicData.id, sliceType, sliceIndex, {
        colormap, min_value: minValue, max_value: maxValue
      });
      
      const imageUrl = URL.createObjectURL(response.data);
      const texture = new THREE.TextureLoader().load(imageUrl);
      texture.needsUpdate = true;
      
      setSliceTextures(prev => ({
        ...prev,
        [cacheKey]: { texture, timestamp: Date.now() }
      }));
      
      return texture;
    } catch (error) {
      console.error(`Failed to load slice:`, error);
      return null;
    } finally {
      setLoadingSlices(prev => ({ ...prev, [cacheKey]: false }));
    }
  };

  const createPlaceholderTexture = (color: string): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 256, 256);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  };

  const placeholderTexture = useMemo(() => createPlaceholderTexture('placeholder'), []);

  const renderInlineSlice = () => {
    const config = slices.inline;
    if (!config.visible) return null;

    const sliceWidth = depth;
    const sliceHeight = height;
    const x = config.index * 10;
    
    return (
      <mesh position={[x, sliceHeight / 2, sliceWidth / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[sliceWidth, sliceHeight]} />
        <meshBasicMaterial
          map={placeholderTexture}
          transparent
          opacity={config.opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  };

  const renderCrosslineSlice = () => {
    const config = slices.crossline;
    if (!config.visible) return null;

    const sliceWidth = width;
    const sliceHeight = height;
    const z = config.index * 10;
    
    return (
      <mesh position={[sliceWidth / 2, sliceHeight / 2, z]}>
        <planeGeometry args={[sliceWidth, sliceHeight]} />
        <meshBasicMaterial
          map={placeholderTexture}
          transparent
          opacity={config.opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  };

  const renderDepthSlice = () => {
    const config = slices.depth;
    if (!config.visible) return null;

    const sliceWidth = width;
    const sliceDepth = depth;
    const y = config.index * 10;
    
    return (
      <mesh position={[sliceWidth / 2, y, sliceDepth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[sliceWidth, sliceDepth]} />
        <meshBasicMaterial
          map={placeholderTexture}
          transparent
          opacity={config.opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  };

  return (
    <group>
      {renderInlineSlice()}
      {renderCrosslineSlice()}
      {renderDepthSlice()}
    </group>
  );
};

export default SliceRenderer;
