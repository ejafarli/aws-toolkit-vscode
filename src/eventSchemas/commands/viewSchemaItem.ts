/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as nls from 'vscode-nls'
const localize = nls.loadMessageBundle()

import fs = require('fs')
import path = require('path')
import { tempDirPath } from '../../shared/filesystemUtilities'

import * as vscode from 'vscode'
import { AwsContext } from '../../shared/awsContext'
import { getLogger, Logger } from '../../shared/logger'
import { recordSchemasView, Result } from '../../shared/telemetry/telemetry'
import { getTabSizeSetting } from '../../shared/utilities/editorUtilities'
import { SchemaItemNode } from '../explorer/schemaItemNode'

export async function viewSchemaItem(node: SchemaItemNode, awsContext: AwsContext) {
    const logger: Logger = getLogger()

    let viewResult: Result = 'Succeeded'
    try {
        const profile = awsContext.getCredentialProfileName()
        const response = await node.client.describeSchema(node.registryName, node.schemaName)
        const fileName = `${profile!}.${node.client.regionCode}.${node.registryName}.${
            node.schemaName
        }.${response.SchemaVersion!}.json`

        const schemaContentTempFile = await writeSchemaContentToTempFile(response.Content!, fileName)
        const documentOptions: vscode.TextDocumentShowOptions = {
            viewColumn: vscode.ViewColumn.One,
            preview: false
        }

        await vscode.window.showTextDocument(vscode.Uri.file(schemaContentTempFile), documentOptions)
    } catch (err) {
        viewResult = 'Failed'
        const error = err as Error
        vscode.window.showErrorMessage(
            localize(
                'AWS.message.error.schemas.viewSchema.could_not_open',
                'Could not fetch and display schema {0} contents',
                node.schemaName
            )
        )
        logger.error('Error on schema preview', error)
    } finally {
        recordSchemasView({ result: viewResult })
    }
}

export function schemaFormatter(rawSchemaContent: string, tabSize: number = getTabSizeSetting()): string {
    const prettySchemaContent = JSON.stringify(JSON.parse(rawSchemaContent), undefined, tabSize)

    return prettySchemaContent
}

export async function writeSchemaContentToTempFile(
    rawSchemaContent: string,
    fileName: string,
    tabSize: number = getTabSizeSetting()
): Promise<string> {
    const prettySchemaContent = schemaFormatter(rawSchemaContent, tabSize)
    const schemaContentTempFile = path.join(tempDirPath, fileName)

    fs.writeFileSync(schemaContentTempFile, prettySchemaContent)

    return schemaContentTempFile
}
