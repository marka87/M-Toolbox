[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$os = Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, BuildNumber, OSArchitecture, LastBootUpTime, TotalVisibleMemorySize, FreePhysicalMemory
$act = Get-CimInstance SoftwareLicensingProduct -Filter "PartialProductKey IS NOT NULL" -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*Windows*" } | Select-Object -First 1 Name, LicenseStatus, Description
$cs = Get-CimInstance Win32_ComputerSystem | Select-Object Name, Domain, PartOfDomain
$cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 Name, Manufacturer, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed
$gpus = @(Get-CimInstance Win32_VideoController | Select-Object Name, DriverVersion, AdapterRAM, Status)
$memChips = @(Get-CimInstance Win32_PhysicalMemory | Select-Object Capacity, Speed, DeviceLocator, SMBIOSMemoryType, MemoryType, ConfiguredClockSpeed)
$bios = Get-CimInstance Win32_BIOS | Select-Object Manufacturer, SMBIOSBIOSVersion, ReleaseDate, SerialNumber

$tpmPresent = $false
$tpmEnabled = $false
$tpmVersion = "N/A"
try {
    $tpmObj = Get-Tpm -ErrorAction SilentlyContinue
    if ($tpmObj) {
        $tpmPresent = [bool]$tpmObj.TpmPresent
        $tpmEnabled = [bool]$tpmObj.TpmEnabled
        $tpmVersion = if ($tpmObj.ManufacturerVersion) { [string]$tpmObj.ManufacturerVersion } else { "2.0" }
    }
} catch {}

$sbEnabled = $false
try {
    $sbEnabled = [bool](Confirm-SecureBootUEFI -ErrorAction SilentlyContinue)
} catch {
    $sbEnabled = $false
}

$physDisks = @(Get-PhysicalDisk -ErrorAction SilentlyContinue | Select-Object FriendlyName, MediaType, HealthStatus, Size, BusType)
$vols = @(Get-Volume -ErrorAction SilentlyContinue | Where-Object { $_.DriveLetter -ne $null } | Select-Object DriveLetter, FileSystemLabel, FileSystem, Size, SizeRemaining)

$result = [PSCustomObject]@{
    OS = $os
    Activation = $act
    Computer = $cs
    CPU = $cpu
    GPUs = $gpus
    MemoryChips = $memChips
    BIOS = $bios
    TPM = [PSCustomObject]@{
        Present = $tpmPresent
        Enabled = $tpmEnabled
        Version = $tpmVersion
    }
    SecureBoot = $sbEnabled
    PhysicalDisks = $physDisks
    Volumes = $vols
}

$result | ConvertTo-Json -Depth 4 -Compress

