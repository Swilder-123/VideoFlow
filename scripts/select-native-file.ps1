param([Parameter(Mandatory=$true)][int]$ApplicationProcessId, [Parameter(Mandatory=$true)][string]$FilePath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class NativePicker {
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string name, string title);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr handle, uint message, IntPtr wparam, string text);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr handle, uint message, IntPtr wparam, IntPtr lparam);
  public static IntPtr EditIn(IntPtr parent) {
    IntPtr edit = FindWindowEx(parent, IntPtr.Zero, "Edit", null);
    if (edit != IntPtr.Zero) return edit;
    for (IntPtr child = FindWindowEx(parent, IntPtr.Zero, null, null); child != IntPtr.Zero; child = FindWindowEx(parent, child, null, null)) {
      edit = EditIn(child); if (edit != IntPtr.Zero) return edit;
    }
    return IntPtr.Zero;
  }
}
'@
$automation = [System.Windows.Automation.AutomationElement]
$scope = [System.Windows.Automation.TreeScope]
$ownerCondition = New-Object System.Windows.Automation.PropertyCondition($automation::ProcessIdProperty, $ApplicationProcessId)
$dialogCondition = New-Object System.Windows.Automation.PropertyCondition($automation::ClassNameProperty, '#32770')
$deadline = [DateTime]::UtcNow.AddSeconds(15)
do {
  $owner = $automation::RootElement.FindFirst($scope::Children, $ownerCondition)
  if ($owner) { $dialog = $owner.FindFirst($scope::Descendants, $dialogCondition) }
  if (!$dialog) { Start-Sleep -Milliseconds 100 }
} until ($dialog -or [DateTime]::UtcNow -gt $deadline)
if (!$dialog) { throw 'Native video picker not found for this application process' }
$editCondition = New-Object System.Windows.Automation.PropertyCondition($automation::AutomationIdProperty, '1148')
$deadline = [DateTime]::UtcNow.AddSeconds(10)
do {
  $combo = $dialog.FindFirst($scope::Descendants, $editCondition)
  $editHandle = if ($combo) { [NativePicker]::EditIn([IntPtr]$combo.Current.NativeWindowHandle) } else { [IntPtr]::Zero }
  if ($editHandle -eq [IntPtr]::Zero) { Start-Sleep -Milliseconds 100 }
} until ($editHandle -ne [IntPtr]::Zero -or [DateTime]::UtcNow -gt $deadline)
if ($editHandle -eq [IntPtr]::Zero) { throw 'Native filename edit handle is missing' }
[void][NativePicker]::SendMessage($editHandle, 0x000C, [IntPtr]::Zero, $FilePath)
$open = $dialog.FindFirst($scope::Descendants, (New-Object System.Windows.Automation.PropertyCondition($automation::AutomationIdProperty, '1')))
if (!$open) { throw 'Native Open button not found' }
[void][NativePicker]::PostMessage([IntPtr]$open.Current.NativeWindowHandle, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero)
Write-Output 'Real file selected through Windows UI Automation and scoped Win32 controls'
