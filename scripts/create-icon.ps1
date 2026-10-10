# Reproducible code-drawn icon matching the existing blue camera brand.
Add-Type -AssemblyName System.Drawing
$assetDirectory = Join-Path $PSScriptRoot '..\build'
[IO.Directory]::CreateDirectory($assetDirectory) | Out-Null
$images = @()
foreach ($size in @(16,32,48,64,128,256)) {
    $bitmap = [Drawing.Bitmap]::new($size,$size)
    $graphics = [Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.ScaleTransform($size / 256.0,$size / 256.0)
    $shape = [Drawing.Drawing2D.GraphicsPath]::new()
    foreach ($arc in @(@(8,8,64,64,180),@(184,8,64,64,270),@(184,184,64,64,0),@(8,184,64,64,90))) { $shape.AddArc($arc[0],$arc[1],$arc[2],$arc[3],$arc[4],90) }
    $shape.CloseFigure()
    $brush = [Drawing.Drawing2D.LinearGradientBrush]::new([Drawing.Point]::new(0,0),[Drawing.Point]::new(256,256),[Drawing.Color]::FromArgb(80,170,255),[Drawing.Color]::FromArgb(23,123,239))
    $graphics.FillPath($brush,$shape)
    $pen = [Drawing.Pen]::new([Drawing.Color]::White,12)
    $pen.LineJoin = [Drawing.Drawing2D.LineJoin]::Round
    $graphics.DrawRectangle($pen,49,70,108,116)
    $camera = [Drawing.Point[]]@([Drawing.Point]::new(157,108),[Drawing.Point]::new(208,79),[Drawing.Point]::new(208,178),[Drawing.Point]::new(157,148))
    $graphics.DrawPolygon($pen,$camera)
    $triangle = [Drawing.Point[]]@([Drawing.Point]::new(85,104),[Drawing.Point]::new(85,152),[Drawing.Point]::new(121,128))
    $graphics.FillPolygon([Drawing.Brushes]::White,$triangle)
    $memory = [IO.MemoryStream]::new()
    $bitmap.Save($memory,[Drawing.Imaging.ImageFormat]::Png)
    $images += ,$memory.ToArray()
    if ($size -eq 256) { [IO.File]::WriteAllBytes((Join-Path $assetDirectory 'icon.png'),$memory.ToArray()) }
    $memory.Dispose(); $pen.Dispose(); $brush.Dispose(); $shape.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
$stream = [IO.File]::Create((Join-Path $assetDirectory 'icon.ico'))
$writer = [IO.BinaryWriter]::new($stream)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$images.Count)
$offset = 6 + 16 * $images.Count
$sizes = @(16,32,48,64,128,256)
for ($index = 0; $index -lt $images.Count; $index++) {
    $dimension = if ($sizes[$index] -eq 256) { 0 } else { $sizes[$index] }
    $writer.Write([byte]$dimension); $writer.Write([byte]$dimension); $writer.Write([byte]0); $writer.Write([byte]0)
    $writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$images[$index].Length); $writer.Write([uint32]$offset)
    $offset += $images[$index].Length
}
foreach ($bytes in $images) { $writer.Write([byte[]]$bytes) }
$writer.Dispose(); $stream.Dispose()
