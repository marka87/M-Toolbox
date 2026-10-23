export interface PowerPlanItem {
  guid: string
  name: string
  isCurrent: boolean
}

export interface BatteryInfo {
  hasBattery: boolean
  chargePercent: number
  statusText: string
  isCharging: boolean
  isDischarging: boolean
  isAcOnline: boolean
  remainingSeconds: number
  designCapacityMWh: number
  fullChargeCapacityMWh: number
  healthPercent: number
  wearLevelPercent: number
  healthRating: 'Exzellent' | 'Gut' | 'Mäßig' | 'Kritisch'
  cycleCount: number
  manufacturer: string
  modelId: string
  serialNumber?: string
  chemistry: string
  voltageMv: number
  voltageV: number
  dischargeRateWatts: number
  chargeRateWatts: number
  currentWattage: number
  activePowerPlan: PowerPlanItem | null
  availablePowerPlans: PowerPlanItem[]
}

export interface BatteryReportResult {
  success: boolean
  filePath?: string
  error?: string
}

