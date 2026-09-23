export interface PowerPlanItem {
  guid: string
  name: string
  isCurrent: boolean
}

export type BatteryDrainImpact = 'Sehr hoch' | 'Hoch' | 'Moderat' | 'Niedrig'

export interface BatteryDrainProcess {
  id: number
  name: string
  cpuPercent: number
  memoryMb: number
  impactLevel: BatteryDrainImpact
  estimatedDrainText?: string
}

export interface BatteryDrainAlert {
  title: string
  message: string
  processName: string
  pid: number
  severity: 'warning' | 'critical'
  cpuPercent: number
  dischargeWattage: number
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
  drainProcesses: BatteryDrainProcess[]
  drainAlert: BatteryDrainAlert | null
  activePowerPlan: PowerPlanItem | null
  availablePowerPlans: PowerPlanItem[]
}

export interface BatteryReportResult {
  success: boolean
  filePath?: string
  error?: string
}


