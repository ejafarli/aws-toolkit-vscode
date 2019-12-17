/*!
 * Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Runtime } from 'aws-sdk/clients/lambda'
import { DependencyManager, SamLambdaTemplate } from '../../../lambda/models/samLambdaRuntime'
import { SamCliContext } from './samCliContext'
import { logAndThrowIfUnexpectedExitCode } from './samCliInvokerUtils'
import { SchemaTemplateExtraContext } from '../../../eventSchemas/templates/schemasAppTemplateUtils'

export interface SamCliInitArgs {
    runtime: Runtime
    template: SamLambdaTemplate
    registryName?: string
    location: string
    name: string
    dependencyManager: DependencyManager
    extraContent?: SchemaTemplateExtraContext
}

export async function runSamCliInit(initArguments: SamCliInitArgs, context: SamCliContext): Promise<void> {
    const args = [
        'init',
        '--name',
        initArguments.name,
        '--runtime',
        initArguments.runtime,
        '--no-interactive',
        '--app-template',
        initArguments.template,
        '--dependency-manager',
        initArguments.dependencyManager
    ]

    if (initArguments.template === 'eventBridge-schema-app') {
        args.push('--extra-context', JSON.stringify(initArguments.extraContent!))
    }

    const childProcessResult = await context.invoker.invoke({
        spawnOptions: { cwd: initArguments.location },
        arguments: args
    })

    logAndThrowIfUnexpectedExitCode(childProcessResult, 0)
}
