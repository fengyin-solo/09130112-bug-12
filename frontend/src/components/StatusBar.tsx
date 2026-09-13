import React from 'react';
import { Space, Tag, Typography } from 'antd';
import { InfoCircleOutlined, DatabaseOutlined, LineChartOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { SeismicData } from '../types';

const { Text } = Typography;

interface StatusBarProps {
  seismicData: SeismicData;
}

const StatusBar: React.FC<StatusBarProps> = ({ seismicData }) => {
  const tool = useSelector((state: RootState) => state.viewer.tool);
  const lastMeasurement = useSelector((state: RootState) => state.viewer.lastMeasurement);
  const measurementPoints = useSelector((state: RootState) => state.viewer.measurementPoints);

  const toolLabels: Record<string, string> = {
    rotate: '旋转模式',
    pan: '平移模式',
    select: '选择模式',
    measure: '测量模式',
    annotate: '标注模式',
  };

  const statusItems = [
    {
      icon: <DatabaseOutlined />,
      content: (
        <>
          <Text type="secondary">数据维度: </Text>
          <Text>
            {seismicData.num_inlines || '-'} × {seismicData.num_crosslines || '-'} × {seismicData.num_depths || '-'}
          </Text>
        </>
      ),
    },
    {
      icon: <LineChartOutlined />,
      content: (
        <>
          <Text type="secondary">数值范围: </Text>
          <Text>
            {seismicData.min_value?.toFixed(2) || '-'} ~ {seismicData.max_value?.toFixed(2) || '-'}
          </Text>
        </>
      ),
    },
    {
      icon: <InfoCircleOutlined />,
      content: (
        <>
          <Text type="secondary">当前模式: </Text>
          <Tag color="blue">{toolLabels[tool] || tool}</Tag>
        </>
      ),
    },
  ];

  if (tool === 'measure' && lastMeasurement) {
    statusItems.push({
      icon: <LineChartOutlined />,
      content: (
        <>
          <Text type="secondary">测量结果: </Text>
          <Tag color="green">
            {lastMeasurement.value.toFixed(2)} {lastMeasurement.unit}
          </Tag>
        </>
      ),
    });
  }

  if (tool === 'measure' && measurementPoints.length > 0) {
    statusItems.push({
      icon: <InfoCircleOutlined />,
      content: (
        <>
          <Text type="secondary">已选点: </Text>
          <Tag>{measurementPoints.length}</Tag>
        </>
      ),
    });
  }

  return (
    <div className="status-bar">
      <Space size="large">
        {statusItems.map((item, index) => (
          <Space key={index} size={4}>
            {item.icon}
            {item.content}
          </Space>
        ))}
      </Space>

      <Space size="large">
        {seismicData.file_size && (
          <Text type="secondary">
            文件大小: {(seismicData.file_size / 1024 / 1024).toFixed(2)} MB
          </Text>
        )}
        <Text type="secondary">
          采样率: {seismicData.depth_step?.toFixed(2) || '-'} ms
        </Text>
      </Space>
    </div>
  );
};

export default StatusBar;
