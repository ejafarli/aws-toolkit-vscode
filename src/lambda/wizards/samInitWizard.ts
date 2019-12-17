/*!
 * Copyright 2018-2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as nls from 'vscode-nls'
const localize = nls.loadMessageBundle()

import { Runtime } from 'aws-sdk/clients/lambda'
import { Set } from 'immutable'
import * as path from 'path'
import * as vscode from 'vscode'
import { samInitDocUrl, schemaCodeDownloadDocUrl } from '../../shared/constants'
import { createHelpButton } from '../../shared/ui/buttons'
import * as input from '../../shared/ui/input'
import * as picker from '../../shared/ui/picker'
import { SchemaClient } from '../../shared/clients/schemaClient'
import { ext } from '../../shared/extensionGlobals'
import {
    BrowseFolderQuickPickItem,
    FolderQuickPickItem,
    MultiStepWizard,
    WizardContext,
    WizardStep,
    WorkspaceFolderQuickPickItem
} from '../../shared/wizards/multiStepWizard'
import * as lambdaRuntime from '../models/samLambdaRuntime'
import { toArrayAsync } from '../../shared/utilities/collectionUtils'

export interface CreateNewSamAppWizardContext {
    readonly lambdaRuntimes: Set<Runtime>
    readonly lambdaTemplates: Set<lambdaRuntime.SamLambdaTemplate>
    readonly lambdaTemplatesHelloWorld: Set<lambdaRuntime.SamLambdaTemplate>
    readonly workspaceFolders: vscode.WorkspaceFolder[] | undefined

    promptUserForRuntime(currRuntime?: Runtime): Promise<Runtime | undefined>

    promptUserForTemplate(
        currRuntime: Runtime,
        currTemplate?: lambdaRuntime.SamLambdaTemplate
    ): Promise<lambdaRuntime.SamLambdaTemplate | undefined>

    promptUserForRegistry(currRegion: string, currRegistry?: string): Promise<string | undefined>
    promptUserForRegion(currRegion?: string): Promise<string | undefined>
    promptUserForSchema(currRegion: string, currSchema?: string): Promise<string | undefined>

    promptUserForLocation(): Promise<vscode.Uri | undefined>

    promptUserForName(): Promise<string | undefined>

    showOpenDialog(options: vscode.OpenDialogOptions): Thenable<vscode.Uri[] | undefined>
}

export class DefaultCreateNewSamAppWizardContext extends WizardContext implements CreateNewSamAppWizardContext {
    public readonly lambdaRuntimes = lambdaRuntime.samLambdaRuntimes
    public readonly lambdaTemplates = lambdaRuntime.samLambdaTemplates
    public lambdaTemplatesHelloWorld = lambdaRuntime.samLambdaTemplatesHelloWorld
    private readonly helpButton = createHelpButton(localize('AWS.command.help', 'View Documentation'))

    public constructor() {
        super()
    }

    public async promptUserForRuntime(currRuntime?: Runtime): Promise<Runtime | undefined> {
        const quickPick = picker.createQuickPick<vscode.QuickPickItem>({
            options: {
                ignoreFocusOut: true,
                title: localize('AWS.samcli.initWizard.runtime.prompt', 'Select a SAM Application Runtime'),
                value: currRuntime ? currRuntime : ''
            },
            buttons: [this.helpButton, vscode.QuickInputButtons.Back],
            items: this.lambdaRuntimes
                .toArray()
                .sort(lambdaRuntime.compareSamLambdaRuntime)
                .map(runtime => ({
                    label: runtime,
                    alwaysShow: runtime === currRuntime,
                    description:
                        runtime === currRuntime ? localize('AWS.wizard.selectedPreviously', 'Selected Previously') : ''
                }))
        })

        const choices = await picker.promptUser({
            picker: quickPick,
            onDidTriggerButton: (button, resolve, reject) => {
                if (button === vscode.QuickInputButtons.Back) {
                    resolve(undefined)
                } else if (button === this.helpButton) {
                    vscode.env.openExternal(vscode.Uri.parse(samInitDocUrl))
                }
            }
        })
        const val = picker.verifySinglePickerOutput(choices)

        return val ? (val.label as Runtime) : undefined
    }

    public async promptUserForTemplate(
        currRuntime: Runtime,
        currLanguage?: lambdaRuntime.SamLambdaTemplate
    ): Promise<lambdaRuntime.SamLambdaTemplate | undefined> {
        if (currRuntime === 'python3.7' || currRuntime === 'python3.6') {
            this.lambdaTemplatesHelloWorld = this.lambdaTemplates
        }

        const quickPick = picker.createQuickPick<vscode.QuickPickItem>({
            options: {
                ignoreFocusOut: true,
                title: localize(
                    'AWS.schemas.downloadCodeBindings.initWizard.language.prompt',
                    'Select a code binding language'
                ),
                value: currLanguage ? currLanguage : ''
            },
            buttons: [this.helpButton, vscode.QuickInputButtons.Back],
            items: this.lambdaTemplatesHelloWorld.toArray().map(language => ({
                label: language,
                alwaysShow: language === currLanguage,
                description:
                    language === currLanguage ? localize('AWS.wizard.selectedPreviously', 'Selected Previously') : ''
            }))
        })

        const choices = await picker.promptUser({
            picker: quickPick,
            onDidTriggerButton: (button, resolve, reject) => {
                if (button === vscode.QuickInputButtons.Back) {
                    resolve(undefined)
                } else if (button === this.helpButton) {
                    vscode.env.openExternal(vscode.Uri.parse(schemaCodeDownloadDocUrl))
                }
            }
        })
        const val = picker.verifySinglePickerOutput(choices)

        return val ? (val.label as lambdaRuntime.SamLambdaTemplate) : undefined
    }

    public async promptUserForRegion(currRegion?: string): Promise<string | undefined> {
        let registries = ['us-east-1', 'us-east-2', 'us-west-2', 'eu-west-1', 'ap-northeast-1']

        //const resourceFetcher = new DefaultResourceFetcher()
        //const regionProvider = new DefaultRegionProvider(ext.context, resourceFetcher)
        //const schemaRegions = await regionProvider.getRegionData()

        //gerek funksiya elave edim bura ve shey edim, we shall see
        //registries = schemaRegions.map(region => region.regionCode)

        const quickPick = picker.createQuickPick<vscode.QuickPickItem>({
            options: {
                ignoreFocusOut: true,
                title: localize('AWS.schemas.downloadCodeBindings.initWizard.version.prompt', 'Select a registry'),
                value: currRegion ? currRegion : ''
            },
            buttons: [this.helpButton, vscode.QuickInputButtons.Back],
            items: registries!.map(region => ({
                label: region,
                alwaysShow: region === currRegion,
                description:
                    region === currRegion ? localize('AWS.wizard.selectedPreviously', 'Selected Previously') : ''
            }))
        })

        const choices = await picker.promptUser({
            picker: quickPick,
            onDidTriggerButton: (button, resolve, reject) => {
                if (button === vscode.QuickInputButtons.Back) {
                    resolve(undefined)
                } else if (button === this.helpButton) {
                    vscode.env.openExternal(vscode.Uri.parse(schemaCodeDownloadDocUrl))
                }
            }
        })
        const val = picker.verifySinglePickerOutput(choices)

        // doesn't make sense, leave it for now
        return val ? (val.label as string) : undefined
    }

    public async promptUserForRegistry(currRegion: string, currRegistry?: string): Promise<string | undefined> {
        const client: SchemaClient = ext.toolkitClientBuilder.createSchemaClient(currRegion)
        const registries = await toArrayAsync(client.listRegistries())

        const quickPick = picker.createQuickPick<vscode.QuickPickItem>({
            options: {
                ignoreFocusOut: true,
                title: localize('AWS.schemas.downloadCodeBindings.initWizard.version.prompt', 'Select a registry'),
                value: currRegistry ? currRegistry : ''
            },
            buttons: [this.helpButton, vscode.QuickInputButtons.Back],
            items: registries!.map(registry => ({
                label: registry.RegistryName!,
                alwaysShow: registry.RegistryName === currRegistry,
                description:
                    registry === currRegistry ? localize('AWS.wizard.selectedPreviously', 'Selected Previously') : ''
            }))
        })

        const choices = await picker.promptUser({
            picker: quickPick,
            onDidTriggerButton: (button, resolve, reject) => {
                if (button === vscode.QuickInputButtons.Back) {
                    resolve(undefined)
                } else if (button === this.helpButton) {
                    vscode.env.openExternal(vscode.Uri.parse(schemaCodeDownloadDocUrl))
                }
            }
        })
        const val = picker.verifySinglePickerOutput(choices)

        // doesn't make sense, leave it for now
        return val ? (val.label as lambdaRuntime.SamLambdaTemplate) : undefined
    }

    public async promptUserForSchema(currRegion: string, currSchema: string): Promise<string | undefined> {
        const client: SchemaClient = ext.toolkitClientBuilder.createSchemaClient(currRegion)
        const schemas = await toArrayAsync(client.listSchemas('aws.events'))

        const quickPick = picker.createQuickPick<vscode.QuickPickItem>({
            options: {
                ignoreFocusOut: true,
                title: localize('AWS.schemas.downloadCodeBindings.initWizard.version.prompt', 'Select a registry'),
                value: currSchema ? currSchema : ''
            },
            buttons: [this.helpButton, vscode.QuickInputButtons.Back],
            items: schemas!.map(schema => ({
                label: schema.SchemaName!,
                alwaysShow: schema.SchemaName === currSchema,
                description:
                    schema === currSchema ? localize('AWS.wizard.selectedPreviously', 'Selected Previously') : ''
            }))
        })

        const choices = await picker.promptUser({
            picker: quickPick,
            onDidTriggerButton: (button, resolve, reject) => {
                if (button === vscode.QuickInputButtons.Back) {
                    resolve(undefined)
                } else if (button === this.helpButton) {
                    vscode.env.openExternal(vscode.Uri.parse(schemaCodeDownloadDocUrl))
                }
            }
        })
        const val = picker.verifySinglePickerOutput(choices)

        // doesn't make sense, leave it for now
        return val ? (val.label as lambdaRuntime.SamLambdaTemplate) : undefined
    }

    public async promptUserForLocation(): Promise<vscode.Uri | undefined> {
        const items: FolderQuickPickItem[] = (this.workspaceFolders || [])
            .map<FolderQuickPickItem>(f => new WorkspaceFolderQuickPickItem(f))
            .concat([
                new BrowseFolderQuickPickItem(
                    this,
                    localize(
                        'AWS.samcli.initWizard.location.prompt',
                        'The folder you select will be added to your VS Code workspace.'
                    )
                )
            ])

        const quickPick = picker.createQuickPick({
            options: {
                ignoreFocusOut: true,
                title: localize(
                    'AWS.samcli.initWizard.location.prompt',
                    'Select a workspace folder for your new project'
                )
            },
            items: items,
            buttons: [this.helpButton, vscode.QuickInputButtons.Back]
        })

        const choices = await picker.promptUser({
            picker: quickPick,
            onDidTriggerButton: (button, resolve, reject) => {
                if (button === vscode.QuickInputButtons.Back) {
                    resolve(undefined)
                } else if (button === this.helpButton) {
                    vscode.env.openExternal(vscode.Uri.parse(samInitDocUrl))
                }
            }
        })
        const pickerResponse = picker.verifySinglePickerOutput<FolderQuickPickItem>(choices)

        if (!pickerResponse) {
            return undefined
        }

        if (pickerResponse instanceof BrowseFolderQuickPickItem) {
            const browseFolderResult = await pickerResponse.getUri()

            // If user cancels from Open Folder dialog, send them back to the folder picker.
            return browseFolderResult ? browseFolderResult : this.promptUserForLocation()
        }

        return pickerResponse.getUri()
    }

    public async promptUserForName(): Promise<string | undefined> {
        const inputBox = input.createInputBox({
            options: {
                title: localize('AWS.samcli.initWizard.name.prompt', 'Enter a name for your new application'),
                ignoreFocusOut: true
            },
            buttons: [this.helpButton, vscode.QuickInputButtons.Back]
        })

        return await input.promptUser({
            inputBox: inputBox,
            onValidateInput: (value: string) => {
                if (!value) {
                    return localize('AWS.samcli.initWizard.name.error.empty', 'Application name cannot be empty')
                }

                if (value.includes(path.sep)) {
                    return localize(
                        'AWS.samcli.initWizard.name.error.pathSep',
                        'The path separator ({0}) is not allowed in application names',
                        path.sep
                    )
                }

                return undefined
            },
            onDidTriggerButton: (button, resolve, reject) => {
                if (button === vscode.QuickInputButtons.Back) {
                    resolve(undefined)
                } else if (button === this.helpButton) {
                    vscode.env.openExternal(vscode.Uri.parse(samInitDocUrl))
                }
            }
        })
    }
}

export interface CreateNewSamAppWizardResponse {
    runtime: Runtime
    template: lambdaRuntime.SamLambdaTemplate
    region: string
    registryName: string
    schemaName: string
    location: vscode.Uri
    name: string
}

export class CreateNewSamAppWizard extends MultiStepWizard<CreateNewSamAppWizardResponse> {
    private runtime?: Runtime
    private template?: lambdaRuntime.SamLambdaTemplate
    private region?: string
    private registryName?: string
    private schemaName?: string
    private location?: vscode.Uri
    private name?: string

    public constructor(private readonly context: CreateNewSamAppWizardContext) {
        super()
    }

    protected get startStep() {
        return this.RUNTIME
    }

    protected getResult(): CreateNewSamAppWizardResponse | undefined {
        if (!this.runtime || !this.template || !this.location || !this.name) {
            return undefined
        }

        return {
            runtime: this.runtime,
            template: this.template,
            region: this.region!,
            registryName: this.registryName!,
            schemaName: this.schemaName!,
            location: this.location,
            name: this.name
        }
    }

    private readonly RUNTIME: WizardStep = async () => {
        this.runtime = await this.context.promptUserForRuntime(this.runtime)

        return this.runtime ? this.TEMPLATE : undefined
    }

    private readonly TEMPLATE: WizardStep = async () => {
        this.template = await this.context.promptUserForTemplate(this.runtime!)

        if (this.template === 'eventBridge-schema-app') {
            return this.REGION
        }

        return this.template ? this.LOCATION : this.RUNTIME // bunu deyishmeliyem ki wizardda backspace basanda exit elemesin
        // bir evvelki stepe qayitsin
    }

    private readonly REGION: WizardStep = async () => {
        this.region = await this.context.promptUserForRegion()

        return this.region ? this.REGISTRY : this.TEMPLATE
    }

    private readonly REGISTRY: WizardStep = async () => {
        this.registryName = await this.context.promptUserForRegistry(this.region!)

        return this.registryName ? this.SCHEMA : this.TEMPLATE
    }

    private readonly SCHEMA: WizardStep = async () => {
        this.schemaName = await this.context.promptUserForSchema(this.region!)

        return this.schemaName ? this.LOCATION : this.REGISTRY
    }

    private readonly LOCATION: WizardStep = async () => {
        this.location = await this.context.promptUserForLocation()

        if (!this.location) {
            if (this.template === 'eventBridge-schema-app') {
                // bu check looks unneccessary, we could just return this.TEMPLATE
                return this.TEMPLATE
            }

            return this.TEMPLATE
        }

        return this.NAME
    }

    private readonly NAME: WizardStep = async () => {
        this.name = await this.context.promptUserForName()

        return this.name ? undefined : this.LOCATION
    }
}
