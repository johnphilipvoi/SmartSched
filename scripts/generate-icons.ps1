# Run with powershell -File scripts/generate-icons.ps1 (Windows / System.Drawing).
# Matches public/icons/logo.svg; maskable artwork stays inside the safe zone.
Add-Type -AssemblyName System.Drawing
$output = Join-Path $PSScriptRoot '../public/icons'
function RoundedRect($x, $y, $w, $h, $r) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $path.AddArc($x, $y, $d, $d, 180, 90)
  $path.AddArc(($x+$w-$d), $y, $d, $d, 270, 90)
  $path.AddArc(($x+$w-$d), ($y+$h-$d), $d, $d, 0, 90)
  $path.AddArc($x, ($y+$h-$d), $d, $d, 90, 90)
  $path.CloseFigure()
  return ,$path
}
foreach ($spec in @(@('icon-192.png',192), @('icon-512.png',512), @('icon-maskable-512.png',512), @('apple-touch-icon.png',180))) {
  $size = [int]$spec[1]
  $bitmap = New-Object System.Drawing.Bitmap($size,$size)
  $g = [System.Drawing.Graphics]::FromImage($bitmap)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.ScaleTransform(($size/512.0),($size/512.0))
  $teal = [System.Drawing.ColorTranslator]::FromHtml('#087f70')
  $g.Clear($teal)
  $paper = RoundedRect 112 128 288 272 48
  $g.FillPath([System.Drawing.Brushes]::White,$paper)
  $line = New-Object System.Drawing.Pen($teal,20)
  $g.DrawLine($line,112,208,400,208)
  $binding = New-Object System.Drawing.Pen([System.Drawing.Color]::White,28)
  $binding.StartCap = $binding.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $g.DrawLine($binding,184,112,184,160)
  $g.DrawLine($binding,328,112,328,160)
  $check = New-Object System.Drawing.Pen($teal,28)
  $check.StartCap = $check.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $check.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  $points = [System.Drawing.Point[]]@([System.Drawing.Point]::new(184,296),[System.Drawing.Point]::new(232,344),[System.Drawing.Point]::new(332,244))
  $g.DrawLines($check,$points)
  $bitmap.Save((Join-Path $output $spec[0]),[System.Drawing.Imaging.ImageFormat]::Png)
  $paper.Dispose(); $line.Dispose(); $binding.Dispose(); $check.Dispose(); $g.Dispose(); $bitmap.Dispose()
}
