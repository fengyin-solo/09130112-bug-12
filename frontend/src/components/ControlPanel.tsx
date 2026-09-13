import React, { useState } from 'react';
import { Card, Collapse, Switch, Slider, Select, Space, Typography, Tag } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined, BuildOutlined, SettingOutlined, AreaChartOutlined } from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import {
  setSliceVisible,
  setSliceIndex,
  setSliceOpacity,
  setSliceColormap,
  setVolumeRenderingEnabled,
  setVolumeRenderingOpacity,
  setBackground,
  setShowAxes,
  setShowGrid,
} from '../store/slices/viewerSlice';
import { RootState, AppDispatch } from '../store';
import { SeismicData } from '../types';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface ControlPanelProps {
  seismicData: SeismicData;
}

const colormapOptions = [
  { value: 'seismic', label: '地震波色标' },
  { value: 'gray', label: '灰度' },
  { value: 'rainbow', label: '彩虹' },
];

const ControlPanel: React.FC<ControlPanelProps> = ({ seismicData }) => {
  const dispatch = useDispatch<AppDispatch>();
  const slices = useSelector((state: RootState) => state.viewer.slices);
  const volumeRendering = useSelector((state: RootState) => state.viewer.volumeRendering);
  const background = useSelector((state: RootState) => state.viewer.background);
  const showAxes = useSelector((state: RootState) => state.viewer.showAxes);
  const showGrid = useSelector((state: RootState) => state.viewer.showGrid);

  const [activeKeys, setActiveKeys] = useState<string[]>(['slices', 'volume', 'display']);

  const renderSliceControl = (sliceType: 'inline' | 'crossline' | 'depth') => {
    const config = slices[sliceType];
    
    const maxMap = {
      inline: seismicData.num_inlines || 100,
      crossline: seismicData.num_crosslines || 100,
      depth: seismicData.num_depths || 100,
    };

    const labelsMap = {
      inline: 'Inline 切片',
      crossline: 'Crossline 切片',
      depth: '深度切片',
    };

    return (
      <Card
        size="small"
        style={{ marginBottom: 8 }}
        extra={
          <Switch
            checked={config.visible}
            onChange={(checked) => dispatch(setSliceVisible({ sliceType, visible: checked }))}
            checkedChildren={<EyeOutlined />}
            unCheckedChildren={<EyeInvisibleOutlined />}
          />
        }
      >
        <Title level={5} style={{ margin: '0 0 12px 0' }}>
          {labelsMap[sliceType]}
        </Title>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text type="secondary">切片索引</Text>
            <Tag color="blue">{config.index}</Tag>
          </div>
          <Slider
            min={0}
            max={maxMap[sliceType] - 1}
            value={config.index}
            onChange={(value) => dispatch(setSliceIndex({ sliceType, index: value as number }))}
            disabled={!config.visible}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text type="secondary">不透明度</Text>
            <Tag>{(config.opacity * 100).toFixed(0)}%</Tag>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={config.opacity}
            onChange={(value) => dispatch(setSliceOpacity({ sliceType, opacity: value as number }))}
            disabled={!config.visible}
          />
        </div>

        <div>
          <Text type="secondary">色标</Text>
          <Select
            value={config.colormap}
            size="small"
            style={{ width: '100%' }}
            onChange={(value) => dispatch(setSliceColormap({ sliceType, colormap: value }))}
            disabled={!config.visible}
          >
            {colormapOptions.map(opt => (
              <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
            ))}
          </Select>
        </div>
      </Card>
    );
  };

  return (
    <div className="control-panel">
      <Card
        size="small"
        title={
          <Space>
            <SettingOutlined />
            <span>控制面板</span>
          </Space>
        }
        style={{ marginBottom: 0 }}
      >
        <Collapse
          activeKey={activeKeys}
          onChange={(keys) => setActiveKeys(keys as string[])}
        >
          <Panel
            header={
              <Space>
                <AreaChartOutlined />
                <span>切片控制</span>
              </Space>
            }
            key="slices"
          >
            {renderSliceControl('inline')}
            {renderSliceControl('crossline')}
            {renderSliceControl('depth')}
          </Panel>

          <Panel
            header={
              <Space>
                <BuildOutlined />
                <span>体绘制</span>
              </Space>
            }
            key="volume"
          >
            <Card size="small">
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>启用体绘制</Text>
                  <Switch
                    checked={volumeRendering.enabled}
                    onChange={(checked) => dispatch(setVolumeRenderingEnabled(checked))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text type="secondary">透明度</Text>
                  <Tag>{(volumeRendering.opacity * 100).toFixed(0)}%</Tag>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={volumeRendering.opacity}
                  onChange={(value) => dispatch(setVolumeRenderingOpacity(value as number))}
                  disabled={!volumeRendering.enabled}
                />
              </div>
            </Card>
          </Panel>

          <Panel
            header={
              <Space>
                <EyeOutlined />
                <span>显示设置</span>
              </Space>
            }
            key="display"
          >
            <Card size="small">
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text>背景</Text>
                  <Select
                    value={background}
                    size="small"
                    style={{ width: 100 }}
                    onChange={(value) => dispatch(setBackground(value))}
                  >
                    <Select.Option value="dark">深色</Select.Option>
                    <Select.Option value="light">浅色</Select.Option>
                  </Select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text>显示坐标轴</Text>
                  <Switch
                    checked={showAxes}
                    onChange={(checked) => dispatch(setShowAxes(checked))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>显示网格</Text>
                  <Switch
                    checked={showGrid}
                    onChange={(checked) => dispatch(setShowGrid(checked))}
                  />
                </div>
              </div>
            </Card>
          </Panel>
        </Collapse>
      </Card>
    </div>
  );
};

export default ControlPanel;
