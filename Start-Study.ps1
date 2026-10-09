$ErrorActionPreference='Stop'
$studyRoot=$PSScriptRoot
$studyNodeCommand=Get-Command node -ErrorAction SilentlyContinue
$studyNode=if($studyNodeCommand){$studyNodeCommand.Source}else{Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'}
if(-not(Test-Path -LiteralPath $studyNode)){throw 'Node.js 24 이상을 설치한 뒤 다시 실행하세요.'}
if(-not(Test-Path -LiteralPath (Join-Path $studyRoot 'dist/client/index.html'))){throw '먼저 npm install, npm run setup, npm run build를 실행하세요.'}
$studyRunning=$false
try {$studyHealth=Invoke-RestMethod 'http://127.0.0.1:6103/health' -TimeoutSec 2; $studyRunning=$studyHealth.ok -eq $true} catch {}
if(-not $studyRunning){Start-Process -FilePath $studyNode -ArgumentList 'server.mjs' -WorkingDirectory $studyRoot -WindowStyle Hidden; Start-Sleep -Seconds 1}
Start-Process 'http://127.0.0.1:6103'
