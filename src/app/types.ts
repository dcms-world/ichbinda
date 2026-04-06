export interface AppBindings {
  [key: string]: unknown;
  DB: D1Database;
  EXPO_ACCESS_TOKEN?: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  DEV_TOKEN?: string;
}

export type AppEnv = {
  Bindings: AppBindings;
  Variables: {
    [key: string]: unknown;
    deviceId: string;
    role: string;
  };
};

export interface RateLimitRow {
  last_heartbeat_at: string;
}

export interface PersonDeviceRow {
  id: number;
  person_id: string;
  device_id: string;
  device_model: string;
  last_seen: string;
}

export interface PersonDevicesResponse {
  devices: PersonDeviceRow[];
  max_devices: number;
  device_count: number;
  device_action: 'switch' | 'add' | 'full';
}

export interface PairingRequestRow {
  pairing_token: string;
  person_id: string;
  watcher_name: string | null;
  watcher_device_id: string | null;
  status: 'pending' | 'completed' | 'expired';
  created_at: string;
  completed_at: string | null;
}

export interface DeviceLinkRequestRow {
  link_token: string;
  person_id: string;
  mode: 'switch' | 'add';
  status: 'pending' | 'completed' | 'expired';
  requested_device_id: string | null;
  requested_device_model: string | null;
  requested_person_id: string | null;
  requested_at: string | null;
  rejected_at: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface OverduePersonRow {
  person_id: string;
  last_heartbeat: string | null;
  watcher_id: string;
  check_interval_minutes: number;
  push_token: string | null;
}

export interface WatcherDisconnectEventRow {
  id: number;
  person_id: string;
  watcher_id: string;
  created_at: string;
  acknowledged_at: string | null;
}
