/*!
 * Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Schemas } from 'aws-sdk'

import * as assert from 'assert'
import fs = require('fs')
import path = require('path')
import * as sinon from 'sinon'
import * as vscode from 'vscode'
import { viewSchemaItem, writeSchemaContentToTempFile } from '../../../eventSchemas/commands/viewSchemaItem'
import { SchemaItemNode } from '../../../eventSchemas/explorer/schemaItemNode'
import { AwsContext } from '../../../shared/awsContext'
import { tempDirPath } from '../../../shared/filesystemUtilities'
import { MockSchemaClient } from '../../shared/clients/mockClients'

const SCHEMA_TAB_SIZE = 2
const profileName = 'testProfile'
const regionCode = 'testRegion'
const schemaName = 'testSchema'
const registryName = 'testRegistry'
const fakeSchema = {
    SchemaName: schemaName
}
const schemaVersion = 'v1'
const fileName = `${profileName}.${regionCode}.${registryName}.${schemaName}.${schemaVersion}.json`
const expectedFilePath = path.join(tempDirPath, fileName)
const textEditor = ({} as any) as vscode.TextEditor
const AWS_EVENT_SCHEMA_RAW =
    '{"openapi":"3.0.0","info":{"version":"1.0.0","title":"Event"},"paths":{},"components":{"schemas":{"Event":{"type":"object","required":["result","cause","event","request-id"],"properties":{"cause":{"type":"string"},"event":{"type":"string"},"request-id":{"type":"string"},"result":{"type":"integer"}}}}}}'

const AWS_EVENT_SCHEMA_PRETTY = `{
  "openapi": "3.0.0",
  "info": {
    "version": "1.0.0",
    "title": "Event"
  },
  "paths": {},
  "components": {
    "schemas": {
      "Event": {
        "type": "object",
        "required": [
          "result",
          "cause",
          "event",
          "request-id"
        ],
        "properties": {
          "cause": {
            "type": "string"
          },
          "event": {
            "type": "string"
          },
          "request-id": {
            "type": "string"
          },
          "result": {
            "type": "integer"
          }
        }
      }
    }
  }
}`

describe('viewSchemaItem', async () => {
    let sandbox: sinon.SinonSandbox
    beforeEach(() => {
        sandbox = sinon.createSandbox()
    })

    afterEach(() => {
        sandbox.restore()
        if (fs.existsSync(expectedFilePath)) {
            fs.unlinkSync(expectedFilePath)
        }
    })

    describe('writeSchemaContentToTempFile', async () => {
        it('can pretty print schema content to a file', async () => {
            const filePath = await writeSchemaContentToTempFile(AWS_EVENT_SCHEMA_RAW, fileName, SCHEMA_TAB_SIZE)
            const response = fs.readFileSync(expectedFilePath, 'utf8')
            assert.strictEqual(response, AWS_EVENT_SCHEMA_PRETTY, 'Schema content not pretty printed')
            assert.strictEqual(filePath, expectedFilePath, 'Incorrect filepath returned')
        })
    })

    it('opens a file in the editor ', async () => {
        const schemaNode = generateSchemaItemNode()
        const awsContext = ({
            getCredentialProfileName: () => {}
        } as any) as AwsContext
        sinon.stub(awsContext, 'getCredentialProfileName').returns(profileName)
        const editorStub = sandbox.stub(vscode.window, 'showTextDocument').returns(Promise.resolve(textEditor))

        await viewSchemaItem(schemaNode, awsContext)
        assert.strictEqual(editorStub.calledOnce, true, 'should be called once')
        assert.deepStrictEqual(
            editorStub.getCalls()[0].args[0],
            vscode.Uri.file(expectedFilePath),
            'should open correct file in the editor'
        )
    })

    function generateSchemaItemNode(): SchemaItemNode {
        const schemaResponse: Schemas.DescribeSchemaResponse = {
            Content: AWS_EVENT_SCHEMA_RAW,
            SchemaVersion: schemaVersion
        }
        const schemaClient = new MockSchemaClient(regionCode)
        sandbox.stub(schemaClient, 'describeSchema').returns(Promise.resolve(schemaResponse))

        return new SchemaItemNode(fakeSchema, schemaClient, registryName)
    }
})
