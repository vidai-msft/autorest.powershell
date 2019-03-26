/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Host } from '@microsoft.azure/autorest-extension-base';
import { Project } from '../project';
import { PSScriptFile } from '../file-formats/psscript-file';
import { relative } from 'path';

export async function generatePsm1Custom(service: Host, project: Project) {
  const psm1 = new PSScriptFile(await service.ReadFile(project.psm1Custom) || '');
  const dllPath = relative(project.customFolder, project.dll);
  const internalPath = relative(project.customFolder, project.psm1Internal);
  psm1.append('Initialization', `
  # Load the private module dll
  $null = Import-Module -PassThru -Name (Join-Path $PSScriptRoot '${dllPath}')

  # Load the internal module
  $internalModulePath = Join-Path $PSScriptRoot '${internalPath}'
  if(Test-Path $internalModulePath) {
    $null = Import-Module -Name $internalModulePath
  }

  # Export nothing to clear implicit exports
  Export-ModuleMember`);
  // psm1.append('LoadScripts', 'Export-ScriptCmdlet -ScriptFolder $PSScriptRoot');
  // psm1.append('LoadScripts', 'Invoke-Expression -Command (Export-ScriptCmdlet -ScriptFolder $PSScriptRoot)');
  // psm1.append('LoadScripts', `Export-ScriptCmdlet -ScriptFolder $PSScriptRoot -EngineIntrinsics $ExecutionContext`);
  psm1.append('LoadScripts', `
  Get-ChildItem -Path $PSScriptRoot -Recurse -Filter '*.ps1' -File | ForEach-Object { . $_.FullName }
  Export-ModuleMember -Function (Get-ScriptCmdlet -ScriptFolder $PSScriptRoot)`);
  psm1.trim();
  service.WriteFile(project.psm1Custom, `${psm1}`, undefined, 'source-file-powershell');
}