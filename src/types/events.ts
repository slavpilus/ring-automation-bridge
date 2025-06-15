// Event type definitions for Ring Automation Bridge

export interface EventPayload {
  timestamp: string;
  eventType: string;
  source: string;
  data: Record<string, any>;
}

export interface DoorbellEventData {
  cameraName: string;
  cameraId: string;
  locationName: string;
  batteryLevel?: number;
  timestamp: string;
  dingId: string;
  kind: string;
  snapshotUrl?: string;
}

export interface MotionEventData {
  id?: string;
  cameraName: string;
  cameraId: string;
  locationName: string;
  batteryLevel?: number;
  timestamp: string;
  lastMotion?: any;
  detectionMethod: string;
  dingId?: string;
  deviceName?: string;
  deviceId?: string;
  kind?: string;
  createdAt?: string;
  eventCreatedAt?: string;
  eventData?: any;
  dingData?: any;
}

export interface AlarmModeEventData {
  locationName: string;
  alarmId: string;
  mode: string;
  previousMode?: string;
  timestamp: string;
  initial?: boolean;
}

export interface CameraStatusEventData {
  cameraName: string;
  cameraId: string;
  locationName: string;
  batteryLevel?: number;
  hasLight?: boolean;
  hasSiren?: boolean;
  isOffline?: boolean;
  isCharging?: boolean;
  hasMotion?: boolean;
  timestamp: string;
}

export interface DeviceEventData {
  id: string;
  description?: string;
  kind?: string;
  health_status?: string;
  battery_life?: number;
  firmware_version?: string;
  location_id?: string;
  device_id?: string;
  time_zone?: string;
  latitude?: number;
  longitude?: number;
}

export type EventType =
  | 'doorbell_pressed'
  | 'motion_detected'
  | 'active_ding'
  | 'alarm_mode_changed'
  | 'alarm_mode_state'
  | 'camera_status_update'
  | 'device_found'
  | 'base_station_found'
  | 'camera_found';

export interface EventStats {
  received: Record<string, number>;
  sent: Record<string, number>;
  blocked: Record<string, number>;
  errors: Record<string, number>;
}
