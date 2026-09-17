import reducer, {
  setTool,
  setMeasurementType,
  addMeasurementPoint,
  clearMeasurementPoints,
  setLastMeasurement,
  resetViewer,
} from './viewerSlice';
import { MeasurementResult } from '../../types';

const sampleResult: MeasurementResult = {
  measurement_type: 'distance',
  value: 12.34,
  unit: 'm',
  points: [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 1, z: 1 },
  ],
};

const stateWithMeasurement = () => {
  let state = reducer(undefined, setTool('measure'));
  state = reducer(state, addMeasurementPoint({ x: 0, y: 0, z: 0 }));
  state = reducer(state, addMeasurementPoint({ x: 1, y: 1, z: 1 }));
  state = reducer(state, setLastMeasurement(sampleResult));
  return state;
};

describe('viewerSlice measurement cleanup', () => {
  it('clears points and last measurement when switching tools', () => {
    const state = reducer(stateWithMeasurement(), setTool('rotate'));
    expect(state.measurementPoints).toEqual([]);
    expect(state.lastMeasurement).toBeNull();
  });

  it('clears points and last measurement when switching measurement type', () => {
    const state = reducer(stateWithMeasurement(), setMeasurementType('area'));
    expect(state.measurementPoints).toEqual([]);
    expect(state.lastMeasurement).toBeNull();
    expect(state.measurementType).toBe('area');
  });

  it('clears points and last measurement when clearing measurements', () => {
    const state = reducer(stateWithMeasurement(), clearMeasurementPoints());
    expect(state.measurementPoints).toEqual([]);
    expect(state.lastMeasurement).toBeNull();
  });

  it('resets viewer state and bumps the view reset token', () => {
    const before = stateWithMeasurement();
    const state = reducer(before, resetViewer());
    expect(state.measurementPoints).toEqual([]);
    expect(state.lastMeasurement).toBeNull();
    expect(state.tool).toBe('rotate');
    expect(state.measurementType).toBe('distance');
    expect(state.viewResetToken).toBe(before.viewResetToken + 1);
  });
});
