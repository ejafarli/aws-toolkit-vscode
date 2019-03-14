/*!
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict'

import * as vscode from 'vscode'
import * as filesystemUtilities from '../../filesystemUtilities'
import { SettingsConfiguration } from '../../settingsConfiguration'
import { SamCliLocationProvider } from './samCliLocator'
import { SamCliVersionValidator } from './samCliVersionValidator'

export interface SamCliConfiguration {
    validator: SamCliVersionValidator

    getSamCliLocation(): string | undefined

    setSamCliLocation(location: string | undefined): Promise<void>

    initialize(): Promise<void>
}

export class DefaultSamCliConfiguration implements SamCliConfiguration {
    public static readonly CONFIGURATION_KEY_SAMCLI_LOCATION: string = 'samcli.location'
    private readonly _configuration: SettingsConfiguration
    private readonly _samCliLocationProvider: SamCliLocationProvider
    private readonly _validator: SamCliVersionValidator

    public constructor(
        configuration: SettingsConfiguration,
        samCliLocationProvider: SamCliLocationProvider,
        validator?: SamCliVersionValidator
    ) {
        this._configuration = configuration
        this._samCliLocationProvider = samCliLocationProvider
        this._validator = validator || new SamCliVersionValidator()
    }

    public get validator(): SamCliVersionValidator {
        return this._validator
    }

    public getSamCliLocation(): string | undefined {
        return this._configuration.readSetting(
            DefaultSamCliConfiguration.CONFIGURATION_KEY_SAMCLI_LOCATION
        )
    }

    public async setSamCliLocation(location: string | undefined): Promise<void> {
        await this._configuration.writeSetting(
            DefaultSamCliConfiguration.CONFIGURATION_KEY_SAMCLI_LOCATION,
            location,
            vscode.ConfigurationTarget.Global
        )
    }

    public async initialize(): Promise<void> {
        const configLocation: string | undefined = this.getSamCliLocation()
        if (!!configLocation) {
            if (await filesystemUtilities.fileExists(configLocation)) { return }
        }

        const detectedLocation = await this._samCliLocationProvider.getLocation()
        await this.setSamCliLocation(detectedLocation)
    }
}
