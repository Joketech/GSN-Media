$ErrorActionPreference = 'Stop'
$synthesizer = $null
$waveStream = $null
try {
    Add-Type -AssemblyName System.Speech
    $synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $requestData = [Environment]::GetEnvironmentVariable('GSN_VOICE_REQUEST') | ConvertFrom-Json
    try { $voiceNames = @($synthesizer.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo.Name }) }
    catch { throw 'Windows speech voices cannot be loaded in this environment. Run on a Windows desktop with installed speech voices, or record/import narration.' }
    if ($voiceNames.Count -eq 0) { throw 'No Windows speech voice is installed. Install a Windows speech voice, or record/import narration.' }
    if ($requestData.action -eq 'voices') {
        [Console]::Out.Write((ConvertTo-Json -InputObject $voiceNames -Compress))
    } else {
        $narrationText = [string]$requestData.text
        if ([string]::IsNullOrWhiteSpace($narrationText) -or $narrationText.Length -gt 8000) { throw 'Narration must contain 1 to 8000 characters.' }
        if ($requestData.voice) {
            if ($voiceNames -notcontains [string]$requestData.voice) { throw 'The selected voice is not installed.' }
            $synthesizer.SelectVoice([string]$requestData.voice)
        }
        $synthesizer.Rate = [Math]::Max(-5, [Math]::Min(5, [int]$requestData.rate))
        $waveStream = New-Object System.IO.MemoryStream
        $synthesizer.SetOutputToWaveStream($waveStream)
        $synthesizer.Speak($narrationText)
        $synthesizer.SetOutputToNull()
        [Console]::Out.Write((ConvertTo-Json -InputObject @{ audio = [Convert]::ToBase64String($waveStream.ToArray()) } -Compress))
    }
} catch {
    [Console]::Error.Write($_.Exception.Message)
    exit 1
} finally {
    if ($synthesizer) { $synthesizer.Dispose() }
    if ($waveStream) { $waveStream.Dispose() }
}
